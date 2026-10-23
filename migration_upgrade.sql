-- Upgrade Script: UGAM MES to Pharmaceutical MES

-- 1. Create New Tables for Material Management and Compliance

CREATE TABLE IF NOT EXISTS vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_code VARCHAR(50) UNIQUE NOT NULL,
    vendor_name VARCHAR(255) NOT NULL,
    qualification_status VARCHAR(50) NOT NULL, -- 'QUALIFIED', 'PROVISIONAL', 'DISQUALIFIED'
    audit_date DATE,
    contact_information TEXT,
    approved_materials JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS material_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_code VARCHAR(100) UNIQUE NOT NULL,
    material_name VARCHAR(255) NOT NULL,
    material_type VARCHAR(50) NOT NULL, -- 'API', 'EXCIPIENT', 'RAW_MATERIAL', 'PACKAGING', 'LABEL', 'SEMI_FINISHED', 'FINISHED'
    category VARCHAR(100),
    uom VARCHAR(20) NOT NULL,
    manufacturer VARCHAR(255),
    vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
    shelf_life_days INTEGER,
    storage_conditions VARCHAR(255),
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS storage_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE,
    area VARCHAR(100) NOT NULL,
    rack VARCHAR(50),
    bin VARCHAR(50),
    code VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS goods_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grn_number VARCHAR(50) UNIQUE NOT NULL,
    vendor_id UUID REFERENCES vendors(id) NOT NULL,
    material_id UUID REFERENCES material_master(id) NOT NULL,
    batch_number VARCHAR(100) NOT NULL,
    quantity_received DECIMAL(12, 4) NOT NULL,
    manufacturing_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    coa_attachment VARCHAR(255),
    status VARCHAR(50) DEFAULT 'PENDING_QC',
    received_by UUID REFERENCES users(id),
    received_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS material_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goods_receipt_id UUID REFERENCES goods_receipts(id) ON DELETE SET NULL,
    material_id UUID REFERENCES material_master(id) NOT NULL,
    batch_number VARCHAR(100) UNIQUE NOT NULL,
    supplier_batch VARCHAR(100),
    quantity DECIMAL(12, 4) NOT NULL,
    uom VARCHAR(20) NOT NULL,
    manufacturing_date DATE,
    expiry_date DATE,
    status VARCHAR(50) DEFAULT 'QUARANTINE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS material_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_batch_id UUID REFERENCES material_batches(id) ON DELETE CASCADE,
    storage_location_id UUID REFERENCES storage_locations(id) ON DELETE SET NULL,
    quantity DECIMAL(12, 4) NOT NULL DEFAULT 0.0000,
    allocated_quantity DECIMAL(12, 4) NOT NULL DEFAULT 0.0000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS material_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_batch_id UUID REFERENCES material_batches(id) ON DELETE CASCADE,
    tx_type VARCHAR(50) NOT NULL,
    quantity DECIMAL(12, 4) NOT NULL,
    from_location_id UUID REFERENCES storage_locations(id),
    to_location_id UUID REFERENCES storage_locations(id),
    performed_by UUID REFERENCES users(id),
    reason TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS batch_recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    recipe_code VARCHAR(50) UNIQUE NOT NULL,
    recipe_name VARCHAR(255) NOT NULL,
    version VARCHAR(20) NOT NULL,
    master_formula TEXT,
    bom JSONB NOT NULL,
    process_instructions JSONB NOT NULL,
    planned_yield_pct DECIMAL(5,2) NOT NULL DEFAULT 100.00,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dispensing_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID REFERENCES work_orders(id) ON DELETE CASCADE,
    material_batch_id UUID REFERENCES material_batches(id) NOT NULL,
    requested_quantity DECIMAL(12, 4) NOT NULL,
    dispensed_quantity DECIMAL(12, 4) NOT NULL,
    balance_quantity DECIMAL(12, 4) NOT NULL,
    weighing_records JSONB NOT NULL,
    operator_id UUID REFERENCES users(id),
    verifier_id UUID REFERENCES users(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    signature_id UUID,
    status VARCHAR(50) DEFAULT 'VERIFIED',
    dispensed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS material_consumptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID REFERENCES work_orders(id) ON DELETE CASCADE,
    material_batch_id UUID REFERENCES material_batches(id) NOT NULL,
    planned_quantity DECIMAL(12, 4) NOT NULL,
    actual_quantity DECIMAL(12, 4) NOT NULL,
    variance DECIMAL(12, 4) NOT NULL,
    yield_impact VARCHAR(255),
    consumed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS electronic_batch_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID REFERENCES work_orders(id) UNIQUE NOT NULL,
    materials_used JSONB NOT NULL,
    operators JSONB NOT NULL,
    equipment_used JSONB NOT NULL,
    process_parameters JSONB NOT NULL,
    quality_checks JSONB NOT NULL,
    deviations JSONB NOT NULL,
    signatures JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'IN_PROCESS'
);

