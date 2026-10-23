-- ==============================================================================
-- FILE: migration_automotive_seat_assembly.sql
-- DESCRIPTION: Master data, BOM, routing, and work order for Automotive Plant
-- User Case: AutoComfort Seating - Front Driver Seat Assembly (SEAT-DRV-101)
-- Work Order: WO-SEAT-2026-001 (100 seats, Line: LINE-SEAT-01)
-- ==============================================================================

BEGIN;

-- 1. VENDOR / MANUFACTURER
INSERT INTO vendors (id, vendor_code, vendor_name, qualification_status, audit_date, contact_information, approved_materials)
VALUES (
    '20111111-0005-1111-1111-111111111111',
    'SUP-ACS-01',
    'AutoComfort Seating Pvt. Ltd.',
    'QUALIFIED',
    '2026-01-15',
    'support@autocomfort-seating.com | +91 20 4455 6677',
    '["FRAME-LH-101", "RAIL-LH-201", "BRKT-LH-301", "RECL-101", "LEVR-101", "FAST-101", "FOAM-CSH-101", "FOAM-BST-101", "COV-LH-101", "CLIP-TRM-101", "TRIM-LH-101", "HDRST-101", "COV-SD-101", "ACC-KIT-101"]'
)
ON CONFLICT (id) DO UPDATE SET
    vendor_code = EXCLUDED.vendor_code,
    vendor_name = EXCLUDED.vendor_name,
    qualification_status = EXCLUDED.qualification_status;

-- 2. ASSEMBLY LINE & WORK STATIONS
INSERT INTO lines (id, area_id, name, code)
VALUES (
    '40111111-0004-1111-1111-111111111111',
    'a1111111-0006-1111-1111-111111111111',
    'Seat Assembly Line 01',
    'LINE-SEAT-01'
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    code = EXCLUDED.code;

INSERT INTO machines (id, line_id, name, code, status)
VALUES
('50111111-0007-1111-1111-111111111111', '40111111-0004-1111-1111-111111111111', 'Station 01: Frame Assembly', 'ST-SEAT-01', 'RUNNING'),
('50111111-0008-1111-1111-111111111111', '40111111-0004-1111-1111-111111111111', 'Station 02: Recliner Fitting', 'ST-SEAT-02', 'RUNNING'),
('50111111-0009-1111-1111-111111111111', '40111111-0004-1111-1111-111111111111', 'Station 03: Foam Installation', 'ST-SEAT-03', 'RUNNING'),
('50111111-0010-1111-1111-111111111111', '40111111-0004-1111-1111-111111111111', 'Station 04: Upholstery Fitting', 'ST-SEAT-04', 'RUNNING'),
('50111111-0011-1111-1111-111111111111', '40111111-0004-1111-1111-111111111111', 'Station 05: Final Seat Assembly', 'ST-SEAT-05', 'RUNNING'),
('50111111-0012-1111-1111-111111111111', '40111111-0004-1111-1111-111111111111', 'Station 06: Final Quality Inspection', 'ST-SEAT-06', 'RUNNING')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    code = EXCLUDED.code,
    status = EXCLUDED.status;

-- Sync to equipment_master if table exists
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'equipment_master') THEN
        INSERT INTO equipment_master (equipment_id, equipment_name, work_center, equipment_type, manufacturer, model, capacity_per_shift, oee_applicable, status)
        VALUES
        ('ST-SEAT-01', 'Station 01: Frame Assembly', 'WC-FRAME', 'ASSEMBLY', 'AutoComfort', 'ACS-FA-01', 400, 'Y', 'RUNNING'),
        ('ST-SEAT-02', 'Station 02: Recliner Fitting', 'WC-RECL', 'ASSEMBLY', 'AutoComfort', 'ACS-RF-02', 400, 'Y', 'RUNNING'),
        ('ST-SEAT-03', 'Station 03: Foam Installation', 'WC-FOAM', 'ASSEMBLY', 'AutoComfort', 'ACS-FI-03', 400, 'Y', 'RUNNING'),
        ('ST-SEAT-04', 'Station 04: Upholstery Fitting', 'WC-UPHL', 'TRIM_STATION', 'AutoComfort', 'ACS-UF-04', 400, 'Y', 'RUNNING'),
        ('ST-SEAT-05', 'Station 05: Final Seat Assembly', 'WC-FASSY', 'ASSEMBLY', 'AutoComfort', 'ACS-FA-05', 400, 'Y', 'RUNNING'),
        ('ST-SEAT-06', 'Station 06: Final Quality Inspection', 'WC-FQC', 'QC_STATION', 'AutoComfort', 'ACS-FQC-06', 400, 'Y', 'RUNNING')
        ON CONFLICT (equipment_id) DO UPDATE SET
            equipment_name = EXCLUDED.equipment_name,
            status = EXCLUDED.status;
    END IF;
