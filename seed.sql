-- DATA POPULATION
-- ==============================================================================

-- 1. SEED SYSTEM USERS
INSERT INTO users (id, username, email, password_hash, role, first_name, last_name, is_active) VALUES
('11111111-1111-1111-1111-111111111111', 'admin', 'himanee@ugamconsultancy.com', '$2b$10$SecretPasswordHashPlaceholderForTestingOnly12345', 'ADMIN', 'System', 'Administrator', true),
('22222222-2222-2222-2222-222222222222', 'manager', 'manager@ugamconsultancy.com', '$2b$10$SecretPasswordHashPlaceholderForTestingOnly12345', 'PRODUCTION_MANAGER', 'Production', 'Manager', true),
('33333333-3333-3333-3333-333333333333', 'supervisor', 'supervisor@ugamconsultancy.com', '$2b$10$SecretPasswordHashPlaceholderForTestingOnly12345', 'SUPERVISOR', 'Shopfloor', 'Supervisor', true),
('44444444-4444-4444-4444-444444444444', 'operator1', 'operator1@ugamconsultancy.com', '$2b$10$SecretPasswordHashPlaceholderForTestingOnly12345', 'OPERATOR', 'Line', 'Operator', true),
('55555555-5555-5555-5555-555555555555', 'quality1', 'quality1@ugamconsultancy.com', '$2b$10$SecretPasswordHashPlaceholderForTestingOnly12345', 'QUALITY_ENGINEER', 'Quality', 'Engineer', true);

-- 2. SEED UOMS & MATERIAL TYPES
INSERT INTO uoms (code, name) VALUES
('KG', 'Kilograms'),
('PCS', 'Pieces'),
('M', 'Meters'),
('L', 'Liters');

INSERT INTO material_types (code, description) VALUES
('RAW', 'Raw Materials (Bars, Rods, Coils, Compounds)'),
('INTERMEDIATE', 'Intermediate Components (Machined, Heat Treated, Molded)'),
('FINISHED', 'Finished Assembly Products (Control Pins, Hydraulic Seals)');

-- 3. SEED SUPPLIERS (Table 2: SUPPLIER_MASTER)
INSERT INTO supplier_master (supplier_code, supplier_name, material_group, country, quality_rating, approved) VALUES
('SUP-001', 'Steel Supplier A', 'STEEL', 'India', 95, 'Y'),
('SUP-002', 'Aluminium Supplier B', 'ALUMINIUM', 'India', 92, 'Y'),
('SUP-003', 'Rubber Supplier C', 'RUBBER', 'India', 90, 'Y'),
('SUP-004', 'Copper Supplier D', 'ELECTRICAL', 'India', 94, 'Y');

-- Also populate the vendors table for MES compatibility
INSERT INTO vendors (id, vendor_code, vendor_name, qualification_status, audit_date, contact_information) VALUES
('20111111-0001-1111-1111-111111111111', 'SUP-001', 'Steel Supplier A', 'QUALIFIED', '2026-01-15', 'India | Rating: 95 | Group: STEEL'),
('20111111-0002-1111-1111-111111111111', 'SUP-002', 'Aluminium Supplier B', 'QUALIFIED', '2026-01-20', 'India | Rating: 92 | Group: ALUMINIUM'),
('20111111-0003-1111-1111-111111111111', 'SUP-003', 'Rubber Supplier C', 'QUALIFIED', '2026-02-05', 'India | Rating: 90 | Group: RUBBER'),
('20111111-0004-1111-1111-111111111111', 'SUP-004', 'Copper Supplier D', 'QUALIFIED', '2026-02-10', 'India | Rating: 94 | Group: ELECTRICAL');

