-- Seed data for Vial Manufacturing and Packaging Plant

-- 1. Areas
INSERT INTO areas (id, plant_id, name, code) VALUES
('bbbbbbbb-b1b1-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Aseptic Vial Filling Cleanroom (Class A/ISO 5)', 'PHA-VIAL'),
('bbbbbbbb-b2b2-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Sterile Vial Packaging Area', 'PHA-VIAL-PKG')
ON CONFLICT (id) DO NOTHING;

-- 2. Lines
INSERT INTO lines (id, area_id, name, code) VALUES
('dddddddd-d1d1-1111-1111-111111111111', 'bbbbbbbb-b1b1-1111-1111-111111111111', 'Aseptic Filling Line 3', 'VIA-L3'),
('dddddddd-d2d2-1111-1111-111111111111', 'bbbbbbbb-b2b2-1111-1111-111111111111', 'Vial Labeling & Cartoning Line 3', 'VIA-PKG-L3')
ON CONFLICT (id) DO NOTHING;

-- 3. Machines
INSERT INTO machines (id, line_id, name, code, status) VALUES
('e1111111-1201-1111-1111-111111111111', 'dddddddd-d1d1-1111-1111-111111111111', 'Vial Washing Tunnel (Rotary)', 'VWM-01', 'RUNNING'),
('e1111111-1202-1111-1111-111111111111', 'dddddddd-d1d1-1111-1111-111111111111', 'Aseptic Filling & Stoppering Machine', 'VFM-01', 'RUNNING'),
('e1111111-1203-1111-1111-111111111111', 'dddddddd-d1d1-1111-1111-111111111111', 'Chamber Lyophilizer (Freeze Dryer)', 'LYO-01', 'IDLE'),
('e1111111-1204-1111-1111-111111111111', 'dddddddd-d1d1-1111-1111-111111111111', 'Vial Aluminum Cap Crimping Machine', 'VCM-01', 'RUNNING'),
('e1111111-1205-1111-1111-111111111111', 'dddddddd-d2d2-1111-1111-111111111111', 'High-Speed Vial Labeling Machine', 'VLM-01', 'RUNNING'),
('e1111111-1206-1111-1111-111111111111', 'dddddddd-d2d2-1111-1111-111111111111', 'Vial Cartoning & Case Packer', 'VCM-02', 'IDLE')
ON CONFLICT (id) DO NOTHING;

-- 4. Vendors
INSERT INTO vendors (id, vendor_code, vendor_name, qualification_status, audit_date, contact_information, approved_materials) VALUES
('20444444-4444-4444-4444-204444444444', 'VEND-04', 'Schott Pharmaceutical Glass', 'QUALIFIED', CURRENT_DATE - INTERVAL '150 days', 'Technical Sales, glass@schott.com', '["MAT-PKG-VIA10"]'),
('20555555-5555-5555-5555-205555555555', 'VEND-05', 'West Pharmaceutical Services', 'QUALIFIED', CURRENT_DATE - INTERVAL '80 days', 'Sales Support, pharma.closures@westpharma.com', '["MAT-PKG-STP20", "MAT-PKG-CAP20"]'),
('20666666-6666-6666-6666-206666666666', 'VEND-06', 'Aseptic BioAntigen Corp', 'QUALIFIED', CURRENT_DATE - INTERVAL '30 days', 'Medical Affairs, antigen-supply@bioantigen.com', '["MAT-API-VBG"]')
ON CONFLICT (id) DO NOTHING;

