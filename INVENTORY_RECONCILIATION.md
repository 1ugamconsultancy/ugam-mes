# Prepared batch-balance corrections

Status: prepared, not applied. Target: this installation's development database `ugam_mes` only. Warehouse inventory is the authoritative source as requested. No warehouse stock, allocation, batch release status, or historical transaction is changed.

| Batch | Current batch total | Warehouse total / proposed batch total | Change |
| --- | ---: | ---: | ---: |
| EN8-260901 | 1000 | 4550 | +3550 |
| HT-260901 | 1000 | 2500 | +1500 |
| RS-260901 | 1000 | 1120 | +120 |
| PIN-260901 | 1000 | 800 | -200 |
| FG-260901 | 945 | 0 | -945 |
| FG-260901-001 | 1 | 0 | -1 |
| HT-260901-001 | 1 | 0 | -1 |
| PIN-260901-001 | 1 | 0 | -1 |

Quantities retain each batch's existing unit; rows must not be summed across materials. Zero means no warehouse inventory is recorded for that batch, not evidence of a physical disposal.

The prepared SQL is `backend/migrations/20261018_prepared_balance_reconciliation.sql`. It is intentionally excluded from the automatic migration runner. During a maintenance window, after backup and review, apply it in one transaction. It locks batch and inventory tables, checks exact batch IDs/numbers and all expected before/after totals, rejects invalid allocations and repeat application, records a dedicated reconciliation audit, and updates only batch totals. Any changed balance aborts the entire correction for a refreshed review.

The separate prepared warehouse migration renames WH-RAW to WH-AUT and assigns it to Ugam Precision Automotive Plant. WH-WIP and WH-FG remain unassigned. Dispensing remains blocked for inconsistent batch totals and unassigned warehouses under the new service.