END $$;

-- 3. PRODUCTS MASTER (SEAT-DRV-101 and SEAT-PAS-101)
INSERT INTO products (id, sku, name, description, uom)
VALUES
(
    '30111111-0006-1111-1111-111111111111',
    'SEAT-DRV-101',
    'Front Driver Seat Assembly',
    'Complete ergonomic front driver seat assembly with multi-position recliner, high-density molded foam, and leatherette trim (LH)',
    'PCS'
),
(
    '30111111-0007-1111-1111-111111111111',
    'SEAT-PAS-101',
    'Front Passenger Seat Assembly',
    'Complete ergonomic front passenger seat assembly with multi-position recliner, high-density molded foam, and leatherette trim (RH)',
    'PCS'
)
ON CONFLICT (id) DO UPDATE SET
    sku = EXCLUDED.sku,
    name = EXCLUDED.name,
    description = EXCLUDED.description;

-- 4. MATERIAL MASTER (Finished Goods and Sub-components)
INSERT INTO material_master (id, material_code, material_name, material_type, category, uom, manufacturer, vendor_id, shelf_life_days, storage_conditions, image_path, status)
VALUES
-- Finished Assembly
('10111111-0010-1111-1111-111111111111', 'SEAT-DRV-101', 'Front Driver Seat Assembly', 'FINISHED', 'SEATING', 'PCS', 'AutoComfort Seating Pvt. Ltd.', '20111111-0005-1111-1111-111111111111', 1825, 'Finished Goods Warehouse - Zone S', '/uploads/control_pin.jpg', 'ACTIVE'),
('10111111-0011-1111-1111-111111111111', 'SEAT-PAS-101', 'Front Passenger Seat Assembly', 'FINISHED', 'SEATING', 'PCS', 'AutoComfort Seating Pvt. Ltd.', '20111111-0005-1111-1111-111111111111', 1825, 'Finished Goods Warehouse - Zone S', '/uploads/control_pin.jpg', 'ACTIVE'),

-- Station 01 Components
('10111111-0012-1111-1111-111111111111', 'FRAME-LH-101', 'Driver-side seat frame', 'RAW', 'FRAME', 'PCS', 'AutoComfort Fabrications', '20111111-0005-1111-1111-111111111111', 730, 'Dry Storage Bay F1', '/uploads/steel_bar_en8.jpg', 'ACTIVE'),
('10111111-0013-1111-1111-111111111111', 'RAIL-LH-201', 'Seat slider rail kit', 'RAW', 'HARDWARE', 'SET', 'Precision Slide Systems', '20111111-0005-1111-1111-111111111111', 730, 'Dry Storage Bay F2', '/uploads/machined_pin.jpg', 'ACTIVE'),
('10111111-0014-1111-1111-111111111111', 'BRKT-LH-301', 'Mounting bracket kit', 'RAW', 'BRACKET', 'SET', 'Precision Pressings', '20111111-0005-1111-1111-111111111111', 730, 'Hardware Bin B1', '/uploads/machined_pin.jpg', 'ACTIVE'),

