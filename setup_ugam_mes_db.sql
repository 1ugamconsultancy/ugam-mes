-- ==============================================================================
-- UGAM NEXT GEN MES - NEW DATABASE SETUP & POPULATION SCRIPT
-- Target Database: ugam_mes
-- Domain: Precision Automotive Engineering & Discrete Manufacturing
-- Based on Master Data Images (Material Master, Supplier Master, BOM, Routing)
-- ==============================================================================

-- Drop database if exists and recreate clean
DROP DATABASE IF EXISTS ugam_mes;
CREATE DATABASE ugam_mes OWNER mes_admin;
GRANT ALL PRIVILEGES ON DATABASE ugam_mes TO mes_admin;

\c ugam_mes;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Role & Status Enum Types
CREATE TYPE user_role AS ENUM ('ADMIN', 'PRODUCTION_MANAGER', 'SUPERVISOR', 'OPERATOR', 'QUALITY_ENGINEER');
CREATE TYPE work_order_status AS ENUM ('DRAFT', 'PLANNED', 'RELEASED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CLOSED');
CREATE TYPE machine_status AS ENUM ('RUNNING', 'IDLE', 'BREAKDOWN', 'SETUP', 'MAINTENANCE');
CREATE TYPE qc_status AS ENUM ('PENDING', 'PASSED', 'REJECTED', 'CONDITIONAL');
CREATE TYPE inventory_tx_type AS ENUM ('RECEIVE', 'ALLOCATE', 'CONSUME', 'ADJUST', 'SHIP');

