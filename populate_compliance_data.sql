-- Populate Compliance & Audit Trails with complete discrete automotive manufacturing data
-- Facility: Ugam Precision Automotive Plant (AUTO-PLANT-01)
-- Target Product: FG-001 Automotive Control Pin / PO-260003

-- 1. Deviations (IATF 16949 Non-Conformance Reports)
DELETE FROM capas;
DELETE FROM deviations;

INSERT INTO deviations (id, work_order_id, title, description, severity, category, reported_by, reported_at, status, investigation_details, root_cause, resolved_by) VALUES
('d0111111-0001-1111-1111-111111111111', '80111111-0003-1111-1111-111111111111', 
 'CNC Turning Tool Wear Diameter Offset Drift (NCR001)', 
 'In-process dimensional check on CNC-01 lathe showed pin outer diameter drifting towards upper limit (24.995 mm vs 24.980 mm nominal).', 
 'MINOR', 'EQUIPMENT', '44444444-4444-4444-4444-444444444444', '2026-09-09 11:30:00+00', 
 'CLOSED', 
 'CMM verification of 10 consecutive pieces confirmed all within specification. Tool insert CNMG 120408 index edge had micro-chipping at flank face.', 
 'Carbide insert micro-wear after 850 continuous cycles without indexing.', 
 '55555555-5555-5555-5555-555555555555'),

('d0111111-0002-1111-1111-111111111111', NULL, 
 'Raw Material EN8 Steel Bar Heat Certificate Mismatch (NCR002)', 
 'Inbound heat number HT-4481 mill test certificate listed carbon content 0.38% vs PO specification 0.40% - 0.45%.', 
 'MAJOR', 'MATERIAL', '33333333-3333-3333-3333-333333333333', '2026-08-28 14:15:00+00', 
 'CLOSED', 
 'Supplier SUP-001 provided revised certified 3.1 chemical analysis certificate. Independent spectrometer check verified actual carbon content at 0.42% (Conforming).', 
 'Administrative clerical error at supplier logistics issuing outdated test report.', 
 '55555555-5555-5555-5555-555555555555'),

('d0111111-0003-1111-1111-111111111111', '80111111-0001-1111-1111-111111111111', 
 'Induction Furnace HT-01 Thermal Pyrometer Variance (NCR003)', 
 'Optical pyrometer sensor on induction hardening station HT-01 exhibited transient +8°C temperature offset during pin heating cycle.', 
 'MINOR', 'EQUIPMENT', '44444444-4444-4444-4444-444444444444', '2026-09-09 15:15:00+00', 
 'CLOSED', 
 'Pyrometer lens cleaned and blackbody reference re-calibrated. Rockwell hardness checks across 15 parts confirmed 47.2 HRC (nominal 45-50 HRC - PASS).', 
 'Surface oil vapor condensation on infrared pyrometer optical window.', 
 '11111111-1111-1111-1111-111111111111'),

('d0111111-0004-1111-1111-111111111111', '80111111-0003-1111-1111-111111111111', 
 'Automatic Bar Feeder CUT-01 Clamp Pressure Fluctuation (NCR004)', 
 'Hydraulic bar feed clamp pressure dropped momentarily from 35 bar to 28 bar during raw bar feed cycle.', 
 'MINOR', 'PROCESS', '44444444-4444-4444-4444-444444444444', '2026-09-09 09:10:00+00', 
 'OPEN', 
 'Hydraulic pressure regulator relief valve inspected. Maintenance monitoring accumulator charge pressure.', 
 'Pending scheduled maintenance line review.', 
 NULL),

('d0111111-0005-1111-1111-111111111111', NULL, 
 'Laser Serialization 2D DataMatrix Grade B Readability (NCR005)', 
 'Laser marking unit on ASM-01 showed ISO 15415 verification grade dropping to Grade B due to surface reflection.', 
 'MAJOR', 'EQUIPMENT', '33333333-3333-3333-3333-333333333333', '2026-09-09 16:30:00+00', 
 'OPEN', 
 'Laser focus distance and pulse frequency optimized from 40 kHz to 55 kHz. 100% verifier verification test underway.', 
 'Pending final engineering signoff.', 
 NULL);

