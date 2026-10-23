-- ==============================================================================
-- UGAM MES - AUTOMOTIVE OPERATIONAL & MASTER DATA POPULATION
-- Tables: EQUIPMENT_MASTER (with MACHINE_MASTER view), QUALITY_CHARACTERISTIC,
--         PRODUCTION_ORDER, PRODUCTION_CONFIRMATION, MATERIAL_CONSUMPTION,
--         QUALITY_RESULT, PROCESS_PARAMETER, GENEALOGY
-- Plus synchronization into standard MES core tables.
-- ==============================================================================

-- 1. EQUIPMENT MASTER
DROP VIEW IF EXISTS machine_master CASCADE;
DROP TABLE IF EXISTS equipment_master CASCADE;

CREATE TABLE equipment_master (
    equipment_id VARCHAR(50) PRIMARY KEY,
    equipment_name VARCHAR(255) NOT NULL,
    work_center VARCHAR(100) NOT NULL,
    equipment_type VARCHAR(100) NOT NULL,
    manufacturer VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    capacity_per_shift INTEGER NOT NULL,
    oee_applicable VARCHAR(10) NOT NULL DEFAULT 'Y',
    status VARCHAR(50) NOT NULL DEFAULT 'RUNNING'
);

CREATE OR REPLACE VIEW machine_master AS
SELECT 
    equipment_id AS machine_id,
    equipment_name AS machine_name,
    work_center,
    equipment_type AS machine_type,
    manufacturer,
    model,
    capacity_per_shift,
    oee_applicable,
    status
FROM equipment_master;

INSERT INTO equipment_master (equipment_id, equipment_name, work_center, equipment_type, manufacturer, model, capacity_per_shift, oee_applicable, status) VALUES
('CUT-01', 'Automatic Bar Cutter 01', 'WC-CUT', 'CUTTING', 'OEM-A', 'ABC-250', 1200, 'Y', 'RUNNING'),
('CNC-01', 'CNC Turning Center 01', 'WC-CNC', 'CNC_LATHE', 'OEM-B', 'CT-500', 500, 'Y', 'RUNNING'),
('DBR-01', 'Deburring Machine 01', 'WC-DBR', 'DEBURRING', 'OEM-C', 'DB-100', 1000, 'Y', 'RUNNING'),
('HT-01', 'Heat Treatment Furnace 01', 'WC-HT', 'FURNACE', 'OEM-D', 'HTF-1000', 300, 'Y', 'RUNNING'),
('RM-01', 'Rubber Moulding Machine 01', 'WC-RM', 'PRESS', 'OEM-E', 'RM-250', 600, 'Y', 'RUNNING'),
('ASM-01', 'Assembly Station 01', 'WC-ASM', 'ASSEMBLY', 'INTERNAL', 'ASM-01', 400, 'Y', 'RUNNING');

-- 2. QUALITY CHARACTERISTIC
DROP TABLE IF EXISTS quality_characteristic CASCADE;
CREATE TABLE quality_characteristic (
    characteristic_code VARCHAR(50) PRIMARY KEY,
    characteristic_name VARCHAR(255) NOT NULL,
    data_type VARCHAR(50) NOT NULL,
    uom VARCHAR(20) NOT NULL,
    lower_limit DECIMAL(12, 4) NOT NULL,
    upper_limit DECIMAL(12, 4) NOT NULL,
    inspection_method VARCHAR(100) NOT NULL
);

INSERT INTO quality_characteristic (characteristic_code, characteristic_name, data_type, uom, lower_limit, upper_limit, inspection_method) VALUES
('CH-DIA', 'Diameter', 'DECIMAL', 'MM', 24.95, 25.00, 'Vernier'),
('CH-LEN', 'Length', 'DECIMAL', 'MM', 79.90, 80.10, 'Micrometer'),
('CH-HRC', 'Hardness', 'DECIMAL', 'HRC', 45.00, 50.00, 'Hardness Tester'),
('CH-LOAD', 'Functional Load', 'DECIMAL', 'N', 480.00, 520.00, 'Load Tester'),
('CH-VIS', 'Visual Defect', 'BOOLEAN', 'NA', 0.00, 0.00, 'Visual');

-- 3. PRODUCTION ORDER
DROP TABLE IF EXISTS production_order CASCADE;
CREATE TABLE production_order (
    production_order VARCHAR(50) PRIMARY KEY,
    material_code VARCHAR(100) NOT NULL,
    order_qty DECIMAL(12, 4) NOT NULL,
    uom VARCHAR(20) NOT NULL,
    planned_start DATE NOT NULL,
    planned_end DATE NOT NULL,
    routing_id VARCHAR(50) NOT NULL,
    priority VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL
);