CREATE TABLE IF NOT EXISTS batch_material_usages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ebr_id UUID REFERENCES electronic_batch_records(id) ON DELETE CASCADE,
    material_batch_id UUID REFERENCES material_batches(id) NOT NULL,
    quantity DECIMAL(12, 4) NOT NULL,
    uom VARCHAR(20) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS electronic_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) NOT NULL,
    username VARCHAR(100) NOT NULL,
    meaning VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_trail (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    username VARCHAR(100),
    action VARCHAR(255) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    reason TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS equipment_calibrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id UUID REFERENCES machines(id) ON DELETE CASCADE,
    calibration_date DATE NOT NULL,
    next_calibration_due DATE NOT NULL,
    calibrated_by VARCHAR(255) NOT NULL,
    certificate_number VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS equipment_qualifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id UUID REFERENCES machines(id) ON DELETE CASCADE,
    qualification_type VARCHAR(50) NOT NULL,
    qualification_date DATE NOT NULL,
    expiry_date DATE,
    performed_by VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS deviations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID REFERENCES work_orders(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(50) NOT NULL,
    category VARCHAR(100) NOT NULL,
    reported_by UUID REFERENCES users(id) NOT NULL,
    reported_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'OPEN',
    investigation_details TEXT,
    root_cause TEXT
);

CREATE TABLE IF NOT EXISTS capas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deviation_id UUID REFERENCES deviations(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    assigned_to UUID REFERENCES users(id),
    due_date DATE NOT NULL,
    completed_date DATE,
    status VARCHAR(50) DEFAULT 'OPEN',
    verification_details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS change_controls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    reason_for_change TEXT NOT NULL,
    impact_assessment TEXT,
    status VARCHAR(50) DEFAULT 'DRAFT',
    initiated_by UUID REFERENCES users(id) NOT NULL,
    approved_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS document_management (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_number VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    version VARCHAR(20) NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    file_path VARCHAR(255),
    status VARCHAR(50) DEFAULT 'DRAFT',
    effective_date DATE,
    created_by UUID REFERENCES users(id) NOT NULL,
    approved_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Seed Pharmaceutical Master & Transaction Data (only if not already seeded)

INSERT INTO areas (id, plant_id, name, code)
SELECT 'a7777777-7777-7777-7777-777777777777', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Pharma Formulation Area', 'PHA-FORM'
WHERE NOT EXISTS (SELECT 1 FROM areas WHERE id = 'a7777777-7777-7777-7777-777777777777');

INSERT INTO areas (id, plant_id, name, code)
SELECT 'a8888888-8888-8888-8888-888888888888', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Pharma Packaging Area', 'PHA-PKG'
WHERE NOT EXISTS (SELECT 1 FROM areas WHERE id = 'a8888888-8888-8888-8888-888888888888');

INSERT INTO lines (id, area_id, name, code)
SELECT 'a9999999-9999-9999-9999-999999999999', 'a7777777-7777-7777-7777-777777777777', 'Tableting Line 1', 'TAB-L1'
WHERE NOT EXISTS (SELECT 1 FROM lines WHERE id = 'a9999999-9999-9999-9999-999999999999');

INSERT INTO lines (id, area_id, name, code)
SELECT 'a0000000-0000-0000-0000-000000000000', 'a8888888-8888-8888-8888-888888888888', 'Packaging Line 2', 'PKG-L2'
WHERE NOT EXISTS (SELECT 1 FROM lines WHERE id = 'a0000000-0000-0000-0000-000000000000');

INSERT INTO machines (id, line_id, name, code, status)
SELECT 'e1111111-1111-1111-1111-111111111111', 'a9999999-9999-9999-9999-999999999999', 'Tablet Compression Press', 'TCP-01', 'RUNNING'
WHERE NOT EXISTS (SELECT 1 FROM machines WHERE id = 'e1111111-1111-1111-1111-111111111111');

INSERT INTO machines (id, line_id, name, code, status)
SELECT 'e2222222-2222-2222-2222-222222222222', 'a9999999-9999-9999-9999-999999999999', 'Fluid Bed Dryer', 'FBD-01', 'IDLE'
WHERE NOT EXISTS (SELECT 1 FROM machines WHERE id = 'e2222222-2222-2222-2222-222222222222');

INSERT INTO machines (id, line_id, name, code, status)
SELECT 'e3333333-3333-3333-3333-333333333333', 'a0000000-0000-0000-0000-000000000000', 'Blister Packaging Machine', 'BPM-01', 'SETUP'
WHERE NOT EXISTS (SELECT 1 FROM machines WHERE id = 'e3333333-3333-3333-3333-333333333333');

-- Equipment details
INSERT INTO equipment_qualifications (id, machine_id, qualification_type, qualification_date, expiry_date, performed_by, status, notes)
SELECT gen_random_uuid(), 'e1111111-1111-1111-1111-111111111111', 'IQ', CURRENT_DATE - INTERVAL '180 days', NULL, 'Dr. Robert Chen', 'COMPLETED', 'Installation Qualification approved. Clean room installation meets ISO 8 standards.'
WHERE NOT EXISTS (SELECT 1 FROM equipment_qualifications WHERE machine_id = 'e1111111-1111-1111-1111-111111111111');

INSERT INTO equipment_calibrations (id, machine_id, calibration_date, next_calibration_due, calibrated_by, certificate_number, status)
SELECT gen_random_uuid(), 'e1111111-1111-1111-1111-111111111111', CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '135 days', 'PharmaCal Calibration Inc.', 'CAL-TCP-00891', 'PASSED'
WHERE NOT EXISTS (SELECT 1 FROM equipment_calibrations WHERE machine_id = 'e1111111-1111-1111-1111-111111111111');

-- Vendors
INSERT INTO vendors (id, vendor_code, vendor_name, qualification_status, audit_date, contact_information, approved_materials)
SELECT '20111111-1111-1111-1111-111111111111', 'VEND-01', 'PharmaChem Labs', 'QUALIFIED', CURRENT_DATE - INTERVAL '90 days', 'Quality Director, qadir@pharmachem.com', '["MAT-API-IBU", "MAT-EXC-MAG"]'
WHERE NOT EXISTS (SELECT 1 FROM vendors WHERE id = '20111111-1111-1111-1111-111111111111');

INSERT INTO vendors (id, vendor_code, vendor_name, qualification_status, audit_date, contact_information, approved_materials)
SELECT '20222222-2222-2222-2222-222222222222', 'VEND-02', 'BioOrganics Corp', 'QUALIFIED', CURRENT_DATE - INTERVAL '60 days', 'Pharma Sales, contact@bioorganics.com', '["MAT-API-APAP", "MAT-EXC-LAC"]'
WHERE NOT EXISTS (SELECT 1 FROM vendors WHERE id = '20222222-2222-2222-2222-222222222222');

INSERT INTO vendors (id, vendor_code, vendor_name, qualification_status, audit_date, contact_information, approved_materials)
SELECT '20333333-3333-3333-3333-333333333333', 'VEND-03', 'PackSmart Solutions', 'QUALIFIED', CURRENT_DATE - INTERVAL '120 days', 'Account Executive, info@packsmart.com', '["MAT-PKG-BLI"]'
WHERE NOT EXISTS (SELECT 1 FROM vendors WHERE id = '20333333-3333-3333-3333-333333333333');

-- Material Master
INSERT INTO material_master (id, material_code, material_name, material_type, category, uom, manufacturer, vendor_id, shelf_life_days, storage_conditions, status)
SELECT '10111111-1111-1111-1111-111111111111', 'MAT-API-APAP', 'Acetaminophen (APAP) Active Ingredient', 'API', 'Active Ingredients', 'G', 'BioOrganics Corp', '20222222-2222-2222-2222-222222222222', 730, 'Store at 15-30°C, dry area', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM material_master WHERE id = '10111111-1111-1111-1111-111111111111');

INSERT INTO material_master (id, material_code, material_name, material_type, category, uom, manufacturer, vendor_id, shelf_life_days, storage_conditions, status)
SELECT '10222222-2222-2222-2222-222222222222', 'MAT-API-IBU', 'Ibuprofen Active Ingredient', 'API', 'Active Ingredients', 'G', 'PharmaChem Labs', '20111111-1111-1111-1111-111111111111', 1095, 'Store below 25°C, protect from light', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM material_master WHERE id = '10222222-2222-2222-2222-222222222222');

INSERT INTO material_master (id, material_code, material_name, material_type, category, uom, manufacturer, vendor_id, shelf_life_days, storage_conditions, status)
SELECT '10333333-3333-3333-3333-333333333333', 'MAT-EXC-LAC', 'Lactose Monohydrate', 'EXCIPIENT', 'Binders & Fillers', 'G', 'BioOrganics Corp', '20222222-2222-2222-2222-222222222222', 1460, 'Keep dry, store at room temperature', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM material_master WHERE id = '10333333-3333-3333-3333-333333333333');

