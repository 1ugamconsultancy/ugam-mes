-- Align Database with End-to-End Production Line Test Plan (TP-MES-AUTO-001)
-- Facility: Ugam Precision Automotive Plant (AUTO-PLANT-01)
-- Machines: CUT-01, CNC-01, DBR-01, HT-01, RM-01, QC-01, ASM-01, TEST-01, QC-02

-- 1. Equipment Calibrations for CUT-01 through QC-02
INSERT INTO equipment_calibrations (id, machine_id, calibration_date, next_calibration_due, calibrated_by, certificate_number, status, created_at) VALUES
('c1111111-0001-1111-1111-111111111111', 'e1111111-0001-1111-1111-111111111111', '2026-06-15', '2027-06-15', 'Apex Precision Metrology', 'CAL-2026-001', 'PASSED', '2026-06-15 10:00:00+00'),
('c1111111-0002-1111-1111-111111111111', 'e1111111-0002-1111-1111-111111111111', '2026-05-10', '2027-05-10', 'Renishaw Laser Calibration', 'CAL-2026-002', 'PASSED', '2026-05-10 10:00:00+00'),
('c1111111-0003-1111-1111-111111111111', 'e1111111-0003-1111-1111-111111111111', '2026-07-01', '2027-07-01', 'Apex Precision Metrology', 'CAL-2026-003', 'PASSED', '2026-07-01 10:00:00+00'),
('c1111111-0004-1111-1111-111111111111', 'e1111111-0004-1111-1111-111111111111', '2026-07-15', '2027-07-15', 'Pyrometry Calibration Services', 'CAL-2026-004', 'PASSED', '2026-07-15 10:00:00+00'),
('c1111111-0005-1111-1111-111111111111', 'e1111111-0005-1111-1111-111111111111', '2026-06-20', '2027-06-20', 'Apex Precision Metrology', 'CAL-2026-005', 'PASSED', '2026-06-20 10:00:00+00'),
('c1111111-0006-1111-1111-111111111111', 'e1111111-0006-1111-1111-111111111111', '2026-04-12', '2027-04-12', 'Keyence Vision Metrology', 'CAL-2026-006', 'PASSED', '2026-04-12 10:00:00+00'),
('c1111111-0007-1111-1111-111111111111', 'e1111111-0007-1111-1111-111111111111', '2026-08-01', '2027-08-01', 'Apex Precision Metrology', 'CAL-2026-007', 'PASSED', '2026-08-01 10:00:00+00'),
('c1111111-0008-1111-1111-111111111111', 'e1111111-0008-1111-1111-111111111111', '2026-05-25', '2027-05-25', 'Apex Precision Metrology', 'CAL-2026-008', 'PASSED', '2026-05-25 10:00:00+00'),
('c1111111-0009-1111-1111-111111111111', 'e1111111-0009-1111-1111-111111111111', '2026-06-01', '2027-06-01', 'Zeiss Metrology Services', 'CAL-2026-009', 'PASSED', '2026-06-01 10:00:00+00')
ON CONFLICT (certificate_number) DO UPDATE SET
  calibration_date = EXCLUDED.calibration_date,
  next_calibration_due = EXCLUDED.next_calibration_due,
  status = EXCLUDED.status;

-- 2. Equipment Qualifications (IQ/OQ/PQ) for Discrete Automotive Line
INSERT INTO equipment_qualifications (id, machine_id, qualification_type, qualification_date, expiry_date, performed_by, status, notes, created_at) VALUES
('b2222222-0001-1111-1111-111111111111', 'e1111111-0001-1111-1111-111111111111', 'PQ', '2026-06-15', '2027-06-15', 'Validation Engineering Lead', 'COMPLETED', 'Automatic bar feed length repeatability < 0.1 mm passed', '2026-06-15 11:00:00+00'),
('b2222222-0002-1111-1111-111111111111', 'e1111111-0002-1111-1111-111111111111', 'PQ', '2026-05-10', '2027-05-10', 'Validation Engineering Lead', 'COMPLETED', 'Spindle runout < 0.003 mm and positioning repeatability qualified', '2026-05-10 11:00:00+00'),
('b2222222-0003-1111-1111-111111111111', 'e1111111-0003-1111-1111-111111111111', 'PQ', '2026-07-01', '2027-07-01', 'Validation Engineering Lead', 'COMPLETED', 'Pin edge deburring chamfer 0.3 mm x 45 deg verified', '2026-07-01 11:00:00+00'),
('b2222222-0004-1111-1111-111111111111', 'e1111111-0004-1111-1111-111111111111', 'PQ', '2026-07-15', '2027-07-15', 'Validation Engineering Lead', 'COMPLETED', 'Induction coil 860°C thermal uniformity and quench rate qualified', '2026-07-15 11:00:00+00'),
('b2222222-0005-1111-1111-111111111111', 'e1111111-0005-1111-1111-111111111111', 'PQ', '2026-06-20', '2027-06-20', 'Validation Engineering Lead', 'COMPLETED', 'Moulding platen temperature 175°C +/- 2°C confirmed', '2026-06-20 11:00:00+00'),
('b2222222-0006-1111-1111-111111111111', 'e1111111-0006-1111-1111-111111111111', 'PQ', '2026-04-12', '2027-04-12', 'Validation Engineering Lead', 'COMPLETED', 'High-speed camera surface defect detection algorithm qualified', '2026-04-12 11:00:00+00'),
('b2222222-0007-1111-1111-111111111111', 'e1111111-0007-1111-1111-111111111111', 'PQ', '2026-08-01', '2027-08-01', 'Validation Engineering Lead', 'COMPLETED', 'Pneumatic assembly press insertion force 4.2 kN verified', '2026-08-01 11:00:00+00'),
('b2222222-0008-1111-1111-111111111111', 'e1111111-0008-1111-1111-111111111111', 'PQ', '2026-05-25', '2027-05-25', 'Validation Engineering Lead', 'COMPLETED', 'Hydrostatic leak testing calibrated to 250 bar pressure', '2026-05-25 11:00:00+00'),
('b2222222-0009-1111-1111-111111111111', 'e1111111-0009-1111-1111-111111111111', 'PQ', '2026-06-01', '2027-06-01', 'Validation Engineering Lead', 'COMPLETED', 'CMM volumetric probing error verified with step gauge (MPEe < 1.2 um)', '2026-06-01 11:00:00+00')
ON CONFLICT (id) DO NOTHING;