INSERT INTO production_order (production_order, material_code, order_qty, uom, planned_start, planned_end, routing_id, priority, status) VALUES
('PO-260001', 'FG-001', 5000, 'PCS', '2026-09-09', '2026-09-11', 'RT-004', 'HIGH', 'RELEASED'),
('PO-260002', 'FG-002', 3000, 'PCS', '2026-09-09', '2026-09-10', 'RT-005', 'NORMAL', 'RELEASED'),
('PO-260003', 'INT-001', 8000, 'PCS', '2026-09-09', '2026-09-10', 'RT-001', 'HIGH', 'IN_PROCESS');

-- 4. PRODUCTION CONFIRMATION
DROP TABLE IF EXISTS production_confirmation CASCADE;
CREATE TABLE production_confirmation (
    confirmation_id VARCHAR(50) PRIMARY KEY,
    production_order VARCHAR(50) NOT NULL,
    operation_no INTEGER NOT NULL,
    machine_id VARCHAR(50) NOT NULL,
    input_qty DECIMAL(12, 4) NOT NULL,
    good_qty DECIMAL(12, 4) NOT NULL,
    reject_qty DECIMAL(12, 4) NOT NULL,
    rework_qty DECIMAL(12, 4) NOT NULL,
    operator_id VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP NOT NULL
);

INSERT INTO production_confirmation (confirmation_id, production_order, operation_no, machine_id, input_qty, good_qty, reject_qty, rework_qty, operator_id, timestamp) VALUES
('PC-001', 'PO-260003', 10, 'CUT-01', 1000, 980, 15, 5, 'OP-101', '2026-09-09 10:00:00'),
('PC-002', 'PO-260003', 20, 'CNC-01', 980, 960, 12, 8, 'OP-102', '2026-09-09 14:00:00'),
('PC-003', 'PO-260003', 30, 'DBR-01', 960, 950, 7, 3, 'OP-103', '2026-09-09 15:30:00');

-- 5. MATERIAL CONSUMPTION
DROP TABLE IF EXISTS material_consumption CASCADE;
CREATE TABLE material_consumption (
    consumption_id VARCHAR(50) PRIMARY KEY,
    production_order VARCHAR(50) NOT NULL,
    operation_no INTEGER NOT NULL,
    material_code VARCHAR(100) NOT NULL,
    batch_no VARCHAR(100) NOT NULL,
    planned_qty DECIMAL(12, 4) NOT NULL,
    actual_qty DECIMAL(12, 4) NOT NULL,
    uom VARCHAR(20) NOT NULL,
    timestamp TIMESTAMP NOT NULL
);

INSERT INTO material_consumption (consumption_id, production_order, operation_no, material_code, batch_no, planned_qty, actual_qty, uom, timestamp) VALUES
('MC-001', 'PO-260003', 10, 'RM-ST-001', 'EN8-260901', 450, 448, 'KG', '2026-09-09 08:15:00'),
('MC-002', 'PO-260001', 30, 'INT-002', 'HT-260901', 950, 945, 'PCS', '2026-09-09 16:10:00'),
('MC-003', 'PO-260002', 20, 'INT-003', 'RS-260901', 500, 495, 'PCS', '2026-09-09 17:00:00');

-- 6. QUALITY RESULT
DROP TABLE IF EXISTS quality_result CASCADE;
CREATE TABLE quality_result (
    inspection_id VARCHAR(50) PRIMARY KEY,
    production_order VARCHAR(50) NOT NULL,
    material_code VARCHAR(100) NOT NULL,
    batch_no VARCHAR(100) NOT NULL,
    operation_no INTEGER NOT NULL,
    characteristic VARCHAR(100) NOT NULL,
    actual_value DECIMAL(12, 4) NOT NULL,
    result VARCHAR(50) NOT NULL,
    inspector_id VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP NOT NULL
);

