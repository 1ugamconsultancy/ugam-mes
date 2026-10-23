# Enterprise inline actions and archive rollout

Deployed 18 October 2026 to the development installation at http://127.0.0.1:8085/super-admin.

Organization and plant rows and detail headings now offer Edit, Add Plant/Add Sibling Plant, and Archive icons. Archive preserves records and history. Show archived reveals archived branches and Restore actions. An archived parent suspends its plants without changing their independent archive flags or activation settings. Themes and User Allocations share the same compact cards, controls, dialogs, and action colors.

Backend: SUPER_ADMIN-only POST `/enterprise/organizations/:id/archive`, `/restore`, and equivalent `/enterprise/plants/:id/...` routes. Organization/plant lists default to unarchived records; `includeArchived=true` returns direct archive metadata and inherited plant state. Generic writes reject archive metadata. Archived scopes reject editing, theme publishing, allocation, login, and authenticated requests. Session versions advance on archive and restore, so restored users must log in again. WebSockets use existing five-second authentication revalidation.

Migration `backend/migrations/20261018_enterprise_archive.sql` adds archive metadata, transactional archive events, and assignment serialization/validation. Enterprise mutations and user reassignment use the same transaction advisory lock; allocation triggers also protect new-user inserts. Codes remain reserved. Inactive records stay inactive on restore.

Validation completed:

- Backend/frontend Docker builds and backend module-load check.
- 22 security/evidence unit tests and six frontend component tests.
- Six real PostgreSQL integration groups using an isolated schema: authorization, archive-field bypass rejection, parent suspension, independent restore state, session revocation, audit failure rollback, allocation concurrency, and idempotency.
- Deployed API smoke test: create, archive, restore, list filtering, inherited suspension, and archived-edit rejection. Uniquely named disposable organization/plant records and their test audit entries were removed afterward.
- Browser: tree and heading actions, sibling default organization, archive confirmation/cancel, keyboard-compatible controls, all three tab layouts, mobile width 390px without page overflow, light/dark appearance. Existing organizations/plants were not archived.

Database backup: `backups/before-inline-archive-20261018.dump`. This rollout does not apply the separately prepared inventory balance corrections.

Repeat tests:

```powershell
cd D:\UGAM_MES\backend
node node_modules/typescript/lib/tsc.js --outDir .security-build --incremental false
node --test test/security-access.test.cjs test/evidence-states.test.cjs
node test/enterprise-archive-integration.cjs
cd ..\frontend
node --test test/enterprise-explorer.test.cjs
```

The isolated integration harness mocks only the native bcrypt boundary on Windows; real PostgreSQL transactions and TypeORM repositories are used. The deployed smoke test uses actual authentication.