-- 4. SEED MATERIAL MASTER (Table 1: MATERIAL_MASTER)
INSERT INTO material_master (id, material_code, material_name, material_type, category, uom, manufacturer, vendor_id, shelf_life_days, storage_conditions, image_path, status) VALUES
('10111111-0001-1111-1111-111111111111', 'RM-ST-001', 'EN8 Steel Bar Ø25 mm', 'RAW', 'STEEL', 'KG', 'Steel Supplier A', '20111111-0001-1111-1111-111111111111', 730, 'EN8 / IS 5517', '/uploads/steel_bar_en8.jpg', 'ACTIVE'),
('10111111-0002-1111-1111-111111111111', 'RM-ST-002', 'Aluminium Rod Ø30 mm', 'RAW', 'ALUMINIUM', 'KG', 'Aluminium Supplier B', '20111111-0002-1111-1111-111111111111', 730, 'AA6061-T6', '/uploads/aluminium_rod.jpg', 'ACTIVE'),
('10111111-0003-1111-1111-111111111111', 'RM-ST-003', 'NBR Rubber Compound', 'RAW', 'RUBBER', 'KG', 'Rubber Supplier C', '20111111-0003-1111-1111-111111111111', 365, 'NBR 70 Shore A | Store < 25°C', '/uploads/nbr_rubber.jpg', 'ACTIVE'),
('10111111-0004-1111-1111-111111111111', 'RM-ST-004', 'Copper Wire 2.5 mm', 'RAW', 'ELECTRICAL', 'KG', 'Copper Supplier D', '20111111-0004-1111-1111-111111111111', 1095, 'Cu-ETP / IS 191', '/uploads/copper_wire.jpg', 'ACTIVE'),
('10111111-0005-1111-1111-111111111111', 'INT-001', 'Machined Steel Pin', 'INTERMEDIATE', 'MACHINED', 'PCS', 'In-House Machining', NULL, 365, 'EN8', '/uploads/machined_pin.jpg', 'ACTIVE'),
('10111111-0006-1111-1111-111111111111', 'INT-002', 'Heat Treated Pin', 'INTERMEDIATE', 'HEAT_TREATMENT', 'PCS', 'In-House Heat Treatment', NULL, 365, 'EN8 / 45-50 HRC', '/uploads/heat_treated_pin.jpg', 'ACTIVE'),
('10111111-0007-1111-1111-111111111111', 'INT-003', 'Rubber Seal', 'INTERMEDIATE', 'RUBBER_PART', 'PCS', 'In-House Moulding', NULL, 365, 'NBR 70 Shore A', '/uploads/rubber_seal.jpg', 'ACTIVE'),
('10111111-0008-1111-1111-111111111111', 'FG-001', 'Automotive Control Pin', 'FINISHED', 'AUTOMOTIVE', 'PCS', 'Ugam Automotive Assembly', NULL, 1825, 'Customer Spec DWG-CP-01', '/uploads/control_pin.jpg', 'ACTIVE'),
('10111111-0009-1111-1111-111111111111', 'FG-002', 'Hydraulic Seal Assembly', 'FINISHED', 'AUTOMOTIVE', 'PCS', 'Ugam Automotive Assembly', NULL, 1825, 'Customer Spec DWG-HS-02', '/uploads/hydraulic_seal.jpg', 'ACTIVE');

-- Products table for MES execution
INSERT INTO products (id, sku, name, description, uom) VALUES
('30111111-0001-1111-1111-111111111111', 'INT-001', 'Machined Steel Pin', 'Intermediate machined pin turned from EN8 steel rod', 'PCS'),
('30111111-0002-1111-1111-111111111111', 'INT-002', 'Heat Treated Pin', 'Intermediate induction-hardened EN8 steel pin (45-50 HRC)', 'PCS'),
('30111111-0003-1111-1111-111111111111', 'INT-003', 'Rubber Seal', 'Intermediate compression-molded NBR 70 rubber seal', 'PCS'),
('30111111-0004-1111-1111-111111111111', 'FG-001', 'Automotive Control Pin', 'Finished automotive control pin assembly', 'PCS'),
('30111111-0005-1111-1111-111111111111', 'FG-002', 'Hydraulic Seal Assembly', 'Finished high-pressure hydraulic seal assembly', 'PCS');

-- 5. SEED BOM HEADERS (Table 3: BOM_HEADER)
INSERT INTO bom_header (bom_id, parent_material, revision, effective_from, status) VALUES
('BOM-001', 'FG-001', 'A', '2026-01-01', 'RELEASED'),
('BOM-002', 'FG-002', 'A', '2026-01-01', 'RELEASED'),
('BOM-003', 'INT-001', 'A', '2026-01-01', 'RELEASED'),
('BOM-004', 'INT-002', 'A', '2026-01-01', 'RELEASED');

-- 6. SEED BOM COMPONENTS (Table 4: BOM_COMPONENT)
INSERT INTO bom_component (bom_id, line_no, parent_material, component_material, component_type, qty, uom) VALUES
('BOM-001', 10, 'FG-001', 'INT-002', 'INTERMEDIATE', 1.0000, 'PCS'),
('BOM-003', 10, 'INT-001', 'RM-ST-001', 'RAW', 0.4500, 'KG'),
('BOM-004', 10, 'INT-002', 'INT-001', 'INTERMEDIATE', 1.0000, 'PCS'),
('BOM-002', 10, 'FG-002', 'INT-003', 'INTERMEDIATE', 1.0000, 'PCS'),
('BOM-002', 20, 'FG-002', 'RM-ST-004', 'RAW', 0.0500, 'KG'),
('BOM-003', 20, 'INT-001', 'RM-ST-001', 'RAW', 0.0200, 'KG');

