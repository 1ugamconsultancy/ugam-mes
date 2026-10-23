-- ============================================================================
-- MIGRATION: ENTERPRISE PRODUCT GENEALOGY & TRACK & TRACE SCALING
-- ============================================================================
-- Standard: IATF 16949 Section 8.5.2, FDA 21 CFR Part 11, GAMP 5
-- Scaled Target:
--   100 Serialized Seats (SEAT-0001 to SEAT-0100)
--   12 Component Types
--   6 Assembly Stations (ST-01 to ST-06)
--   5 Qualified Suppliers
--   10 Supplier Material Lots (including 1 Defective Lot: LOT-RECL-2026-DEF)
--   8 Operators and Inspectors
--   1 Defective Material Lot
--   1 Forward Recall Simulation
-- ============================================================================

-- 1. UNIVERSAL SERIALIZED UNIT REGISTRY (Works for ANY Finished Good)
CREATE TABLE IF NOT EXISTS serialized_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    serial_number VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'UNDER_ASSEMBLY',
    current_operation_no INT NOT NULL DEFAULT 10,
    current_work_center VARCHAR(50),
    warehouse_location VARCHAR(100),
    dispatch_note VARCHAR(100),
    dispatch_customer VARCHAR(100),
    dispatch_date TIMESTAMP WITH TIME ZONE,
    qr_payload TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_serialized_units_wo ON serialized_units(work_order_id);
CREATE INDEX IF NOT EXISTS idx_serialized_units_product ON serialized_units(product_id);
CREATE INDEX IF NOT EXISTS idx_serialized_units_status ON serialized_units(status);

-- 2. UNIVERSAL PRODUCT GENEALOGY EVENT LEDGER (5W1H)
CREATE TABLE IF NOT EXISTS product_genealogy_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_serial VARCHAR(100) NOT NULL REFERENCES serialized_units(serial_number) ON DELETE CASCADE,
    work_order_id UUID NOT NULL REFERENCES work_orders(id),
    operation_no INT NOT NULL,
    operation_name VARCHAR(100) NOT NULL,
    work_center VARCHAR(50) NOT NULL,
    machine_id VARCHAR(50) NOT NULL,
    component_code VARCHAR(50) NOT NULL,
    component_name VARCHAR(100) NOT NULL,
    component_lot VARCHAR(100) NOT NULL,
    supplier_code VARCHAR(50),
    supplier_name VARCHAR(100),
    inventory_location VARCHAR(100),
    operator_id UUID REFERENCES users(id),
    operator_username VARCHAR(50) NOT NULL,
    operator_signature VARCHAR(100),
    inspector_id UUID REFERENCES users(id),
    inspector_username VARCHAR(50),
    inspector_signature VARCHAR(100),
    dual_signature_verified BOOLEAN DEFAULT false,
    quality_status VARCHAR(20) DEFAULT 'PASS',
    quality_inspection_text TEXT,
    parameters JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_genealogy_events_unit ON product_genealogy_events(unit_serial);
CREATE INDEX IF NOT EXISTS idx_genealogy_events_lot ON product_genealogy_events(component_lot);
CREATE INDEX IF NOT EXISTS idx_genealogy_events_op ON product_genealogy_events(operation_no);