-- 2. CAPAs (Corrective and Preventive Actions)
INSERT INTO capas (id, deviation_id, title, action_type, description, assigned_to, due_date, completed_date, status, verification_details, created_at) VALUES
('c0111111-0001-1111-1111-111111111111', 'd0111111-0001-1111-1111-111111111111', 
 'CNC-01 Automated Tool Life Counter & Predictive Offset Integration', 
 'CORRECTIVE', 
 'Replace carbide inserts on tool post 2 and configure Fanuc CNC tool life counter to alert operator at 800 cycles.', 
 '22222222-2222-2222-2222-222222222222', '2026-09-15', '2026-09-09', 
 'COMPLETED', 
 'Tool insert indexed, tool life monitoring activated, and 50 consecutive parts verified on CMM with Cpk = 1.67.', 
 '2026-09-09 12:00:00+00'),

('c0111111-0002-1111-1111-111111111111', 'd0111111-0002-1111-1111-111111111111', 
 'Supplier Quality Mill Test Certificate Digital Integration (IATF 8.4.2)', 
 'PREVENTIVE', 
 'Mandate automated digital mill test upload with spectrometer heat validation for all incoming EN8 steel bar heats.', 
 '33333333-3333-3333-3333-333333333333', '2026-09-20', '2026-08-30', 
 'COMPLETED', 
 'Quality agreement updated with Steel Supplier A. Digital CoA verification gate enforced at Goods Receipt.', 
 '2026-08-28 15:00:00+00'),

('c0111111-0003-1111-1111-111111111111', 'd0111111-0003-1111-1111-111111111111', 
 'Infrared Pyrometer Positive Air Purge Collar for Induction Furnace HT-01', 
 'PREVENTIVE', 
 'Install clean dry air positive purge collar on pyrometer optics to prevent quench vapor and oil mist deposition.', 
 '22222222-2222-2222-2222-222222222222', '2026-09-22', '2026-09-10', 
 'COMPLETED', 
 'Purge collar installed, continuous 0.5 bar dry air supply verified. Zero optical drift observed over 72h heat treating run.', 
 '2026-09-09 16:00:00+00'),

('c0111111-0004-1111-1111-111111111111', 'd0111111-0004-1111-1111-111111111111', 
 'Bar Cutter CUT-01 Hydraulic Power Unit Proportional Valve Replacement', 
 'CORRECTIVE', 
 'Perform overhaul of bar cutter hydraulic power unit and replace proportional clamp pressure regulator valve.', 
 '22222222-2222-2222-2222-222222222222', '2026-09-25', NULL, 
 'OPEN', 
 'Replacement valve requisitioned from OEM. Scheduled for implementation during weekend preventative maintenance.', 
 '2026-09-09 10:00:00+00');

-- 3. Change Controls (IATF 16949 / Engineering Change Orders)
DELETE FROM change_controls;

INSERT INTO change_controls (id, title, description, reason_for_change, impact_assessment, status, initiated_by, approved_by, created_at, updated_at) VALUES
('cc111111-0001-1111-1111-111111111111', 
 'CNC Turning Center Spindle RPM Optimization for EN8 Steel Bar Turning', 
 'Optimize CNC turning cutting speed from 2200 RPM to 2500 RPM with coated ceramic inserts.', 
 'Improve pin surface finish to Ra 0.8 um and reduce turning cycle time by 18 seconds per part.', 
 'Zero dimensional impact; surface roughness improved from Ra 1.2 um to Ra 0.75 um. Cpk maintained > 1.67.', 
 'APPROVED', 
 '55555555-5555-5555-5555-555555555555', '22222222-2222-2222-2222-222222222222', '2026-09-01 15:00:00+00', '2026-09-01 16:00:00+00'),

('cc111111-0002-1111-1111-111111111111', 
 'Induction Hardening Quench Water Agitation Flow Enhancement', 
 'Upgrade quench water recirculation pump on HT-01 furnace from 50 L/min to 85 L/min with laminar flow nozzles.', 
 'Eliminates localized soft spots and achieves uniform 47-49 HRC case depth of 1.2 mm +/- 0.2 mm.', 
 'Metallurgical destructive cut-up evaluation showed 100% martensitic transformation with zero cracking.', 
 'APPROVED', 
 '33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', '2026-09-02 09:00:00+00', '2026-09-02 10:30:00+00'),