INSERT INTO material_master (id, material_code, material_name, material_type, category, uom, manufacturer, vendor_id, shelf_life_days, storage_conditions, status)
SELECT '10444444-4444-4444-4444-444444444444', 'MAT-EXC-MAG', 'Magnesium Stearate', 'EXCIPIENT', 'Lubricants', 'G', 'PharmaChem Labs', '20111111-1111-1111-1111-111111111111', 1095, 'Keep dry, store at room temperature', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM material_master WHERE id = '10444444-4444-4444-4444-444444444444');

INSERT INTO material_master (id, material_code, material_name, material_type, category, uom, manufacturer, vendor_id, shelf_life_days, storage_conditions, status)
SELECT '10555555-5555-5555-5555-555555555555', 'MAT-PKG-BLI', 'Alu-Alu Blister Foil', 'PACKAGING', 'Packaging Materials', 'PCS', 'PackSmart Solutions', '20333333-3333-3333-3333-333333333333', 1825, 'Store at room temperature', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM material_master WHERE id = '10555555-5555-5555-5555-555555555555');

-- Warehouses & Storage locations
INSERT INTO warehouses (id, code, name, location)
SELECT '30111111-1111-1111-1111-111111111111', 'WH-PH-01', 'Boston Central Pharmaceutical Warehouse', 'Facility Building B, Suite 100'
WHERE NOT EXISTS (SELECT 1 FROM warehouses WHERE id = '30111111-1111-1111-1111-111111111111');