-- 7. SEED ROUTING HEADERS (Table 5: ROUTING_HEADER)
INSERT INTO routing_header (routing_id, material_code, revision, description, status) VALUES
('RT-001', 'INT-001', 'A', 'Steel Pin Machining', 'RELEASED'),
('RT-002', 'INT-002', 'A', 'Heat Treatment', 'RELEASED'),
('RT-003', 'INT-003', 'A', 'Rubber Moulding', 'RELEASED'),
('RT-004', 'FG-001', 'A', 'Control Pin Assembly', 'RELEASED'),
('RT-005', 'FG-002', 'A', 'Hydraulic Seal Assembly', 'RELEASED');

-- 8. SEED ROUTING OPERATIONS (Table 6: ROUTING_OPERATION)
INSERT INTO routing_operation (routing_id, operation_no, operation_code, operation_name, work_center, machine_code) VALUES
('RT-001', 10, 'CUT', 'Cutting', 'WC-CUT', 'CUT-01'),
('RT-001', 20, 'CNC', 'CNC Turning', 'WC-CNC', 'CNC-01'),
('RT-001', 30, 'DEBURR', 'Deburring', 'WC-DBR', 'DBR-01'),
('RT-002', 10, 'HT', 'Heat Treatment', 'WC-HT', 'HT-01'),
('RT-003', 10, 'MOULD', 'Rubber Moulding', 'WC-RM', 'RM-01'),
('RT-003', 20, 'VISUAL', 'Visual Inspection', 'WC-QC', 'QC-01'),
('RT-004', 10, 'ASSY', 'Component Assembly', 'WC-ASM', 'ASM-01'),
('RT-004', 20, 'TEST', 'Functional Test', 'WC-TEST', 'TEST-01'),
('RT-004', 30, 'FINAL', 'Final Inspection', 'WC-QC', 'QC-02'),
('RT-005', 10, 'ASSY', 'Component Assembly', 'WC-ASM', 'ASM-01'),
('RT-005', 20, 'TEST', 'Hydrostatic Test', 'WC-TEST', 'TEST-01'),
('RT-005', 30, 'FINAL', 'Final Inspection', 'WC-QC', 'QC-02');

-- 9. SEED PLANT, WORK CENTERS (AREAS), LINES & MACHINES
INSERT INTO plants (id, name, code, location) VALUES
('a0000000-0001-1111-1111-111111111111', 'Ugam Precision Automotive Plant', 'AUTO-PLANT-01', 'Pune, MH, India');

INSERT INTO areas (id, plant_id, name, code) VALUES
('a1111111-0001-1111-1111-111111111111', 'a0000000-0001-1111-1111-111111111111', 'Cutting Work Center', 'WC-CUT'),
('a1111111-0002-1111-1111-111111111111', 'a0000000-0001-1111-1111-111111111111', 'CNC Turning Work Center', 'WC-CNC'),
('a1111111-0003-1111-1111-111111111111', 'a0000000-0001-1111-1111-111111111111', 'Deburring Work Center', 'WC-DBR'),
('a1111111-0004-1111-1111-111111111111', 'a0000000-0001-1111-1111-111111111111', 'Heat Treatment Work Center', 'WC-HT'),
('a1111111-0005-1111-1111-111111111111', 'a0000000-0001-1111-1111-111111111111', 'Rubber Moulding Work Center', 'WC-RM'),
('a1111111-0006-1111-1111-111111111111', 'a0000000-0001-1111-1111-111111111111', 'Assembly Work Center', 'WC-ASM'),
('a1111111-0007-1111-1111-111111111111', 'a0000000-0001-1111-1111-111111111111', 'Testing Work Center', 'WC-TEST'),
('a1111111-0008-1111-1111-111111111111', 'a0000000-0001-1111-1111-111111111111', 'Quality Inspection Center', 'WC-QC');

INSERT INTO lines (id, area_id, name, code) VALUES
('40111111-0001-1111-1111-111111111111', 'a1111111-0002-1111-1111-111111111111', 'Machining Line 1', 'LINE-MACH-01'),
('40111111-0002-1111-1111-111111111111', 'a1111111-0005-1111-1111-111111111111', 'Moulding Line 1', 'LINE-MOULD-01'),
('40111111-0003-1111-1111-111111111111', 'a1111111-0006-1111-1111-111111111111', 'Automotive Assembly Line 1', 'LINE-ASSY-01');

