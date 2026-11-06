-- ============================================================================
-- PHARMA LIQUID-LIQUID EXTRACTION PLANT & USE CASE SEED SCRIPT
-- ============================================================================

-- 1. Organization: Ugam Biopharma Solutions Ltd
INSERT INTO public.organizations (id, name, code, industry_type, logo_url, is_active, created_at, updated_at, archived_at, archived_by)
VALUES ('10000000-0000-0000-0000-000000000003', 'Ugam Biopharma Solutions Ltd', 'UGAM-PHARMA', 'PHARMACEUTICAL', NULL, true, NOW(), NOW(), NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- 2. Plant: Pharma Liquid-Liquid Extraction Plant
INSERT INTO public.plants (id, name, code, location, created_at, organization_id, timezone, status, archived_at, archived_by)
VALUES ('a0000000-0003-3333-3333-333333333333', 'Pharma Liquid-Liquid Extraction Plant', 'PHARMA-PLANT-01', 'Biotech Park, Hyderabad, India', NOW(), '10000000-0000-0000-0000-000000000003', 'Asia/Kolkata', 'ACTIVE', NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- 3. Plant Theme Settings: Pharma Cleanroom Cyan Palette
INSERT INTO public.plant_theme_settings (id, organization_id, plant_id, theme_name, palette_type, is_dark_mode, colors, updated_by, updated_at)
VALUES ('70111111-0003-1111-1111-111111111111', '10000000-0000-0000-0000-000000000003', 'a0000000-0003-3333-3333-333333333333', 'Pharma Cleanroom Cyan', 'PRESET', false, '{"bgPrimary": "#FFFFFF", "bgSection": "#F8FAFC", "bgCard": "#FFFFFF", "textPrimary": "#0F172A", "textSecondary": "#475569", "borderColor": "rgba(14, 116, 144, 0.25)", "colorPrimary": "#0E7490", "colorCorporate": "#0F172A", "colorAccent": "#10B981"}', NULL, NOW())
ON CONFLICT (id) DO NOTHING;

-- 4. Area: API Synthesis & Extraction Center
INSERT INTO public.areas (id, plant_id, name, code, created_at)
VALUES ('a1111111-0009-1111-1111-111111111111', 'a0000000-0003-3333-3333-333333333333', 'API Synthesis & Extraction Center', 'WC-API-EXT', NOW())
ON CONFLICT (id) DO NOTHING;

-- 5. Line: Liquid-Liquid Extraction Train 01
INSERT INTO public.lines (id, area_id, name, code, created_at)
VALUES ('40111111-0005-1111-1111-111111111111', 'a1111111-0009-1111-1111-111111111111', 'Liquid-Liquid Extraction Train 01', 'LINE-LLE-01', NOW())
ON CONFLICT (id) DO NOTHING;

-- 6. Machine: Extraction Vessel EX-101
INSERT INTO public.machines (id, line_id, name, code, status, last_status_change, created_at)
VALUES ('e1111111-0010-1111-1111-111111111111', '40111111-0005-1111-1111-111111111111', 'Extraction Vessel EX-101', 'EX-101', 'RUNNING', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 7. Equipment Master
INSERT INTO public.equipment_master (equipment_id, equipment_name, work_center, equipment_type, manufacturer, model, capacity_per_shift, oee_applicable, status)
VALUES ('EX-101', 'Extraction Vessel EX-101', 'WC-API-EXT', 'EXTRACTION_VESSEL', 'Pfaudler Reactor Systems', 'GL-EX-250', 500, 'Y', 'RUNNING')
ON CONFLICT (equipment_id) DO NOTHING;

-- 8. Warehouse
INSERT INTO public.warehouses (id, code, name, location, created_at, plant_id)
VALUES ('b0000000-0003-3333-3333-333333333333', 'WH-PHARMA-01', 'Pharma API Cleanroom Warehouse', 'Zone A Cleanroom Air-lock', NOW(), 'a0000000-0003-3333-3333-333333333333')
ON CONFLICT (id) DO NOTHING;

-- 9. Storage Location
INSERT INTO public.storage_locations (id, warehouse_id, area, rack, bin, code, created_at)
VALUES ('b1111111-0003-1111-1111-111111111111', 'b0000000-0003-3333-3333-333333333333', 'Cleanroom Area', 'RACK-01', 'BIN-01', 'LOC-PHARMA-01', NOW())
ON CONFLICT (id) DO NOTHING;

-- 10. Product: API Intermediate X
INSERT INTO public.products (id, sku, name, description, uom, created_at)
VALUES ('30111111-0008-1111-1111-111111111111', 'API-INT-X', 'API Intermediate X', 'High-Purity Active Pharmaceutical Ingredient Intermediate X (Recovered Organic Phase Solution)', 'KG', NOW())
ON CONFLICT (id) DO NOTHING;

-- 11. Materials Master
INSERT INTO public.material_master (id, material_code, material_name, material_type, category, uom, manufacturer, vendor_id, shelf_life_days, storage_conditions, image_path, status, created_at)
VALUES
('ca000001-0001-1111-1111-111111111111', 'INT-CRUDE-001', 'Crude API Reaction Mixture', 'INTERMEDIATE', 'RAW_PHARMA', 'KG', 'AuraBio Synthesis Unit', NULL, 180, '2-8°C Controlled Cold Room', '', 'APPROVED', NOW()),
('ca000001-0002-1111-1111-111111111111', 'RM-SOLV-001', 'Ethyl Acetate Solvent USP', 'RAW_MATERIAL', 'SOLVENT', 'L', 'Merck Millipore Bio', NULL, 730, 'Flammable Storage Cabinet 15-25°C', '', 'APPROVED', NOW()),
('ca000001-0003-1111-1111-111111111111', 'RM-WTR-001', 'Purified Water USP', 'RAW_MATERIAL', 'WATER', 'L', 'In-House Generation Loop', NULL, 30, 'Ambient Loop WFI Circulation', '', 'APPROVED', NOW()),
('ca000001-0004-1111-1111-111111111111', 'RM-SALT-001', 'Sodium Chloride Reagent USP', 'RAW_MATERIAL', 'SALT', 'KG', 'Avantor Performance Materials', NULL, 1095, 'Dry Ambient Storage < 60% RH', '', 'APPROVED', NOW())
ON CONFLICT (material_code) DO NOTHING;

-- 12. Material Batches & Inventory
INSERT INTO public.material_batches (id, goods_receipt_id, material_id, batch_number, supplier_batch, quantity, uom, manufacturing_date, expiry_date, status, created_at, heat_number)
VALUES
('cb000001-0001-1111-1111-111111111111', NULL, 'ca000001-0001-1111-1111-111111111111', 'LOT-API-CRUDE-04', 'SPL-CRD-889', 120, 'KG', NOW() - INTERVAL '10 days', NOW() + INTERVAL '170 days', 'RELEASED', NOW(), NULL),
('cb000001-0002-1111-1111-111111111111', NULL, 'ca000001-0002-1111-1111-111111111111', 'LOT-EA-SOLV-22', 'MRK-EA-5541', 250, 'L', NOW() - INTERVAL '30 days', NOW() + INTERVAL '700 days', 'RELEASED', NOW(), NULL),
('cb000001-0003-1111-1111-111111111111', NULL, 'ca000001-0003-1111-1111-111111111111', 'LOT-WTR-USP-01', 'WFI-LOOP-01', 500, 'L', NOW() - INTERVAL '2 days', NOW() + INTERVAL '28 days', 'RELEASED', NOW(), NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.inventory_balances (id, product_id, lot_number, quantity, wip_status, location_code, created_at, updated_at, plant_id)
VALUES
('db000001-0001-1111-1111-111111111111', '30111111-0008-1111-1111-111111111111', 'LOT-API-CRUDE-04', 120, 'RELEASED', 'LOC-PHARMA-01', NOW(), NOW(), 'a0000000-0003-3333-3333-333333333333'),
('db000001-0002-1111-1111-111111111111', '30111111-0008-1111-1111-111111111111', 'LOT-EA-SOLV-22', 250, 'RELEASED', 'LOC-PHARMA-01', NOW(), NOW(), 'a0000000-0003-3333-3333-333333333333')
ON CONFLICT (id) DO NOTHING;

-- 13. BOM Header & Components
INSERT INTO public.bom_header (bom_id, parent_material, revision, effective_from, effective_to, status)
VALUES ('BOM-API-001', 'API-INT-X', 'A', '2026-01-01', NULL, 'RELEASED')
ON CONFLICT (bom_id) DO NOTHING;

INSERT INTO public.bom_component (id, bom_id, line_no, parent_material, component_material, component_type, qty, uom)
VALUES
('bc000001-0001-1111-1111-111111111111', 'BOM-API-001', 10, 'API-INT-X', 'INT-CRUDE-001', 'RAW', 65.0, 'KG'),
('bc000001-0002-1111-1111-111111111111', 'BOM-API-001', 20, 'API-INT-X', 'RM-SOLV-001', 'RAW', 45.0, 'L'),
('bc000001-0003-1111-1111-111111111111', 'BOM-API-001', 30, 'API-INT-X', 'RM-WTR-001', 'RAW', 20.0, 'L')
ON CONFLICT (id) DO NOTHING;

-- 14. Routing Header & Routing Operations (Steps 1 through 13)
INSERT INTO public.routing_header (routing_id, material_code, revision, description, status)
VALUES ('RT-API-001', 'API-INT-X', 'A', '13-Step GMP Liquid-Liquid Extraction Train', 'RELEASED')
ON CONFLICT (routing_id) DO NOTHING;

INSERT INTO public.routing_operation (id, routing_id, operation_no, operation_code, operation_name, work_center, machine_code)
VALUES
('ea000001-0001-1111-1111-111111111111', 'RT-API-001', 1, 'OP-01', 'Verify API intermediate and solvent lots', 'WC-API-EXT', 'EX-101'),
('ea000001-0002-1111-1111-111111111111', 'RT-API-001', 2, 'OP-02', 'Verify extraction vessel', 'WC-API-EXT', 'EX-101'),
('ea000001-0003-1111-1111-111111111111', 'RT-API-001', 3, 'OP-03', 'Charge API intermediate solution', 'WC-API-EXT', 'EX-101'),
('ea000001-0004-1111-1111-111111111111', 'RT-API-001', 4, 'OP-04', 'Add extraction solvent', 'WC-API-EXT', 'EX-101'),
('ea000001-0005-1111-1111-111111111111', 'RT-API-001', 5, 'OP-05', 'Mix phases', 'WC-API-EXT', 'EX-101'),
('ea000001-0006-1111-1111-111111111111', 'RT-API-001', 6, 'OP-06', 'Stop mixing and allow settling', 'WC-API-EXT', 'EX-101'),
('ea000001-0007-1111-1111-111111111111', 'RT-API-001', 7, 'OP-07', 'Verify interface formation', 'WC-API-EXT', 'EX-101'),
('ea000001-0008-1111-1111-111111111111', 'RT-API-001', 8, 'OP-08', 'Verify aqueous phase conductivity', 'WC-API-EXT', 'EX-101'),
('ea000001-0009-1111-1111-111111111111', 'RT-API-001', 9, 'OP-09', 'Verify organic phase / carryover', 'WC-API-EXT', 'EX-101'),
('ea000001-0010-1111-1111-111111111111', 'RT-API-001', 10, 'OP-10', 'Collect designated API-containing phase', 'WC-API-EXT', 'EX-101'),
('ea000001-0011-1111-1111-111111111111', 'RT-API-001', 11, 'OP-11', 'Perform final in-process QC', 'WC-API-EXT', 'EX-101'),
('ea000001-0012-1111-1111-111111111111', 'RT-API-001', 12, 'OP-12', 'QA review and approval', 'WC-API-EXT', 'EX-101'),
('ea000001-0013-1111-1111-111111111111', 'RT-API-001', 13, 'OP-13', 'Transfer to next processing stage', 'WC-API-EXT', 'EX-101')
ON CONFLICT (id) DO NOTHING;

-- 15. Batch Recipe: RCP-API-LLE-001 with 13 Steps and Critical Process Parameters
INSERT INTO public.batch_recipes (
  id, product_id, recipe_code, recipe_name, version, master_formula, bom, process_instructions, planned_yield_pct, status, created_by, created_at, evidence_requirements
)
VALUES (
  'f1111111-0006-1111-1111-111111111111',
  '30111111-0008-1111-1111-111111111111',
  'RCP-API-LLE-001',
  'Liquid–Liquid Extraction Process Recipe for API Intermediate X',
  'A',
  '{"process": "Liquid-Liquid Extraction", "targetBatchSizeKg": 100, "phaseA": "Aqueous phase (Crude API + dissolved salts)", "phaseB": "Organic phase (Ethyl Acetate extraction solvent)", "extractionVessel": "EX-101"}',
  '[{"component_code": "INT-CRUDE-001", "component_name": "Crude API Reaction Mixture", "component_type": "INTERMEDIATE", "quantity": 65.0, "uom": "KG", "line_no": 10}, {"component_code": "RM-SOLV-001", "component_name": "Ethyl Acetate Solvent USP", "component_type": "RAW", "quantity": 45.0, "uom": "L", "line_no": 20}, {"component_code": "RM-WTR-001", "component_name": "Purified Water USP", "component_type": "RAW", "quantity": 20.0, "uom": "L", "line_no": 30}]',
  '[
    {"step": 1, "operation_no": 1, "operation_code": "OP-01", "operation_name": "Verify API intermediate and solvent lots", "work_center": "WC-API-EXT", "machine_code": "EX-101", "instruction": "Scan 2D QR barcoded containers for Crude API Mixture INT-CRUDE-001 and Solvent RM-SOLV-001. Confirm analytical QA release status in LIMS.", "verification": "Material scan and released status", "signoff_role": "Operator"},
    {"step": 2, "operation_no": 2, "operation_code": "OP-02", "operation_name": "Verify extraction vessel", "work_center": "WC-API-EXT", "machine_code": "EX-101", "instruction": "Inspect Extraction Vessel EX-101 cleanliness tag, CIP/SIP certificate validity, and vessel pressure integrity.", "verification": "Cleaning and equipment status", "signoff_role": "Operator"},
    {"step": 3, "operation_no": 3, "operation_code": "OP-03", "operation_name": "Charge API intermediate solution", "work_center": "WC-API-EXT", "machine_code": "EX-101", "instruction": "Transfer 65.0 kg (+/- 0.5 kg) of Crude API aqueous solution into EX-101 via calibrated mass flow meter FM-101.", "verification": "Quantity verification", "signoff_role": "Operator"},
    {"step": 4, "operation_no": 4, "operation_code": "OP-04", "operation_name": "Add extraction solvent", "work_center": "WC-API-EXT", "machine_code": "EX-101", "instruction": "Charge 45.0 L (+/- 0.5 L) of approved USP Ethyl Acetate process solvent into EX-101 under nitrogen blanket.", "verification": "Material identity and quantity", "signoff_role": "Operator"},
    {"step": 5, "operation_no": 5, "operation_code": "OP-05", "operation_name": "Mix phases", "work_center": "WC-API-EXT", "machine_code": "EX-101", "instruction": "Engage EX-101 agitator at 250 RPM (+/- 20 RPM) for 45 minutes at 22-25°C jacket temperature to ensure maximum solute mass transfer.", "verification": "RPM, time, temperature", "signoff_role": "Operator", "cpp": "Mixing Speed: 250 RPM, Duration: 45 min, Temp: 23.5°C"},
    {"step": 6, "operation_no": 6, "operation_code": "OP-06", "operation_name": "Stop mixing and allow settling", "work_center": "WC-API-EXT", "machine_code": "EX-101", "instruction": "Halt agitator. Allow biphasic liquid mixture to disengage under quiescent conditions for 60 minutes minimum.", "verification": "Settling time", "signoff_role": "Operator", "cpp": "Settling Time: >= 60 min quiescent"},
    {"step": 7, "operation_no": 7, "operation_code": "OP-07", "operation_name": "Verify interface formation", "work_center": "WC-API-EXT", "machine_code": "EX-101", "instruction": "Visually inspect sight glass and optical boundary sensor to confirm sharp meniscus interface disengagement between aqueous and organic layers.", "verification": "Interface position and stability", "signoff_role": "Operator", "cpp": "Interface Meniscus: 50% +/- 2%, Sharp Boundary"},
    {"step": 8, "operation_no": 8, "operation_code": "OP-08", "operation_name": "Verify aqueous phase conductivity", "work_center": "WC-API-EXT", "machine_code": "EX-101", "instruction": "Sample lower aqueous phase and record in-line toroidal conductivity probe reading. Confirm high ionic reading (> 45 mS/cm).", "verification": "Approved conductivity range", "signoff_role": "Quality Inspector", "cpp": "Aqueous Conductivity: > 45 mS/cm (Target: 52.4 mS/cm)"},
    {"step": 9, "operation_no": 9, "operation_code": "OP-09", "operation_name": "Verify organic phase / carryover", "work_center": "WC-API-EXT", "machine_code": "EX-101", "instruction": "Sample upper organic phase. Verify low conductivity (< 0.20 mS/cm) to confirm absence of aqueous ionic salt carryover.", "verification": "Conductivity where suitable, plus required QC tests", "signoff_role": "Quality Inspector", "cpp": "Organic Conductivity: < 0.20 mS/cm (Target: 0.08 mS/cm)"},
    {"step": 10, "operation_no": 10, "operation_code": "OP-10", "operation_name": "Collect designated API-containing phase", "work_center": "WC-API-EXT", "machine_code": "EX-101", "instruction": "Activate automated bottom transfer valve interlock to drain aqueous waste to holding tank, then divert recovered organic API phase to receiver REC-102.", "verification": "Valve interlock and collection traceability", "signoff_role": "Operator"},
    {"step": 11, "operation_no": 11, "operation_code": "OP-11", "operation_name": "Perform final in-process QC", "work_center": "WC-API-EXT", "machine_code": "EX-101", "instruction": "Submit representative sample of organic stream to analytical lab: Karl Fischer moisture (< 0.50% w/w) and residual solvent assay (>= 98.5%).", "verification": "Required tests and specifications", "signoff_role": "Quality Engineer", "cpp": "Water Content: < 0.50% w/w, HPLC Assay: >= 98.5%"},
    {"step": 12, "operation_no": 12, "operation_code": "OP-12", "operation_name": "QA review and approval", "work_center": "WC-API-EXT", "machine_code": "EX-101", "instruction": "QA officer reviews electronic batch record dossier, verified sensor logs, and IPQC certificates. Commit 21 CFR Part 11 digital signature.", "verification": "Electronic signature", "signoff_role": "Quality Manager"},
    {"step": 13, "operation_no": 13, "operation_code": "OP-13", "operation_name": "Transfer to next processing stage", "work_center": "WC-API-EXT", "machine_code": "EX-101", "instruction": "Authorize transfer of recovered organic phase to downstream Crystallization & Solvent Recovery Stage. Seal batch genealogy.", "verification": "WO step completion and genealogy", "signoff_role": "Production Supervisor"}
  ]',
  98.50,
  'ACTIVE',
  '11111111-1111-1111-1111-111111111111',
  NOW(),
  '{"criticalProcessParameters": [
    {"parameter": "Mixing speed", "target": "250 RPM", "range": "230 - 270 RPM", "whyItMatters": "Influences extraction and emulsion formation"},
    {"parameter": "Mixing duration", "target": "45 min", "range": "40 - 50 min", "whyItMatters": "Influences mass transfer between phases"},
    {"parameter": "Temperature", "target": "23.5°C", "range": "20.0 - 25.0°C", "whyItMatters": "Influences solubility, conductivity, and separation"},
    {"parameter": "Settling time", "target": "60 min", "range": "55 - 75 min", "whyItMatters": "Allows the phases to disengage"},
    {"parameter": "Interface level", "target": "50.0%", "range": "48.0 - 52.0%", "whyItMatters": "Helps prevent collection of the wrong phase"},
    {"parameter": "Aqueous conductivity", "target": "52.4 mS/cm", "range": "> 45 mS/cm", "whyItMatters": "Helps identify the conductive aqueous phase"},
    {"parameter": "Organic stream conductivity", "target": "0.08 mS/cm", "range": "< 0.20 mS/cm", "whyItMatters": "May indicate ionic aqueous carryover, if measurable"},
    {"parameter": "Water content", "target": "0.32% w/w", "range": "< 0.50% w/w", "whyItMatters": "Helps quantify moisture in the recovered organic phase"},
    {"parameter": "Residual solvent / assay", "target": "99.4%", "range": ">= 98.5%", "whyItMatters": "Supports API-intermediate quality assessment"}
  ]}'
)
ON CONFLICT (id) DO NOTHING;

-- 16. Work Order: WO-API-2026-001 (In Progress, 100 kg Planned)
INSERT INTO public.work_orders (
  id, wo_number, product_id, target_quantity, completed_quantity, scrap_quantity,
  planned_start, planned_end, actual_start, actual_end, status,
  created_by, created_at, updated_at, plant_id, revision, recipe_id,
  evidence_snapshot, reviewed_snapshot, completed_by, reviewed_by,
  shortfall_approval, legacy_unverified
)
VALUES (
  '80111111-0008-1111-1111-111111111111',
  'WO-API-2026-001',
  '30111111-0008-1111-1111-111111111111',
  100, 45, 0,
  NOW() - INTERVAL '1 day', NOW() + INTERVAL '2 days', NOW() - INTERVAL '6 hours', NULL, 'IN_PROGRESS',
  '11111111-1111-1111-1111-111111111111', NOW(), NOW(),
  'a0000000-0003-3333-3333-333333333333', 0, 'f1111111-0006-1111-1111-111111111111',
  NULL, NULL, NULL, NULL, NULL, false
)
ON CONFLICT (id) DO NOTHING;

-- 17. Seed Users for Pharma Plant (Password: MES123 for all accounts)
-- Hash $2b$10$rNfm3NBFktkLEcTITstS7uuEgElrD7a/yWNJN7pWp98aokhGgiZxW is bcrypt for MES123
INSERT INTO public.users (
  id, username, email, password_hash, role, first_name, last_name, is_active, created_at, updated_at, organization_id, plant_id, session_version
)
VALUES
('44444444-4444-4444-4444-444444444450', 'pharma_op1', 'pharma_op1@ugambiopharma.com', '$2b$10$rNfm3NBFktkLEcTITstS7uuEgElrD7a/yWNJN7pWp98aokhGgiZxW', 'OPERATOR', 'Aakash', 'Verma (Extraction OP)', true, NOW(), NOW(), '10000000-0000-0000-0000-000000000003', 'a0000000-0003-3333-3333-333333333333', 0),
('55555555-5555-5555-5555-555555555560', 'pharma_qa1', 'pharma_qa1@ugambiopharma.com', '$2b$10$rNfm3NBFktkLEcTITstS7uuEgElrD7a/yWNJN7pWp98aokhGgiZxW', 'QUALITY_ENGINEER', 'Dr. Priya', 'Sen (QA Compliance)', true, NOW(), NOW(), '10000000-0000-0000-0000-000000000003', 'a0000000-0003-3333-3333-333333333333', 0),
('11111111-1111-1111-1111-111111111120', 'pharma_admin', 'pharma_admin@ugambiopharma.com', '$2b$10$rNfm3NBFktkLEcTITstS7uuEgElrD7a/yWNJN7pWp98aokhGgiZxW', 'ADMIN', 'Dr. Ramesh', 'Joshi (Plant Director)', true, NOW(), NOW(), '10000000-0000-0000-0000-000000000003', 'a0000000-0003-3333-3333-333333333333', 0)
ON CONFLICT (username) DO NOTHING;