INSERT INTO storage_locations (id, warehouse_id, area, rack, bin, code)
SELECT '40111111-1111-1111-1111-111111111111', '30111111-1111-1111-1111-111111111111', 'RELEASED_STOCKS', 'RACK-01', 'BIN-A', 'WH-PH-R1'
WHERE NOT EXISTS (SELECT 1 FROM storage_locations WHERE id = '40111111-1111-1111-1111-111111111111');

INSERT INTO storage_locations (id, warehouse_id, area, rack, bin, code)
SELECT '40222222-2222-2222-2222-222222222222', '30111111-1111-1111-1111-111111111111', 'QUARANTINE_STOCKS', 'RACK-02', 'BIN-B', 'WH-PH-Q1'
WHERE NOT EXISTS (SELECT 1 FROM storage_locations WHERE id = '40222222-2222-2222-2222-222222222222');

-- Goods Receipts
INSERT INTO goods_receipts (id, grn_number, vendor_id, material_id, batch_number, quantity_received, manufacturing_date, expiry_date, coa_attachment, status)
SELECT '50111111-1111-1111-1111-111111111111', 'GRN-2026-0001', '20222222-2222-2222-2222-222222222222', '10111111-1111-1111-1111-111111111111', 'SUP-APAP-89', 500000.0000, CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE + INTERVAL '700 days', 'COA-APAP-89.pdf', 'RELEASED'
WHERE NOT EXISTS (SELECT 1 FROM goods_receipts WHERE id = '50111111-1111-1111-1111-111111111111');

INSERT INTO goods_receipts (id, grn_number, vendor_id, material_id, batch_number, quantity_received, manufacturing_date, expiry_date, coa_attachment, status)
SELECT '50222222-2222-2222-2222-222222222222', 'GRN-2026-0002', '20222222-2222-2222-2222-222222222222', '10333333-3333-3333-3333-333333333333', 'SUP-LAC-01', 200000.0000, CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE + INTERVAL '1445 days', 'COA-LAC-01.pdf', 'RELEASED'
WHERE NOT EXISTS (SELECT 1 FROM goods_receipts WHERE id = '50222222-2222-2222-2222-222222222222');

-- Material Batches
INSERT INTO material_batches (id, goods_receipt_id, material_id, batch_number, supplier_batch, quantity, uom, manufacturing_date, expiry_date, status)
SELECT 'b0111111-1111-1111-1111-111111111111', '50111111-1111-1111-1111-111111111111', '10111111-1111-1111-1111-111111111111', 'LOT-APAP-2026-01', 'SUP-APAP-89', 500000.0000, 'G', CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE + INTERVAL '700 days', 'RELEASED'
WHERE NOT EXISTS (SELECT 1 FROM material_batches WHERE id = 'b0111111-1111-1111-1111-111111111111');

