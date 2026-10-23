# End-to-End Production Line Test Plan: Precision Automotive Control Pin & Hydraulic Seal Manufacturing (LINE-MACH-01 / LINE-ASSY-01)

**Document Reference:** `TP-MES-AUTO-001`  
**System Name:** UGAM Next Gen Manufacturing Execution System (MES)  
**Target Manufacturing Facility:** Ugam Precision Automotive Plant (`AUTO-PLANT-01`)  
**Production Lines:** Machining Line 1 (`LINE-MACH-01`) & Automotive Assembly Line 1 (`LINE-ASSY-01`)  
**Target Product SKU:** `FG-001` - Automotive Control Pin (and `FG-002` - Hydraulic Seal Assembly)  
**Reference Work Order Campaign:** `PO-260003` (Target: 8,000 PCS) / `PO-260001` (Target: 5,000 PCS)  
**Regulatory & Quality Standards:** IATF 16949:2016, ISO 9001:2015, AIAG APQP / PPAP Level 3, VDA 6.3, 21 CFR Part 11 Audit Trail Integrity  
**Effective Date:** 2026-09-01  
**Status:** APPROVED & ACTIVE  

---

## 1. Executive Summary & Objective

### 1.1 Purpose
This document defines the comprehensive **End-to-End Verification & Validation Test Plan** for the complete manufacturing lifecycle of **Automotive Control Pins (`FG-001`)** and **Hydraulic Seal Assemblies (`FG-002`)** produced at **Ugam Precision Automotive Plant (`AUTO-PLANT-01`)** across **Machining Line 1 (`LINE-MACH-01`)** and **Assembly Line 1 (`LINE-ASSY-01`)**.

The test plan validates:
1. **Raw Material Metallurgical Inbound & Quarantine Control:** Receipt, vendor quality qualification, 3.1 Mill Test Certificate (CoA) verification, and electronic signature release for alloy steel round bar stock (`RM-ST-001`).
2. **Machining & Metrology Calibration Integrity:** Machine calibration statuses (`CAL-2026-001` through `CAL-2026-009`), equipment qualification (IQ/OQ/PQ), tool wear monitoring, and line clearance.
3. **Master Routing & Material Dispensing:** Multi-tier Bill of Materials (BOM) explosion, bar stock cutting allocation, dual-signature weight verification, and heat number tagging.
4. **Progressive Precision Shopfloor Line Execution:** Step-by-step equipment execution across Automatic Bar Cutter (`CUT-01`), CNC Turning Center (`CNC-01`), Deburring (`DBR-01`), Induction Hardening (`HT-01`), Rubber Moulding (`RM-01`), and Component Assembly (`ASM-01`).
5. **Quality Control, Deviations & CAPA:** In-process CMM inspection (`INSP-001` / `INSP-002`), case hardness testing (45–50 HRC), Non-Conformance logging (`NCR001`), root-cause investigation, and Corrective/Preventive Action (`CAPA-2026-001`).
6. **Electronic Batch Record (EBR) Closure:** Complete electronic production dossier consolidation, immutable ALCOA+ audit trail logging, and dual QA electronic signature release.
7. **Finished Goods Serialization, Track & Trace & Mock Recall Drill:** 2D DataMatrix laser serialization (`FG-260901-001`), GS1 supply chain traceability, outbound OEM dispatch (`D001`), multi-tier upstream genealogy (`EN8-260901` ➔ `PIN-260901-001` ➔ `HT-260901-001` ➔ `FG-260901-001`), and containment drill in under 1.5 seconds.

---

## 2. Production Line Architecture & Equipment Topology

### 2.1 Plant Hierarchy
- **Enterprise / Plant:** Ugam Precision Automotive Plant (`AUTO-PLANT-01`, ID: `a0000000-0001-1111-1111-111111111111`)
- **Departments / Work Centers:**
  - `WC-CUT`: Cutting Work Center (Area ID: `a1111111-0001-1111-1111-111111111111`)
  - `WC-CNC`: CNC Turning Work Center (Area ID: `a1111111-0002-1111-1111-111111111111`)
  - `WC-DBR`: Deburring Work Center (Area ID: `a1111111-0003-1111-1111-111111111111`)
  - `WC-HT`: Heat Treatment Work Center (Area ID: `a1111111-0004-1111-1111-111111111111`)
  - `WC-RM`: Rubber Moulding Work Center (Area ID: `a1111111-0005-1111-1111-111111111111`)
  - `WC-ASM`: Assembly Work Center (Area ID: `a1111111-0006-1111-1111-111111111111`)
  - `WC-TEST`: Testing Work Center (Area ID: `a1111111-0007-1111-1111-111111111111`)
  - `WC-QC`: Quality Metrology Center (Area ID: `a1111111-0008-1111-1111-111111111111`)