-- 1. Users & Authentication
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Plant Hierarchy & Machines
CREATE TABLE plants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    location VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plant_id UUID REFERENCES plants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    area_id UUID REFERENCES areas(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE machines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    line_id UUID REFERENCES lines(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    status machine_status DEFAULT 'IDLE',
    last_status_change TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Vendors / Suppliers
CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_code VARCHAR(50) UNIQUE NOT NULL,
    vendor_name VARCHAR(255) NOT NULL,
    qualification_status VARCHAR(50) NOT NULL,
    audit_date DATE,
    contact_information TEXT,
    approved_materials JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Products & Material Master
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    uom VARCHAR(20) DEFAULT 'PCS',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE material_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_code VARCHAR(100) UNIQUE NOT NULL,
    material_name VARCHAR(255) NOT NULL,
    material_type VARCHAR(50) NOT NULL,
    category VARCHAR(100),
    uom VARCHAR(20) NOT NULL,
    manufacturer VARCHAR(255),
    vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
    shelf_life_days INTEGER,
    storage_conditions VARCHAR(255),
    image_path VARCHAR(255),
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Warehouses & Storage
CREATE TABLE warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE storage_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE,
    area VARCHAR(100) NOT NULL,
    rack VARCHAR(50),
    bin VARCHAR(50),
    code VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Goods Receipts & Inventory Batches
CREATE TABLE goods_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grn_number VARCHAR(50) UNIQUE NOT NULL,
    vendor_id UUID REFERENCES vendors(id) NOT NULL,
    material_id UUID REFERENCES material_master(id) NOT NULL,
    batch_number VARCHAR(100) NOT NULL,
    quantity_received DECIMAL(12, 4) NOT NULL,
    manufacturing_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    coa_attachment VARCHAR(255),
    status VARCHAR(50) DEFAULT 'RELEASED',
    received_by UUID REFERENCES users(id),
    received_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE material_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goods_receipt_id UUID REFERENCES goods_receipts(id) ON DELETE SET NULL,
    material_id UUID REFERENCES material_master(id) NOT NULL,
    batch_number VARCHAR(100) UNIQUE NOT NULL,
    supplier_batch VARCHAR(100),
    quantity DECIMAL(12, 4) NOT NULL,
    uom VARCHAR(20) NOT NULL,
    manufacturing_date DATE,
    expiry_date DATE,
    status VARCHAR(50) DEFAULT 'RELEASED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE material_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_batch_id UUID REFERENCES material_batches(id) ON DELETE CASCADE,
    storage_location_id UUID REFERENCES storage_locations(id) ON DELETE SET NULL,
    quantity DECIMAL(12, 4) NOT NULL DEFAULT 0.0000,
    allocated_quantity DECIMAL(12, 4) NOT NULL DEFAULT 0.0000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE inventory_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    lot_number VARCHAR(100) UNIQUE NOT NULL,
    quantity DECIMAL(12, 4) NOT NULL DEFAULT 0.0000,
    wip_status VARCHAR(50) DEFAULT 'RAW',
    location_code VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE material_transactions (
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

-- 7. Batch Recipes & Process Instructions
CREATE TABLE batch_recipes (
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

-- 8. Work Orders & Execution
CREATE TABLE work_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wo_number VARCHAR(50) UNIQUE NOT NULL,
    product_id UUID REFERENCES products(id) NOT NULL,
    target_quantity INTEGER NOT NULL,
    completed_quantity INTEGER NOT NULL DEFAULT 0,
    scrap_quantity INTEGER NOT NULL DEFAULT 0,
    planned_start TIMESTAMP WITH TIME ZONE NOT NULL,
    planned_end TIMESTAMP WITH TIME ZONE NOT NULL,
    actual_start TIMESTAMP WITH TIME ZONE,
    actual_end TIMESTAMP WITH TIME ZONE,
    status work_order_status DEFAULT 'DRAFT',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE dispensing_records (
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

CREATE TABLE material_consumptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID REFERENCES work_orders(id) ON DELETE CASCADE,
    material_batch_id UUID REFERENCES material_batches(id) NOT NULL,
    planned_quantity DECIMAL(12, 4) NOT NULL,
    actual_quantity DECIMAL(12, 4) NOT NULL,
    variance DECIMAL(12, 4) NOT NULL,
    yield_impact VARCHAR(255),
    consumed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE electronic_batch_records (
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

CREATE TABLE production_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID REFERENCES work_orders(id) ON DELETE CASCADE,
    machine_id UUID REFERENCES machines(id) ON DELETE CASCADE,
    operator_id UUID REFERENCES users(id),
    shift_id UUID,
    count_good INTEGER DEFAULT 0,
    count_scrap INTEGER DEFAULT 0,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE downtime_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id UUID REFERENCES machines(id) ON DELETE CASCADE,
    reason_code VARCHAR(100) NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ended_at TIMESTAMP WITH TIME ZONE,
    is_planned BOOLEAN NOT NULL DEFAULT FALSE,
    comments TEXT,
    reported_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id)
);

CREATE TABLE quality_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID REFERENCES work_orders(id) ON DELETE CASCADE,
    inspector_id UUID REFERENCES users(id),
    serial_number VARCHAR(100),
    check_parameters JSONB NOT NULL,
    status qc_status NOT NULL DEFAULT 'PENDING',
    non_conformance_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Equipment Maintenance, Calibration & Qualification
CREATE TABLE equipment_calibrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id UUID REFERENCES machines(id) ON DELETE CASCADE,
    calibration_date DATE NOT NULL,
    next_calibration_due DATE NOT NULL,
    calibrated_by VARCHAR(255) NOT NULL,
    certificate_number VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE equipment_qualifications (
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

-- 10. Compliance, Deviations & CAPA
CREATE TABLE deviations (
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
    root_cause TEXT,
    resolved_by UUID REFERENCES users(id)
);

CREATE TABLE capas (
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

CREATE TABLE change_controls (
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

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    target_table VARCHAR(100) NOT NULL,
    target_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    severity VARCHAR(50) DEFAULT 'INFO',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE electronic_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) NOT NULL,
    username VARCHAR(100) NOT NULL,
    meaning VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE uoms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL
);

CREATE TABLE material_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    description VARCHAR(255)
);

-- ==============================================================================
-- DEDICATED RELATIONAL TABLES MATCHING EXACTLY THE 6 USER IMAGES
-- ==============================================================================

-- Image 2: Table 2 - SUPPLIER_MASTER
CREATE TABLE supplier_master (
    supplier_code VARCHAR(50) PRIMARY KEY,
    supplier_name VARCHAR(255) NOT NULL,
    material_group VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL,
    quality_rating INTEGER NOT NULL,
    approved VARCHAR(10) NOT NULL DEFAULT 'Y'
);

-- Image 2: Table 3 - BOM_HEADER
CREATE TABLE bom_header (
    bom_id VARCHAR(50) PRIMARY KEY,
    parent_material VARCHAR(100) NOT NULL,
    revision VARCHAR(10) NOT NULL DEFAULT 'A',
    effective_from DATE NOT NULL,
    effective_to DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'RELEASED'
);

-- Image 3: Table 4 - BOM_COMPONENT
CREATE TABLE bom_component (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bom_id VARCHAR(50) REFERENCES bom_header(bom_id) ON DELETE CASCADE,
    line_no INTEGER NOT NULL,
    parent_material VARCHAR(100) NOT NULL,
    component_material VARCHAR(100) NOT NULL,
    component_type VARCHAR(50) NOT NULL,
    qty DECIMAL(12, 4) NOT NULL,
    uom VARCHAR(20) NOT NULL
);

-- Image 4: Table 5 - ROUTING_HEADER
CREATE TABLE routing_header (
    routing_id VARCHAR(50) PRIMARY KEY,
    material_code VARCHAR(100) NOT NULL,
    revision VARCHAR(10) NOT NULL DEFAULT 'A',
    description VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'RELEASED'
);

-- Image 5: Table 6 - ROUTING_OPERATION
CREATE TABLE routing_operation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    routing_id VARCHAR(50) REFERENCES routing_header(routing_id) ON DELETE CASCADE,
    operation_no INTEGER NOT NULL,
    operation_code VARCHAR(50) NOT NULL,
    operation_name VARCHAR(255) NOT NULL,
    work_center VARCHAR(100) NOT NULL,
    machine_code VARCHAR(50) NOT NULL
);

-- ==============================================================================
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
SELECT 'UGAM NEXT GEN MES Database Created & Populated Successfully!' AS status;