('cc111111-0003-1111-1111-111111111111', 
 'Routing RT-004 Assembly Station Pneumatic Press Force Calibration', 
 'Standardize assembly pin press insertion force to 4.2 kN +/- 0.3 kN on ASM-01 station.', 
 'Prevent micro-deformation of pin seal groove during rubber seal assembly.', 
 'Functional leak testing of 500 assemblies showed zero leakage up to 250 bar hydraulic pressure.', 
 'APPROVED', 
 '22222222-2222-2222-2222-222222222222', '55555555-5555-5555-5555-555555555555', '2026-08-25 10:00:00+00', '2026-08-26 14:00:00+00'),

('cc111111-0004-1111-1111-111111111111', 
 'High-Speed 2D DataMatrix Serialization Camera Upgrade (Cognex In-Sight 8402)', 
 'Upgrade end-of-line verification vision camera to high-resolution verifier for 100% ISO/IEC 15415 Grade A code quality.', 
 'Ensure zero barcode reading failures at automotive OEM customer receiving docks.', 
 'PPAP validation protocol in progress. Awaiting customer engineering approval.', 
 'UNDER_REVIEW', 
 '33333333-3333-3333-3333-333333333333', NULL, '2026-09-03 11:00:00+00', '2026-09-03 11:00:00+00');

-- 4. Document Management (SOP Documents - Discrete Automotive Plant)
DELETE FROM document_management;