-- Machines (CUT-01 through QC-02)
INSERT INTO machines (id, line_id, name, code, status) VALUES
('e1111111-0001-1111-1111-111111111111', '40111111-0001-1111-1111-111111111111', 'Band Saw Cutting Machine (CUT-01)', 'CUT-01', 'RUNNING'),
('e1111111-0002-1111-1111-111111111111', '40111111-0001-1111-1111-111111111111', 'CNC Turning Center (CNC-01)', 'CNC-01', 'RUNNING'),
('e1111111-0003-1111-1111-111111111111', '40111111-0001-1111-1111-111111111111', 'Rotary Deburring Machine (DBR-01)', 'DBR-01', 'IDLE'),
('e1111111-0004-1111-1111-111111111111', '40111111-0001-1111-1111-111111111111', 'Induction Heat Treatment Furnace (HT-01)', 'HT-01', 'RUNNING'),
('e1111111-0005-1111-1111-111111111111', '40111111-0002-1111-1111-111111111111', 'Hydraulic Rubber Moulding Press (RM-01)', 'RM-01', 'RUNNING'),
('e1111111-0006-1111-1111-111111111111', '40111111-0002-1111-1111-111111111111', 'Visual Optical Inspection Station (QC-01)', 'QC-01', 'IDLE'),
('e1111111-0007-1111-1111-111111111111', '40111111-0003-1111-1111-111111111111', 'Component Assembly Station (ASM-01)', 'ASM-01', 'RUNNING'),
('e1111111-0008-1111-1111-111111111111', '40111111-0003-1111-1111-111111111111', 'Functional Torque & Load Test Bench (TEST-01)', 'TEST-01', 'IDLE'),
('e1111111-0009-1111-1111-111111111111', '40111111-0003-1111-1111-111111111111', 'Coordinate Measuring Machine CMM (QC-02)', 'QC-02', 'IDLE');

-- 10. SEED BATCH RECIPES (Integrated MES Formula & Instructions)
INSERT INTO batch_recipes (id, product_id, recipe_code, recipe_name, version, master_formula, bom, process_instructions, planned_yield_pct, status) VALUES
-- Recipe for FG-001 (Automotive Control Pin)
('f1111111-0001-1111-1111-111111111111', '30111111-0004-1111-1111-111111111111', 'RT-004', 'Control Pin Assembly', 'A',
 'Assembly of heat treated EN8 steel pin into control housing with functional testing and final CMM inspection',
 '[{"line_no": 10, "component_code": "INT-002", "component_name": "Heat Treated Pin", "component_type": "INTERMEDIATE", "quantity": 1.0, "uom": "PCS"}]',
 '[
    {"step": 1, "operation_no": 10, "operation_code": "ASSY", "operation_name": "Component Assembly", "work_center": "WC-ASM", "machine_code": "ASM-01", "instruction": "Insert heat treated pin INT-002 into control pin fixture on ASM-01 press with 4.5 kN insertion load."},
    {"step": 2, "operation_no": 20, "operation_code": "TEST", "operation_name": "Functional Test", "work_center": "WC-TEST", "machine_code": "TEST-01", "instruction": "Perform 100% rotational torque actuation test (12 Nm ± 0.5 Nm) on TEST-01."},
    {"step": 3, "operation_no": 30, "operation_code": "FINAL", "operation_name": "Final Inspection", "work_center": "WC-QC", "machine_code": "QC-02", "instruction": "Measure outer pin diameter and concentricity on CMM QC-02 against DWG-CP-01."}
 ]',
 99.20, 'ACTIVE'),

-- Recipe for FG-002 (Hydraulic Seal Assembly)
('f1111111-0002-1111-1111-111111111111', '30111111-0005-1111-1111-111111111111', 'RT-005', 'Hydraulic Seal Assembly', 'A',
 'Assembly of NBR 70 rubber seal and copper retaining ring with hydrostatic pressure leak testing',
 '[
    {"line_no": 10, "component_code": "INT-003", "component_name": "Rubber Seal", "component_type": "INTERMEDIATE", "quantity": 1.0, "uom": "PCS"},
    {"line_no": 20, "component_code": "RM-ST-004", "component_name": "Copper Wire 2.5 mm", "component_type": "RAW", "quantity": 0.05, "uom": "KG"}
 ]',
 '[
    {"step": 1, "operation_no": 10, "operation_code": "ASSY", "operation_name": "Component Assembly", "work_center": "WC-ASM", "machine_code": "ASM-01", "instruction": "Form copper wire retaining ring and seat NBR rubber seal INT-003 on ASM-01."},
    {"step": 2, "operation_no": 20, "operation_code": "TEST", "operation_name": "Hydrostatic Test", "work_center": "WC-TEST", "machine_code": "TEST-01", "instruction": "Pressurize seal assembly to 250 bar hydrostatic pressure for 30 seconds on TEST-01."},
    {"step": 3, "operation_no": 30, "operation_code": "FINAL", "operation_name": "Final Inspection", "work_center": "WC-QC", "machine_code": "QC-02", "instruction": "Perform visual lip seal inspection and dimension verification on QC-02."}
 ]',
 98.80, 'ACTIVE'),

