# User roles and plant access remediation

Live deployment completed on 18 October 2026. The database was backed up, restored into a validation database, migrated and tested there, then migrated in `ugam_mes`. Backend and frontend images were rebuilt and deployed. All seven accounts are active with unique generated passwords; no placeholder hashes remain.

**Credential handover:** `security-bootstrap-credentials.json` contains the generated passwords and is ignored by Git. Read access has been restored for the current Windows user; SYSTEM and Administrators retain their existing access. No passwords are printed in this report.

## Implemented model

- `SUPER_ADMIN` is the only global role. Its account has no assigned organization or plant. It can administer the enterprise without an active plant, or log in with an explicit active plant for manufacturing work.
- Every other account has one plant and that plant's organization. Plant admins cannot transfer accounts, create global users, edit global users, or edit another plant's users.
- Usernames are globally unique, trimmed, and lowercase. Display names can repeat. Username collision enforcement also exists in the database.
- Every protected HTTP request validates current account activity, role, organization/plant assignment, and session version. Only login and the two tenant-discovery endpoints remain public. OPC is protected by this global guard.
- Role, password, status, or allocation updates revoke prior sessions. HTTP revocation takes effect on the next request; existing sockets revalidate every five seconds and disconnect at token expiry. Browser sessions check their profile every 30 seconds.
- User passwords are explicitly selected only for authentication/signature verification. Hashes are excluded from normal ORM queries and account responses.
- Authentication and signature bypasses, offline mock login, quick-login password buttons, fabricated user rosters, and disconnected-socket counter simulation were removed.
- Existing CSS, theme engine, palette definitions, light/dark mode, and factory mode were not changed. Authentication feedback uses existing styles.

## Source account review — not a live database audit

The live `ugam-postgres` database was inspected after the containers were started. Seven accounts were found, with no normalized username collisions and no inconsistent existing plant assignments. All seven placeholder passwords were replaced with unique bcrypt-hashed credentials.

| Username | Intended role | Assignment recorded in enterprise migration | Credential finding |
| --- | --- | --- | --- |
| superadmin | SUPER_ADMIN | Global | Unique password provisioned |
| admin | ADMIN | Automotive plant | Unique password provisioned |
| manager | PRODUCTION_MANAGER | Automotive plant | Unique password provisioned |
| supervisor | SUPERVISOR | Automotive plant | Unique password provisioned |
| operator1 | OPERATOR | Automotive plant | Unique password provisioned |
| quality1 | QUALITY_ENGINEER | Automotive plant | Unique password provisioned |
| food_op1 | OPERATOR | Food plant | Unique password provisioned |

These seven live usernames do not collide after normalization. Future imported accounts and SQL changes must be checked against the actual database. The migration does not use usernames to guess missing plant assignments. Some placeholder hashes have a valid bcrypt-shaped length, so explicit placeholder detection is also applied.

## Database rollout

The following procedure was rehearsed and applied to the running deployment. The pre-upgrade backup is `backups/ugam_mes-before-security-20261018.dump`; the earlier restore-rehearsal backup is also retained. The restored database `ugam_security_validation_20261018` is retained for inspection; its temporary API container was stopped. Do not rerun these steps against the live deployment unnecessarily.

1. Back up the database and rehearse restoration. Stop backend workers and writes during cutover.
2. Install backend dependencies on the deployment platform. Set connection variables from `backend/.env.example`; use a unique random `JWT_SECRET` of at least 32 characters. The former embedded secret is rejected. `APP_MODE` defaults to `production`.
3. Run from `backend/`:

   ```powershell
   node scripts/security-admin.cjs audit > ../security-account-audit.json
   ```

   This command only reads the database and reports users, normalized collisions, plant assignments, password-format/placeholder status, work-order production-plant candidates, and inventory lots. It never prints password hashes.

4. Prepare `reviewed-plant-mapping.json` using the example structure below. Omit rows already assigned correctly. Explicitly map ambiguous work orders and existing inventory lots. Work orders may be backfilled from physical production logs only when exactly one plant is represented. Creator identity alone is not used as ownership evidence.

   ```json
   {
     "users": [
       { "userId": "existing-user-uuid", "plantId": "reviewed-plant-uuid", "username": "optional.corrected.username" }
     ],
     "workOrders": [
       { "workOrderId": "existing-order-uuid", "plantId": "reviewed-plant-uuid" }
     ],
     "inventoryLots": [
       { "inventoryId": "existing-inventory-row-uuid", "plantId": "reviewed-plant-uuid" }
     ]
   }
   ```

5. Validate against a restored database first with `node scripts/security-admin.cjs check-migration --mapping ../reviewed-plant-mapping.json` (transaction rolled back), then apply the transactional migration:

   ```powershell
   node scripts/security-admin.cjs migrate --mapping ../reviewed-plant-mapping.json
   ```

   Duplicate normalized usernames, invalid assignments, invalid plant references, and unresolved work-order ownership roll back the entire migration. Super-admin assignments are cleared, organizations are reconciled to the assigned plant, and placeholder accounts are disabled. Unmapped historical finished-goods inventory is retained but excluded from plant queries until explicitly mapped; it is never exposed globally.

