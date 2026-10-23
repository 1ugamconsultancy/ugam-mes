BEGIN;
CREATE TABLE IF NOT EXISTS operational_migrations(version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
-- Use text with a check so adding REVIEWED does not require an enum commit boundary.
ALTER TABLE work_orders ALTER COLUMN status DROP DEFAULT;
ALTER TABLE work_orders ALTER COLUMN status TYPE text USING status::text;
ALTER TABLE work_orders ALTER COLUMN status SET DEFAULT 'DRAFT';
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 0;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS recipe_id uuid REFERENCES batch_recipes(id);
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS evidence_snapshot jsonb;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS reviewed_snapshot jsonb;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS completed_by uuid REFERENCES users(id);
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES users(id);
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS shortfall_approval jsonb;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS legacy_unverified boolean NOT NULL DEFAULT true;
ALTER TABLE work_orders ALTER COLUMN legacy_unverified SET DEFAULT false;
ALTER TABLE batch_recipes ADD COLUMN IF NOT EXISTS evidence_requirements jsonb;
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS plant_id uuid REFERENCES plants(id);
CREATE TABLE IF NOT EXISTS order_evidence (
 id uuid PRIMARY KEY, work_order_id uuid NOT NULL REFERENCES work_orders(id), requirement_id text NOT NULL,
 outcome text NOT NULL CHECK(outcome IN ('RECORDED','NOT_APPLICABLE','BLOCKING','RESOLVED')),
 details jsonb NOT NULL, actor_id uuid NOT NULL REFERENCES users(id), recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS order_transition_history (
 id uuid PRIMARY KEY, work_order_id uuid NOT NULL REFERENCES work_orders(id), action text NOT NULL,
 from_status text NOT NULL, to_status text NOT NULL, revision integer NOT NULL, actor_id uuid NOT NULL REFERENCES users(id),
 reason text NOT NULL, reauthenticated boolean NOT NULL DEFAULT false, evidence jsonb, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS dispensing_requests (
 plant_id uuid NOT NULL REFERENCES plants(id), request_key text NOT NULL, fingerprint text NOT NULL,
 actor_id uuid NOT NULL REFERENCES users(id), response jsonb, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(plant_id,request_key)
);
ALTER TABLE dispensing_records ADD COLUMN IF NOT EXISTS inventory_id uuid REFERENCES material_inventory(id);
ALTER TABLE material_consumptions ADD COLUMN IF NOT EXISTS dispensing_id uuid UNIQUE REFERENCES dispensing_records(id);
ALTER TABLE material_transactions ADD COLUMN IF NOT EXISTS dispensing_id uuid UNIQUE REFERENCES dispensing_records(id);
ALTER TABLE electronic_batch_records ADD COLUMN IF NOT EXISTS provenance jsonb;
ALTER TABLE production_logs ADD COLUMN IF NOT EXISTS evidence_verified boolean NOT NULL DEFAULT false;
ALTER TABLE quality_checks ADD COLUMN IF NOT EXISTS evidence_verified boolean NOT NULL DEFAULT false;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='operational_inventory_nonnegative') THEN
  ALTER TABLE material_inventory ADD CONSTRAINT operational_inventory_nonnegative CHECK(quantity>=0 AND allocated_quantity>=0 AND quantity>=allocated_quantity);
  ALTER TABLE material_batches ADD CONSTRAINT operational_batch_nonnegative CHECK(quantity>=0);
  ALTER TABLE work_orders ADD CONSTRAINT operational_order_status CHECK(status IN ('DRAFT','PLANNED','RELEASED','IN_PROGRESS','PAUSED','COMPLETED','REVIEWED','CLOSED'));
 END IF;
END $$;
-- Evidence changes serialize with transitions, invalidate review, and cannot mutate a closed dossier.
CREATE OR REPLACE FUNCTION operational_evidence_change() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE oid uuid; s text;
BEGIN
 IF TG_OP='DELETE' THEN oid=OLD.work_order_id; ELSE oid=NEW.work_order_id; END IF;
 IF TG_OP='UPDATE' AND OLD.work_order_id IS DISTINCT FROM NEW.work_order_id THEN RAISE EXCEPTION 'Evidence cannot move between orders'; END IF;
 IF oid IS NOT NULL THEN
  SELECT status INTO s FROM work_orders WHERE id=oid FOR UPDATE;
  IF s='CLOSED' THEN RAISE EXCEPTION 'Closed order evidence is immutable'; END IF;
  IF TG_TABLE_NAME='production_logs' AND s<>'IN_PROGRESS' THEN RAISE EXCEPTION 'Production requires IN_PROGRESS order'; END IF;
  UPDATE work_orders SET revision=revision+1, shortfall_approval=CASE WHEN TG_TABLE_NAME='production_logs' THEN NULL ELSE shortfall_approval END, reviewed_snapshot=NULL, reviewed_by=NULL,
    status=CASE WHEN status='REVIEWED' THEN 'COMPLETED' ELSE status END WHERE id=oid;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['order_evidence','production_logs','quality_checks','dispensing_records','material_consumptions','deviations'] LOOP
  EXECUTE format('DROP TRIGGER IF EXISTS operational_evidence_guard ON %I',t);
  EXECUTE format('CREATE TRIGGER operational_evidence_guard BEFORE INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION operational_evidence_change()',t);
 END LOOP;
END $$;
INSERT INTO operational_migrations(version) VALUES('20261018_operational_integrity') ON CONFLICT DO NOTHING;
COMMIT;
