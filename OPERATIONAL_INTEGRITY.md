# Operational integrity update

## Deployment status

Deployed on 18 October 2026 after explicit user approval. Backend/frontend images and workflow schema are live. WH-RAW is now WH-AUT, assigned to AUTO-PLANT-01; WH-WIP and WH-FG remain unassigned. The separately prepared batch-balance reconciliation remains unapplied. Backup: `backups/before-enterprise-20261018.dump`; old container filesystem exports are also retained in `backups/`. Super-admin enterprise routing and an operator dashboard were verified in the deployed browser.

## Workflow and evidence

The server accepts explicit PLAN, RELEASE, START, PAUSE, RESUME, APPROVE_SHORTFALL, COMPLETE, REVIEW, REJECT_REVIEW and CLOSE actions through `POST /work-orders/:id/transitions`. Supply `expectedRevision` and `reason`; RELEASE also needs `recipeId`, and REVIEW/CLOSE/APPROVE_SHORTFALL require the acting user's password. Generic PATCH rejects status/count writes. Counts require an in-progress order and a machine in its plant.

Recipe evidence requirements have an id, label, PRE_START/EXECUTION phase, MANUAL/PRODUCTION/MATERIAL/QUALITY/WEIGHING/VERIFIER kind, and optional `allowNotApplicable`. The release snapshot freezes the selected recipe and requirements. The work-order screen can create an evidence-plan recipe revision. Signed not-applicable dispositions and exception resolutions are available through the evidence endpoint; they require a supervisor or production manager.

Reviews must be independent of completion. Closure is a separate manager action by a different person from the reviewer. Evidence changes lock the order, advance its revision and invalidate review. Closed order evidence is immutable, including production, quality, material records and deviations. Review/closure never manufacture a signature. Below-target output requires a recorded supervisor approval.

Legacy orders, reports, production logs and quality samples are not silently promoted to verified evidence. Existing open legacy orders without a release snapshot remain blocked from new execution/finalization; review and migrate their setup explicitly or create a new order. Historical closed records remain closed but cannot be re-exported as newly verified final reports.

## Dispensing

`POST /materials/dispensing` requires a stable `Idempotency-Key`, workOrderId, inventoryId, materialBatchId, uom, requestedQuantity and dispensedQuantity. Quantities have at most four decimal places. An identical authenticated retry returns the original response; a changed payload or actor with the same key conflicts. The transaction locks order, batch and source inventory and commits all balance, dispensing, consumption and audit writes together.

Weighing inputs, when supplied/required, are `scale_id`, `tare_weight`, `gross_weight`, `net_weight`, `uom`, and `source: RECORDED`; a container identifier is required. A verifier uses `verifierUsername` and `verifierPassword` and must differ from the operator. Credentials are excluded from persisted retry fingerprints and audit records. The frontend retains the retry key until a definitive result; an unresolved request cannot be replaced with different quantities. Each dispense uses one source bin. The direct consumption endpoint rejects attempts to bypass dispensing.

GRN creation/release is also transactional, requires a plant-owned storage location and cannot duplicate receipt stock on repeated release. No material transfer/adjustment endpoints existed in this module. All material balance mutations are now through these transaction paths and database nonnegative constraints. Unowned allocations cannot be consumed.

Reviewed warehouse mapping: rename **WH-RAW → WH-AUT**, assign it to **AUTO-PLANT-01 (Ugam Precision Automotive Plant)**. Leave **WH-WIP** and **WH-FG** unassigned. No inventory is moved or renamed by this mapping.

Eight legacy batch totals disagree with warehouse inventory. The user requested corrections based on warehouse stock totals; the proposal is documented in `INVENTORY_RECONCILIATION.md` and guarded SQL `backend/migrations/20261018_prepared_balance_reconciliation.sql`. It is prepared only, excluded from automatic migration, and does not change warehouse stock. Inconsistent batches remain blocked from dispensing until reconciled.

## Honest outputs

The dashboard shows verified recorded counts; OEE availability/performance and aggregate OEE stay unavailable without recorded runtime, scheduled time and ideal rate. Production forecasts stay unavailable; demo mode retains explicitly simulated predictive examples. Scheduling shows stored order dates without invented machine allocations. SPC plots only an explicitly selected order/parameter/unit; control statistics remain unavailable without a validated control-limit configuration. New quality checks require actual measurements; legacy measurements are identified as unverified.

API provenance distinguishes RECORDED/DERIVED/SIMULATED from AVAILABLE/STALE/UNAVAILABLE. Live observations default to a five-minute freshness threshold; historical periods are not made stale solely by age. Final EBR export (`?final=true`) requires closure and a complete reviewed snapshot. Default PDF export is a labeled draft. The report includes frozen checklist, recorded evidence, approval history and source IDs, without fallback people, measurements, materials or approvals.

## Validation and rollout

Local checks:

```powershell
cd D:\UGAM_MES\backend
node node_modules/typescript/lib/tsc.js --outDir .security-build --incremental false
node --test test/security-access.test.cjs test/evidence-states.test.cjs
node test/operational-integration.cjs
cd D:\UGAM_MES\frontend
npm.cmd run build
```

The PostgreSQL tests use a temporary isolated schema and remove it afterward. They cover workflow gates, independence, revision conflicts, shortfall, evidence correction, closed-record protection, concurrent dispensing, idempotent retries, rollback after each write and final export. The Windows test harness mocks the bcrypt comparison boundary because the checkout's native binary targets Linux; database operations are real. The running application uses bcrypt normally.

Once Docker build/deployment is authorized, build images before the maintenance window. Back up `ugam_mes` with `pg_dump`; stop backend and frontend; run `node backend/scripts/operational-migration.cjs audit` and review results, then `node backend/scripts/operational-migration.cjs apply --development`. Start the new backend/frontend together. Do not run the old backend against migrated workflow data. Verify the warehouse mapping, a new work-order lifecycle, one recorded dispense/retry, and draft/final exports. Keep the database backup until acceptance. A rollback after new workflow activity requires a reviewed database restore, not simply restarting the old image.

Desktop/mobile browser verification and live smoke checks remain pending deployment. Local frontend compilation and PDF fixture rendering do not replace those checks.