-- Recipe for INT-001 (Machined Steel Pin)
('f1111111-0003-1111-1111-111111111111', '30111111-0001-1111-1111-111111111111', 'RT-001', 'Steel Pin Machining', 'A',
 'Machining of EN8 steel bar stock into precision pin on CNC lathe and deburring',
 '[
    {"line_no": 10, "component_code": "RM-ST-001", "component_name": "EN8 Steel Bar Ø25 mm", "component_type": "RAW", "quantity": 0.45, "uom": "KG"},
    {"line_no": 20, "component_code": "RM-ST-001", "component_name": "EN8 Steel Bar (Scrap/Allowance)", "component_type": "RAW", "quantity": 0.02, "uom": "KG"}
 ]',
 '[
    {"step": 1, "operation_no": 10, "operation_code": "CUT", "operation_name": "Cutting", "work_center": "WC-CUT", "machine_code": "CUT-01", "instruction": "Cut EN8 steel bar Ø25 mm to length 120 mm ± 0.5 mm on CUT-01 band saw."},
    {"step": 2, "operation_no": 20, "operation_code": "CNC", "operation_name": "CNC Turning", "work_center": "WC-CNC", "machine_code": "CNC-01", "instruction": "Face, turn OD to 24.00 mm ± 0.02 mm, drill center, and chamfer on CNC-01 lathe."},
    {"step": 3, "operation_no": 30, "operation_code": "DEBURR", "operation_name": "Deburring", "work_center": "WC-DBR", "machine_code": "DBR-01", "instruction": "Tumble deburr machined pins in ceramic media on DBR-01 for 15 minutes."}
 ]',
 97.50, 'ACTIVE'),

-- Recipe for INT-002 (Heat Treated Pin)
('f1111111-0004-1111-1111-111111111111', '30111111-0002-1111-1111-111111111111', 'RT-002', 'Heat Treatment', 'A',
 'Induction case hardening and oil quenching of machined steel pins',
 '[{"line_no": 10, "component_code": "INT-001", "component_name": "Machined Steel Pin", "component_type": "INTERMEDIATE", "quantity": 1.0, "uom": "PCS"}]',
 '[
    {"step": 1, "operation_no": 10, "operation_code": "HT", "operation_name": "Heat Treatment", "work_center": "WC-HT", "machine_code": "HT-01", "instruction": "Induction harden at 860°C, polymer quench, and temper at 220°C to achieve 45-50 HRC surface hardness on HT-01."}
 ]',
 99.50, 'ACTIVE'),

-- Recipe for INT-003 (Rubber Seal)
('f1111111-0005-1111-1111-111111111111', '30111111-0003-1111-1111-111111111111', 'RT-003', 'Rubber Moulding', 'A',
 'Compression moulding and visual QA of NBR 70 Shore A rubber seals',
 '[{"line_no": 10, "component_code": "RM-ST-003", "component_name": "NBR Rubber Compound", "component_type": "RAW", "quantity": 0.08, "uom": "KG"}]',
 '[
    {"step": 1, "operation_no": 10, "operation_code": "MOULD", "operation_name": "Rubber Moulding", "work_center": "WC-RM", "machine_code": "RM-01", "instruction": "Compression mould rubber compound preform at 170°C, 150 bar for 4.5 minutes on RM-01."},
    {"step": 2, "operation_no": 20, "operation_code": "VISUAL", "operation_name": "Visual Inspection", "work_center": "WC-QC", "machine_code": "QC-01", "instruction": "Inspect seal lip profile for flashes, voids, and tears on optical station QC-01."}
 ]',
 98.00, 'ACTIVE');

-- 11. SEED WAREHOUSES & STORAGE BINS
INSERT INTO warehouses (id, code, name, location) VALUES
('50111111-0001-1111-1111-111111111111', 'WH-RAW', 'Raw Materials Central Warehouse', 'Building A - North Bay'),
('50111111-0002-1111-1111-111111111111', 'WH-WIP', 'WIP Intermediate Staging Store', 'Building A - Shopfloor Buffer'),
('50111111-0003-1111-1111-111111111111', 'WH-FG', 'Finished Goods Distribution Center', 'Building B - Shipping Logistics');

