-- Migration: 2D QR Code Integration & Raw Material Pedigree
-- Adds QR code tracking, heat numbers, and enhanced traceability metadata

-- 1. Add QR code and container columns to dispensing_records
ALTER TABLE dispensing_records ADD COLUMN IF NOT EXISTS qr_code_data TEXT;
ALTER TABLE dispensing_records ADD COLUMN IF NOT EXISTS container_id VARCHAR(100);

-- 2. Add heat_number to material_batches
ALTER TABLE material_batches ADD COLUMN IF NOT EXISTS heat_number VARCHAR(100);

-- 3. Add po_number and coa_status to goods_receipts
ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS po_number VARCHAR(100) DEFAULT 'PO-PUR-9901';
ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS coa_status VARCHAR(50) DEFAULT 'APPROVED';

-- 4. Seed / Update raw material batches with heat numbers and QR metadata
UPDATE material_batches 
SET heat_number = 'HEAT-88412-A' 
WHERE batch_number = 'EN8-260901' OR batch_number = 'LOT-001';

UPDATE material_batches 
SET heat_number = 'HEAT-AL-5521' 
WHERE batch_number = 'AL-260901' OR batch_number = 'LOT-002';

UPDATE material_batches 
SET heat_number = 'LOT-POLY-992' 
WHERE batch_number = 'NBR-260901' OR batch_number = 'LOT-003';

UPDATE material_batches 
SET heat_number = 'HEAT-SS-316L-09' 
WHERE batch_number = 'LOT-004';

-- 5. Ensure dispensing_records have QR metadata populated for automotive order PO-260001
UPDATE dispensing_records
SET qr_code_data = '{"type":"RAW_MATERIAL","sku":"RM-ST-001","lot":"EN8-260901","heat":"HEAT-88412-A","vendor":"SUP-001","qty":448,"uom":"KG"}',
    container_id = 'CONT-DRUM-01'
WHERE work_order_id = '80111111-0003-1111-1111-111111111111' OR requested_quantity = 450;