INSERT INTO material_batches (id, goods_receipt_id, material_id, batch_number, supplier_batch, quantity, uom, manufacturing_date, expiry_date, status)
SELECT 'b0222222-2222-2222-2222-222222222222', '50222222-2222-2222-2222-222222222222', '10333333-3333-3333-3333-333333333333', 'LOT-LAC-2026-01', 'SUP-LAC-01', 200000.0000, 'G', CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE + INTERVAL '1445 days', 'RELEASED'
WHERE NOT EXISTS (SELECT 1 FROM material_batches WHERE id = 'b0222222-2222-2222-2222-222222222222');

INSERT INTO material_batches (id, goods_receipt_id, material_id, batch_number, supplier_batch, quantity, uom, manufacturing_date, expiry_date, status)
SELECT 'b0333333-3333-3333-3333-333333333333', NULL, '10444444-4444-4444-4444-444444444444', 'LOT-MAG-2026-01', 'SUP-MAG-04', 15000.0000, 'G', CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '1085 days', 'RELEASED'
WHERE NOT EXISTS (SELECT 1 FROM material_batches WHERE id = 'b0333333-3333-3333-3333-333333333333');

INSERT INTO material_batches (id, goods_receipt_id, material_id, batch_number, supplier_batch, quantity, uom, manufacturing_date, expiry_date, status)
SELECT 'b0444444-4444-4444-4444-444444444444', NULL, '10555555-5555-5555-5555-555555555555', 'LOT-BLI-2026-01', 'SUP-BLI-99', 8000.0000, 'PCS', CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE + INTERVAL '1820 days', 'RELEASED'
WHERE NOT EXISTS (SELECT 1 FROM material_batches WHERE id = 'b0444444-4444-4444-4444-444444444444');

-- Material Inventory
INSERT INTO material_inventory (id, material_batch_id, storage_location_id, quantity, allocated_quantity)
SELECT gen_random_uuid(), 'b0111111-1111-1111-1111-111111111111', '40111111-1111-1111-1111-111111111111', 500000.0000, 0.0000
WHERE NOT EXISTS (SELECT 1 FROM material_inventory WHERE material_batch_id = 'b0111111-1111-1111-1111-111111111111');

INSERT INTO material_inventory (id, material_batch_id, storage_location_id, quantity, allocated_quantity)
SELECT gen_random_uuid(), 'b0222222-2222-2222-2222-222222222222', '40111111-1111-1111-1111-111111111111', 200000.0000, 0.0000
WHERE NOT EXISTS (SELECT 1 FROM material_inventory WHERE material_batch_id = 'b0222222-2222-2222-2222-222222222222');

INSERT INTO material_inventory (id, material_batch_id, storage_location_id, quantity, allocated_quantity)
SELECT gen_random_uuid(), 'b0333333-3333-3333-3333-333333333333', '40111111-1111-1111-1111-111111111111', 15000.0000, 0.0000
WHERE NOT EXISTS (SELECT 1 FROM material_inventory WHERE material_batch_id = 'b0333333-3333-3333-3333-333333333333');

INSERT INTO material_inventory (id, material_batch_id, storage_location_id, quantity, allocated_quantity)
SELECT gen_random_uuid(), 'b0444444-4444-4444-4444-444444444444', '40111111-1111-1111-1111-111111111111', 8000.0000, 0.0000
WHERE NOT EXISTS (SELECT 1 FROM material_inventory WHERE material_batch_id = 'b0444444-4444-4444-4444-444444444444');

-- Finished Products
INSERT INTO products (id, sku, name, description, uom)
SELECT 'f1111111-1111-1111-1111-111111111111', 'PH-TAB-APAP500', 'Acetaminophen 500mg Tablets', 'Analgesic and antipyretic oral tablets', 'PCS'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE id = 'f1111111-1111-1111-1111-111111111111');

INSERT INTO products (id, sku, name, description, uom)
SELECT 'f2222222-2222-2222-2222-222222222222', 'PH-CAP-IBU400', 'Ibuprofen 400mg Capsules', 'Non-steroidal anti-inflammatory capsules', 'PCS'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE id = 'f2222222-2222-2222-2222-222222222222');

INSERT INTO products (id, sku, name, description, uom)
SELECT 'f3333333-3333-3333-3333-333333333333', 'PH-SYR-COUGH', 'Ugam Antitussive Cough Syrup 100ml', 'Liquid oral suspension syrup', 'BOT'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE id = 'f3333333-3333-3333-3333-333333333333');

INSERT INTO products (id, sku, name, description, uom)
SELECT 'f4444444-4444-4444-4444-444444444444', 'PH-INJ-SAL09', 'Sterile Saline Infusion 0.9% 500ml', 'Intravenous sterile injectable bag', 'PCS'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE id = 'f4444444-4444-4444-4444-444444444444');