INSERT INTO storage_locations (id, warehouse_id, area, rack, bin, code) VALUES
('60111111-0001-1111-1111-111111111111', '50111111-0001-1111-1111-111111111111', 'RAW_STEEL', 'RACK-01', 'BIN-01', 'WH-RAW-ST-01'),
('60111111-0002-1111-1111-111111111111', '50111111-0001-1111-1111-111111111111', 'RAW_ALUMINIUM', 'RACK-02', 'BIN-01', 'WH-RAW-AL-01'),
('60111111-0003-1111-1111-111111111111', '50111111-0001-1111-1111-111111111111', 'RAW_RUBBER', 'RACK-03', 'BIN-01', 'WH-RAW-RB-01'),
('60111111-0004-1111-1111-111111111111', '50111111-0001-1111-1111-111111111111', 'RAW_COPPER', 'RACK-04', 'BIN-01', 'WH-RAW-CU-01'),
('60111111-0005-1111-1111-111111111111', '50111111-0002-1111-1111-111111111111', 'WIP_MACHINED', 'RACK-01', 'BIN-01', 'WH-WIP-PIN-01'),
('60111111-0006-1111-1111-111111111111', '50111111-0003-1111-1111-111111111111', 'FG_AUTOMOTIVE', 'RACK-01', 'BIN-01', 'WH-FG-AUTO-01');

-- 12. SEED GOODS RECEIPTS, MATERIAL BATCHES & INVENTORY
INSERT INTO goods_receipts (id, grn_number, vendor_id, material_id, batch_number, quantity_received, manufacturing_date, expiry_date, status, received_by) VALUES
('70111111-0001-1111-1111-111111111111', 'GRN-2026-001', '20111111-0001-1111-1111-111111111111', '10111111-0001-1111-1111-111111111111', 'LOT-ST-260901', 5000.0000, '2026-08-15', '2028-08-15', 'RELEASED', '11111111-1111-1111-1111-111111111111'),
('70111111-0002-1111-1111-111111111111', 'GRN-2026-002', '20111111-0002-1111-1111-111111111111', '10111111-0002-1111-1111-111111111111', 'LOT-AL-260901', 2500.0000, '2026-08-20', '2028-08-20', 'RELEASED', '11111111-1111-1111-1111-111111111111'),
('70111111-0003-1111-1111-111111111111', 'GRN-2026-003', '20111111-0003-1111-1111-111111111111', '10111111-0003-1111-1111-111111111111', 'LOT-RB-260901', 1200.0000, '2026-08-25', '2027-08-25', 'RELEASED', '11111111-1111-1111-1111-111111111111'),
('70111111-0004-1111-1111-111111111111', 'GRN-2026-004', '20111111-0004-1111-1111-111111111111', '10111111-0004-1111-1111-111111111111', 'LOT-CU-260901', 850.0000, '2026-08-28', '2029-08-28', 'RELEASED', '11111111-1111-1111-1111-111111111111');

INSERT INTO material_batches (id, goods_receipt_id, material_id, batch_number, supplier_batch, quantity, uom, manufacturing_date, expiry_date, status) VALUES
('b1111111-0001-1111-1111-111111111111', '70111111-0001-1111-1111-111111111111', '10111111-0001-1111-1111-111111111111', 'LOT-ST-260901', 'SUP-A-HEAT-8841', 5000.0000, 'KG', '2026-08-15', '2028-08-15', 'RELEASED'),
('b1111111-0002-1111-1111-111111111111', '70111111-0002-1111-1111-111111111111', '10111111-0002-1111-1111-111111111111', 'LOT-AL-260901', 'SUP-B-COIL-4412', 2500.0000, 'KG', '2026-08-20', '2028-08-20', 'RELEASED'),
('b1111111-0003-1111-1111-111111111111', '70111111-0003-1111-1111-111111111111', '10111111-0003-1111-1111-111111111111', 'LOT-RB-260901', 'SUP-C-BATCH-109', 1200.0000, 'KG', '2026-08-25', '2027-08-25', 'RELEASED'),
('b1111111-0004-1111-1111-111111111111', '70111111-0004-1111-1111-111111111111', '10111111-0004-1111-1111-111111111111', 'LOT-CU-260901', 'SUP-D-DRUM-991', 850.0000, 'KG', '2026-08-28', '2029-08-28', 'RELEASED');

INSERT INTO material_inventory (material_batch_id, storage_location_id, quantity, allocated_quantity) VALUES
('b1111111-0001-1111-1111-111111111111', '60111111-0001-1111-1111-111111111111', 4550.0000, 450.0000),
('b1111111-0002-1111-1111-111111111111', '60111111-0002-1111-1111-111111111111', 2500.0000, 0.0000),
('b1111111-0003-1111-1111-111111111111', '60111111-0003-1111-1111-111111111111', 1120.0000, 80.0000),
('b1111111-0004-1111-1111-111111111111', '60111111-0004-1111-1111-111111111111', 800.0000, 50.0000);

