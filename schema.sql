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
