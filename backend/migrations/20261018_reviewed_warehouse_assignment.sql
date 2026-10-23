-- User-reviewed mapping: WH-RAW becomes WH-AUT; WH-WIP and WH-FG stay unassigned.
BEGIN;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM plants WHERE id='a0000000-0001-1111-1111-111111111111' AND code='AUTO-PLANT-01') THEN
  RAISE EXCEPTION 'Reviewed automotive plant identity does not match this database';
 END IF;
 IF EXISTS(SELECT 1 FROM warehouses WHERE code='WH-RAW') AND EXISTS(SELECT 1 FROM warehouses WHERE code='WH-AUT') THEN
  RAISE EXCEPTION 'Both warehouse codes exist; resolve duplicate before migration';
 END IF;
END $$;
UPDATE warehouses SET code='WH-AUT',plant_id='a0000000-0001-1111-1111-111111111111' WHERE code IN ('WH-RAW','WH-AUT');
UPDATE warehouses SET plant_id=NULL WHERE code IN ('WH-WIP','WH-FG');
INSERT INTO operational_migrations(version) VALUES('20261018_reviewed_warehouse_assignment') ON CONFLICT DO NOTHING;
COMMIT;