-- Recipes
INSERT INTO batch_recipes (id, product_id, recipe_code, recipe_name, version, master_formula, bom, process_instructions, planned_yield_pct)
SELECT '60111111-1111-1111-1111-111111111111', 'f1111111-1111-1111-1111-111111111111', 'REC-APAP-500', 'Acetaminophen 500mg Compression Recipe', 'v1.0', 
'Formulation for 1000 tablets: Acetaminophen API 500g, Lactose Monohydrate 100g, Magnesium Stearate 5g, Alu-Blister Foil 100pcs.', 
'[
  {"material_code": "MAT-API-APAP", "quantity": 0.5, "uom": "G", "purpose": "Active Ingredient"},
  {"material_code": "MAT-EXC-LAC", "quantity": 0.1, "uom": "G", "purpose": "Filler/Binder"},
  {"material_code": "MAT-EXC-MAG", "quantity": 0.005, "uom": "G", "purpose": "Lubricant"},
  {"material_code": "MAT-PKG-BLI", "quantity": 0.1, "uom": "PCS", "purpose": "Blister Packaging"}
]', 
'[
  {"step": 1, "operation": "Sifting & Milling", "instruction": "Sift Acetaminophen and Lactose through #40 mesh. Sift Magnesium Stearate through #60 mesh.", "critical_params": "Mesh check, speed 500rpm"},
  {"step": 2, "operation": "Wet Granulation", "instruction": "Granulate with purified water. Mix for 15 minutes at high shear.", "critical_params": "Granulation endpoint, water quantity"},
  {"step": 3, "operation": "Drying", "instruction": "Dry granules in FBD-01 at 55°C until LOD (Loss on Drying) is between 1.5% and 2.0%.", "critical_params": "LOD < 2.0%, Temperature 55°C"},
  {"step": 4, "operation": "Lubrication", "instruction": "Add Magnesium Stearate and blend in octagonal blender for 5 minutes.", "critical_params": "Blending speed 15rpm, time 5 min"},
  {"step": 5, "operation": "Compression", "instruction": "Compress into tablets on TCP-01. Average tablet weight: 605mg ± 5%. Target hardness: 10-14 Kp.", "critical_params": "Avg Weight 605mg, Hardness 10-14 Kp, Thickness 4.2mm"},
  {"step": 6, "operation": "Packaging", "instruction": "Pack 10 tablets per blister on BPM-01 blister packaging machine.", "critical_params": "Sealing temperature 185°C, seal integrity"}
]', 99.20
WHERE NOT EXISTS (SELECT 1 FROM batch_recipes WHERE id = '60111111-1111-1111-1111-111111111111');

-- Work Orders
INSERT INTO work_orders (id, wo_number, product_id, target_quantity, completed_quantity, scrap_quantity, planned_start, planned_end, actual_start, status, created_by)
SELECT '70111111-1111-1111-1111-111111111111', 'BATCH-2026-0001', 'f1111111-1111-1111-1111-111111111111', 1000, 990, 8, CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE + INTERVAL '1 day', CURRENT_DATE - INTERVAL '2 days', 'IN_PROGRESS', '22222222-2222-2222-2222-222222222222'
WHERE NOT EXISTS (SELECT 1 FROM work_orders WHERE id = '70111111-1111-1111-1111-111111111111');

INSERT INTO work_orders (id, wo_number, product_id, target_quantity, completed_quantity, scrap_quantity, planned_start, planned_end, actual_start, status, created_by)
SELECT '70222222-2222-2222-2222-222222222222', 'BATCH-2026-0002', 'f1111111-1111-1111-1111-111111111111', 5000, 0, 0, CURRENT_DATE + INTERVAL '5 days', CURRENT_DATE + INTERVAL '7 days', NULL, 'PLANNED', '22222222-2222-2222-2222-222222222222'
WHERE NOT EXISTS (SELECT 1 FROM work_orders WHERE id = '70222222-2222-2222-2222-222222222222');

-- Dispensing Records
INSERT INTO dispensing_records (id, work_order_id, material_batch_id, requested_quantity, dispensed_quantity, balance_quantity, weighing_records, operator_id, verifier_id, verified_at, signature_id, status)
SELECT gen_random_uuid(), '70111111-1111-1111-1111-111111111111', 'b0111111-1111-1111-1111-111111111111', 500.0000, 500.0000, 499500.0000, '{"scale_id": "SCALE-01", "tare_weight_g": 1200.00, "gross_weight_g": 1700.00, "net_weight_g": 500.00}', '44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', CURRENT_TIMESTAMP - INTERVAL '1 day', NULL, 'VERIFIED'
WHERE NOT EXISTS (SELECT 1 FROM dispensing_records WHERE work_order_id = '70111111-1111-1111-1111-111111111111' AND material_batch_id = 'b0111111-1111-1111-1111-111111111111');

