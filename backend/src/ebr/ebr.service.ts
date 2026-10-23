import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { jsPDF } from 'jspdf';
import { WorkflowService } from '../work-orders/workflow.service';
import { appMode } from '../auth/security-config';
@Injectable()
export class EbrService {
    constructor(private db: DataSource, private workflow: WorkflowService) { }
    async getOrCreateEbr(id: string): Promise<any> {
        const order = await this.workflow.order(this.db.manager, id);
        const frozen = order.status === 'CLOSED' && order.reviewed_snapshot && !order.legacy_unverified;
        const evidence = frozen ? order.reviewed_snapshot : await this.workflow.evidence(this.db.manager, order);
        const recipe = order.evidence_snapshot?.recipe;
        return { id, workOrderId: id, workOrder: { id, woNumber: order.wo_number, status: order.status }, status: frozen ? 'FINAL' : 'DRAFT',
            legacyUnverified: order.legacy_unverified, provenance: evidence.provenance, missingEvidence: evidence.missing,
            recipe: recipe ? { id: recipe.id, code: recipe.recipe_code, version: recipe.version, instructions: recipe.process_instructions } : null,
            materialsUsed: evidence.materials, operators: evidence.production.map(p => ({ userId: p.operator_id, timestamp: p.timestamp, sourceId: p.id })),
            equipmentUsed: evidence.production.map(p => ({ machineId: p.machine_id, sourceId: p.id })), processParameters: evidence.checks,
            qualityChecks: evidence.quality, deviations: evidence.deviations, signatures: evidence.signatures,
            counts: { good: order.completed_quantity, scrap: order.scrap_quantity, target: order.target_quantity }, evidence };
    }
    async submitForReview(id: string, dto: any) { return this.workflow.transition(id, { ...dto, action: 'COMPLETE' }); }
    async approveEbr(id: string, dto: any) { return this.workflow.transition(id, { ...dto, action: 'REVIEW' }); }
    async generateEbrPdf(id: string, final = false): Promise<Buffer> {
        const ebr = await this.getOrCreateEbr(id);
        if (final && (ebr.status !== 'FINAL' || ebr.missingEvidence.length || appMode === 'demo'))
            throw new BadRequestException('Final export requires closed, reviewed, complete production evidence');
        const doc = new jsPDF();
        let y = 18;
        const line = (text: string, size = 10) => { doc.setFontSize(size); doc.setFont('helvetica', size > 10 ? 'bold' : 'normal'); doc.setTextColor(size > 10 ? 20 : 45, size > 10 ? 42 : 55, size > 10 ? 69 : 65); const lines = doc.splitTextToSize(text, 178); for (const l of lines) {
            if (y > 272) {
                doc.addPage();
                y = 18;
            }
            doc.text(l, 16, y);
            y += 5;
        } y += 2; };
        line(`${final ? 'FINAL' : 'DRAFT / INCOMPLETE'} - Electronic Batch Record`, 16);
        if (appMode === 'demo')
            line('SIMULATION / DEMO ENVIRONMENT - NOT A PRODUCTION RELEASE', 12);
        line(`Work order: ${ebr.workOrder.woNumber} | Status: ${ebr.workOrder.status}`);
        line(`Source: recorded evidence | Recipe: ${ebr.recipe ? ebr.recipe.code + ' revision ' + ebr.recipe.version : 'Unavailable'}`);
        if (ebr.legacyUnverified)
            line('LEGACY UNVERIFIED: Historical records have not been validated.');
        line(`Good: ${ebr.counts.good}; Scrap: ${ebr.counts.scrap}; Target: ${ebr.counts.target}`);
        if (ebr.missingEvidence.length)
            line('Missing evidence: ' + ebr.missingEvidence.join('; '));
        line('Frozen process requirements', 12);
        for (const r of ebr.evidence.requirements)
            line(`${r.phase}: ${r.label} (${r.kind})`);
        const section = (name: string, items: any[], describe: (x: any) => string[]) => {
            if (y > 245) {
                doc.addPage();
                y = 18;
            }
            line(name, 12);
            if (!items.length)
                line('No verified records. This section is mandatory only when required by the frozen process checklist.');
            for (const item of items) {
                for (const text of describe(item))
                    line(text);
                line(`Source record: ${item.id}`, 8);
            }
        };
        section('Materials', ebr.materialsUsed, m => [`${m.material_code} - ${m.material_name}`, `Lot: ${m.batch_number} | Dispensed: ${m.actual_quantity} ${m.uom} | Requested: ${m.planned_quantity} ${m.uom}`, `Recorded at: ${m.consumed_at} | Container: ${m.container_id ?? 'Not recorded'}`, `Independent verifier: ${m.verifier_id ?? 'Not recorded'}`]);
        section('Production', ebr.evidence.production, p => [`Recorded at: ${p.timestamp} | Good: ${p.count_good} | Scrap: ${p.count_scrap}`, `Machine: ${p.machine_id} | Operator: ${p.operator_id ?? 'Not recorded'}`]);
        section('Quality checks', ebr.qualityChecks, q => [`Sample: ${q.serial_number} | Result: ${q.status} | Inspector: ${q.inspector_id}`, ...(q.check_parameters?.measurements || []).map((m: any) => `${m.parameter}: ${m.value} ${m.unit}`), `Recorded at: ${q.created_at}`]);
        section('Deviations', ebr.deviations, d => [`${d.title} | ${d.status}`, `Recorded at: ${d.reported_at}`]);
        section('Recorded checks', ebr.processParameters, c => [`${c.requirement_id}: ${c.outcome}`, c.details.notes, `Actor: ${c.actor_id} | Recorded at: ${c.recorded_at}`]);
        const reviews = ebr.signatures.filter(s => s.action === 'REVIEW'), latestReview = reviews[reviews.length - 1]?.id;
        section('Authenticated approval history', ebr.signatures, s => [`${s.action}${s.action === 'REVIEW' && s.id !== latestReview ? ' (superseded)' : ''} | Evidence revision: ${s.revision}`, `Actor: ${s.actor_id} | Signed at: ${s.created_at}`, `Reason: ${s.reason}`]);
        line('Evidence provenance', 12);
        line(`Source: ${ebr.provenance.sourceKind} | Availability: ${ebr.provenance.availability}`);
        line(`Reporting period: ${ebr.provenance.reportingPeriod?.start ?? 'Not started'} to ${ebr.provenance.reportingPeriod?.end ?? 'Not completed'}`);
        line('All values above come from the referenced records. Missing measurements and approvals have not been inferred.');
        const pages = doc.getNumberOfPages();
        for (let i = 1; i <= pages; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.text(`${final ? 'FINAL' : 'DRAFT'}${appMode === 'demo' ? ' / SIMULATED' : ''} | ${ebr.workOrder.woNumber} | ${i}/${pages}`, 16, 290);
        }
        return Buffer.from(doc.output('arraybuffer'));
    }
}