-- 5. Material Master
INSERT INTO material_master (id, material_code, material_name, material_type, category, uom, manufacturer, vendor_id, shelf_life_days, storage_conditions, status) VALUES
('10666666-6666-6666-6666-106666666666', 'MAT-PKG-VIA10', '10ml Tubular Clear Glass Vials (Type I)', 'PACKAGING', 'Containers', 'PCS', 'Schott Glass', '20444444-4444-4444-4444-204444444444', 1825, 'Store in cool, dry place. Protect from physical impact.', 'ACTIVE'),
('10777777-7777-7777-7777-107777777777', 'MAT-PKG-STP20', '20mm Chlorobutyl Rubber Stoppers (Sterile)', 'PACKAGING', 'Closures', 'PCS', 'West Pharmaceutical', '20555555-5555-5555-5555-205555555555', 1095, 'Store in sealed bags, protect from contamination.', 'ACTIVE'),
('10888888-8888-8888-8888-108888888888', 'MAT-PKG-CAP20', '20mm Flip-Off Aluminum Caps (Blue)', 'PACKAGING', 'Seals', 'PCS', 'West Pharmaceutical', '20555555-5555-5555-5555-205555555555', 1825, 'Store at room temperature.', 'ACTIVE'),
('10999999-9999-9999-9999-109999999999', 'MAT-API-VBG', 'Sterile Bio-Active Antigen Powder', 'API', 'Active Ingredients', 'G', 'Aseptic BioAntigen Corp', '20666666-6666-6666-6666-206666666666', 365, 'Deep freeze storage (-80°C to -60°C). Ultra cold chain.', 'ACTIVE'),
('10aaaaaa-aaaa-aaaa-aaaa-10aaaaaaaaaa', 'MAT-EXC-WFI', 'Sterile Water for Injection (WFI) USP', 'EXCIPIENT', 'Solvents', 'L', 'Ugam Tech On-Site Generation', NULL, 30, 'Store in heated circulating tank (80°C). Use within 24h of dispensing.', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

-- 6. Goods Receipts & Material Batches (Incoming Stocks)
INSERT INTO goods_receipts (id, grn_number, vendor_id, material_id, batch_number, quantity_received, manufacturing_date, expiry_date, coa_attachment, status) VALUES
('50333333-3333-3333-3333-503333333333', 'GRN-2026-0005', '20444444-4444-4444-4444-204444444444', '10666666-6666-6666-6666-106666666666', 'SCH-VIA10-502', 50000.0000, CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE + INTERVAL '1810 days', 'COA-SCH-VIA10.pdf', 'RELEASED'),
('50444444-4444-4444-4444-504444444444', 'GRN-2026-0006', '20555555-5555-5555-5555-205555555555', '10777777-7777-7777-7777-107777777777', 'WST-STP20-401', 50000.0000, CURRENT_DATE - INTERVAL '20 days', CURRENT_DATE + INTERVAL '1075 days', 'COA-WST-STP20.pdf', 'RELEASED'),
('50555555-5555-5555-5555-505555555555', 'GRN-2026-0007', '20555555-5555-5555-5555-205555555555', '10888888-8888-8888-8888-108888888888', 'WST-CAP20-802', 50000.0000, CURRENT_DATE - INTERVAL '20 days', CURRENT_DATE + INTERVAL '1805 days', 'COA-WST-CAP20.pdf', 'RELEASED'),
('50666666-6666-6666-6666-506666666666', 'GRN-2026-0008', '20666666-6666-6666-6666-206666666666', '10999999-9999-9999-9999-109999999999', 'BIO-VBG-109', 2000.0000, CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '355 days', 'COA-BIO-VBG109.pdf', 'RELEASED'),
('50777777-7777-7777-7777-507777777777', 'GRN-2026-0009', '20444444-4444-4444-4444-204444444444', '10aaaaaa-aaaa-aaaa-aaaa-10aaaaaaaaaa', 'WFI-ON-SITE-08', 500.0000, CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', 'COA-WFI-ONLINE.pdf', 'RELEASED')
ON CONFLICT (id) DO NOTHING;

INSERT INTO material_batches (id, goods_receipt_id, material_id, batch_number, supplier_batch, quantity, uom, manufacturing_date, expiry_date, status) VALUES
('b0555555-5555-5555-5555-b05555555555', '50333333-3333-3333-3333-503333333333', '10666666-6666-6666-6666-106666666666', 'LOT-VIA10-2026-01', 'SCH-VIA10-502', 50000.0000, 'PCS', CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE + INTERVAL '1810 days', 'RELEASED'),
('b0666666-6666-6666-6666-b06666666666', '50444444-4444-4444-4444-504444444444', '10777777-7777-7777-7777-107777777777', 'LOT-STP20-2026-01', 'WST-STP20-401', 50000.0000, 'PCS', CURRENT_DATE - INTERVAL '20 days', CURRENT_DATE + INTERVAL '1075 days', 'RELEASED'),
('b0777777-7777-7777-7777-b07777777777', '50555555-5555-5555-5555-505555555555', '10888888-8888-8888-8888-108888888888', 'LOT-CAP20-2026-01', 'WST-CAP20-802', 50000.0000, 'PCS', CURRENT_DATE - INTERVAL '20 days', CURRENT_DATE + INTERVAL '1805 days', 'RELEASED'),
('b0888888-8888-8888-8888-b08888888888', '50666666-6666-6666-6666-506666666666', '10999999-9999-9999-9999-109999999999', 'LOT-VBG-2026-01', 'BIO-VBG-109', 2000.0000, 'G', CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '355 days', 'RELEASED'),
('b0999999-9999-9999-9999-b09999999999', '50777777-7777-7777-7777-507777777777', '10aaaaaa-aaaa-aaaa-aaaa-10aaaaaaaaaa', 'LOT-WFI-2026-01', 'WFI-ON-SITE-08', 500.0000, 'L', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', 'RELEASED')
ON CONFLICT (id) DO NOTHING;

INSERT INTO material_inventory (id, material_batch_id, storage_location_id, quantity, allocated_quantity) VALUES
(gen_random_uuid(), 'b0555555-5555-5555-5555-b05555555555', '40111111-1111-1111-1111-111111111111', 50000.0000, 0.0000),
(gen_random_uuid(), 'b0666666-6666-6666-6666-b06666666666', '40111111-1111-1111-1111-111111111111', 50000.0000, 0.0000),
(gen_random_uuid(), 'b0777777-7777-7777-7777-b07777777777', '40111111-1111-1111-1111-111111111111', 50000.0000, 0.0000),
(gen_random_uuid(), 'b0888888-8888-8888-8888-b08888888888', '40111111-1111-1111-1111-111111111111', 2000.0000, 0.0000),
(gen_random_uuid(), 'b0999999-9999-9999-9999-b09999999999', '40111111-1111-1111-1111-111111111111', 500.0000, 0.0000)
ON CONFLICT (id) DO NOTHING;

-- 7. Products (SKUs)
INSERT INTO products (id, sku, name, description, uom) VALUES
('f5555555-5555-5555-5555-f55555555555', 'PH-VIA-VAC10', 'Ugam Multi-Dose Vaccine 10ml Injectable Vial', 'Sterile injectable multi-dose vaccine suspension', 'PCS'),
('f6666666-6666-6666-6666-f66666666666', 'PH-VIA-SAL05', 'Sterile Saline Injection 5ml Vial', 'Single-dose solvent solution for reconstitution', 'PCS')
ON CONFLICT (id) DO NOTHING;

-- 8. Batch Recipes
INSERT INTO batch_recipes (id, product_id, recipe_code, recipe_name, version, master_formula, bom, process_instructions, planned_yield_pct) VALUES
('60222222-2222-2222-2222-602222222222', 'f5555555-5555-5555-5555-f55555555555', 'REC-VAC-10', 'Ugam Sterile Vaccine 10ml Filling Recipe', 'v1.0', 
'Formulation for 1000 vials: Bio-Active Antigen Powder 100g, Sterile Water for Injection (WFI) 10.2L, 10ml Glass Vials 1000pcs, Stoppers 1000pcs, Aluminum Seals 1000pcs.', 
'[
  {"material_code": "MAT-API-VBG", "quantity": 0.1, "uom": "G", "purpose": "Active Antigen"},
  {"material_code": "MAT-EXC-WFI", "quantity": 0.0102, "uom": "L", "purpose": "Solvent"},
  {"material_code": "MAT-PKG-VIA10", "quantity": 1.0, "uom": "PCS", "purpose": "Type I Glass Container"},
  {"material_code": "MAT-PKG-STP20", "quantity": 1.0, "uom": "PCS", "purpose": "Sealing Stopper"},
  {"material_code": "MAT-PKG-CAP20", "quantity": 1.0, "uom": "PCS", "purpose": "Crimped Closure"}
]', 
'[
  {"step": 1, "operation": "Vial Washing & Depyrogenation", "instruction": "Feed glass vials through VWM-01 washer. Run depyrogenation tunnel bake at 320°C for 45 minutes to achieve a 3-log endotoxin reduction.", "critical_params": "Tunnel temperature 320°C, speed 4.5Hz"},
  {"step": 2, "operation": "Aseptic Formulation", "instruction": "Formulate batch by dissolving active antigen (MAT-API-VBG) in Water for Injection (MAT-EXC-WFI). Perform sterile filtration through dual 0.22 micron filters into sterile holding tank.", "critical_params": "pH 7.2 ± 0.2, filtration pressure < 2.2 bar"},
  {"step": 3, "operation": "Aseptic Filling & Stoppering", "instruction": "Fill 10.2ml of sterile suspension per vial under laminar air flow (Class A). Partially insert rubber stoppers (MAT-PKG-STP20) for lyophilization compatibility.", "critical_params": "Fill volume 10.2ml ± 0.1ml, check weights every 100 vials"},
  {"step": 4, "operation": "Lyophilization (Freeze Drying)", "instruction": "Load stoppers partially seated vials into LYO-01. Execute 36-hour freeze drying recipe. Collapse stoppers to fully seal the vials under vacuum at cycle end.", "critical_params": "Freezing -45°C, Chamber vacuum 0.05mbar, shelf heating ramp 1.5°C/h"},
  {"step": 5, "operation": "Aluminum Crimping & Sealing", "instruction": "Transfer lyophilized sealed vials to crimper VCM-01. Apply Flip-Off aluminum cap seals (MAT-PKG-CAP20).", "critical_params": "Crimping head pressure 120N, seal integrity test"},
  {"step": 6, "operation": "Labeling & Secondary Cartoning", "instruction": "Affix labels on VLM-01. Package 10 vials into secondary cartons with leaflet insert on VCM-02.", "critical_params": "Sealed carton height, barcode check"}
]', 98.80)
ON CONFLICT (id) DO NOTHING;

-- 9. Work Orders (Batches)
INSERT INTO work_orders (id, wo_number, product_id, target_quantity, completed_quantity, scrap_quantity, planned_start, planned_end, actual_start, status, created_by) VALUES
('70333333-3333-3333-3333-703333333333', 'BATCH-VAC-0001', 'f5555555-5555-5555-5555-f55555555555', 5000, 2450, 22, CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '2 days', CURRENT_DATE - INTERVAL '1 day', 'IN_PROGRESS', '22222222-2222-2222-2222-222222222222'),
('70444444-4444-4444-4444-704444444444', 'BATCH-VAC-0002', 'f5555555-5555-5555-5555-f55555555555', 10000, 0, 0, CURRENT_DATE + INTERVAL '4 days', CURRENT_DATE + INTERVAL '7 days', NULL, 'PLANNED', '22222222-2222-2222-2222-222222222222'),
('70555555-5555-5555-5555-705555555555', 'BATCH-SAL-0001', 'f6666666-6666-6666-6666-f66666666666', 8000, 8000, 15, CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE - INTERVAL '3 days', CURRENT_DATE - INTERVAL '5 days', 'COMPLETED', '22222222-2222-2222-2222-222222222222')
ON CONFLICT (id) DO NOTHING;

-- 10. Dispensing Records
INSERT INTO dispensing_records (id, work_order_id, material_batch_id, requested_quantity, dispensed_quantity, balance_quantity, weighing_records, operator_id, verifier_id, verified_at, signature_id, status) VALUES
(gen_random_uuid(), '70333333-3333-3333-3333-703333333333', 'b0888888-8888-8888-8888-b08888888888', 500.0000, 500.0000, 1500.0000, '{"scale_id": "SCALE-01", "tare_weight_g": 850.00, "gross_weight_g": 1350.00, "net_weight_g": 500.00}', '44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', CURRENT_TIMESTAMP - INTERVAL '12 hours', NULL, 'VERIFIED'),
(gen_random_uuid(), '70333333-3333-3333-3333-703333333333', 'b0999999-9999-9999-9999-b09999999999', 51.0000, 51.0000, 449.0000, '{"flowmeter_id": "FM-01", "net_liters": 51.00}', '44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', CURRENT_TIMESTAMP - INTERVAL '11 hours', NULL, 'VERIFIED')
ON CONFLICT (id) DO NOTHING;

-- 11. Material Consumptions
INSERT INTO material_consumptions (id, work_order_id, material_batch_id, planned_quantity, actual_quantity, variance, yield_impact) VALUES
(gen_random_uuid(), '70333333-3333-3333-3333-703333333333', 'b0888888-8888-8888-8888-b08888888888', 500.0000, 500.0000, 0.0000, 'None'),
(gen_random_uuid(), '70333333-3333-3333-3333-703333333333', 'b0999999-9999-9999-9999-b09999999999', 51.0000, 51.0500, 0.0500, 'Nominal line transfer loss')
ON CONFLICT (id) DO NOTHING;

-- 12. Equipment Qualification & Calibration for Vial Machines
INSERT INTO equipment_qualifications (id, machine_id, qualification_type, qualification_date, expiry_date, performed_by, status, notes) VALUES
(gen_random_uuid(), 'e1111111-1202-1111-1111-111111111111', 'IQ', CURRENT_DATE - INTERVAL '120 days', NULL, 'Dr. Robert Chen', 'COMPLETED', 'Liquid filler IQ completed in sterile zone 1. Laminar flow validations meet ISO 5 standard.'),
(gen_random_uuid(), 'e1111111-1202-1111-1111-111111111111', 'OQ', CURRENT_DATE - INTERVAL '118 days', NULL, 'Dr. Robert Chen', 'COMPLETED', 'Dispense cycle limits calibrated. Bubble point filter validations pass.'),
(gen_random_uuid(), 'e1111111-1202-1111-1111-111111111111', 'PQ', CURRENT_DATE - INTERVAL '115 days', CURRENT_DATE + INTERVAL '250 days', 'Dr. Robert Chen', 'COMPLETED', 'Media fill validation run completed with zero contamination out of 3000 vials.'),
(gen_random_uuid(), 'e1111111-1203-1111-1111-111111111111', 'PQ', CURRENT_DATE - INTERVAL '90 days', CURRENT_DATE + INTERVAL '275 days', 'Dr. Robert Chen', 'COMPLETED', 'Condenser temperature mapping and sublimation rates validated.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO equipment_calibrations (id, machine_id, calibration_date, next_calibration_due, calibrated_by, certificate_number, status) VALUES
(gen_random_uuid(), 'e1111111-1202-1111-1111-111111111111', CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '170 days', 'PharmaCal Calibration Inc.', 'CAL-VFM-01021', 'PASSED'),
(gen_random_uuid(), 'e1111111-1203-1111-1111-111111111111', CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE + INTERVAL '150 days', 'PharmaCal Calibration Inc.', 'CAL-LYO-00214', 'PASSED')
ON CONFLICT (id) DO NOTHING;

-- 13. Quality Checks (Aseptic Inspections)
INSERT INTO quality_checks (work_order_id, inspector_id, serial_number, check_parameters, status, non_conformance_reason) VALUES
('70333333-3333-3333-3333-703333333333', '55555555-5555-5555-5555-555555555555', 'VIAL-B01-00045', '{"fill_volume_ml": 10.22, "crimp_tightness": true, "particulate_inspected": true, "stopper_correctly_seated": true}', 'PASSED', NULL),
('70333333-3333-3333-3333-703333333333', '55555555-5555-5555-5555-555555555555', 'VIAL-B01-00046', '{"fill_volume_ml": 8.12, "crimp_tightness": true, "particulate_inspected": true, "stopper_correctly_seated": false}', 'REJECTED', 'Underfill defect (8.12ml vs target 10.2ml) and misaligned rubber stopper seating detected by automatic inspection sensor.')
ON CONFLICT (id) DO NOTHING;

-- 14. Electronic Batch Record (EBR)
INSERT INTO electronic_batch_records (id, work_order_id, materials_used, operators, equipment_used, process_parameters, quality_checks, deviations, signatures, status) VALUES
('e1011111-2222-2222-2222-111111111111', '70333333-3333-3333-3333-703333333333', 
'[
  {"material_code": "MAT-API-VBG", "batch_number": "LOT-VBG-2026-01", "quantity": 500.0, "uom": "G"},
  {"material_code": "MAT-EXC-WFI", "batch_number": "LOT-WFI-2026-01", "quantity": 51.05, "uom": "L"}
]',
'[
  {"username": "operator1", "name": "David Lightman", "role": "OPERATOR", "action": "Antigen Formulation", "timestamp": "2026-06-24T08:00:00Z"},
  {"username": "operator1", "name": "David Lightman", "role": "OPERATOR", "action": "Vial Filling & Stoppering", "timestamp": "2026-06-24T10:15:00Z"}
]',
'[
  {"machine_code": "VWM-01", "name": "Vial Washing Tunnel", "runtime_minutes": 240, "cleaning_status": "CLEANED_VALIDATED"},
  {"machine_code": "VFM-01", "name": "Aseptic Filling Machine", "runtime_minutes": 180, "cleaning_status": "CLEANED_VALIDATED"}
]',
'[
  {"parameter": "Depyrogenation Temperature", "target": "320°C", "actual": "320.2°C", "status": "WITHIN_LIMITS"},
  {"parameter": "Antigen Fill Volume", "target": "10.2ml", "actual": "10.21ml", "status": "WITHIN_LIMITS"},
  {"parameter": "Filling Room Particle Count", "target": "Class A / ISO 5", "actual": "0 particles/m3 (>0.5um)", "status": "WITHIN_LIMITS"}
]',
'[
  {"check": "Endotoxin LAL Test", "value": "<0.25 EU/ml (USP)", "status": "PASSED"},
  {"check": "Particulate Inspection", "value": "0 defects detected", "status": "PASSED"},
  {"check": "Fill Volume Accuracy", "value": "10.21ml avg weight (meets USP)", "status": "PASSED"}
]',
'[]',
'[
  {"stage": "Formulation Verification", "user": "supervisor", "name": "Robert Patrick", "meaning": "Double Weigh Sign-off", "timestamp": "2026-06-24T08:10:00Z"},
  {"stage": "Aseptic Filling Review", "user": "manager", "name": "Sarah Connor", "meaning": "Clean Room Line Sign-off", "timestamp": "2026-06-24T12:00:00Z"}
]', 'IN_PROGRESS')
ON CONFLICT (id) DO NOTHING;

-- 15. Deviations & CAPAs for Vials
INSERT INTO deviations (id, work_order_id, title, description, severity, category, reported_by, reported_at, status, investigation_details, root_cause) VALUES
('d0111111-2222-2222-2222-222222222222', '70333333-3333-3333-3333-703333333333', 'Filling Chamber Pressure Spike', 'Laminar air flow zone differential pressure momentarily dropped to 8 Pa (target limit >= 10 Pa) for 45 seconds during vial filling.', 'MAJOR', 'EQUIPMENT', '44444444-4444-4444-4444-444444444444', CURRENT_TIMESTAMP - INTERVAL '1 day', 'OPEN', 'Filling line was auto-halted. Vials filled during the 45-second dip were segregated and quarantined. Standard microbiological environment swabs took place.', 'Temporary static pressure bypass from main HVAC filter replacement on the secondary plant floor.')
ON CONFLICT (id) DO NOTHING;