INSERT INTO dispensing_records (id, work_order_id, material_batch_id, requested_quantity, dispensed_quantity, balance_quantity, weighing_records, operator_id, verifier_id, verified_at, signature_id, status)
SELECT gen_random_uuid(), '70111111-1111-1111-1111-111111111111', 'b0222222-2222-2222-2222-222222222222', 100.0000, 100.0000, 199900.0000, '{"scale_id": "SCALE-02", "tare_weight_g": 500.00, "gross_weight_g": 600.00, "net_weight_g": 100.00}', '44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', CURRENT_TIMESTAMP - INTERVAL '1 day', NULL, 'VERIFIED'
WHERE NOT EXISTS (SELECT 1 FROM dispensing_records WHERE work_order_id = '70111111-1111-1111-1111-111111111111' AND material_batch_id = 'b0222222-2222-2222-2222-222222222222');

-- Material Consumptions
INSERT INTO material_consumptions (id, work_order_id, material_batch_id, planned_quantity, actual_quantity, variance, yield_impact)
SELECT gen_random_uuid(), '70111111-1111-1111-1111-111111111111', 'b0111111-1111-1111-1111-111111111111', 500.0000, 500.0000, 0.0000, 'None'
WHERE NOT EXISTS (SELECT 1 FROM material_consumptions WHERE work_order_id = '70111111-1111-1111-1111-111111111111' AND material_batch_id = 'b0111111-1111-1111-1111-111111111111');

INSERT INTO material_consumptions (id, work_order_id, material_batch_id, planned_quantity, actual_quantity, variance, yield_impact)
SELECT gen_random_uuid(), '70111111-1111-1111-1111-111111111111', 'b0222222-2222-2222-2222-222222222222', 100.0000, 101.2000, 1.2000, 'Minor bulk variance, no critical yield impact'
WHERE NOT EXISTS (SELECT 1 FROM material_consumptions WHERE work_order_id = '70111111-1111-1111-1111-111111111111' AND material_batch_id = 'b0222222-2222-2222-2222-222222222222');

-- Electronic Batch Records
INSERT INTO electronic_batch_records (id, work_order_id, materials_used, operators, equipment_used, process_parameters, quality_checks, deviations, signatures, status)
SELECT 'e1011111-1111-1111-1111-111111111111', '70111111-1111-1111-1111-111111111111', 
'[
  {"material_code": "MAT-API-APAP", "batch_number": "LOT-APAP-2026-01", "quantity": 500.0, "uom": "G"},
  {"material_code": "MAT-EXC-LAC", "batch_number": "LOT-LAC-2026-01", "quantity": 101.2, "uom": "G"}
]',
'[
  {"username": "operator1", "name": "David Lightman", "role": "OPERATOR", "action": "Weighing & Dispensing", "timestamp": "2026-06-20T10:15:00Z"},
  {"username": "operator1", "name": "David Lightman", "role": "OPERATOR", "action": "Sifting & Granulation", "timestamp": "2026-06-20T11:45:00Z"},
  {"username": "operator1", "name": "David Lightman", "role": "OPERATOR", "action": "Tablet Compression", "timestamp": "2026-06-21T09:00:00Z"}
]',
'[
  {"machine_code": "TCP-01", "name": "Tablet Compression Press", "runtime_minutes": 180, "cleaning_status": "CLEANED_VALIDATED"},
  {"machine_code": "FBD-01", "name": "Fluid Bed Dryer", "runtime_minutes": 60, "cleaning_status": "CLEANED"}
]',
'[
  {"parameter": "Dryer Air Temperature", "target": "55°C", "actual": "54.8°C", "status": "WITHIN_LIMITS"},
  {"parameter": "Compression Force", "target": "15 kN", "actual": "14.9 kN", "status": "WITHIN_LIMITS"},
  {"parameter": "Blending Speed", "target": "15 rpm", "actual": "15 rpm", "status": "WITHIN_LIMITS"}
]',
'[
  {"check": "Tablet Hardness", "value": "12 Kp", "status": "PASSED"},
  {"check": "Tablet Weight Variation", "value": "603mg avg (meets USP)", "status": "PASSED"},
  {"check": "Tablet Thickness", "value": "4.18mm", "status": "PASSED"}
]',
'[]',
'[
  {"stage": "Dispensing Verification", "user": "supervisor", "name": "Robert Patrick", "meaning": "Weighing Verification", "timestamp": "2026-06-20T10:20:00Z"},
  {"stage": "Production Completion", "user": "manager", "name": "Sarah Connor", "meaning": "Production Review & Sign-off", "timestamp": "2026-06-21T17:30:00Z"}
]', 'IN_PROCESS'
WHERE NOT EXISTS (SELECT 1 FROM electronic_batch_records WHERE id = 'e1011111-1111-1111-1111-111111111111');