-- 3. ENSURE THE 8 OPERATORS AND INSPECTORS EXIST IN USERS TABLE
INSERT INTO users (id, username, email, password_hash, role, first_name, last_name, is_active, organization_id, plant_id)
VALUES
  ('44444444-4444-4444-4444-444444444444', 'operator1', 'operator1@ugamconsultancy.com', '$2b$10$SecretPasswordHashPlaceholderForTestingOnly12345', 'OPERATOR', 'Rajesh', 'Kumar', true, '10000000-0000-0000-0000-000000000001', 'a0000000-0001-1111-1111-111111111111'),
  ('44444444-4444-4444-4444-444444444446', 'operator2', 'operator2@ugamconsultancy.com', '$2b$10$SecretPasswordHashPlaceholderForTestingOnly12345', 'OPERATOR', 'Amit', 'Sharma', true, '10000000-0000-0000-0000-000000000001', 'a0000000-0001-1111-1111-111111111111'),
  ('44444444-4444-4444-4444-444444444447', 'operator3', 'operator3@ugamconsultancy.com', '$2b$10$SecretPasswordHashPlaceholderForTestingOnly12345', 'OPERATOR', 'Sunil', 'Verma', true, '10000000-0000-0000-0000-000000000001', 'a0000000-0001-1111-1111-111111111111'),
  ('44444444-4444-4444-4444-444444444448', 'operator4', 'operator4@ugamconsultancy.com', '$2b$10$SecretPasswordHashPlaceholderForTestingOnly12345', 'OPERATOR', 'Pooja', 'Patel', true, '10000000-0000-0000-0000-000000000001', 'a0000000-0001-1111-1111-111111111111'),
  ('55555555-5555-5555-5555-555555555555', 'quality1', 'quality1@ugamconsultancy.com', '$2b$10$SecretPasswordHashPlaceholderForTestingOnly12345', 'QUALITY_ENGINEER', 'Vikram', 'Singh', true, '10000000-0000-0000-0000-000000000001', 'a0000000-0001-1111-1111-111111111111'),
  ('55555555-5555-5555-5555-555555555556', 'quality2', 'quality2@ugamconsultancy.com', '$2b$10$SecretPasswordHashPlaceholderForTestingOnly12345', 'QUALITY_ENGINEER', 'Deepa', 'Nair', true, '10000000-0000-0000-0000-000000000001', 'a0000000-0001-1111-1111-111111111111'),
  ('33333333-3333-3333-3333-333333333333', 'supervisor', 'supervisor@ugamconsultancy.com', '$2b$10$SecretPasswordHashPlaceholderForTestingOnly12345', 'SUPERVISOR', 'Anand', 'Mehta', true, '10000000-0000-0000-0000-000000000001', 'a0000000-0001-1111-1111-111111111111'),
  ('33333333-3333-3333-3333-333333333334', 'supervisor2', 'supervisor2@ugamconsultancy.com', '$2b$10$SecretPasswordHashPlaceholderForTestingOnly12345', 'SUPERVISOR', 'Sanjay', 'Deshmukh', true, '10000000-0000-0000-0000-000000000001', 'a0000000-0001-1111-1111-111111111111')
