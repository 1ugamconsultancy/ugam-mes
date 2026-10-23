-- Run against a restored database after applying migration_security_plant_access.sql.
-- Tests use the existing automotive seed plant; everything is rolled back.
BEGIN;
DO $$
DECLARE p uuid := 'a0000000-0001-1111-1111-111111111111';
        o uuid := '10000000-0000-0000-0000-000000000001';
BEGIN
 BEGIN
  INSERT INTO users(username,email,password_hash,role) VALUES('scope.test.orphan','scope.orphan@example.invalid','test','OPERATOR');
  RAISE EXCEPTION 'FAILED: unassigned ordinary account was accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
  INSERT INTO users(username,email,password_hash,role,plant_id,organization_id) VALUES('scope.test.mismatch','scope.mismatch@example.invalid','test','OPERATOR',p,'10000000-0000-0000-0000-000000000002');
  RAISE EXCEPTION 'FAILED: mismatched organization was accepted';
 EXCEPTION WHEN foreign_key_violation THEN NULL; END;
 BEGIN
  INSERT INTO users(username,email,password_hash,role,plant_id,organization_id) VALUES('scope.test.global','scope.global@example.invalid','test','SUPER_ADMIN',p,o);
  RAISE EXCEPTION 'FAILED: plant-assigned global account was accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
  INSERT INTO users(username,email,password_hash,role,plant_id,organization_id) VALUES('ADMIN','scope.uppercase@example.invalid','test','ADMIN',p,o);
  RAISE EXCEPTION 'FAILED: uppercase duplicate username was accepted';
 EXCEPTION WHEN check_violation OR unique_violation THEN NULL; END;
 INSERT INTO users(username,email,password_hash,role,plant_id,organization_id) VALUES('scope.test.valid','scope.valid@example.invalid','test','OPERATOR',p,o);
 IF EXISTS(SELECT 1 FROM work_orders WHERE plant_id IS NULL) THEN RAISE EXCEPTION 'FAILED: unresolved work orders remain'; END IF;
 RAISE NOTICE 'PASS: missing scope, organization mismatch, global scope, username normalization, valid account, and work-order ownership';
END $$;
ROLLBACK;
