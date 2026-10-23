BEGIN;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS archived_by uuid REFERENCES users(id);
ALTER TABLE plants ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE plants ADD COLUMN IF NOT EXISTS archived_by uuid REFERENCES users(id);
CREATE TABLE IF NOT EXISTS enterprise_archive_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 entity_type text NOT NULL CHECK(entity_type IN ('organization','plant')),
 entity_id uuid NOT NULL,
 action text NOT NULL CHECK(action IN ('ARCHIVE','RESTORE')),
 actor_id uuid NOT NULL REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
-- Serialize assignments with archival. A statement trigger takes the lock before row locks.
CREATE OR REPLACE FUNCTION enterprise_assignment_lock() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(180026,1);
 RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS enterprise_assignment_lock ON users;
CREATE TRIGGER enterprise_assignment_lock BEFORE INSERT OR UPDATE ON users
FOR EACH STATEMENT EXECUTE FUNCTION enterprise_assignment_lock();
CREATE OR REPLACE FUNCTION enterprise_assignment_validate() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='UPDATE' THEN
  IF NEW.plant_id IS NOT DISTINCT FROM OLD.plant_id AND NEW.organization_id IS NOT DISTINCT FROM OLD.organization_id AND NEW.role IS NOT DISTINCT FROM OLD.role THEN RETURN NEW; END IF;
 END IF;
 IF NEW.plant_id IS NOT NULL AND EXISTS (
  SELECT 1 FROM plants p LEFT JOIN organizations o ON o.id=p.organization_id
  WHERE p.id=NEW.plant_id AND (p.archived_at IS NOT NULL OR o.archived_at IS NOT NULL)
 ) THEN RAISE EXCEPTION 'Cannot allocate a user to an archived plant or organization' USING ERRCODE='23514'; END IF;
 IF NEW.organization_id IS NOT NULL AND EXISTS (SELECT 1 FROM organizations WHERE id=NEW.organization_id AND archived_at IS NOT NULL)
 THEN RAISE EXCEPTION 'Cannot allocate a user to an archived organization' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS enterprise_assignment_validate ON users;
CREATE TRIGGER enterprise_assignment_validate BEFORE INSERT OR UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION enterprise_assignment_validate();
INSERT INTO operational_migrations(version) VALUES('20261018_enterprise_archive') ON CONFLICT DO NOTHING;
COMMIT;