-- 13. SEED WORK ORDERS
INSERT INTO work_orders (id, wo_number, product_id, target_quantity, completed_quantity, scrap_quantity, planned_start, planned_end, actual_start, status, created_by) VALUES
-- WO 1: Automotive Control Pin (FG-001) - IN PROGRESS
('80111111-0001-1111-1111-111111111111', 'WO-2026-001', '30111111-0004-1111-1111-111111111111', 1000, 450, 6, '2026-09-08 08:00:00+00', '2026-09-12 17:00:00+00', '2026-09-08 08:30:00+00', 'IN_PROGRESS', '22222222-2222-2222-2222-222222222222'),
-- WO 2: Hydraulic Seal Assembly (FG-002) - RELEASED
('80111111-0002-1111-1111-111111111111', 'WO-2026-002', '30111111-0005-1111-1111-111111111111', 500, 0, 0, '2026-09-11 08:00:00+00', '2026-09-14 17:00:00+00', NULL, 'RELEASED', '22222222-2222-2222-2222-222222222222'),
-- WO 3: Machined Steel Pin (INT-001) - COMPLETED
('80111111-0003-1111-1111-111111111111', 'WO-2026-003', '30111111-0001-1111-1111-111111111111', 1500, 1485, 15, '2026-09-01 08:00:00+00', '2026-09-05 17:00:00+00', '2026-09-01 08:15:00+00', 'COMPLETED', '22222222-2222-2222-2222-222222222222');

-- 14. SEED EQUIPMENT CALIBRATIONS & QUALIFICATIONS
INSERT INTO equipment_calibrations (id, machine_id, calibration_date, next_calibration_due, calibrated_by, certificate_number, status) VALUES
('c1111111-0001-1111-1111-111111111111', 'e1111111-0001-1111-1111-111111111111', '2026-06-15', '2027-06-15', 'Apex Metrology Services', 'CAL-CUT-01-2026', 'PASSED'),
('c1111111-0002-1111-1111-111111111111', 'e1111111-0002-1111-1111-111111111111', '2026-05-10', '2027-05-10', 'Apex Metrology Services', 'CAL-CNC-01-2026', 'PASSED'),
('c1111111-0003-1111-1111-111111111111', 'e1111111-0003-1111-1111-111111111111', '2026-07-01', '2027-07-01', 'Apex Metrology Services', 'CAL-DBR-01-2026', 'PASSED'),
('c1111111-0004-1111-1111-111111111111', 'e1111111-0004-1111-1111-111111111111', '2026-07-15', '2027-07-15', 'Apex Metrology Services', 'CAL-HT-01-2026', 'PASSED'),
('c1111111-0005-1111-1111-111111111111', 'e1111111-0005-1111-1111-111111111111', '2026-06-20', '2027-06-20', 'Apex Metrology Services', 'CAL-RM-01-2026', 'PASSED'),
('c1111111-0006-1111-1111-111111111111', 'e1111111-0006-1111-1111-111111111111', '2026-04-12', '2027-04-12', 'Zeiss Metrology India', 'CAL-QC-01-2026', 'PASSED'),
('c1111111-0007-1111-1111-111111111111', 'e1111111-0007-1111-1111-111111111111', '2026-08-01', '2027-08-01', 'Apex Metrology Services', 'CAL-ASM-01-2026', 'PASSED'),
('c1111111-0008-1111-1111-111111111111', 'e1111111-0008-1111-1111-111111111111', '2026-05-25', '2027-05-25', 'Instron Calibration Corp', 'CAL-TEST-01-2026', 'PASSED'),
('c1111111-0009-1111-1111-111111111111', 'e1111111-0009-1111-1111-111111111111', '2026-06-01', '2027-06-01', 'Zeiss Metrology India', 'CAL-QC-02-2026', 'PASSED');

INSERT INTO equipment_qualifications (id, machine_id, qualification_type, qualification_date, expiry_date, performed_by, status, notes) VALUES
('90111111-0001-1111-1111-111111111111', 'e1111111-0002-1111-1111-111111111111', 'PQ', '2026-05-10', '2027-05-10', 'Lead Validation Engineer', 'COMPLETED', 'CNC Turning spindle runout < 0.003 mm and repeatability verified'),
('90111111-0002-1111-1111-111111111111', 'e1111111-0004-1111-1111-111111111111', 'PQ', '2026-07-15', '2027-07-15', 'Lead Metallurgist', 'COMPLETED', 'Induction furnace 860°C thermal uniformity and quench rate qualified'),
('90111111-0003-1111-1111-111111111111', 'e1111111-0009-1111-1111-111111111111', 'PQ', '2026-06-01', '2027-06-01', 'Quality Director', 'COMPLETED', 'CMM volumetric probing error verified with certified step gauge (MPEe < 1.2 um)');

