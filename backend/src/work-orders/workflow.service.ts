import { Injectable, BadRequestException, ConflictException, ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import { currentAccess, currentPlant } from '../auth/access-context';
import { assertTransition, permitted, transitions, validateRequirements } from './workflow-policy';
import { provenance } from '../common/provenance';
import { appMode } from '../auth/security-config';
@Injectable()
export class WorkflowService {
    constructor(private db: DataSource) { }
    async updateSetup(id: string, dto: any) {
        return this.db.transaction(async (m) => {
            const order = await this.order(m, id, true);
            if (!['DRAFT', 'PLANNED'].includes(order.status))
                throw new BadRequestException('Released order setup is frozen');
            if (!['ADMIN', 'SUPER_ADMIN', 'PRODUCTION_MANAGER'].includes(currentAccess().role))
                throw new ForbiddenException('Production manager required');
            if (dto.expectedRevision !== order.revision)
                throw new ConflictException('Reload the order');
            const start = new Date(dto.plannedStart ?? order.planned_start), end = new Date(dto.plannedEnd ?? order.planned_end);
            if (!(end > start))
                throw new BadRequestException('Invalid planned dates');
            await m.query('UPDATE work_orders SET planned_start=$2,planned_end=$3,revision=revision+1,updated_at=now() WHERE id=$1', [id, start, end]);
            return { id, revision: order.revision + 1 };
        });
    }
    async order(m: EntityManager, id: string, lock = false) {
        const [order] = await m.query(`SELECT * FROM work_orders WHERE id=$1 AND plant_id=$2 ${lock ? 'FOR UPDATE' : ''}`, [id, currentPlant()]);
        if (!order)
            throw new NotFoundException('Work order not found');
        return order;
    }
    async reauthenticate(m: EntityManager, password: string, username?: string, roles?: string[]) {
        const [user] = await m.query('SELECT * FROM users WHERE ' + (username ? 'username=$1' : 'id=$1'), [username || currentAccess().sub]);
        if (!user?.is_active || typeof password !== 'string' || Buffer.byteLength(password) > 72 || !await bcrypt.compare(password, user.password_hash).catch(() => false))
            throw new UnauthorizedException('Reauthentication failed');
        if (user.role !== 'SUPER_ADMIN' && user.plant_id !== currentPlant())
            throw new ForbiddenException('Approver outside this plant');
        if (roles && ![...roles, 'ADMIN', 'SUPER_ADMIN'].includes(user.role))
            throw new ForbiddenException('Approver role not permitted');
        return user;
    }
    async evidence(m: EntityManager, order: any) {
        const id = order.id;
        const checks = await m.query("SELECT * FROM order_evidence WHERE work_order_id=$1 AND details->>'sourceKind'='RECORDED' ORDER BY recorded_at,id", [id]);
        const production = await m.query('SELECT * FROM production_logs WHERE work_order_id=$1 AND evidence_verified=true ORDER BY timestamp,id', [id]);
        const quality = await m.query('SELECT * FROM quality_checks WHERE work_order_id=$1 AND evidence_verified=true ORDER BY created_at,id', [id]);
        const deviations = await m.query('SELECT * FROM deviations WHERE work_order_id=$1 ORDER BY reported_at,id', [id]);
        const materials = await m.query(`SELECT c.*,d.inventory_id,d.weighing_records,d.verifier_id,d.verified_at,d.container_id,b.batch_number,b.uom,mm.material_code,mm.material_name
   FROM material_consumptions c JOIN dispensing_records d ON d.id=c.dispensing_id JOIN material_batches b ON b.id=c.material_batch_id JOIN material_master mm ON mm.id=b.material_id WHERE c.work_order_id=$1 ORDER BY c.consumed_at,c.id`, [id]);
        const signatures = await m.query('SELECT id,action,actor_id,reason,created_at,revision FROM order_transition_history WHERE work_order_id=$1 AND reauthenticated=true ORDER BY created_at,id', [id]);
        const latest = new Map<string, any>();
        checks.forEach((e: any) => latest.set(e.requirement_id, e));
        const requirements = order.evidence_snapshot?.requirements || [];
        const missing: string[] = [];
        if (!order.evidence_snapshot)
            missing.push('No released recipe/evidence snapshot; legacy order needs a reviewed setup');
        const unmet = (phase?: string) => requirements.filter((r: any) => !phase || r.phase === phase).filter((r: any) => {
            const e = latest.get(r.id);
            if (e?.outcome === 'NOT_APPLICABLE' && r.allowNotApplicable === true && e.details?.reauthenticated)
                return false;
            if (e?.outcome === 'BLOCKING')
                return true;
            if (r.kind === 'MATERIAL')
                return !materials.length;
            if (r.kind === 'PRODUCTION')
                return !production.length;
            if (r.kind === 'QUALITY')
                return !quality.some((q: any) => q.status === 'PASSED') || (quality.some((q: any) => q.status !== 'PASSED') && e?.outcome !== 'RESOLVED');
            if (r.kind === 'WEIGHING')
                return !materials.length || materials.some((d: any) => !d.weighing_records?.scale_id);
            if (r.kind === 'VERIFIER')
                return !materials.length || materials.some((d: any) => !d.verifier_id || !d.verified_at);
            return !e || !['RECORDED', 'RESOLVED'].includes(e.outcome);
        }).map((r: any) => `${r.id}: ${r.label}`);
        missing.push(...unmet());
        for (const d of deviations)
            if (!['RESOLVED', 'CLOSED'].includes(d.status))
                missing.push(`Unresolved deviation: ${d.id} ${d.title}`);
        for (const [key, e] of latest)
            if (e.outcome === 'BLOCKING')
                missing.push(`Unresolved exception: ${key}`);
        const good = production.reduce((n: number, p: any) => n + Number(p.count_good), 0), scrap = production.reduce((n: number, p: any) => n + Number(p.count_scrap), 0);
        if (good !== order.completed_quantity || scrap !== order.scrap_quantity)
            missing.push('Production counts do not reconcile with verified production logs');
        const recorded = checks.length + production.length + quality.length + materials.length;
        return { checks, production, quality, materials, deviations, signatures, requirements, missing: [...new Set(missing)], preStartMissing: unmet('PRE_START'),
            provenance: provenance('RECORDED', order.updated_at, recorded ? [] : ['No verified evidence'], [...checks, ...production, ...quality, ...materials].map(e => e.id), { start: order.actual_start, end: order.actual_end }) };
    }
    async describe(id: string) {
        const order = await this.order(this.db.manager, id);
        const evidence = await this.evidence(this.db.manager, order);
        return { revision: order.revision, recipeId: order.recipe_id, legacyUnverified: order.legacy_unverified, requirements: evidence.requirements,
            availableActions: Object.keys(transitions).filter(a => permitted(a, order.status, currentAccess().role)), unmetPrerequisites: evidence.missing, evidence };
    }
    async transition(id: string, dto: any) {
        return this.db.transaction(async (m) => {
            const order = await this.order(m, id, true), actor = currentAccess();
            if (!Number.isInteger(dto.expectedRevision) || dto.expectedRevision !== order.revision)
                throw new ConflictException('Order changed. Reload before acting.');
            assertTransition(dto.action, order.status, actor.role);
            if (typeof dto.reason !== 'string' || !dto.reason.trim())
                throw new BadRequestException('A reason is required');
            const action = dto.action;
            let snapshot = order.evidence_snapshot;
            let authenticated = false;
            if (['REVIEW', 'CLOSE', 'APPROVE_SHORTFALL'].includes(action)) {
                await this.reauthenticate(m, dto.password);
                authenticated = true;
            }
            if (action === 'PLAN' || action === 'RELEASE') {
                if (!(order.target_quantity > 0) || !(new Date(order.planned_end) > new Date(order.planned_start)))
                    throw new BadRequestException('Positive target and valid planned dates required');
            }
            if (action === 'RELEASE') {
                const [recipe] = await m.query("SELECT * FROM batch_recipes WHERE id=$1 AND product_id=$2 AND status IN ('ACTIVE','RELEASED') FOR SHARE", [dto.recipeId || order.recipe_id, order.product_id]);
                if (!recipe)
                    throw new BadRequestException('Select a released recipe version for this product');
                validateRequirements(recipe.evidence_requirements);
                snapshot = { recipe, requirements: recipe.evidence_requirements, releasedAt: new Date().toISOString(), releasedBy: actor.sub };
                await m.query('UPDATE work_orders SET recipe_id=$2,evidence_snapshot=$3,legacy_unverified=false WHERE id=$1', [id, recipe.id, snapshot]);
                order.evidence_snapshot = snapshot;
            }
            const evidence = await this.evidence(m, order);
            if (['START', 'RESUME'].includes(action) && (!snapshot || evidence.preStartMissing.length))
                throw new BadRequestException({ message: 'Pre-start evidence required', missing: evidence.preStartMissing });
            if (['COMPLETE', 'REVIEW', 'CLOSE'].includes(action) && evidence.missing.length)
                throw new BadRequestException({ message: 'Required evidence incomplete', missing: evidence.missing });
            if (['COMPLETE', 'REVIEW', 'CLOSE'].includes(action) && order.completed_quantity < order.target_quantity && !order.shortfall_approval)
                throw new BadRequestException('Supervisor-approved shortfall required');
            if (action === 'REVIEW' && (!order.completed_by || order.completed_by === actor.sub))
                throw new ForbiddenException('Review must be independent of completion');
            if (action === 'CLOSE' && (!order.reviewed_snapshot || !order.reviewed_by || order.reviewed_by === actor.sub))
                throw new ForbiddenException('Independent manager closure requires current supervisor review');
            const to = transitions[action].to || order.status;
            if (action === 'APPROVE_SHORTFALL')
                await m.query('UPDATE work_orders SET shortfall_approval=$2 WHERE id=$1', [id, { actor: actor.sub, reason: dto.reason, at: new Date().toISOString(), good: order.completed_quantity, scrap: order.scrap_quantity }]);
            if (action === 'COMPLETE')
                await m.query('UPDATE work_orders SET completed_by=$2,actual_end=now() WHERE id=$1', [id, actor.sub]);
            if (action === 'START')
                await m.query('UPDATE work_orders SET actual_start=COALESCE(actual_start,now()) WHERE id=$1', [id]);
            if (action === 'REJECT_REVIEW')
                await m.query('UPDATE work_orders SET reviewed_by=NULL,reviewed_snapshot=NULL WHERE id=$1', [id]);
            await m.query('INSERT INTO order_transition_history(id,work_order_id,action,from_status,to_status,revision,actor_id,reason,reauthenticated,evidence) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)', [randomUUID(), id, action, order.status, to, order.revision + 1, actor.sub, dto.reason, authenticated, { sourceReferences: evidence.provenance.sourceReferences }]);
            if (action === 'CLOSE') {
                const [closure] = await m.query("SELECT id,action,actor_id,reason,created_at,revision FROM order_transition_history WHERE work_order_id=$1 AND action='CLOSE' ORDER BY created_at DESC LIMIT 1", [id]);
                await m.query('UPDATE work_orders SET reviewed_snapshot=$2 WHERE id=$1', [id, { ...order.reviewed_snapshot, signatures: [...order.reviewed_snapshot.signatures, closure] }]);
            }
            if (action === 'REVIEW') {
                const frozen = await this.evidence(m, order);
                await m.query('UPDATE work_orders SET reviewed_by=$2,reviewed_snapshot=$3 WHERE id=$1', [id, actor.sub, { ...frozen, order: { ...order, reviewed_snapshot: undefined }, reviewedAt: new Date().toISOString(), revision: order.revision + 1 }]);
            }
            await m.query('UPDATE work_orders SET status=$2,revision=revision+1,updated_at=now() WHERE id=$1', [id, to]);
            return { id, status: to, revision: order.revision + 1 };
        });
    }
    async recordEvidence(id: string, dto: any) {
        return this.db.transaction(async (m) => {
            const order = await this.order(m, id, true);
            if (order.status === 'CLOSED' || !order.evidence_snapshot)
                throw new BadRequestException('Evidence requires a released, open order');
            if (dto.expectedRevision !== order.revision)
                throw new ConflictException('Reload the order');
            const requirement = order.evidence_snapshot.requirements.find((r: any) => r.id === dto.requirementId);
            if (!requirement || !['RECORDED', 'NOT_APPLICABLE', 'BLOCKING', 'RESOLVED'].includes(dto.outcome) || typeof dto.notes !== 'string' || !dto.notes.trim())
                throw new BadRequestException('Requirement, outcome and evidence notes required');
            let reauthenticated = false;
            if (dto.outcome === 'NOT_APPLICABLE' || dto.outcome === 'RESOLVED') {
                if (dto.outcome === 'NOT_APPLICABLE' && !requirement.allowNotApplicable)
                    throw new BadRequestException('Requirement cannot be waived');
                await this.reauthenticate(m, dto.password, undefined, ['SUPERVISOR', 'PRODUCTION_MANAGER']);
                reauthenticated = true;
            }
            await m.query('INSERT INTO order_evidence(id,work_order_id,requirement_id,outcome,details,actor_id) VALUES($1,$2,$3,$4,$5,$6)', [randomUUID(), id, dto.requirementId, dto.outcome, { notes: dto.notes, reauthenticated, sourceKind: appMode === 'demo' ? 'SIMULATED' : 'RECORDED' }, currentAccess().sub]);
            return { success: true };
        });
    }
    async counts(id: string, good: number, scrap: number, machineId: string) {
        if (!Number.isSafeInteger(good) || !Number.isSafeInteger(scrap) || good < 0 || scrap < 0 || good + scrap === 0 || !machineId)
            throw new BadRequestException('Machine and nonnegative integer counts required');
        return this.db.transaction(async (m) => {
            const order = await this.order(m, id, true);
            if (order.status !== 'IN_PROGRESS')
                throw new BadRequestException('Counts require an IN_PROGRESS order');
            const machines = await m.query('SELECT m.id FROM machines m JOIN lines l ON l.id=m.line_id JOIN areas a ON a.id=l.area_id WHERE m.id=$1 AND a.plant_id=$2', [machineId, currentPlant()]);
            if (!machines.length)
                throw new NotFoundException('Machine not found in plant');
            await m.query('INSERT INTO production_logs(id,work_order_id,machine_id,operator_id,count_good,count_scrap,evidence_verified) VALUES($1,$2,$3,$4,$5,$6,$7)', [randomUUID(), id, machineId, currentAccess().sub, good, scrap, appMode !== 'demo']);
            await m.query('UPDATE work_orders SET completed_quantity=completed_quantity+$2,scrap_quantity=scrap_quantity+$3,updated_at=now() WHERE id=$1', [id, good, scrap]);
            return { success: true };
        });
    }
}