INSERT INTO quality_result (inspection_id, production_order, material_code, batch_no, operation_no, characteristic, actual_value, result, inspector_id, timestamp) VALUES
('INSP-001', 'PO-260003', 'INT-001', 'PIN-260901', 20, 'Diameter', 24.98, 'PASS', 'QC-01', '2026-09-09 11:00:00'),
('INSP-002', 'PO-260003', 'INT-001', 'PIN-260901', 20, 'Length', 80.04, 'PASS', 'QC-01', '2026-09-09 11:02:00'),
('INSP-003', 'PO-260003', 'INT-002', 'HT-260901', 10, 'Hardness', 47.20, 'PASS', 'QC-02', '2026-09-09 15:00:00'),
('INSP-004', 'PO-260001', 'FG-001', 'FG-260901', 20, 'Functional Load', 492.00, 'PASS', 'QC-03', '2026-09-09 17:45:00');

-- 7. PROCESS PARAMETER
DROP TABLE IF EXISTS process_parameter CASCADE;
CREATE TABLE process_parameter (
    parameter_id VARCHAR(50) PRIMARY KEY,
    production_order VARCHAR(50) NOT NULL,
    operation_no INTEGER NOT NULL,
    machine_id VARCHAR(50) NOT NULL,
    parameter VARCHAR(100) NOT NULL,
    target_value DECIMAL(12, 4) NOT NULL,
    actual_value DECIMAL(12, 4) NOT NULL,
    uom VARCHAR(20) NOT NULL,
    result VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP NOT NULL
);

INSERT INTO process_parameter (parameter_id, production_order, operation_no, machine_id, parameter, target_value, actual_value, uom, result, timestamp) VALUES
('PP-001', 'PO-260003', 20, 'CNC-01', 'Spindle Speed', 2500, 2480, 'RPM', 'PASS', '2026-09-09 10:30:00'),
('PP-002', 'PO-260003', 20, 'CNC-01', 'Feed Rate', 0.1500, 0.1480, 'MM/REV', 'PASS', '2026-09-09 10:30:00'),
('PP-003', 'PO-260003', 20, 'CNC-01', 'Coolant Temp', 22.0000, 23.0000, 'C', 'PASS', '2026-09-09 10:30:00'),
('PP-004', 'PO-260003', 10, 'HT-01', 'Furnace Temp', 850.0000, 852.0000, 'C', 'PASS', '2026-09-09 14:30:00');

-- 8. GENEALOGY
DROP TABLE IF EXISTS genealogy CASCADE;
CREATE TABLE genealogy (
    genealogy_id VARCHAR(50) PRIMARY KEY,
    parent_batch_serial VARCHAR(100) NOT NULL,
    parent_material VARCHAR(100) NOT NULL,
    child_batch_serial VARCHAR(100) NOT NULL,
    child_material VARCHAR(100) NOT NULL,
    relationship VARCHAR(100) NOT NULL,
    operation_no INTEGER NOT NULL,
    machine_id VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP NOT NULL
);

INSERT INTO genealogy (genealogy_id, parent_batch_serial, parent_material, child_batch_serial, child_material, relationship, operation_no, machine_id, timestamp) VALUES
('GEN-001', 'FG-260901-001', 'FG-001', 'HT-260901-001', 'INT-002', 'CONSUMED_FROM', 30, 'ASM-01', '2026-09-09 16:10:00'),
('GEN-002', 'HT-260901-001', 'INT-002', 'PIN-260901-001', 'INT-001', 'PRODUCED_FROM', 10, 'HT-01', '2026-09-09 15:00:00'),
('GEN-003', 'PIN-260901-001', 'INT-001', 'EN8-260901', 'RM-ST-001', 'CONSUMED_FROM', 20, 'CNC-01', '2026-09-09 10:20:00');

-- ==============================================================================
-- SYNCHRONIZE WITH STANDARD CORE UGAM MES RELATIONS
-- ==============================================================================

-- Sync machines
UPDATE machines SET name = 'Automatic Bar Cutter 01 (CUT-01)', status = 'RUNNING' WHERE code = 'CUT-01';
UPDATE machines SET name = 'CNC Turning Center 01 (CNC-01)', status = 'RUNNING' WHERE code = 'CNC-01';
UPDATE machines SET name = 'Deburring Machine 01 (DBR-01)', status = 'RUNNING' WHERE code = 'DBR-01';
UPDATE machines SET name = 'Heat Treatment Furnace 01 (HT-01)', status = 'RUNNING' WHERE code = 'HT-01';
UPDATE machines SET name = 'Rubber Moulding Machine 01 (RM-01)', status = 'RUNNING' WHERE code = 'RM-01';
UPDATE machines SET name = 'Assembly Station 01 (ASM-01)', status = 'RUNNING' WHERE code = 'ASM-01';
UPDATE machines SET status = 'RUNNING' WHERE status = 'IDLE';