-- Station 02 Components
('10111111-0015-1111-1111-111111111111', 'RECL-101', 'Recliner mechanism', 'RAW', 'MECHANISM', 'PCS', 'AutoComfort Mechanisms', '20111111-0005-1111-1111-111111111111', 730, 'Precision Mech Rack M1', '/uploads/heat_treated_pin.jpg', 'ACTIVE'),
('10111111-0016-1111-1111-111111111111', 'LEVR-101', 'Adjustment lever', 'RAW', 'HARDWARE', 'PCS', 'ErgoControls Ltd.', '20111111-0005-1111-1111-111111111111', 730, 'Hardware Bin B2', '/uploads/aluminium_rod.jpg', 'ACTIVE'),
('10111111-0017-1111-1111-111111111111', 'FAST-101', 'Fastener kit', 'RAW', 'HARDWARE', 'SET', 'BoltTech Fasteners', '20111111-0005-1111-1111-111111111111', 1095, 'Fastener Bin B3', '/uploads/copper_wire.jpg', 'ACTIVE'),

-- Station 03 Components
('10111111-0018-1111-1111-111111111111', 'FOAM-CSH-101', 'Seat cushion foam', 'RAW', 'FOAM', 'PCS', 'PolyFlex Polymer Foams', '20111111-0005-1111-1111-111111111111', 365, 'Foam Storage Cell C1', '/uploads/nbr_rubber.jpg', 'ACTIVE'),
('10111111-0019-1111-1111-111111111111', 'FOAM-BST-101', 'Backrest foam', 'RAW', 'FOAM', 'PCS', 'PolyFlex Polymer Foams', '20111111-0005-1111-1111-111111111111', 365, 'Foam Storage Cell C2', '/uploads/nbr_rubber.jpg', 'ACTIVE'),

-- Station 04 Components
('10111111-0020-1111-1111-111111111111', 'COV-LH-101', 'Seat cover', 'RAW', 'TRIM', 'PCS', 'TexCraft Automotive Upholstery', '20111111-0005-1111-1111-111111111111', 365, 'Textile Bay T1', '/uploads/rubber_seal.jpg', 'ACTIVE'),
('10111111-0021-1111-1111-111111111111', 'CLIP-TRM-101', 'Trim clips', 'RAW', 'HARDWARE', 'SET', 'PlastiClip Automotive', '20111111-0005-1111-1111-111111111111', 730, 'Clip Dispenser D1', '/uploads/machined_pin.jpg', 'ACTIVE'),
('10111111-0022-1111-1111-111111111111', 'TRIM-LH-101', 'Trim components', 'RAW', 'TRIM', 'SET', 'TrimMould Automotive', '20111111-0005-1111-1111-111111111111', 730, 'Trim Storage Cell T2', '/uploads/rubber_seal.jpg', 'ACTIVE'),

-- Station 05 Components
('10111111-0023-1111-1111-111111111111', 'HDRST-101', 'Headrest', 'RAW', 'ACCESSORY', 'PCS', 'AutoComfort Seating Pvt. Ltd.', '20111111-0005-1111-1111-111111111111', 730, 'Accessory Bay A1', '/uploads/control_pin.jpg', 'ACTIVE'),
('10111111-0024-1111-1111-111111111111', 'COV-SD-101', 'Side covers', 'RAW', 'PLASTIC', 'SET', 'PlastiMould Polymers', '20111111-0005-1111-1111-111111111111', 730, 'Plastic Trim Bin P1', '/uploads/hydraulic_seal.jpg', 'ACTIVE'),
('10111111-0025-1111-1111-111111111111', 'ACC-KIT-101', 'Specified accessories kit', 'RAW', 'ACCESSORY', 'SET', 'WireMaster Electricals', '20111111-0005-1111-1111-111111111111', 730, 'Electrical Bay E1', '/uploads/copper_wire.jpg', 'ACTIVE')
ON CONFLICT (id) DO UPDATE SET
    material_code = EXCLUDED.material_code,
    material_name = EXCLUDED.material_name,
    material_type = EXCLUDED.material_type,
    image_path = EXCLUDED.image_path,
    status = EXCLUDED.status;