INSERT INTO document_management (id, document_number, title, version, document_type, file_path, status, effective_date, created_by, approved_by, created_at) VALUES
('d0000001-1111-1111-1111-111111111111', 'SOP-MACH-101', 'Precision CNC Turning & In-Line Dimensional Verification Protocol', '1.0', 'SOP', 'SOP-MACH-101-v10.pdf', 'EFFECTIVE', '2026-05-23', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', '2026-05-20 10:00:00+00'),
('d0000002-1111-1111-1111-111111111111', 'SOP-QC-205', 'Coordinate Measuring Machine (CMM) Calibration & Runout Verification', '2.1', 'SOP', 'SOP-QC-205-v21.pdf', 'EFFECTIVE', '2026-04-03', '55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', '2026-04-01 10:00:00+00'),
('d0000003-1111-1111-1111-111111111111', 'SOP-DISP-102', 'Steel Raw Material Bar Cutting & Weight Allocation Procedure', '2.0', 'SOP', 'SOP-DISP-102-v20.pdf', 'EFFECTIVE', '2026-07-01', '22222222-2222-2222-2222-222222222222', '55555555-5555-5555-5555-555555555555', '2026-06-28 10:00:00+00'),
('d0000004-1111-1111-1111-111111111111', 'SOP-HT-301', 'Induction Hardening Heat Treatment & Quench Quality Control (45-50 HRC)', '3.0', 'PROTOCOL', 'SOP-HT-301-v30.pdf', 'EFFECTIVE', '2026-06-15', '33333333-3333-3333-3333-333333333333', '55555555-5555-5555-5555-555555555555', '2026-06-10 10:00:00+00'),
('d0000005-1111-1111-1111-111111111111', 'SOP-CAL-401', 'Metrology Equipment Calibration & NIST Traceability Standards Protocol', '1.0', 'PROTOCOL', 'SOP-CAL-401-v10.pdf', 'EFFECTIVE', '2026-01-15', '33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', '2026-01-10 10:00:00+00'),
('d0000006-1111-1111-1111-111111111111', 'SOP-TRK-504', 'Automotive Component 2D DataMatrix Serialization & GS1 Traceability Protocol', '1.2', 'SPECIFICATION', 'SOP-TRK-504-v12.pdf', 'EFFECTIVE', '2026-08-10', '55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', '2026-08-05 10:00:00+00');

-- 5. Electronic Signatures (21 CFR Part 11 / IATF 16949 Signoffs)
DELETE FROM electronic_signatures;

INSERT INTO electronic_signatures (id, user_id, username, meaning, ip_address, timestamp) VALUES
('a2222222-0001-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'quality1', 'Raw Material Quarantine Release Approval for Heat EN8-260901', '192.168.1.105', '2026-09-08 11:00:00+00'),
('a2222222-0002-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'manager', 'Line Clearance & Work Order Release for PO-260003 (Control Pin)', '192.168.1.102', '2026-09-09 08:00:00+00'),
('a2222222-0003-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'quality1', 'In-Process CMM & Final Release Authorization for Finished Good Serial FG-260901-001', '192.168.1.105', '2026-09-09 17:45:00+00'),
('a2222222-0004-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'quality1', 'Approve deviation resolution and tool life root cause assessment for DEV-2026-001', '192.168.1.105', '2026-09-09 13:00:00+00'),
('a2222222-0005-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'admin', 'Quality Management Authorization for Change Control CC-2026-002', '192.168.1.100', '2026-09-09 18:00:00+00');

-- 6. Immutable Audit Trail Logs (ALCOA+ Traceability)
DELETE FROM audit_trail;

INSERT INTO audit_trail (id, user_id, username, action, old_value, new_value, reason, timestamp) VALUES
('a1111111-0001-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'quality1', 'RAW_MATERIAL_QC_RELEASE', 'QUARANTINE', 'RELEASED', 'Passed all incoming 3.1 mill test specifications for EN8-260901 (Steel Bar Ø25mm)', '2026-09-08 11:00:00+00'),
('a1111111-0002-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'supervisor', 'EQUIPMENT_CALIBRATION_CERTIFIED', 'PENDING', 'QUALIFIED', 'Calibration CAL-2026-002 on CNC-01 certified with NIST traceable laser interferometer', '2026-09-08 14:00:00+00'),
('a1111111-0003-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'admin', 'MASTER_ROUTING_APPROVAL', 'DRAFT', 'ACTIVE', 'Approved Master Routing RT-004 vA with 3-operation sequence for Control Pin Assembly', '2026-09-08 16:00:00+00'),
('a1111111-0004-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'manager', 'WORK_ORDER_RELEASE', 'PLANNED', 'RELEASED', 'Released work order PO-260003 for Line 1 machining campaign (8000 units)', '2026-09-09 08:00:00+00'),
('a1111111-0005-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'operator1', 'RAW_MATERIAL_DISPENSING', '0.00 kg', '448.00 kg', 'Dispensed 448 kg EN8 steel bar stock. Barcode scanned and verified by Production Supervisor', '2026-09-09 08:15:00+00'),
('a1111111-0006-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'operator1', 'LINE_STEP_EXECUTION', 'IDLE', 'RUNNING', 'Initiated Operation 10 Automatic Bar Cutting on CUT-01', '2026-09-09 08:30:00+00'),
('a1111111-0007-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'quality1', 'IN_PROCESS_QC_RECORDED', 'PENDING', 'PASSED', 'Recorded in-process CMM inspection INSP-001 (Diameter: 24.98 mm, Length: 80.04 mm - PASS)', '2026-09-09 11:00:00+00'),
('a1111111-0008-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'operator1', 'REPORT_DEVIATION', NULL, 'NCR001', 'Logged minor tool wear diameter offset observation on CNC-01 during batch run', '2026-09-09 11:30:00+00'),
('a1111111-0009-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'quality1', 'RESOLVE_DEVIATION', 'OPEN', 'CLOSED', 'Replaced tool insert on CNC-01, recalibrated offset, and verified 10 consecutive pieces', '2026-09-09 12:30:00+00'),
('a1111111-0010-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'quality1', 'CREATE_CAPA', NULL, 'CAPA-2026-001', 'Logged corrective action plan for CNC-01 automated tool life counter configuration', '2026-09-09 12:00:00+00'),
('a1111111-0011-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'quality1', 'COMPLETE_CAPA', 'OPEN', 'COMPLETED', 'Configured 800-cycle tool alert on Fanuc CNC controller. Verified and closed', '2026-09-09 13:15:00+00'),
('a1111111-0012-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'quality1', 'INITIATE_CHANGE_CONTROL', NULL, 'CC-2026-001', 'Initiated change control to optimize spindle speed to 2500 RPM for EN8 steel bar', '2026-09-09 15:00:00+00'),
('a1111111-0013-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'manager', 'APPROVE_CHANGE_CONTROL', 'UNDER_REVIEW', 'APPROVED', 'Approved CC-2026-001. Surface finish verified at Ra 0.75 um with zero dimensional offset', '2026-09-09 16:00:00+00'),
('a1111111-0014-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'quality1', 'EBR_QA_RELEASE', 'IN_PROCESS', 'QA_APPROVED', 'Authorized electronic batch record and released FG serial lot FG-260901-001 (945 units)', '2026-09-09 17:45:00+00');