-- 15. SEED DEVIATIONS & CAPAs
INSERT INTO deviations (id, work_order_id, title, description, severity, category, reported_by, status, investigation_details, root_cause, resolved_by) VALUES
('d1111111-0001-1111-1111-111111111111', '80111111-0001-1111-1111-111111111111',
 'CNC Turning Tool Wear Diameter Offset (+0.025 mm)',
 'In-process sampling on CNC-01 showed pin outer diameter drifting towards upper specification limit of 24.02 mm.',
 'MINOR', 'EQUIPMENT', '44444444-4444-4444-4444-444444444444', 'CLOSED',
 'Carbide turning insert DNMG 150408 experienced flank wear after machining 450 pins.',
 'Standard insert tool wear life reached. Auto-tool offset updated by -0.015 mm and insert index rotated.', '55555555-5555-5555-5555-555555555555'),

('d1111111-0002-1111-1111-111111111111', NULL,
 'Raw Material EN8 Steel Bar Heat Certificate Mismatch',
 'Inbound truck heat lot test certificate showed manganese percentage 0.72% vs specification 0.60-0.80% (acceptable but at low boundary).',
 'MINOR', 'MATERIAL', '33333333-3333-3333-3333-333333333333', 'CLOSED',
 'Spectrometric analysis confirmed Mn content at 0.74%. Material conforms to IS 5517 requirements.',
 'Third-party mill lab certificate clerical transcription error.', '55555555-5555-5555-5555-555555555555');

-- 16. SEED AUDIT LOGS
INSERT INTO audit_logs (user_id, action, target_table, target_id, new_values, ip_address) VALUES
('11111111-1111-1111-1111-111111111111', 'DATABASE_INITIALIZATION', 'ugam_mes', NULL, '{"domain": "Precision Automotive Discrete Manufacturing", "materials": 9, "suppliers": 4, "boms": 4, "routings": 5, "machines": 9}', '127.0.0.1');

-- Summary check output
SELECT 'UGAM MES Database Created & Populated Successfully!' AS status;


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
INSERT INTO work_orders (id, wo_number, product_id, target_quantity, completed_quantity, scrap_quantity, planned_start, planned_end, actual_start, status, created_by) VALUES
('80111111-0001-1111-1111-111111111111', 'WO-2026-001', '30111111-0004-1111-1111-111111111111', 5000, 2850, 32, '2026-09-26 08:00:00+00', '2026-09-28 17:00:00+00', '2026-09-26 08:15:00+00', 'IN_PROGRESS', '22222222-2222-2222-2222-222222222222')
ON CONFLICT (id) DO UPDATE SET 
    wo_number = EXCLUDED.wo_number,
    product_id = EXCLUDED.product_id,
    target_quantity = EXCLUDED.target_quantity,
    completed_quantity = EXCLUDED.completed_quantity,
    scrap_quantity = EXCLUDED.scrap_quantity,
    actual_start = EXCLUDED.actual_start,
    planned_start = EXCLUDED.planned_start,
    planned_end = EXCLUDED.planned_end,
    status = EXCLUDED.status;

INSERT INTO work_orders (id, wo_number, product_id, target_quantity, completed_quantity, scrap_quantity, planned_start, planned_end, status, created_by) VALUES
('80111111-0004-1111-1111-111111111111', 'WO-2026-004', '30111111-0004-1111-1111-111111111111', 3500, 0, 0, '2026-09-27 08:00:00+00', '2026-09-29 17:00:00+00', 'PLANNED', '22222222-2222-2222-2222-222222222222')
ON CONFLICT (id) DO UPDATE SET 
    wo_number = EXCLUDED.wo_number,
    status = EXCLUDED.status;

INSERT INTO work_orders (id, wo_number, product_id, target_quantity, completed_quantity, scrap_quantity, planned_start, planned_end, status, created_by) VALUES
('80111111-0005-1111-1111-111111111111', 'WO-2026-005', '30111111-0004-1111-1111-111111111111', 4000, 0, 0, '2026-09-28 08:00:00+00', '2026-09-30 17:00:00+00', 'RELEASED', '22222222-2222-2222-2222-222222222222')
ON CONFLICT (id) DO UPDATE SET 
    wo_number = EXCLUDED.wo_number,
    status = EXCLUDED.status;

INSERT INTO work_orders (id, wo_number, product_id, target_quantity, completed_quantity, scrap_quantity, planned_start, planned_end, actual_start, actual_end, status, created_by) VALUES
('80111111-0000-1111-1111-111111111111', 'WO-2026-000', '30111111-0004-1111-1111-111111111111', 5000, 4960, 40, '2026-09-24 08:00:00+00', '2026-09-25 17:00:00+00', '2026-09-24 08:10:00+00', '2026-09-25 16:45:00+00', 'COMPLETED', '22222222-2222-2222-2222-222222222222')
ON CONFLICT (id) DO UPDATE SET 
    wo_number = EXCLUDED.wo_number,
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