-- 5. MATERIAL BATCHES (Stock inventory for barcode validation)
INSERT INTO material_batches (id, material_id, batch_number, supplier_batch, quantity, uom, manufacturing_date, expiry_date, status)
VALUES
('b1111111-0010-1111-1111-111111111111', '10111111-0012-1111-1111-111111111111', 'FRAME-LH-101', 'SUP-FRM-2601', 500.0, 'PCS', CURRENT_DATE - 5, CURRENT_DATE + 700, 'RELEASED'),
('b1111111-0011-1111-1111-111111111111', '10111111-0013-1111-1111-111111111111', 'RAIL-LH-201', 'SUP-RAL-2601', 500.0, 'SET', CURRENT_DATE - 5, CURRENT_DATE + 700, 'RELEASED'),
('b1111111-0012-1111-1111-111111111111', '10111111-0014-1111-1111-111111111111', 'BRKT-LH-301', 'SUP-BKT-2601', 500.0, 'SET', CURRENT_DATE - 5, CURRENT_DATE + 700, 'RELEASED'),
('b1111111-0013-1111-1111-111111111111', '10111111-0015-1111-1111-111111111111', 'RECL-101', 'SUP-RCL-2601', 500.0, 'PCS', CURRENT_DATE - 5, CURRENT_DATE + 700, 'RELEASED'),
('b1111111-0014-1111-1111-111111111111', '10111111-0016-1111-1111-111111111111', 'LEVR-101', 'SUP-LVR-2601', 500.0, 'PCS', CURRENT_DATE - 5, CURRENT_DATE + 700, 'RELEASED'),
('b1111111-0015-1111-1111-111111111111', '10111111-0017-1111-1111-111111111111', 'FAST-101', 'SUP-FST-2601', 500.0, 'SET', CURRENT_DATE - 5, CURRENT_DATE + 700, 'RELEASED'),
('b1111111-0016-1111-1111-111111111111', '10111111-0018-1111-1111-111111111111', 'FOAM-CSH-101', 'SUP-FMC-2601', 500.0, 'PCS', CURRENT_DATE - 5, CURRENT_DATE + 700, 'RELEASED'),
('b1111111-0017-1111-1111-111111111111', '10111111-0019-1111-1111-111111111111', 'FOAM-BST-101', 'SUP-FMB-2601', 500.0, 'PCS', CURRENT_DATE - 5, CURRENT_DATE + 700, 'RELEASED'),
('b1111111-0018-1111-1111-111111111111', '10111111-0020-1111-1111-111111111111', 'COV-LH-101', 'SUP-CVR-2601', 500.0, 'PCS', CURRENT_DATE - 5, CURRENT_DATE + 700, 'RELEASED'),
('b1111111-0019-1111-1111-111111111111', '10111111-0021-1111-1111-111111111111', 'CLIP-TRM-101', 'SUP-CLP-2601', 500.0, 'SET', CURRENT_DATE - 5, CURRENT_DATE + 700, 'RELEASED'),
('b1111111-0020-1111-1111-111111111111', '10111111-0022-1111-1111-111111111111', 'TRIM-LH-101', 'SUP-TRM-2601', 500.0, 'SET', CURRENT_DATE - 5, CURRENT_DATE + 700, 'RELEASED'),
('b1111111-0021-1111-1111-111111111111', '10111111-0023-1111-1111-111111111111', 'HDRST-101', 'SUP-HDR-2601', 500.0, 'PCS', CURRENT_DATE - 5, CURRENT_DATE + 700, 'RELEASED'),
('b1111111-0022-1111-1111-111111111111', '10111111-0024-1111-1111-111111111111', 'COV-SD-101', 'SUP-CSD-2601', 500.0, 'SET', CURRENT_DATE - 5, CURRENT_DATE + 700, 'RELEASED'),
('b1111111-0023-1111-1111-111111111111', '10111111-0025-1111-1111-111111111111', 'ACC-KIT-101', 'SUP-ACC-2601', 500.0, 'SET', CURRENT_DATE - 5, CURRENT_DATE + 700, 'RELEASED')
ON CONFLICT (id) DO UPDATE SET
    batch_number = EXCLUDED.batch_number,
    quantity = EXCLUDED.quantity,
    status = EXCLUDED.status;

