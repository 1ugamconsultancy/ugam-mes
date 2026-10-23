-- Run through backend/scripts/security-admin.cjs migrate --mapping <reviewed.json>.
-- All changes are transactional. Ambiguous ownership aborts the migration.
CREATE TEMP TABLE IF NOT EXISTS security_user_map(user_id uuid PRIMARY KEY, plant_id uuid, username text) ON COMMIT DROP;
CREATE TEMP TABLE IF NOT EXISTS security_order_map(work_order_id uuid PRIMARY KEY, plant_id uuid NOT NULL) ON COMMIT DROP;
-- Some deployed databases contain only audit_logs; the current service uses audit_trail.
CREATE TABLE IF NOT EXISTS audit_trail (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid REFERENCES users(id) ON DELETE SET NULL,
 username varchar(100), action varchar(255) NOT NULL, old_value text, new_value text,
 reason text NOT NULL, timestamp timestamptz NOT NULL DEFAULT now()
);
DO $$ BEGIN
 IF to_regclass('public.audit_logs') IS NOT NULL THEN
  INSERT INTO audit_trail(id,user_id,username,action,old_value,new_value,reason,timestamp)
  SELECT a.id,a.user_id,u.username,a.action,a.old_values::text,a.new_values::text,
   'Migrated legacy audit for ' || coalesce(a.target_table,'unknown target'),a.timestamp
  FROM audit_logs a LEFT JOIN users u ON u.id=a.user_id
  ON CONFLICT(id) DO NOTHING;
 END IF;
END $$;
ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version integer NOT NULL DEFAULT 0;
ALTER TABLE inventory_balances ADD COLUMN IF NOT EXISTS plant_id uuid REFERENCES plants(id) ON DELETE RESTRICT;
CREATE TEMP TABLE IF NOT EXISTS security_inventory_map(inventory_id uuid PRIMARY KEY, plant_id uuid NOT NULL) ON COMMIT DROP;
UPDATE inventory_balances i SET plant_id=m.plant_id FROM security_inventory_map m WHERE i.id=m.inventory_id;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS plant_id uuid REFERENCES plants(id) ON DELETE RESTRICT;

UPDATE users u SET username=m.username FROM security_user_map m WHERE u.id=m.user_id AND m.username IS NOT NULL;
DO $$ BEGIN
  IF EXISTS(SELECT lower(btrim(username)) FROM users GROUP BY lower(btrim(username)) HAVING count(*)>1) THEN
    RAISE EXCEPTION 'Duplicate normalized usernames; provide reviewed username mappings';
  END IF;
END $$;
UPDATE users SET username=lower(btrim(username));
UPDATE users u SET plant_id=m.plant_id FROM security_user_map m WHERE u.id=m.user_id AND u.role::text<>'SUPER_ADMIN';
UPDATE users SET plant_id=NULL, organization_id=NULL WHERE role::text='SUPER_ADMIN';
UPDATE users u SET organization_id=p.organization_id FROM plants p WHERE u.plant_id=p.id AND u.role::text<>'SUPER_ADMIN';
-- Invalid legacy placeholder hashes cannot authenticate; require individual secure resets.
UPDATE users SET is_active=false WHERE password_hash LIKE '%SecretPasswordHashPlaceholder%' OR password_hash !~ '^\$2[aby]\$[0-9]{2}\$[./A-Za-z0-9]{53}$';
UPDATE users SET session_version=session_version+1;

-- Backfill orders only when physical production evidence identifies exactly one plant.
WITH evidence AS (
 SELECT pl.work_order_id, min(a.plant_id::text)::uuid AS plant_id
 FROM production_logs pl JOIN machines m ON m.id=pl.machine_id
 JOIN lines l ON l.id=m.line_id JOIN areas a ON a.id=l.area_id
 GROUP BY pl.work_order_id HAVING count(DISTINCT a.plant_id)=1
)
UPDATE work_orders w SET plant_id=e.plant_id FROM evidence e WHERE w.id=e.work_order_id AND w.plant_id IS NULL;
UPDATE work_orders w SET plant_id=m.plant_id FROM security_order_map m WHERE w.id=m.work_order_id;

DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM users u LEFT JOIN plants p ON p.id=u.plant_id WHERE u.role::text<>'SUPER_ADMIN' AND (p.id IS NULL OR p.organization_id IS NULL OR u.organization_id IS DISTINCT FROM p.organization_id)) THEN
   RAISE EXCEPTION 'Users have unresolved plant assignments; supply reviewed user mappings';
 END IF;
 IF EXISTS(SELECT 1 FROM work_orders WHERE plant_id IS NULL) THEN
   RAISE EXCEPTION 'Work orders have unresolved ownership; supply reviewed order mappings';
 END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS users_username_normalized_unique ON users(lower(btrim(username)));
CREATE UNIQUE INDEX IF NOT EXISTS plants_id_organization_unique ON plants(id, organization_id);
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='users_normalized_username') THEN
  ALTER TABLE users ADD CONSTRAINT users_normalized_username CHECK(username=lower(btrim(username)) AND username ~ '^[a-z0-9][a-z0-9._@-]*$');
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='users_role_plant_scope') THEN
  ALTER TABLE users ADD CONSTRAINT users_role_plant_scope CHECK(
   (role::text='SUPER_ADMIN' AND plant_id IS NULL AND organization_id IS NULL) OR
   (role::text<>'SUPER_ADMIN' AND plant_id IS NOT NULL AND organization_id IS NOT NULL));
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='users_plant_organization_fk') THEN
  ALTER TABLE users ADD CONSTRAINT users_plant_organization_fk FOREIGN KEY(plant_id,organization_id) REFERENCES plants(id,organization_id) ON DELETE RESTRICT;
 END IF;
END $$;
ALTER TABLE work_orders ALTER COLUMN plant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS work_orders_plant_created_idx ON work_orders(plant_id,created_at DESC);

CREATE TABLE IF NOT EXISTS opc_tags (
 plant_id uuid NOT NULL REFERENCES plants(id) ON DELETE RESTRICT,
 tag_name text NOT NULL, data jsonb NOT NULL, PRIMARY KEY(plant_id,tag_name)
);
CREATE TABLE IF NOT EXISTS opc_server_configs (
 plant_id uuid PRIMARY KEY REFERENCES plants(id) ON DELETE RESTRICT, data jsonb NOT NULL
);
CREATE TABLE IF NOT EXISTS opc_command_audit (
 id uuid PRIMARY KEY, plant_id uuid NOT NULL REFERENCES plants(id) ON DELETE RESTRICT,
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT, username text NOT NULL,
 tag_name text, action text NOT NULL, status text NOT NULL, details jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS opc_audit_plant_created_idx ON opc_command_audit(plant_id,created_at DESC);