6. Reset each placeholder account individually with a securely supplied `MES_RESET_PASSWORD` environment variable:

   ```powershell
   node scripts/security-admin.cjs reset-password --username superadmin
   ```

   The reset requires at least 12 characters and no more than 72 UTF-8 bytes. It activates the account and revokes old sessions. Clear the temporary environment variable afterwards. Never put passwords in command-line arguments, source files, or the mapping file.

7. Run the audit again, verify accounts and assignments, deploy frontend/backend together, and require fresh login. Base schema, enterprise migration, and the manufacturing tables used by the existing application must exist before this migration; it is an upgrade, not a replacement initial database installer. Do not rerun legacy seed scripts after cutover because they can reintroduce invalid legacy accounts.

## Operational interfaces

- Work-order creation assigns the current plant and creator server-side. Listing, ID lookup, modification, and progress updates include the active plant. Quality inspection and EBR access also verify order ownership. Material consumption/dispensing entry points verify the target order.
- Equipment/topology queries use machine → line → area → plant ownership. Equipment creation now requires a selected production line rather than silently choosing the first global line.
- Traceability raw SQL uses plant-filtered work-order, finished-goods, genealogy, and consumed-batch relations. Finished-goods rows require reviewed plant ownership; raw batches are traceable here only through a consuming order in the active plant.
- OPC tags/configuration/audits now persist by plant. Old process-memory tags/configuration were not authoritative database records and are not silently imported. Administrators must register plant equipment tags and configure approved endpoints.
- `OPC_ALLOWED_ENDPOINTS` is a comma-separated exact allowlist of Kepware IoT Gateway base URLs. Connection tests cannot probe arbitrary request-supplied URLs. Only `KEPWARE_REST` is implemented; native OPC UA is rejected rather than advertised as working.
- All authenticated manufacturing roles can read tags/status. Supervisors, production managers, and admins can write writable tags. Only admins configure/register/test/sync. Quality engineers, production managers, and admins can read OPC command audits. Super admins inherit these permissions in their selected plant.
- Command actor identity comes from authentication, not request payloads. Each physical write requires persisted intent first; failures or missing acknowledgements are recorded as `UNKNOWN` and must be reconciled before retrying. Physical failures cannot become simulated success. Demo mode never sends physical commands and requires its own database/secrets/deployment.
- Socket.IO uses `auth: { token }`. Rooms are chosen by the server. Plant broadcasts and recipient-specific operator messages do not accept client-selected rooms. Logout/login clears stored operational counters and alerts; token changes recreate the socket connection.

## Validation and boundaries

- Backend and frontend production Docker builds both pass. Backend dependency installation is now reused for the production image rather than performed twice.
- PostgreSQL constraint tests on the restored database passed: missing plant assignments, organization mismatch, invalid global scope, and uppercase duplicate usernames are rejected; valid plant accounts are accepted.
- Twenty automated service/guard/gateway regression tests pass: role escalation, foreign-plant access, login/signature bypasses, session revocation, missing socket credentials, plant rooms, recipient ownership, OPC audit-before-write, and failed-write outcomes. Tests mock bcrypt, repositories, network calls, and sockets; they do not replace a real PostgreSQL/HTTP/equipment integration test.
- All 27 frontend TypeScript/TSX files passed syntax checks, followed by a successful full TypeScript/Vite production build. No theme/CSS files were edited; screenshot comparison was not performed.
- Thirty real HTTP checks passed against the restored database using native bcrypt. Twenty-eight read-only live checks passed on port 3001, and the same checks passed through the actual nginx proxy at port 8085. All seven accounts authenticate and the former bypass password is rejected.
- Real Socket.IO tests against the restored database confirmed that anonymous clients are disconnected and automotive production events do not reach the food-plant client.
- Testing found and fixed compatibility with the existing PostgreSQL UUID-shaped identifiers and the deployed legacy `audit_logs` table. The migration creates the expected `audit_trail` table, preserves legacy entries, and electronic signatures now persist together with their audit entry in a transaction.
- Run `npm run test:security` from `backend/` after installing dependencies. Local backend compilation used dependencies recovered from the supplied backend image archive when npm DNS access was unavailable. Reinstall native dependencies on the target platform; recovered Linux bcrypt binaries are unsuitable for native Windows runtime.
- The SQL migration, password provisioning, and local application rollout were verified against the running environment. Real physical-device acknowledgements remain untested because no approved equipment endpoint is configured. Coordinate future schema/application rollouts; rolling back the app alone is not a safe substitute for restoring the matched database backup.
- The new backend dependency build reports 17 npm audit findings in runtime dependencies, including two critical findings. Dependency remediation is separate from these access-control changes and remains outstanding; no breaking automatic audit fixes were applied.
- This change secures the account model and the named operational paths. It does **not** establish complete product-wide tenant isolation: legacy shared material/vendor catalogs, warehouse/GRN stock workflows, recipes/BOMs, and parts of compliance/downtime still require their own ownership migrations and query scoping. Do not present this release as fully isolated multi-tenant production software until that follow-through is complete.