-- 6. BILL OF MATERIALS (BOM-SEAT-101 Rev A)
DELETE FROM bom_component WHERE bom_id = 'BOM-SEAT-101';
DELETE FROM bom_header WHERE bom_id = 'BOM-SEAT-101';

INSERT INTO bom_header (bom_id, parent_material, revision, effective_from, status)
VALUES ('BOM-SEAT-101', 'SEAT-DRV-101', 'A', CURRENT_DATE - 10, 'RELEASED');

INSERT INTO bom_component (id, bom_id, line_no, parent_material, component_material, component_type, qty, uom)
VALUES
(gen_random_uuid(), 'BOM-SEAT-101', 10, 'SEAT-DRV-101', 'FRAME-LH-101', 'FRAME', 1, 'PCS'),
(gen_random_uuid(), 'BOM-SEAT-101', 11, 'SEAT-DRV-101', 'RAIL-LH-201', 'HARDWARE', 1, 'SET'),
(gen_random_uuid(), 'BOM-SEAT-101', 12, 'SEAT-DRV-101', 'BRKT-LH-301', 'BRACKET', 1, 'SET'),

(gen_random_uuid(), 'BOM-SEAT-101', 20, 'SEAT-DRV-101', 'RECL-101', 'MECHANISM', 1, 'PCS'),
(gen_random_uuid(), 'BOM-SEAT-101', 21, 'SEAT-DRV-101', 'LEVR-101', 'HARDWARE', 1, 'PCS'),
(gen_random_uuid(), 'BOM-SEAT-101', 22, 'SEAT-DRV-101', 'FAST-101', 'HARDWARE', 1, 'SET'),

(gen_random_uuid(), 'BOM-SEAT-101', 30, 'SEAT-DRV-101', 'FOAM-CSH-101', 'FOAM', 1, 'PCS'),
(gen_random_uuid(), 'BOM-SEAT-101', 31, 'SEAT-DRV-101', 'FOAM-BST-101', 'FOAM', 1, 'PCS'),

(gen_random_uuid(), 'BOM-SEAT-101', 40, 'SEAT-DRV-101', 'COV-LH-101', 'TRIM', 1, 'PCS'),
(gen_random_uuid(), 'BOM-SEAT-101', 41, 'SEAT-DRV-101', 'CLIP-TRM-101', 'HARDWARE', 1, 'SET'),
(gen_random_uuid(), 'BOM-SEAT-101', 42, 'SEAT-DRV-101', 'TRIM-LH-101', 'TRIM', 1, 'SET'),

(gen_random_uuid(), 'BOM-SEAT-101', 50, 'SEAT-DRV-101', 'HDRST-101', 'ACCESSORY', 1, 'PCS'),
(gen_random_uuid(), 'BOM-SEAT-101', 51, 'SEAT-DRV-101', 'COV-SD-101', 'PLASTIC', 1, 'SET'),
(gen_random_uuid(), 'BOM-SEAT-101', 52, 'SEAT-DRV-101', 'ACC-KIT-101', 'ACCESSORY', 1, 'SET');

-- 7. ROUTING (RT-SEAT-01 Rev A)
DELETE FROM routing_operation WHERE routing_id = 'RT-SEAT-01';
DELETE FROM routing_header WHERE routing_id = 'RT-SEAT-01';

INSERT INTO routing_header (routing_id, material_code, revision, description, status)
VALUES ('RT-SEAT-01', 'SEAT-DRV-101', 'A', '6-Station Progressive Automotive Seat Assembly', 'RELEASED');

