-- PREPARED ONLY: not part of the automatic migration runner.
-- Warehouse stock totals are authoritative per the user's reconciliation decision.
BEGIN;
-- Maintenance-only table locks also prevent newly inserted inventory from changing sums.
LOCK TABLE material_batches IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE material_inventory IN SHARE ROW EXCLUSIVE MODE;
CREATE TEMP TABLE reviewed_balance_corrections (
  batch_id uuid PRIMARY KEY, batch_number text, expected_before numeric, expected_after numeric
) ON COMMIT DROP;
INSERT INTO reviewed_balance_corrections VALUES
('b1111111-0001-1111-1111-111111111111','EN8-260901',1000,4550),
('b1111111-0002-1111-1111-111111111111','HT-260901',1000,2500),
('b1111111-0003-1111-1111-111111111111','RS-260901',1000,1120),
('b1111111-0004-1111-1111-111111111111','PIN-260901',1000,800),
('b1111111-0005-1111-1111-111111111111','FG-260901',945,0),
('b1111111-0006-1111-1111-111111111111','FG-260901-001',1,0),
('b1111111-0007-1111-1111-111111111111','HT-260901-001',1,0),
('b1111111-0008-1111-1111-111111111111','PIN-260901-001',1,0);
CREATE TABLE IF NOT EXISTS inventory_balance_reconciliation_audit (
  reconciliation_id text NOT NULL,
  batch_id uuid NOT NULL,
  batch_number text NOT NULL,
  previous_batch_quantity numeric NOT NULL,
  corrected_batch_quantity numeric NOT NULL,
  basis text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  database_actor text NOT NULL DEFAULT current_user,
  PRIMARY KEY (reconciliation_id,batch_id)
);
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM inventory_balance_reconciliation_audit
             WHERE reconciliation_id='20261018-warehouse-stock-authoritative') THEN
    RAISE EXCEPTION 'Reconciliation already applied; do not apply twice';
  END IF;
  IF EXISTS (
    SELECT 1 FROM reviewed_balance_corrections c
    LEFT JOIN material_batches b ON b.id=c.batch_id
    WHERE b.id IS NULL OR b.batch_number<>c.batch_number
       OR b.quantity<>c.expected_before
       OR COALESCE((SELECT sum(i.quantity) FROM material_inventory i
                    WHERE i.material_batch_id=c.batch_id),0)<>c.expected_after
  ) THEN
    RAISE EXCEPTION 'Balances changed since review; refresh the reconciliation proposal';
  END IF;
  IF EXISTS (SELECT 1 FROM material_inventory i JOIN reviewed_balance_corrections c
             ON c.batch_id=i.material_batch_id
             WHERE i.quantity<0 OR i.allocated_quantity<0 OR i.allocated_quantity>i.quantity) THEN
    RAISE EXCEPTION 'Invalid inventory or allocation requires separate reconciliation';
  END IF;
END $$;
INSERT INTO inventory_balance_reconciliation_audit
  (reconciliation_id,batch_id,batch_number,previous_batch_quantity,corrected_batch_quantity,basis)
SELECT '20261018-warehouse-stock-authoritative',batch_id,batch_number,expected_before,expected_after,
       'User-directed reconciliation to warehouse stock totals; no physical inventory movement'
FROM reviewed_balance_corrections;
UPDATE material_batches b SET quantity=c.expected_after
FROM reviewed_balance_corrections c WHERE b.id=c.batch_id;
COMMIT;