-- Sync work_orders (clean update or insert)
INSERT INTO work_orders (id, wo_number, product_id, target_quantity, completed_quantity, scrap_quantity, planned_start, planned_end, status, created_by) VALUES
('80111111-0001-1111-1111-111111111111', 'PO-260001', '30111111-0004-1111-1111-111111111111', 5000, 945, 5, '2026-09-09 08:00:00+00', '2026-09-11 18:00:00+00', 'RELEASED', '22222222-2222-2222-2222-222222222222')
ON CONFLICT (id) DO UPDATE SET 
    wo_number = EXCLUDED.wo_number,
    product_id = EXCLUDED.product_id,
    target_quantity = EXCLUDED.target_quantity,
    completed_quantity = EXCLUDED.completed_quantity,
    scrap_quantity = EXCLUDED.scrap_quantity,
    planned_start = EXCLUDED.planned_start,
    planned_end = EXCLUDED.planned_end,
    status = EXCLUDED.status;

INSERT INTO work_orders (id, wo_number, product_id, target_quantity, completed_quantity, scrap_quantity, planned_start, planned_end, status, created_by) VALUES
('80111111-0002-1111-1111-111111111111', 'PO-260002', '30111111-0005-1111-1111-111111111111', 3000, 495, 5, '2026-09-09 08:00:00+00', '2026-09-10 18:00:00+00', 'RELEASED', '22222222-2222-2222-2222-222222222222')
ON CONFLICT (id) DO UPDATE SET 
    wo_number = EXCLUDED.wo_number,
    product_id = EXCLUDED.product_id,
    target_quantity = EXCLUDED.target_quantity,
    completed_quantity = EXCLUDED.completed_quantity,
    scrap_quantity = EXCLUDED.scrap_quantity,
    planned_start = EXCLUDED.planned_start,
    planned_end = EXCLUDED.planned_end,
    status = EXCLUDED.status;

INSERT INTO work_orders (id, wo_number, product_id, target_quantity, completed_quantity, scrap_quantity, planned_start, planned_end, status, created_by) VALUES
('80111111-0003-1111-1111-111111111111', 'PO-260003', '30111111-0001-1111-1111-111111111111', 8000, 950, 34, '2026-09-09 08:00:00+00', '2026-09-10 18:00:00+00', 'IN_PROGRESS', '22222222-2222-2222-2222-222222222222')
ON CONFLICT (id) DO UPDATE SET 
    wo_number = EXCLUDED.wo_number,
    product_id = EXCLUDED.product_id,
    target_quantity = EXCLUDED.target_quantity,
    completed_quantity = EXCLUDED.completed_quantity,
    scrap_quantity = EXCLUDED.scrap_quantity,
    planned_start = EXCLUDED.planned_start,
    planned_end = EXCLUDED.planned_end,
    status = EXCLUDED.status;

-- Sync material_batches (clean update or insert)
INSERT INTO material_batches (id, material_id, batch_number, supplier_batch, quantity, uom, manufacturing_date, expiry_date, status) VALUES
('b1111111-0001-1111-1111-111111111111', '10111111-0001-1111-1111-111111111111', 'EN8-260901', 'SUP-ST-8891', 1000.0000, 'KG', '2026-09-01', '2028-09-01', 'RELEASED')
ON CONFLICT (id) DO UPDATE SET 
    material_id = EXCLUDED.material_id,
    batch_number = EXCLUDED.batch_number,
    supplier_batch = EXCLUDED.supplier_batch,
    quantity = EXCLUDED.quantity,
    uom = EXCLUDED.uom;

INSERT INTO material_batches (id, material_id, batch_number, supplier_batch, quantity, uom, manufacturing_date, expiry_date, status) VALUES
('b1111111-0002-1111-1111-111111111111', '10111111-0006-1111-1111-111111111111', 'HT-260901', 'INTERNAL-HT-01', 1000.0000, 'PCS', '2026-09-09', '2027-09-09', 'RELEASED')
ON CONFLICT (id) DO UPDATE SET 
    material_id = EXCLUDED.material_id,
    batch_number = EXCLUDED.batch_number,
    supplier_batch = EXCLUDED.supplier_batch,
    quantity = EXCLUDED.quantity,
    uom = EXCLUDED.uom;