INSERT INTO routing_operation (id, routing_id, operation_no, operation_code, operation_name, work_center, machine_code)
VALUES
(gen_random_uuid(), 'RT-SEAT-01', 10, 'ST-01', 'Seat frame assembly', 'WC-FRAME', 'ST-SEAT-01'),
(gen_random_uuid(), 'RT-SEAT-01', 20, 'ST-02', 'Recliner mechanism fitting', 'WC-RECL', 'ST-SEAT-02'),
(gen_random_uuid(), 'RT-SEAT-01', 30, 'ST-03', 'Foam installation', 'WC-FOAM', 'ST-SEAT-03'),
(gen_random_uuid(), 'RT-SEAT-01', 40, 'ST-04', 'Upholstery installation', 'WC-UPHL', 'ST-SEAT-04'),
(gen_random_uuid(), 'RT-SEAT-01', 50, 'ST-05', 'Final seat assembly', 'WC-FASSY', 'ST-SEAT-05'),
(gen_random_uuid(), 'RT-SEAT-01', 60, 'ST-06', 'Final quality inspection', 'WC-FQC', 'ST-SEAT-06');

-- 8. MASTER RECIPE (REC-SEAT-101)
DELETE FROM batch_recipes WHERE recipe_code = 'REC-SEAT-101';