- **Lines:**
  - `LINE-MACH-01`: Machining Line 1 (Line ID: `40111111-0001-1111-1111-111111111111`)
  - `LINE-MOULD-01`: Moulding Line 1 (Line ID: `40111111-0002-1111-1111-111111111111`)
  - `LINE-ASSY-01`: Automotive Assembly Line 1 (Line ID: `40111111-0003-1111-1111-111111111111`)

### 2.2 Progressive Discrete Equipment Train

```
 ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
 │    CUT-01    │     │    CNC-01    │     │    DBR-01    │     │    HT-01     │
 │Automatic Bar │────▶│ CNC Turning  │────▶│  Deburring   │────▶│  Induction   │
 │    Cutter    │     │    Center    │     │   Machine    │     │   Hardening  │
 └──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                                                                        │
 ┌──────────────┐     ┌──────────────┐     ┌──────────────┐            │
 │    QC-02     │     │   TEST-01    │     │    ASM-01    │            │
 │ CMM Metrology│◀────│ Torque & Hyd │◀────│ Assembly &   │◀───────────┘
 │  Inspection  │     │  Load Test   │     │ Laser Mark   │
 └──────┬───────┘     └──────────────┘     └──────────────┘
        │
        ▼
 [ Finished Serial FG-260901-001 / Batch FG-260901 ➔ Warehouse WH-FG Distribution Bay ]
```

| Step # | Equipment Code | Machine Name | Machine UUID | Work Center | Function & Critical Process Parameters (CPPs) |
|---|---|---|---|---|---|
| **01** | `CUT-01` | Automatic Bar Cutter 01 | `e1111111-0001-1111-1111-111111111111` | `WC-CUT` | Precision band sawing; cutting length: `80.0 mm ± 0.1 mm`; clamp pressure: `35 bar` |
| **02** | `CNC-01` | CNC Turning Center 01 | `e1111111-0002-1111-1111-111111111111` | `WC-CNC` | Turning & profiling; spindle speed: `2500 RPM`; feed rate: `0.15 mm/rev`; OD: `24.98 mm ± 0.02 mm` |
| **03** | `DBR-01` | Deburring Machine 01 | `e1111111-0003-1111-1111-111111111111` | `WC-DBR` | Edge radiusing & cleaning; chamfer: `0.3 mm x 45°`; cycle time: `45s` |
| **04** | `HT-01` | Heat Treatment Furnace 01 | `e1111111-0004-1111-1111-111111111111` | `WC-HT` | Induction hardening; temperature: `860°C ± 10°C`; polymer quench flow: `85 L/min`; hardness: `45–50 HRC` |
| **05** | `RM-01` | Rubber Moulding Machine 01 | `e1111111-0005-1111-1111-111111111111` | `WC-RM` | Compression moulding; platen temp: `175°C ± 2°C`; cure time: `180s`; clamp tonnage: `150T` |
| **06** | `ASM-01` | Assembly Station 01 | `e1111111-0007-1111-1111-111111111111` | `WC-ASM` | Pin & seal press assembly; press force: `4.2 kN ± 0.3 kN`; laser 2D DataMatrix serialization |
| **07** | `TEST-01` | Functional Torque/Load Bench | `e1111111-0008-1111-1111-111111111111` | `WC-TEST` | Proof loading & seal test; axial proof load: `500 N ± 20 N`; hydraulic leak: `0 leak at 250 bar` |
| **08** | `QC-02` | CMM Metrology Center | `e1111111-0009-1111-1111-111111111111` | `WC-QC` | Multi-axis CMM inspection; diameter, total runout (< 0.015 mm), surface roughness (Ra < 0.8 um) |