-- Deviations
INSERT INTO deviations (id, work_order_id, title, description, severity, category, reported_by, reported_at, status, investigation_details, root_cause)
SELECT 'd0111111-1111-1111-1111-111111111111', '70111111-1111-1111-1111-111111111111', 'LOD Moisture Level Exceedance', 'Dryer LOD moisture reading registered 2.4% at the planned drying endpoint (target range: 1.5% - 2.0%).', 'MINOR', 'PROCESS', '44444444-4444-4444-4444-444444444444', CURRENT_TIMESTAMP - INTERVAL '2 days', 'CLOSED', 'Dryer run extended for an additional 15 minutes at 55°C. Retesting showed LOD at 1.7%, which is within acceptable specification.', 'Inadequate air flow volume due to dirty air intake filter (replaced during corrective action).'
WHERE NOT EXISTS (SELECT 1 FROM deviations WHERE id = 'd0111111-1111-1111-1111-111111111111');

INSERT INTO capas (id, deviation_id, title, action_type, description, assigned_to, due_date, completed_date, status, verification_details)
SELECT gen_random_uuid(), 'd0111111-1111-1111-1111-111111111111', 'Update SOP for Dryer Air Intake Filter Maintenance', 'PREVENTIVE', 'Amend SOP-FBD-002 to increase frequency of filter cleaning and inspection from monthly to bi-weekly.', '33333333-3333-3333-3333-333333333333', CURRENT_DATE + INTERVAL '10 days', CURRENT_DATE + INTERVAL '1 day', 'COMPLETED', 'SOP-FBD-002 Rev 2.0 published and distributed to operations team. Training records verified.'
WHERE NOT EXISTS (SELECT 1 FROM capas WHERE deviation_id = 'd0111111-1111-1111-1111-111111111111');

-- Change control
INSERT INTO change_controls (id, title, description, reason_for_change, impact_assessment, status, initiated_by, approved_by)
SELECT gen_random_uuid(), 'Upgrade of Blister Packaging Seal Parameters', 'Modify the blister packaging temperature sealing setpoints from 180°C to 185°C to improve seal integrity for Alu-Alu packaging.', 'Occasional minor micro-void leaks detected in high humidity stress chamber tests.', 'No impact on chemical stability of APIs or excipients. Mechanical testing confirms stronger seal strength.', 'APPROVED', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111'
WHERE NOT EXISTS (SELECT 1 FROM change_controls WHERE title = 'Upgrade of Blister Packaging Seal Parameters');

-- Document Management
INSERT INTO document_management (id, document_number, title, version, document_type, file_path, status, effective_date, created_by, approved_by)
SELECT gen_random_uuid(), 'SOP-PROD-102', 'Weighing and Dispensing of Active Pharmaceutical Ingredients', '1.2', 'SOP', 'SOP-PROD-102-v12.pdf', 'EFFECTIVE', CURRENT_DATE - INTERVAL '180 days', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111'
WHERE NOT EXISTS (SELECT 1 FROM document_management WHERE document_number = 'SOP-PROD-102');

INSERT INTO document_management (id, document_number, title, version, document_type, file_path, status, effective_date, created_by, approved_by)
SELECT gen_random_uuid(), 'SOP-QA-045', 'Deviation and Out of Specification (OOS) Reporting Management', '2.0', 'SOP', 'SOP-QA-045-v20.pdf', 'EFFECTIVE', CURRENT_DATE - INTERVAL '360 days', '55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111'
WHERE NOT EXISTS (SELECT 1 FROM document_management WHERE document_number = 'SOP-QA-045');

INSERT INTO document_management (id, document_number, title, version, document_type, file_path, status, effective_date, created_by, approved_by)
SELECT gen_random_uuid(), 'SOP-FBD-002', 'Operation and Cleaning Validation of Fluid Bed Dryer FBD-01', '2.0', 'SOP', 'SOP-FBD-002-v20.pdf', 'EFFECTIVE', CURRENT_DATE - INTERVAL '1 day', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111'
WHERE NOT EXISTS (SELECT 1 FROM document_management WHERE document_number = 'SOP-FBD-002');