INSERT INTO batch_recipes (
    id, product_id, recipe_code, recipe_name, version, master_formula,
    planned_yield_pct, status, created_by,
    bom, process_instructions
)
VALUES (
    '70111111-0006-1111-1111-111111111111',
    '30111111-0006-1111-1111-111111111111',
    'REC-SEAT-101',
    'Front Driver Seat Assembly (AutoComfort)',
    'A',
    'Progressive 6-station lean flow seat cell assembly for automotive driver seat with integrated recliner, ergonomic high-density foam, leatherette trim, and end-of-line functional inspection.',
    99.2,
    'ACTIVE',
    '11111111-1111-1111-1111-111111111111',
    '[
        {"component_code": "FRAME-LH-101", "component_name": "Driver-side seat frame", "quantity": 1, "uom": "PCS", "purpose": "Structural chassis"},
        {"component_code": "RAIL-LH-201", "component_name": "Seat slider rail kit", "quantity": 1, "uom": "SET", "purpose": "Fore-aft sliding mechanism"},
        {"component_code": "BRKT-LH-301", "component_name": "Mounting bracket kit", "quantity": 1, "uom": "SET", "purpose": "Floor mounting brackets"},
        {"component_code": "RECL-101", "component_name": "Recliner mechanism", "quantity": 1, "uom": "PCS", "purpose": "Backrest angle adjust"},
        {"component_code": "LEVR-101", "component_name": "Adjustment lever", "quantity": 1, "uom": "PCS", "purpose": "Operator manual control lever"},
        {"component_code": "FAST-101", "component_name": "Fastener kit", "quantity": 1, "uom": "SET", "purpose": "M8/M10 flange bolts & torx screws"},
        {"component_code": "FOAM-CSH-101", "component_name": "Seat cushion foam", "quantity": 1, "uom": "PCS", "purpose": "High-density molded PU cushion"},
        {"component_code": "FOAM-BST-101", "component_name": "Backrest foam", "quantity": 1, "uom": "PCS", "purpose": "High-density molded PU backrest"},
        {"component_code": "COV-LH-101", "component_name": "Seat cover", "quantity": 1, "uom": "PCS", "purpose": "Premium perforated leatherette"},
        {"component_code": "CLIP-TRM-101", "component_name": "Trim clips", "quantity": 1, "uom": "SET", "purpose": "Hog rings & trim retention clips"},
        {"component_code": "TRIM-LH-101", "component_name": "Trim components", "quantity": 1, "uom": "SET", "purpose": "Side valance & bezel trim"},
        {"component_code": "HDRST-101", "component_name": "Headrest", "quantity": 1, "uom": "PCS", "purpose": "Adjustable headrest"},
        {"component_code": "COV-SD-101", "component_name": "Side covers", "quantity": 1, "uom": "SET", "purpose": "Protective plastic hinge shields"},
        {"component_code": "ACC-KIT-101", "component_name": "Specified accessories kit", "quantity": 1, "uom": "SET", "purpose": "Wiring harness & buckle sensor"}
    ]'::jsonb,
    '[
        {
            "step": 1,
            "operation_name": "Seat frame assembly",
            "operation_code": "ST-01",
            "machine_code": "ST-SEAT-01",
            "work_center": "WC-FRAME",
            "instruction": "Scan frame, slider rails, and mounting brackets against BOM. Position on assembly jig and torque fasteners to 28 Nm.",
            "cpp": "Fastener Torque: 28 ± 2 Nm, Rail Parallelism: < 0.5 mm",
            "signoff_role": "Assembly Operator"
        },
        {
            "step": 2,
            "operation_name": "Recliner mechanism fitting",
            "operation_code": "ST-02",
            "machine_code": "ST-SEAT-02",
            "work_center": "WC-RECL",
            "instruction": "Scan recliner mechanism, adjustment lever, and fastener kit. Align recliner gear quadrant and torque to 35 Nm. Test smooth detent locking.",
            "cpp": "Quadrant Engagement: 100%, Actuation Effort: 15–25 N",
            "signoff_role": "Assembly Operator"
        },
        {
            "step": 3,
            "operation_name": "Foam installation",
            "operation_code": "ST-03",
            "machine_code": "ST-SEAT-03",
            "work_center": "WC-FOAM",
            "instruction": "Scan seat cushion foam and backrest foam. Seat cushion foam into bottom frame pan, ensuring wire harness channels remain uninhibited.",
            "cpp": "Listing Wire Retention: 100%, Foam Gap: 0 mm",
            "signoff_role": "Assembly Operator"
        },
        {
            "step": 4,
            "operation_name": "Upholstery installation",
            "operation_code": "ST-04",
            "machine_code": "ST-SEAT-04",
            "work_center": "WC-UPHL",
            "instruction": "Scan seat cover, clips, and trim components. Pull cover taut over foam contours, secure with hog-rings. Inspect seam straightness and lack of wrinkles.",
            "cpp": "Seam Alignment: ±1.5 mm, Hog-ring Pitch: 45 mm",
            "signoff_role": "Quality Inspector"
        },
        {
            "step": 5,
            "operation_name": "Final seat assembly",
            "operation_code": "ST-05",
            "machine_code": "ST-SEAT-05",
            "work_center": "WC-FASSY",
            "instruction": "Scan headrest, side protective covers, and electrical accessory harness kit. Assemble headrest notch guide, snap side covers, and connect electrical buckle check.",
            "cpp": "Headrest Detent Load: 40–60 N, Circuit Resistance: < 0.5 Ohm",
            "signoff_role": "Quality Inspector"
        },
        {
            "step": 6,
            "operation_name": "Final quality inspection",
            "operation_code": "ST-06",
            "machine_code": "ST-SEAT-06",
            "work_center": "WC-FQC",
            "instruction": "Scan completed seat serial number QR tag. Perform full functional 360 inspection checklist, verify slide travel, recline detent, and seal electronic genealogy record.",
            "cpp": "Full Stroke Slide Travel: 220 mm, Recline Range: 65°–125°",
            "signoff_role": "Quality Supervisor"
        }
    ]'::jsonb
);

-- 9. WORK ORDER (WO-SEAT-2026-001)
INSERT INTO work_orders (
    id, wo_number, product_id, target_quantity, completed_quantity, scrap_quantity,
    planned_start, planned_end, status, created_by, plant_id, revision
)
VALUES (
    '80111111-0007-1111-1111-111111111111',
    'WO-SEAT-2026-001',
    '30111111-0006-1111-1111-111111111111',
    100,
    14,
    0,
    CURRENT_DATE,
    CURRENT_DATE + 3,
    'IN_PROGRESS',
    '11111111-1111-1111-1111-111111111111',
    'a0000000-0001-1111-1111-111111111111',
    1
)
ON CONFLICT (id) DO UPDATE SET
    wo_number = EXCLUDED.wo_number,
    product_id = EXCLUDED.product_id,
    target_quantity = EXCLUDED.target_quantity,
    completed_quantity = EXCLUDED.completed_quantity,
    status = EXCLUDED.status,
    plant_id = EXCLUDED.plant_id;

COMMIT;