---

## 3. Test Phase 1: Raw Material Inbound, Vendor Qualification & Quarantine Release

### 3.1 Overview & Acceptance Criteria
Incoming carbon steel bar stock (`RM-ST-001`) and aluminium billets must arrive from **Qualified Suppliers (`QUALIFIED`)**, receive a unique Goods Receipt Note (`GRN`), be staged in **`QUARANTINE`** status, undergo metallurgical 3.1 mill certificate review, and be formally released via **Electronic Signature** before production allocation.

### 3.2 Material Master & Vendor Alignment

| Material Code | Material Description | Material Type | Category | Approved Supplier | Storage Warehouse & Bin | Target Lot / Heat # |
|---|---|---|---|---|---|---|
| `RM-ST-001` | EN8 Steel Bar Ø25 mm | `RAW` | STEEL | Steel Supplier A (`SUP-001`) | `WH-RAW` (`LOC-RM-01`) | `EN8-260901` (`LOT-ST-260901`) |
| `RM-ST-002` | Aluminium Rod Ø30 mm | `RAW` | ALUMINIUM | Aluminium Supplier B (`SUP-002`) | `WH-RAW` (`WH-RAW-AL-01`) | `LOT-AL-260901` |
| `RM-ST-003` | NBR Rubber Compound | `RAW` | RUBBER | Rubber Supplier C (`SUP-003`) | `WH-RAW` (`WH-RAW-RB-01`) | `LOT-RB-260901` |
| `RM-ST-004` | Copper Wire 2.5 mm | `RAW` | ELECTRICAL | Copper Supplier D (`SUP-004`) | `WH-RAW` (`WH-RAW-CU-01`) | `LOT-CU-260901` |

---

## 4. Test Phase 2: Master Routing, BOM Formulation & Equipment Calibration

### 4.1 Master Routing Specification (`RT-004` / `RT-001`)
- **Routing Code:** `RT-004` (Automotive Control Pin Assembly) & `RT-001` (Steel Pin Machining)
- **Target Product:** `FG-001` - Automotive Control Pin
- **Planned Yield Target:** `98.50%`
- **Standard Batch Base:** 5,000 PCS

#### 4.1.1 Bill of Materials (BOM) Calculation Table (`BOM-001` / `BOM-003`)

| Parent Material | Component Material | Component Type | Line No | Qty per Assembly | UOM | Source Station |
|---|---|---|---|---|---|---|
| `FG-001` | `INT-002` (Heat Treated Pin) | `INTERMEDIATE` | 10 | 1.0000 | PCS | Station `ASM-01` (Op 30) |
| `INT-002` | `INT-001` (Machined Pin) | `INTERMEDIATE` | 10 | 1.0000 | PCS | Station `HT-01` (Op 10) |
| `INT-001` | `RM-ST-001` (EN8 Steel Bar Ø25mm) | `RAW` | 10 | 0.4500 | KG | Station `CNC-01` (Op 20) |

---

## 5. Test Phase 3: Work Order Campaign Initiation & Dispensing Verification

### 5.1 Work Order Metadata
- **Work Order Number:** `PO-260003` (Machining Campaign) / `PO-260001` (Final Assembly)
- **Product:** `INT-001` / `FG-001`
- **Target Quantity:** `8,000 PCS` (Machining) / `5,000 PCS` (Assembly)
- **Planned Schedule:** `2026-09-09 08:00:00 UTC` to `2026-09-11 17:00:00 UTC`
- **Production Manager:** `Venugopal Savadatti` (`manager@ugamconsultancy.com`)
- **Assigned Operator:** `Himanee-Op Savadatti` (`operator1@ugamconsultancy.com`)
- **Quality Lead:** `Venu-Quality Savadatti` (`quality1@ugamconsultancy.com`)

### 5.2 Material Dispensing Records (`dispensing_records`)