-- 3. Electronic Batch Records (EBR) for Work Order PO-260003
INSERT INTO electronic_batch_records (id, work_order_id, materials_used, operators, equipment_used, process_parameters, quality_checks, deviations, signatures, created_at, completed_at, status) VALUES
('e0111111-0001-1111-1111-111111111111', '80111111-0003-1111-1111-111111111111', 
'[
  {"material_code": "RM-ST-001", "material_name": "EN8 Steel Bar Ø25 mm", "batch_number": "EN8-260901", "quantity": 448.0, "uom": "kg"}
]',
'[
  {"username": "operator1", "name": "Himanee-Op Savadatti", "role": "OPERATOR", "action": "CNC Machining & Turning", "timestamp": "2026-09-09T08:00:00Z"},
  {"username": "manager", "name": "Venugopal Savadatti", "role": "PRODUCTION_MANAGER", "action": "Campaign Line Release & Authorization", "timestamp": "2026-09-09T08:15:00Z"},
  {"username": "quality1", "name": "Venu-Quality Savadatti", "role": "QUALITY_ENGINEER", "action": "CMM In-Process QC & Batch Release", "timestamp": "2026-09-09T17:45:00Z"}
]',
'[
  {"machine_code": "CUT-01", "name": "Automatic Bar Cutter", "runtime_minutes": 120, "cleaning_status": "CALIBRATED_CLEAN"},
  {"machine_code": "CNC-01", "name": "CNC Turning Center", "runtime_minutes": 240, "cleaning_status": "CALIBRATED_CLEAN"},
  {"machine_code": "DBR-01", "name": "Deburring Machine", "runtime_minutes": 90, "cleaning_status": "CALIBRATED_CLEAN"},
  {"machine_code": "QC-02", "name": "CMM Metrology Inspection", "runtime_minutes": 45, "cleaning_status": "CALIBRATED_CLEAN"}
]',
'[
  {"parameter": "Spindle Turning Speed", "target": "2500 RPM", "actual": "2480 RPM", "status": "PASSED"},
  {"parameter": "Lathe Feed Rate", "target": "0.15 mm/rev", "actual": "0.148 mm/rev", "status": "PASSED"},
  {"parameter": "Coolant Temperature", "target": "22.0°C ± 2°C", "actual": "23.0°C", "status": "PASSED"},
  {"parameter": "Cutting Tool Insert Life", "target": "< 800 cycles", "actual": "420 cycles", "status": "PASSED"}
]',
'[
  {"check": "Pin Diameter Check (INSP-001)", "value": "Passed (24.98 mm, Tol: 24.95 - 25.00 mm)", "status": "PASSED"},
  {"check": "Pin Length Check (INSP-002)", "value": "Passed (80.04 mm, Tol: 79.90 - 80.10 mm)", "status": "PASSED"},
  {"check": "Surface Roughness Ra", "value": "Passed (Ra 0.75 um, Max 0.8 um)", "status": "PASSED"},
  {"check": "2D DataMatrix Serialization Readability", "value": "Passed (100% Grade A ISO 15415)", "status": "PASSED"}
]',
'[
  {"title": "CNC Turning Tool Wear Diameter Offset Drift (NCR001)", "severity": "MINOR", "reported_at": "2026-09-09T11:30:00Z", "status": "CLOSED"}
]',
'[
  {"stage": "Line Setup & Clearance", "user": "manager", "name": "Venugopal Savadatti", "meaning": "Verified raw material heat certificate and CNC tool offsets", "timestamp": "2026-09-09T08:15:00Z"},
  {"stage": "QA Metrology Approval & Batch Release", "user": "quality1", "name": "Venu-Quality Savadatti", "meaning": "I have reviewed this Electronic Batch Record in accordance with IATF 16949 standards and authorize batch release.", "timestamp": "2026-09-09T17:45:00Z"}
]',
'2026-09-09 08:00:00+00', '2026-09-09 17:45:00+00', 'QA_APPROVED')
ON CONFLICT (work_order_id) DO UPDATE SET
  materials_used = EXCLUDED.materials_used,
  operators = EXCLUDED.operators,
  equipment_used = EXCLUDED.equipment_used,
  process_parameters = EXCLUDED.process_parameters,
  quality_checks = EXCLUDED.quality_checks,
  deviations = EXCLUDED.deviations,
  signatures = EXCLUDED.signatures,
  status = EXCLUDED.status,
  completed_at = EXCLUDED.completed_at;

