import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { createHash, randomUUID } from 'crypto';
import { currentAccess, currentPlant } from '../auth/access-context';
import { WorkflowService } from '../work-orders/workflow.service';
import { appMode } from '../auth/security-config';
export function decimalQuantity(value: any) {
    const text = String(value);
    if (!/^(?:0|[1-9]\d{0,7})(?:\.\d{1,4})?$/.test(text) || Number(text) <= 0)
        throw new BadRequestException('Quantity must be positive with at most four decimal places');
    return Number(text).toFixed(4);
}
function canonical(v: any): string { return Array.isArray(v) ? '[' + v.map(canonical).join(',') + ']' : v && typeof v === 'object' ? '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canonical(v[k])).join(',') + '}' : JSON.stringify(v); }
@Injectable()
export class DispensingService {
    constructor(private db: DataSource, private workflow: WorkflowService) { }
    async dispense(dto: any, key: string) {
        if (appMode === 'demo')
            throw new BadRequestException('Physical stock dispensing is unavailable in demo mode');
        if (typeof key !== 'string' || !/^[a-zA-Z0-9_-]{16,100}$/.test(key))
            throw new BadRequestException('A stable Idempotency-Key is required');
        const qty = decimalQuantity(dto.dispensedQuantity), requested = decimalQuantity(dto.requestedQuantity);
        if (!dto.inventoryId || !dto.workOrderId || !dto.materialBatchId || typeof dto.uom !== 'string')
            throw new BadRequestException('Source inventory, order, batch and unit required');
        const payload = { workOrderId: dto.workOrderId, inventoryId: dto.inventoryId, materialBatchId: dto.materialBatchId, uom: dto.uom, dispensedQuantity: qty, requestedQuantity: requested, weighingRecords: dto.weighingRecords || null, containerId: dto.containerId || null, verifierUsername: dto.verifierUsername || null, qrCodeData: dto.qrCodeData || null };
        const fingerprint = createHash('sha256').update(canonical(payload)).digest('hex');
        return this.db.transaction(async (m) => {
            await m.query('INSERT INTO dispensing_requests(plant_id,request_key,fingerprint,actor_id) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING', [currentPlant(), key, fingerprint, currentAccess().sub]);
            const [request] = await m.query('SELECT * FROM dispensing_requests WHERE plant_id=$1 AND request_key=$2 FOR UPDATE', [currentPlant(), key]);
            if (request.fingerprint !== fingerprint || request.actor_id !== currentAccess().sub)
                throw new ConflictException('Idempotency key already used for another dispense');
            if (request.response)
                return request.response;
            const order = await this.workflow.order(m, dto.workOrderId, true);
            if (!['RELEASED', 'IN_PROGRESS'].includes(order.status) || !order.evidence_snapshot || order.legacy_unverified)
                throw new BadRequestException('Dispensing requires a verified RELEASED or IN_PROGRESS order');
            const [batch] = await m.query('SELECT * FROM material_batches WHERE id=$1 FOR UPDATE', [dto.materialBatchId]);
            if (!batch)
                throw new NotFoundException('Batch not found');
            const [inv] = await m.query(`SELECT i.*,w.plant_id FROM material_inventory i JOIN storage_locations l ON l.id=i.storage_location_id JOIN warehouses w ON w.id=l.warehouse_id WHERE i.id=$1 AND i.material_batch_id=$2 ORDER BY i.id FOR UPDATE OF i`, [dto.inventoryId, batch.id]);
            if (!inv || inv.plant_id !== currentPlant())
                throw new BadRequestException('Source inventory requires a reviewed warehouse assignment to this plant');
            const [balance] = await m.query('SELECT b.quantity=COALESCE(sum(i.quantity),0) AS consistent FROM material_batches b LEFT JOIN material_inventory i ON i.material_batch_id=b.id WHERE b.id=$1 GROUP BY b.id,b.quantity', [batch.id]);
            if (!balance?.consistent)
                throw new ConflictException('Batch and inventory totals disagree; reconcile this lot before dispensing');
            const [eligible] = await m.query("SELECT id FROM material_batches WHERE id=$1 AND status='RELEASED' AND (expiry_date IS NULL OR expiry_date>=CURRENT_DATE) AND uom=$2", [batch.id, dto.uom]);
            if (!eligible)
                throw new BadRequestException('Batch must be released, unexpired and use the requested unit');
            const requirements = order.evidence_snapshot.requirements;
            const weighingRequired = requirements.some((r: any) => r.kind === 'WEIGHING');
            const weighing = dto.weighingRecords;
            if (weighingRequired || weighing) {
                if (!weighing?.scale_id || !dto.containerId || !['tare_weight', 'gross_weight', 'net_weight'].every(k => typeof weighing[k] === 'number' && Number.isFinite(weighing[k]) && weighing[k] >= 0) || weighing.uom !== dto.uom || Math.abs(weighing.gross_weight - weighing.tare_weight - weighing.net_weight) > 0.0001 || Math.abs(weighing.net_weight - Number(qty)) > 0.0001 || weighing.source !== 'RECORDED')
                    throw new BadRequestException('Recorded scale, container, matching units and reconciled weights required');
            }
            let verifier = null;
            if (requirements.some((r: any) => r.kind === 'VERIFIER') || dto.verifierUsername) {
                if (!dto.verifierUsername)
                    throw new BadRequestException('Verifier credentials required');
                verifier = await this.workflow.reauthenticate(m, dto.verifierPassword, dto.verifierUsername, ['SUPERVISOR', 'QUALITY_ENGINEER']);
                if (verifier.id === currentAccess().sub)
                    throw new BadRequestException('Verifier must be independent of operator');
            }
            const updatedInventory = await m.query('UPDATE material_inventory SET quantity=quantity-$2::numeric,updated_at=now() WHERE id=$1 AND quantity-allocated_quantity >= $2::numeric RETURNING id', [inv.id, qty]);
            const updatedBatch = await m.query('UPDATE material_batches SET quantity=quantity-$2::numeric WHERE id=$1 AND quantity >= $2::numeric RETURNING quantity', [batch.id, qty]);
            if (!updatedInventory.length || !updatedBatch.length)
                throw new ConflictException('Insufficient unreserved stock');
            const id = randomUUID();
            await m.query(`INSERT INTO dispensing_records(id,work_order_id,material_batch_id,inventory_id,requested_quantity,dispensed_quantity,balance_quantity,weighing_records,operator_id,verifier_id,verified_at,status,container_id,qr_code_data)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`, [id, order.id, batch.id, inv.id, requested, qty, updatedBatch[0].quantity, weighing || {}, currentAccess().sub, verifier?.id || null, verifier ? new Date() : null, verifier ? 'VERIFIED' : 'IN_PROGRESS', dto.containerId || null, dto.qrCodeData || null]);
            await m.query("INSERT INTO material_transactions(id,material_batch_id,tx_type,quantity,from_location_id,performed_by,reason,dispensing_id) VALUES($1,$2,'DISPENSING',-$3::numeric,$4,$5,$6,$7)", [randomUUID(), batch.id, qty, inv.storage_location_id, currentAccess().sub, `Dispensed to ${order.wo_number}`, id]);
            await m.query('INSERT INTO material_consumptions(id,work_order_id,material_batch_id,planned_quantity,actual_quantity,variance,dispensing_id) VALUES($1,$2,$3,$4,$5,$5::numeric-$4::numeric,$6)', [randomUUID(), order.id, batch.id, requested, qty, id]);
            await m.query("INSERT INTO order_transition_history(id,work_order_id,action,from_status,to_status,revision,actor_id,reason,evidence) SELECT $1,id,'DISPENSE',status,status,revision,$3,$4,$5 FROM work_orders WHERE id=$2", [randomUUID(), order.id, currentAccess().sub, 'Material dispensed', { dispensingId: id, inventoryId: inv.id, verifierId: verifier?.id || null }]);
            const response = { id, workOrderId: order.id, inventoryId: inv.id, dispensedQuantity: qty, balanceQuantity: updatedBatch[0].quantity, status: verifier ? 'VERIFIED' : 'IN_PROGRESS' };
            await m.query('UPDATE dispensing_requests SET response=$3 WHERE plant_id=$1 AND request_key=$2', [currentPlant(), key, response]);
            return response;
        });
    }
}