| Material Code | Heat Lot # | Requested Qty | Dispensed Qty | Balance Remaining | Scale ID & Tare | Verification Status |
|---|---|---|---|---|---|---|
| `RM-ST-001` | `EN8-260901` | `450.000 kg` | `448.000 kg` | `552.000 kg` | `SC-01` (Tare: 0.00 kg) | `VERIFIED` |
| `INT-002` | `HT-260901` | `950.000 pcs` | `945.000 pcs` | `55.000 pcs` | `SC-02` (Tare: 0.00 kg) | `VERIFIED` |
| `INT-003` | `RS-260901` | `500.000 pcs` | `495.000 pcs` | `505.000 pcs` | `SC-03` (Tare: 0.00 kg) | `VERIFIED` |

---

## 6. Test Phase 4: In-Process Quality Checks, Deviations & CAPA

### 6.1 In-Process Quality Inspection Records (`quality_result` / `quality_checks`)

| Inspection ID | Production Order | Material Code | Characteristic | Tolerance Limits | Actual Measured | Result |
|---|---|---|---|---|---|---|
| `INSP-001` | `PO-260003` | `INT-001` | Outer Diameter | `24.95 – 25.00 mm` | `24.98 mm` | `PASS` |
| `INSP-002` | `PO-260003` | `INT-001` | Total Length | `79.90 – 80.10 mm` | `80.04 mm` | `PASS` |
| `INSP-003` | `PO-260003` | `INT-002` | Case Hardness | `45.0 – 50.0 HRC` | `47.2 HRC` | `PASS` |
| `INSP-004` | `PO-260001` | `FG-001` | Functional Load Test | `480 – 520 N` | `492 N` | `PASS` |

### 6.2 Non-Conformance Management (`deviations`)
- **Deviation Report ID:** `NCR001` (`d0111111-0001-1111-1111-111111111111`)
- **Category:** `EQUIPMENT` | **Severity:** `MINOR`
- **Title:** CNC Turning Tool Wear Diameter Offset Drift
- **Description:** In-process dimensional sampling on lathe CNC-01 showed pin outer diameter drifting towards upper tolerance limit (24.995 mm vs 24.980 mm nominal).
- **Root Cause:** Micro-chipping on tool insert flank face after 850 continuous cycles.
- **Disposition:** Tool insert indexed to new cutting edge; 10 consecutive pieces measured on CMM and cleared (Cpk = 1.67).
- **Status:** `CLOSED` (Resolved by Quality Lead `Venu-Quality Savadatti`).

### 6.3 Corrective & Preventive Action (`capas`)
- **CAPA ID:** `CAPA-2026-001`
- **Linked Deviation:** `NCR001`
- **Action Type:** `CORRECTIVE`
- **Title:** CNC-01 Automated Tool Life Counter & Predictive Offset Integration
- **Status:** `COMPLETED` (Automated 800-cycle tool indexing alarm configured in CNC controller).

---

## 7. Test Phase 5: Finished Goods Serialization, Track & Trace & Multi-Tier Genealogy

### 7.1 Finished Goods Serialization & DataMatrix
- **Finished Good Serial:** `FG-260901-001`
- **Product SKU:** `FG-001` - Automotive Control Pin
- **Location:** `LOC-FG-01` (Finished Goods Bay)
- **Status:** `FINISHED / RELEASED`
- **GS1 2D DataMatrix Encoding:** `(01)08901234000018(10)FG-260901(21)FG-260901-001`

### 7.2 Multi-Tier Upstream Genealogy Tree

```
                                [ STEEL SUPPLIER A (SUP-001) ]
                              (Raw Heat HT-4481 Mill CoA: PASS)
                                              │
                                              ▼
                                 [ RAW STEEL BAR EN8-260901 ]
                               (Material RM-ST-001, Station CUT-01)
                                              │
                                              ▼
                                 [ MACHINED PIN PIN-260901-001 ]
                              (Material INT-001, Station CNC-01, Op 20)
                                              │
                                              ▼
                               [ HEAT TREATED PIN HT-260901-001 ]
                              (Material INT-002, Station HT-01, Op 10)
                                              │
                                              ▼
                            [ AUTOMOTIVE CONTROL PIN FG-260901-001 ]
                              (Material FG-001, Station ASM-01, Op 30)
                                              │
                                              ▼
                            [ DISPATCH D001 ➔ PREMIER MOTORS OEM-A ]
                                   (Sales Order SO-AUTO-01)
```

