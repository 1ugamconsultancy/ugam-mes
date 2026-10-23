# Operational indexes

The versioned CJS manifest is executed by the PostgreSQL runner, not the transactional SQL runner.
`CREATE INDEX CONCURRENTLY` and `DROP INDEX CONCURRENTLY` run as individual statements.
No application data or APIs change. An ownership journal records only indexes this migration
creates, including pending creation attempts, so equivalent pre-existing indexes survive rollback.

From `backend/`:

```
node test/operational-indexes.cjs
node scripts/operational-indexes.cjs apply --development
node scripts/operational-indexes.cjs verify
node scripts/operational-indexes.cjs rollback --development
```

Before applying, take and validate a PostgreSQL custom-format backup. The CLI targets this
installation's development database only; credentials are read from the existing Compose file.
The test creates and removes a separate disposable database and writes its measurements to
`backups/operational-indexes-validation.json`. It needs database creation privileges. Its synthetic
write timing is a comparative microbenchmark, not an end-to-end dispensing throughput guarantee.
Run the existing operational integration suite separately to verify transactional behavior.

The runner takes a session advisory lock, limits lock waits to five seconds and individual
statements to ten minutes, checks definitions and validity, and analyzes affected tables.
The completion marker is written only after every index is valid. A failed concurrent build may
leave an invalid index; the runner reports it instead of silently skipping it. Explicit rollback
removes owned pending/complete indexes, after checking definition and recorded OID, then permits
retry. Foreign invalid equivalents require separate inspection; they are never dropped here.
Rollback leaves the empty journal table in place, and removes the migration completion marker.

The existing work-order index and all primary/unique constraints remain unchanged. Queries on a
small table may correctly keep using sequential scans; do not disable sequential scans to make
the validation pass. The next improvement (paginated summaries) is a separate application change.