INSERT INTO material_batches (id, material_id, batch_number, supplier_batch, quantity, uom, manufacturing_date, expiry_date, status) VALUES
('b1111111-0003-1111-1111-111111111111', '10111111-0007-1111-1111-111111111111', 'RS-260901', 'INTERNAL-RM-01', 1000.0000, 'PCS', '2026-09-09', '2027-09-09', 'RELEASED')
ON CONFLICT (id) DO UPDATE SET 
    material_id = EXCLUDED.material_id,
    batch_number = EXCLUDED.batch_number,
    supplier_batch = EXCLUDED.supplier_batch,
    quantity = EXCLUDED.quantity,
    uom = EXCLUDED.uom;

INSERT INTO material_batches (id, material_id, batch_number, supplier_batch, quantity, uom, manufacturing_date, expiry_date, status) VALUES
('b1111111-0004-1111-1111-111111111111', '10111111-0005-1111-1111-111111111111', 'PIN-260901', 'INTERNAL-CNC-01', 1000.0000, 'PCS', '2026-09-09', '2027-09-09', 'RELEASED')
ON CONFLICT (id) DO UPDATE SET 
    material_id = EXCLUDED.material_id,
    batch_number = EXCLUDED.batch_number,
    supplier_batch = EXCLUDED.supplier_batch,
    quantity = EXCLUDED.quantity,
    uom = EXCLUDED.uom;

INSERT INTO material_batches (id, material_id, batch_number, supplier_batch, quantity, uom, manufacturing_date, expiry_date, status) VALUES
('b1111111-0005-1111-1111-111111111111', '10111111-0008-1111-1111-111111111111', 'FG-260901', 'ASM-LINE-01', 945.0000, 'PCS', '2026-09-09', '2031-09-09', 'RELEASED')
ON CONFLICT (id) DO UPDATE SET batch_number = EXCLUDED.batch_number, quantity = EXCLUDED.quantity;

INSERT INTO material_batches (id, material_id, batch_number, supplier_batch, quantity, uom, manufacturing_date, expiry_date, status) VALUES
('b1111111-0006-1111-1111-111111111111', '10111111-0008-1111-1111-111111111111', 'FG-260901-001', 'ASM-LINE-01-SN1', 1.0000, 'PCS', '2026-09-09', '2031-09-09', 'RELEASED')
ON CONFLICT (id) DO UPDATE SET batch_number = EXCLUDED.batch_number, quantity = EXCLUDED.quantity;

INSERT INTO material_batches (id, material_id, batch_number, supplier_batch, quantity, uom, manufacturing_date, expiry_date, status) VALUES
('b1111111-0007-1111-1111-111111111111', '10111111-0006-1111-1111-111111111111', 'HT-260901-001', 'HT-01-SN1', 1.0000, 'PCS', '2026-09-09', '2027-09-09', 'RELEASED')
ON CONFLICT (id) DO UPDATE SET batch_number = EXCLUDED.batch_number, quantity = EXCLUDED.quantity;

INSERT INTO material_batches (id, material_id, batch_number, supplier_batch, quantity, uom, manufacturing_date, expiry_date, status) VALUES
('b1111111-0008-1111-1111-111111111111', '10111111-0005-1111-1111-111111111111', 'PIN-260901-001', 'CNC-01-SN1', 1.0000, 'PCS', '2026-09-09', '2027-09-09', 'RELEASED')
ON CONFLICT (id) DO UPDATE SET batch_number = EXCLUDED.batch_number, quantity = EXCLUDED.quantity;

-- Sync storage_locations and inventory_balances
INSERT INTO storage_locations (id, code, area, rack, bin) VALUES
('60111111-0001-1111-1111-111111111111', 'LOC-RM-01', 'Raw Material Storage A', 'R-01', 'B-01')
ON CONFLICT (id) DO UPDATE SET code = EXCLUDED.code, area = EXCLUDED.area;

INSERT INTO storage_locations (id, code, area, rack, bin) VALUES
('60111111-0002-1111-1111-111111111111', 'LOC-WIP-01', 'WIP Stage Buffer', 'R-02', 'B-01')
ON CONFLICT (id) DO UPDATE SET code = EXCLUDED.code, area = EXCLUDED.area;

INSERT INTO storage_locations (id, code, area, rack, bin) VALUES
('60111111-0003-1111-1111-111111111111', 'LOC-FG-01', 'Finished Goods Bay', 'R-03', 'B-01')
ON CONFLICT (id) DO UPDATE SET code = EXCLUDED.code, area = EXCLUDED.area;