-- 4. Electronic Signatures
INSERT INTO electronic_signatures (id, user_id, username, meaning, ip_address, timestamp) VALUES
('a2222222-0001-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'quality1', 'Raw Material Quarantine Release Approval for Heat EN8-260901', '192.168.1.105', '2026-09-08 11:00:00+00'),
('a2222222-0002-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'manager', 'Line Clearance & Work Order Release for PO-260003 (Control Pin)', '192.168.1.102', '2026-09-09 08:00:00+00'),
('a2222222-0003-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'quality1', 'In-Process CMM & Final Release Authorization for Finished Good Serial FG-260901-001', '192.168.1.105', '2026-09-09 17:45:00+00')
ON CONFLICT (id) DO NOTHING;

-- 5. Immutable Audit Trail (ALCOA+ Traceability)
INSERT INTO audit_trail (id, user_id, username, action, old_value, new_value, reason, timestamp) VALUES
('a1111111-0001-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'quality1', 'BATCH_RELEASE', 'QUARANTINE', 'RELEASED', 'Passed all incoming 3.1 mill test specifications for EN8-260901', '2026-09-08 11:00:00+00'),
('a1111111-0002-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'manager', 'WORK_ORDER_RELEASE', 'PLANNED', 'RELEASED', 'Released work order PO-260003 for Line 1 machining campaign', '2026-09-09 08:00:00+00'),
('a1111111-0003-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'operator1', 'DISPENSING_COMPLETE', NULL, 'Dispensed 448 kg EN8 steel bar', 'Verification completed on Floor Scale SC-01', '2026-09-09 08:15:00+00'),
('a1111111-0004-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'quality1', 'REPORT_DEVIATION', NULL, 'NCR001', 'Logged minor tool wear diameter offset observation on CNC-01', '2026-09-09 11:30:00+00'),
('a1111111-0005-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'quality1', 'EBR_QA_RELEASE', 'IN_PROCESS', 'QA_APPROVED', 'Authorized finished goods serial FG-260901-001 release to LOC-FG-01', '2026-09-09 17:45:00+00')
ON CONFLICT (id) DO NOTHING;

-- 6. CAPAs (Corrective and Preventive Actions)
INSERT INTO capas (id, deviation_id, title, action_type, description, assigned_to, due_date, completed_date, status, verification_details, created_at) VALUES
('c0111111-0001-1111-1111-111111111111', 'd0111111-0001-1111-1111-111111111111', 'CNC-01 Automated Tool Life Counter & Predictive Offset Integration', 'CORRECTIVE', 'Replace carbide inserts on tool post 2 and configure Fanuc CNC tool life counter to alert operator at 800 cycles.', '22222222-2222-2222-2222-222222222222', '2026-09-15', '2026-09-09', 'COMPLETED', 'Tool insert indexed, tool life monitoring activated, and 50 consecutive parts verified on CMM with Cpk = 1.67.', '2026-09-09 12:00:00+00')
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  completed_date = EXCLUDED.completed_date,
  verification_details = EXCLUDED.verification_details;

-- 7. Change Controls
INSERT INTO change_controls (id, title, description, reason_for_change, impact_assessment, status, initiated_by, approved_by, created_at, updated_at) VALUES
('c3333333-0001-1111-1111-111111111111', 'CNC Turning Center Spindle RPM Optimization for EN8 Steel Bar Turning', 'Optimize CNC turning cutting speed from 2200 RPM to 2500 RPM with coated ceramic inserts.', 'Improve pin surface finish to Ra 0.8 um and reduce turning cycle time by 18 seconds per part.', 'Zero dimensional impact; surface roughness improved from Ra 1.2 um to Ra 0.75 um. Cpk maintained > 1.67.', 'APPROVED', '55555555-5555-5555-5555-555555555555', '22222222-2222-2222-2222-222222222222', '2026-09-01 15:00:00+00', '2026-09-01 16:00:00+00')
ON CONFLICT (id) DO NOTHING;