### 7.3 Raw Heat Containment Drill (IATF 16949 Recall Drill)
- **Query:** `GET /inventory/recall/EN8-260901`
- **Performance:** Resolved in **1.15 seconds**.
- **Contamination Tree Isolated:**
  - **Raw Material:** `EN8-260901` (EN8 Steel Bar Ø25 mm).
  - **Affected Batches:** `PO-260003` (448 kg consumed), `PO-260001` (consumed in subassembly).
  - **Affected Finished Lots:** `FG-260901-001` (1 unit in FG Bay), `FG-260901` (945 units isolated in WIP buffer).
  - **Customer Notification:** `Premier Automotive Motors (OEM-A)` (`SO-AUTO-01`).
  - **Risk Level:** `CONTAINED - Raw heat tractability validated; 945 units isolated in WIP buffer`.

---

## 8. Comprehensive Acceptance Matrix

| Test ID | Test Category | Specific Test Assertion | Expected Result | Verified Result | Status |
|---|---|---|---|---|---|
| `TC-001` | Master Data | All discrete automotive machines (`CUT-01` through `QC-02`) registered | Machine records exist with unique codes and work centers | Validated in `machines` table | **PASS** |
| `TC-002` | Calibration | Calibrations `CAL-2026-001` to `CAL-2026-009` valid | All machines report status `PASSED` | Validated via `/equipment/statuses` | **PASS** |
| `TC-003` | Qualification | IQ/OQ/PQ records active for CNC turning and induction hardening | PQ records active; spindle runout < 0.003 mm verified | Validated in `equipment_qualifications` | **PASS** |
| `TC-004` | Receiving QC | Inbound steel heat `EN8-260901` received and released | Mill certificate verified, status `RELEASED` | Validated in `material_batches` | **PASS** |
| `TC-005` | Dispensing | Weight allocation of 448 kg EN8 bar stock recorded | Dual verification completed on scale `SC-01` | Validated in `dispensing_records` | **PASS** |
| `TC-006` | Line Exec | Machining, deburring, and assembly logging | Total produced: 945 good units, scrap within tolerance | Validated in `production_confirmation` | **PASS** |
| `TC-007` | In-Process QC | CMM dimensional checks (`INSP-001` / `INSP-002`) | Diameter 24.98 mm, Length 80.04 mm, Hardness 47.2 HRC | Validated in `quality_result` | **PASS** |
| `TC-008` | Deviations | Tool wear deviation `NCR001` logged and closed with root cause | Deviation status `CLOSED`, linked to `PO-260003` | Validated in `deviations` | **PASS** |
| `TC-009` | CAPA | Tool counter CAPA `CAPA-2026-001` created and completed | Status `COMPLETED`, 800-cycle tool alert active | Validated in `capas` | **PASS** |
| `TC-010` | EBR Closure | Complete Electronic Batch Record consolidated and signed | Status `QA_APPROVED` with IATF 16949 release | Validated via `/ebr/work-order/:id` | **PASS** |
| `TC-011` | Audit Trail | Immutable audit trail captures all routing, QC, and release events | 100% ALCOA+ compliance with user IDs and timestamps | Validated via `/compliance/audit-logs` | **PASS** |
| `TC-012` | Track & Trace | Multi-tier upstream genealogy traces `FG-260901-001` back to `EN8-260901` | Complete 4-tier tree returned with stations and timestamps | Validated via `/inventory/traceability/:lot` | **PASS** |
| `TC-013` | Containment Drill | Query on `EN8-260901` isolates affected batches and customer orders | Returns `FG-260901` and `Premier Automotive Motors` in < 2s | Validated via `/inventory/recall/EN8-260901` | **PASS** |

---

## 9. Document Revision & Sign-off History

| Version | Date | Author / Role | Summary of Changes | Approval Signature |
|---|---|---|---|---|
| **1.0** | `2026-09-01` | Lead MES Systems Architect | Initial baseline creation for Ugam Precision Automotive Plant | *Approved by Venugopal Savadatti (Prod Mgr)* |
| **1.1** | `2026-10-14` | Quality & Systems Engineering | Full Discrete Automotive alignment: Control Pin & Hydraulic Seal lines, IATF 16949 compliance, 2D DataMatrix serialization | *Approved by Venu-Quality Savadatti (QA Lead)* |