INSERT INTO inventory_balances (product_id, lot_number, quantity, wip_status, location_code) VALUES
('30111111-0004-1111-1111-111111111111', 'FG-260901-001', 1.0000, 'FINISHED', 'LOC-FG-01'),
('30111111-0004-1111-1111-111111111111', 'FG-260901', 945.0000, 'FINISHED', 'LOC-FG-01'),
('30111111-0005-1111-1111-111111111111', 'FG-260902', 495.0000, 'FINISHED', 'LOC-FG-01'),
('30111111-0002-1111-1111-111111111111', 'HT-260901', 55.0000, 'WIP', 'LOC-WIP-01'),
('30111111-0001-1111-1111-111111111111', 'PIN-260901', 950.0000, 'WIP', 'LOC-WIP-01')
ON CONFLICT (lot_number) DO UPDATE SET 
    quantity = EXCLUDED.quantity,
    wip_status = EXCLUDED.wip_status;

-- Sync dispensing_records
DELETE FROM dispensing_records;
INSERT INTO dispensing_records (work_order_id, material_batch_id, requested_quantity, dispensed_quantity, balance_quantity, weighing_records, operator_id, status) VALUES
('80111111-0003-1111-1111-111111111111', 'b1111111-0001-1111-1111-111111111111', 450.0000, 448.0000, 552.0000, '{"target": 450, "actual": 448, "scale": "SC-01"}', '44444444-4444-4444-4444-444444444444', 'VERIFIED'),
('80111111-0001-1111-1111-111111111111', 'b1111111-0002-1111-1111-111111111111', 950.0000, 945.0000, 55.0000, '{"target": 950, "actual": 945, "scale": "SC-02"}', '44444444-4444-4444-4444-444444444444', 'VERIFIED'),
('80111111-0002-1111-1111-111111111111', 'b1111111-0003-1111-1111-111111111111', 500.0000, 495.0000, 505.0000, '{"target": 500, "actual": 495, "scale": "SC-03"}', '44444444-4444-4444-4444-444444444444', 'VERIFIED');

-- Sync material_consumptions (plural)
DELETE FROM material_consumptions;
INSERT INTO material_consumptions (work_order_id, material_batch_id, planned_quantity, actual_quantity, variance, yield_impact) VALUES
('80111111-0003-1111-1111-111111111111', 'b1111111-0001-1111-1111-111111111111', 450.0000, 448.0000, -2.0000, 'NORMAL_TOLERANCE'),
('80111111-0001-1111-1111-111111111111', 'b1111111-0002-1111-1111-111111111111', 950.0000, 945.0000, -5.0000, 'NORMAL_TOLERANCE'),
('80111111-0002-1111-1111-111111111111', 'b1111111-0003-1111-1111-111111111111', 500.0000, 495.0000, -5.0000, 'NORMAL_TOLERANCE');

-- Sync production_logs
DELETE FROM production_logs;
INSERT INTO production_logs (work_order_id, machine_id, operator_id, count_good, count_scrap, timestamp) VALUES
('80111111-0003-1111-1111-111111111111', 'e1111111-0001-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 980, 15, '2026-09-09 10:00:00+00'),
('80111111-0003-1111-1111-111111111111', 'e1111111-0002-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 960, 12, '2026-09-09 14:00:00+00'),
('80111111-0003-1111-1111-111111111111', 'e1111111-0003-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 950, 7, '2026-09-09 15:30:00+00');

-- Sync quality_checks
DELETE FROM quality_checks;
INSERT INTO quality_checks (work_order_id, inspector_id, serial_number, check_parameters, status) VALUES
('80111111-0003-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'PIN-260901', '{"characteristic": "Diameter", "actual_value": 24.98, "uom": "MM", "lower_limit": 24.95, "upper_limit": 25.00, "result": "PASS", "method": "Vernier", "operation": 20}', 'PASSED'),
('80111111-0003-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'PIN-260901', '{"characteristic": "Length", "actual_value": 80.04, "uom": "MM", "lower_limit": 79.90, "upper_limit": 80.10, "result": "PASS", "method": "Micrometer", "operation": 20}', 'PASSED'),
('80111111-0003-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'HT-260901', '{"characteristic": "Hardness", "actual_value": 47.2, "uom": "HRC", "lower_limit": 45.00, "upper_limit": 50.00, "result": "PASS", "method": "Hardness Tester", "operation": 10}', 'PASSED'),
('80111111-0001-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'FG-260901', '{"characteristic": "Functional Load", "actual_value": 492, "uom": "N", "lower_limit": 480.00, "upper_limit": 520.00, "result": "PASS", "method": "Load Tester", "operation": 20}', 'PASSED');