ON CONFLICT (id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  role = EXCLUDED.role;

-- 4. ENSURE THE 5 TIER-1 AUTOMOTIVE SUPPLIERS EXIST IN VENDORS TABLE
INSERT INTO vendors (id, vendor_code, vendor_name, qualification_status, audit_date, contact_information, approved_materials)
VALUES
  ('20111111-0001-1111-1111-111111111111', 'SUP-STEEL-01', 'Bharat Precision Steel & Tubes Ltd.', 'QUALIFIED', '2026-01-15', 'Pune, India | contact@bharatsteel.com', '["FRAME-LH-101", "RAIL-LH-201", "BRKT-LH-301"]'),
  ('20111111-0002-1111-1111-111111111111', 'SUP-MECH-02', 'Kinematics Motion Systems Pvt. Ltd.', 'QUALIFIED', '2026-01-20', 'Chennai, India | support@kinematicsmotion.com', '["RECL-101", "LEVR-101", "FAST-101"]'),
  ('20111111-0003-1111-1111-111111111111', 'SUP-FOAM-03', 'ComfortFoam Polymers India Ltd.', 'QUALIFIED', '2026-02-05', 'Gurugram, India | qa@comfortfoam.in', '["FOAM-CSH-101", "FOAM-BST-101"]'),
  ('20111111-0004-1111-1111-111111111111', 'SUP-TRIM-04', 'Apex Automotive Upholstery & Leatherettes', 'QUALIFIED', '2026-02-10', 'Bangalore, India | info@apexautoupholstery.com', '["COV-LH-101", "CLIP-TRM-101", "TRIM-LH-101"]'),
  ('20111111-0005-1111-1111-111111111111', 'SUP-FASSY-05', 'Autofit Ergonomics & Safety Systems', 'QUALIFIED', '2026-01-15', 'Ahmedabad, India | dispatch@autofitergonomics.com', '["HDRST-101", "COV-SD-101", "ACC-KIT-101"]')
ON CONFLICT (id) DO UPDATE SET
  vendor_code = EXCLUDED.vendor_code,
  vendor_name = EXCLUDED.vendor_name,
  qualification_status = EXCLUDED.qualification_status,
  approved_materials = EXCLUDED.approved_materials;

-- 5. ENSURE THE 10 SUPPLIER MATERIAL LOTS EXIST IN MATERIAL_BATCHES TABLE
-- Note: LOT-RECL-2026-DEF is specifically flagged as QUARANTINED (The Defective Lot)
INSERT INTO material_batches (id, material_id, batch_number, supplier_batch, quantity, uom, status, manufacturing_date, expiry_date, heat_number)
VALUES
  ('70111111-0001-1111-1111-111111111111', '10111111-0012-1111-1111-111111111111', 'LOT-FRM-2026-A1', 'BPST-FRM-9021', 500.0000, 'PCS', 'RELEASED', '2026-09-01', '2028-09-01', 'HEAT-ST-8821'),
  ('70111111-0002-1111-1111-111111111111', '10111111-0013-1111-1111-111111111111', 'LOT-RAIL-2026-A2', 'BPST-RAIL-8842', 500.0000, 'KIT', 'RELEASED', '2026-09-03', '2028-09-03', 'HEAT-RAIL-4410'),
  ('70111111-0003-1111-1111-111111111111', '10111111-0014-1111-1111-111111111111', 'LOT-BRKT-2026-A3', 'BPST-BRKT-7731', 500.0000, 'KIT', 'RELEASED', '2026-09-04', '2028-09-04', 'HEAT-BRKT-3309'),
  ('70111111-0004-1111-1111-111111111111', '10111111-0015-1111-1111-111111111111', 'LOT-RECL-2026-B1', 'KMS-RECL-1049', 450.0000, 'PCS', 'RELEASED', '2026-09-05', '2028-09-05', 'HEAT-MECH-9011'),
  ('70111111-0005-1111-1111-111111111111', '10111111-0015-1111-1111-111111111111', 'LOT-RECL-2026-DEF', 'KMS-RECL-DEF09', 50.0000, 'PCS', 'QUARANTINED', '2026-09-05', '2028-09-05', 'HEAT-MECH-DEF01'),
  ('70111111-0006-1111-1111-111111111111', '10111111-0016-1111-1111-111111111111', 'LOT-LEVR-2026-B2', 'KMS-LEVR-3321', 500.0000, 'PCS', 'RELEASED', '2026-09-06', '2028-09-06', 'HEAT-MECH-7740'),
  ('70111111-0007-1111-1111-111111111111', '10111111-0017-1111-1111-111111111111', 'LOT-FAST-2026-B3', 'KMS-FAST-6612', 1500.0000, 'KIT', 'RELEASED', '2026-09-07', '2028-09-07', 'HEAT-FAST-5511'),
  ('70111111-0008-1111-1111-111111111111', '10111111-0018-1111-1111-111111111111', 'LOT-FOAM-2026-C1', 'CFP-FOAM-5501', 500.0000, 'PCS', 'RELEASED', '2026-09-08', '2027-09-08', 'BATCH-PU-8831'),
  ('70111111-0009-1111-1111-111111111111', '10111111-0020-1111-1111-111111111111', 'LOT-UPHL-2026-D1', 'AAU-COV-4412', 500.0000, 'PCS', 'RELEASED', '2026-09-09', '2027-09-09', 'DYE-LOT-9921'),
  ('70111111-0010-1111-1111-111111111111', '10111111-0023-1111-1111-111111111111', 'LOT-ACC-2026-E1', 'AES-ACC-8819', 500.0000, 'KIT', 'RELEASED', '2026-09-10', '2028-09-10', 'BATCH-ACC-1102')
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  supplier_batch = EXCLUDED.supplier_batch;

-- 6. GENERATE AND SEED 100 SERIALIZED SEATS (SEAT-0001 to SEAT-0100)
-- Work Order: WO-SEAT-2026-001 (id: 80111111-0007-1111-1111-111111111111)
-- Product: SEAT-DRV-101 (id: 30111111-0006-1111-1111-111111111111)
DO $$
DECLARE
    i INT;
    v_sn VARCHAR(50);
    v_status VARCHAR(30);
    v_op_no INT;
    v_wc VARCHAR(50);
    v_wh VARCHAR(100);
    v_dn VARCHAR(100);
    v_cust VARCHAR(100);
    v_disp_date TIMESTAMP WITH TIME ZONE;
    v_qr TEXT;
    v_is_defective BOOLEAN;
BEGIN
    FOR i IN 1..100 LOOP
        v_sn := 'SEAT-' || LPAD(i::TEXT, 4, '0');
        v_is_defective := (i IN (14, 15, 18, 22, 25));
        
        -- Status distribution:
        -- Units 1-70: FINISHED_INVENTORY (Except unit 25 which was dispatched)
        -- Units 71-85: DISPATCHED (including 25)
        -- Units 86-95: UNDER_ASSEMBLY
        -- Units 96-98: REWORK
        -- Units 99-100: REJECTED
        IF i = 25 OR (i >= 71 AND i <= 85) THEN
            v_status := 'DISPATCHED';
            v_op_no := 60;
            v_wc := 'WC-FQC';
            v_wh := 'WH-FG-01 / DISPATCH-DOCK-02';
            v_dn := 'DN-2026-0842';
            v_cust := 'Tata Motors Passenger Vehicles Ltd. (Sanand Plant)';
            v_disp_date := '2026-10-21 14:30:00+00';
        ELSIF i <= 70 THEN
            v_status := 'FINISHED_INVENTORY';
            v_op_no := 60;
            v_wc := 'WC-FQC';
            v_wh := 'WH-FG-01 / ROW-0' || ((i % 4) + 1)::TEXT || ' / BAY-' || LPAD(((i % 25) + 1)::TEXT, 2, '0');
            v_dn := NULL;
            v_cust := NULL;
            v_disp_date := NULL;
        ELSIF i >= 86 AND i <= 95 THEN
            v_status := 'UNDER_ASSEMBLY';
            v_op_no := ((i - 86) % 5 + 1) * 10; -- ST-01 to ST-05
            v_wc := CASE v_op_no
                WHEN 10 THEN 'WC-FRAME'
                WHEN 20 THEN 'WC-RECL'
                WHEN 30 THEN 'WC-FOAM'
                WHEN 40 THEN 'WC-UPHL'
                ELSE 'WC-FASSY'
            END;
            v_wh := 'LINE-SEAT-01 / STATION-0' || (v_op_no / 10)::TEXT;
            v_dn := NULL;
            v_cust := NULL;
            v_disp_date := NULL;
        ELSIF i >= 96 AND i <= 98 THEN
            v_status := 'REWORK';
            v_op_no := 40;
            v_wc := 'WC-REWORK';
            v_wh := 'REWORK-BAY-01';
            v_dn := NULL;
            v_cust := NULL;
            v_disp_date := NULL;
        ELSE
            v_status := 'REJECTED';
            v_op_no := 60;
            v_wc := 'WC-FQC';
            v_wh := 'MRB-QUARANTINE-01';
            v_dn := NULL;
            v_cust := NULL;
            v_disp_date := NULL;
        END IF;

        v_qr := '{"type":"SERIALIZED_UNIT","sku":"SEAT-DRV-101","serial":"' || v_sn || '","wo":"WO-SEAT-2026-001","rev":"Rev A"}';

        INSERT INTO serialized_units (
            work_order_id,
            product_id,
            serial_number,
            status,
            current_operation_no,
            current_work_center,
            warehouse_location,
            dispatch_note,
            dispatch_customer,
            dispatch_date,
            qr_payload,
            metadata
        ) VALUES (
            '80111111-0007-1111-1111-111111111111',
            '30111111-0006-1111-1111-111111111111',
            v_sn,
            v_status,
            v_op_no,
            v_wc,
            v_wh,
            v_dn,
            v_cust,
            v_disp_date,
            v_qr,
            jsonb_build_object(
                'seatVariant', 'Comfort Premium LH',
                'color', 'Obsidian Black',
                'hasDefectiveRecliner', v_is_defective
            )
        )
        ON CONFLICT (serial_number) DO UPDATE SET
            status = EXCLUDED.status,
            current_operation_no = EXCLUDED.current_operation_no,
            current_work_center = EXCLUDED.current_work_center,
            warehouse_location = EXCLUDED.warehouse_location,
            dispatch_note = EXCLUDED.dispatch_note,
            dispatch_customer = EXCLUDED.dispatch_customer,
            metadata = EXCLUDED.metadata;
    END LOOP;
END $$;

-- 7. POPULATE 5W1H PRODUCT GENEALOGY EVENTS FOR COMPLETED & UNDER-ASSEMBLY SEATS
-- For each seat, populate the station events (Stations 10..60)
DO $$
DECLARE
    rec RECORD;
    v_recliner_lot VARCHAR(100);
    v_base_time TIMESTAMP WITH TIME ZONE;
BEGIN
    FOR rec IN SELECT serial_number, status, current_operation_no, (metadata->>'hasDefectiveRecliner')::BOOLEAN as is_defective FROM serialized_units WHERE work_order_id = '80111111-0007-1111-1111-111111111111' LOOP
        v_base_time := '2026-10-21 06:00:00+00'::TIMESTAMP WITH TIME ZONE + (SUBSTRING(rec.serial_number, 6)::INT * INTERVAL '8 minutes');
        
        -- Decide recliner lot: defective units get LOT-RECL-2026-DEF
        IF rec.is_defective THEN
            v_recliner_lot := 'LOT-RECL-2026-DEF';
        ELSE
            v_recliner_lot := 'LOT-RECL-2026-B1';
        END IF;

        -- Station 1: Frame Assembly (Operation 10)
        IF rec.current_operation_no >= 10 THEN
            INSERT INTO product_genealogy_events (
                unit_serial, work_order_id, operation_no, operation_name, work_center, machine_id,
                component_code, component_name, component_lot, supplier_code, supplier_name, inventory_location,
                operator_username, operator_signature, inspector_username, inspector_signature, dual_signature_verified,
                quality_status, quality_inspection_text, parameters, timestamp
            ) VALUES (
                rec.serial_number, '80111111-0007-1111-1111-111111111111', 10, 'Seat frame assembly', 'WC-FRAME', 'ST-SEAT-01',
                'FRAME-LH-101', 'Driver-side seat frame', 'LOT-FRM-2026-A1', 'SUP-STEEL-01', 'Bharat Precision Steel & Tubes Ltd.', 'WH-RAW / AISLE-A1 / BIN-02',
                'operator1', 'Rajesh Kumar (Assembly Operator)', 'supervisor', 'Anand Mehta (Supervisor)', true,
                'PASS', 'Frame orientation verified, bilateral slider rail seating confirmed.',
                '{"torque_nm": 38.5, "spec_nm": "38.0 ± 2.0", "alignment_deg": 0.05, "status": "IN_SPEC"}',
                v_base_time + INTERVAL '3 minutes'
            );
        END IF;

        -- Station 2: Recliner Mechanism Fitting (Operation 20)
        IF rec.current_operation_no >= 20 THEN
            INSERT INTO product_genealogy_events (
                unit_serial, work_order_id, operation_no, operation_name, work_center, machine_id,
                component_code, component_name, component_lot, supplier_code, supplier_name, inventory_location,
                operator_username, operator_signature, inspector_username, inspector_signature, dual_signature_verified,
                quality_status, quality_inspection_text, parameters, timestamp
            ) VALUES (
                rec.serial_number, '80111111-0007-1111-1111-111111111111', 20, 'Recliner mechanism fitting', 'WC-RECL', 'ST-SEAT-02',
                'RECL-101', 'Recliner mechanism', v_recliner_lot, 'SUP-MECH-02', 'Kinematics Motion Systems Pvt. Ltd.', 'WH-RAW / AISLE-B2 / BIN-08',
                'operator2', 'Amit Sharma (Assembly Operator)', 'supervisor', 'Anand Mehta (Supervisor)', true,
                CASE WHEN rec.is_defective THEN 'HOLD_FLAGGED' ELSE 'PASS' END,
                'Recliner movement and multi-position locking verified under 15kN load test.',
                jsonb_build_object(
                    'torque_nm', 42.1,
                    'spec_nm', '42.0 ± 2.0',
                    'detent_positions', 12,
                    'is_defective_lot', rec.is_defective,
                    'ncr_reference', CASE WHEN rec.is_defective THEN 'NCR-2026-089' ELSE NULL END
                ),
                v_base_time + INTERVAL '6 minutes'
            );
        END IF;

        -- Station 3: Foam Installation (Operation 30)
        IF rec.current_operation_no >= 30 THEN
            INSERT INTO product_genealogy_events (
                unit_serial, work_order_id, operation_no, operation_name, work_center, machine_id,
                component_code, component_name, component_lot, supplier_code, supplier_name, inventory_location,
                operator_username, operator_signature, inspector_username, inspector_signature, dual_signature_verified,
                quality_status, quality_inspection_text, parameters, timestamp
            ) VALUES (
                rec.serial_number, '80111111-0007-1111-1111-111111111111', 30, 'Foam installation', 'WC-FOAM', 'ST-SEAT-03',
                'FOAM-CSH-101', 'Seat cushion foam', 'LOT-FOAM-2026-C1', 'SUP-FOAM-03', 'ComfortFoam Polymers India Ltd.', 'WH-RAW / AISLE-C1 / BIN-05',
                'operator2', 'Amit Sharma (Assembly Operator)', 'supervisor', 'Anand Mehta (Supervisor)', true,
                'PASS', 'Molded PU cushion seated over frame, backrest foam contour fit verified.',
                '{"fitment_gap_mm": 0.8, "max_gap_mm": 2.0, "density_kg_m3": 45.2, "status": "IN_SPEC"}',
                v_base_time + INTERVAL '9 minutes'
            );
        END IF;

        -- Station 4: Upholstery Installation (Operation 40)
        IF rec.current_operation_no >= 40 THEN
            INSERT INTO product_genealogy_events (
                unit_serial, work_order_id, operation_no, operation_name, work_center, machine_id,
                component_code, component_name, component_lot, supplier_code, supplier_name, inventory_location,
                operator_username, operator_signature, inspector_username, inspector_signature, dual_signature_verified,
                quality_status, quality_inspection_text, parameters, timestamp
            ) VALUES (
                rec.serial_number, '80111111-0007-1111-1111-111111111111', 40, 'Upholstery installation', 'WC-UPHL', 'ST-SEAT-04',
                'COV-LH-101', 'Seat cover', 'LOT-UPHL-2026-D1', 'SUP-TRIM-04', 'Apex Automotive Upholstery & Leatherettes', 'WH-RAW / AISLE-C3 / BIN-14',
                'operator3', 'Sunil Verma (Upholstery Operator)', 'quality1', 'Vikram Singh (Quality Inspector)', true,
                'PASS', 'Zero surface wrinkles, stitch seam alignment within ±0.5 mm tolerance.',
                '{"wrinkle_count": 0, "seam_deviation_mm": 0.3, "clip_retention_n": 120, "status": "IN_SPEC"}',
                v_base_time + INTERVAL '13 minutes'
            );
        END IF;

        -- Station 5: Final Seat Assembly (Operation 50)
        IF rec.current_operation_no >= 50 THEN
            INSERT INTO product_genealogy_events (
                unit_serial, work_order_id, operation_no, operation_name, work_center, machine_id,
                component_code, component_name, component_lot, supplier_code, supplier_name, inventory_location,
                operator_username, operator_signature, inspector_username, inspector_signature, dual_signature_verified,
                quality_status, quality_inspection_text, parameters, timestamp
            ) VALUES (
                rec.serial_number, '80111111-0007-1111-1111-111111111111', 50, 'Final seat assembly', 'WC-FASSY', 'ST-SEAT-05',
                'HDRST-101', 'Headrest assembly', 'LOT-ACC-2026-E1', 'SUP-FASSY-05', 'Autofit Ergonomics & Safety Systems', 'WH-RAW / AISLE-D2 / BIN-01',
                'operator4', 'Pooja Patel (Final Assembly Operator)', 'quality1', 'Vikram Singh (Quality Inspector)', true,
                'PASS', 'Headrest 3-position detent verified, side trim aesthetic covers snap-fitted.',
                '{"headrest_travel_mm": 60, "snap_fit_force_n": 48.0, "status": "IN_SPEC"}',
                v_base_time + INTERVAL '16 minutes'
            );
        END IF;

        -- Station 6: Final Quality Inspection (Operation 60)
        IF rec.current_operation_no >= 60 THEN
            INSERT INTO product_genealogy_events (
                unit_serial, work_order_id, operation_no, operation_name, work_center, machine_id,
                component_code, component_name, component_lot, supplier_code, supplier_name, inventory_location,
                operator_username, operator_signature, inspector_username, inspector_signature, dual_signature_verified,
                quality_status, quality_inspection_text, parameters, timestamp
            ) VALUES (
                rec.serial_number, '80111111-0007-1111-1111-111111111111', 60, 'Final quality inspection', 'WC-FQC', 'ST-SEAT-06',
                rec.serial_number, 'Front Driver Seat Assembly (Certified)', rec.serial_number, 'SUP-ACS-01', 'AutoComfort Seating Pvt. Ltd.', 'WH-FG-01 / STAGING',
                'quality2', 'Deepa Nair (Senior Quality Inspector)', 'supervisor2', 'Sanjay Deshmukh (Plant Quality Manager)', true,
                CASE WHEN rec.is_defective THEN 'DEFECT_DETECTED' ELSE 'PASS' END,
                CASE WHEN rec.is_defective
                     THEN 'RECALL WARNING: Unit flagged with supplier lot LOT-RECL-2026-DEF. High risk of recliner mechanism failure.'
                     ELSE '100% End-of-Line audit completed. Certified for OEM dispatch.'
                END,
                jsonb_build_object(
                    'electrical_continuity', 'PASS',
                    'slider_resistance_n', 18.5,
                    'recline_cycle_test', 'PASS',
                    'regulatory_standard', 'IATF 16949 / GAMP 5',
                    'recall_risk', rec.is_defective
                ),
                v_base_time + INTERVAL '18 minutes'
            );

            -- Also sync to standard MES genealogy table for legacy bidirectional query compatibility
            INSERT INTO genealogy (
                genealogy_id, parent_batch_serial, parent_material, child_batch_serial, child_material, relationship, operation_no, machine_id, timestamp
            ) VALUES (
                'GEN-' || rec.serial_number || '-RECL',
                rec.serial_number,
                'SEAT-DRV-101',
                v_recliner_lot,
                'RECL-101',
                'CONSUMED_FROM',
                20,
                'ST-SEAT-02',
                (v_base_time + INTERVAL '6 minutes')::TIMESTAMP WITHOUT TIME ZONE
            )
            ON CONFLICT (genealogy_id) DO NOTHING;

            INSERT INTO genealogy (
                genealogy_id, parent_batch_serial, parent_material, child_batch_serial, child_material, relationship, operation_no, machine_id, timestamp
            ) VALUES (
                'GEN-' || rec.serial_number || '-FRM',
                rec.serial_number,
                'SEAT-DRV-101',
                'LOT-FRM-2026-A1',
                'FRAME-LH-101',
                'CONSUMED_FROM',
                10,
                'ST-SEAT-01',
                (v_base_time + INTERVAL '3 minutes')::TIMESTAMP WITHOUT TIME ZONE
            )
            ON CONFLICT (genealogy_id) DO NOTHING;
        END IF;

    END LOOP;
END $$;
