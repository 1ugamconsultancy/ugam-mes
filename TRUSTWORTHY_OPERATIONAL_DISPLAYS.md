> Superseded UI: on 19 October 2026, at the user's request, Dashboard, Monitoring, Operator, WorkOrders, and Quality were restored from the earlier D:/Lumos_MES source copy. The previous navigation layout was restored too. Backend protections and database indexes remain installed. Five-page read-only browser smoke testing passed. Replaced page sources are saved under backups/before-page-rollback-20261019/. The display-specific browser tests below describe the superseded UI.

# Trustworthy operational displays — 19 October 2026

Monitoring and Operator now share recorded-data rendering, with demonstrations gated by the
authenticated runtime mode endpoint. Unknown mode disables demonstrations and writes. Demonstration
controls have no mutation requests. Production step execution, component scan verification, and
step signatures remain disabled: this change does not introduce a persisted execution system.

Machine status updates wait for the backend response, disable duplicate submissions, check errors,
and refresh recorded state after ambiguous failures. Reads are cancelled on refresh, selection,
and session changes. Empty responses clear previous data; failed refreshes mark retained data stale.
Requests time out after 15 seconds. The existing five-minute live freshness threshold is retained.

Equipment responses now use the machine status record, verified production logs scoped through
both order and equipment plant, and genuine metadata without fabricated defaults. Counts are
recorded lifetime totals, not shift totals. Missing samples and aggregation failures return null;
zero is preserved. Calibration and qualification distinguish missing evidence from recorded failure.
Work-order detail adds `releasedRecipe` (id, code, version, instructions) only from its matching
released snapshot. Existing fields remain compatible. No migration is needed.

Mobile navigation replaces the fixed-width sidebar on small screens. Equipment consumers handle
missing metadata and dates. The old equipment master fallback catalog is no longer loaded.

## Validation

- Frontend and backend Docker production builds passed.
- 20 security tests, four equipment display tests, six explorer tests, and ten PostgreSQL integration groups passed.
- Headless Edge with mocked APIs verifies recorded zero/null, successful confirmation, pending-state
  duplicate protection, 422/403/500/network failures, stale/empty results, recipe snapshots, disabled
  execution controls, demo isolation, unavailable runtime, and desktop/mobile light/dark layouts.
- Live read-only smoke check authenticated as the development operator, read nine machines with
  provenance, and opened Monitoring and Operator without browser errors or production mutations.
- Screenshots: `backups/display-review/`.

Test entrypoints: `backend/test/operational-displays.test.cjs`,
`frontend/test/operational-displays.browser.cjs`, and `frontend/test/operational-displays.live.cjs`.
Browser tests require Playwright and Edge. `DISPLAY_TEST_URL` selects the local test server; API
responses are mocked in the browser suite. The live smoke suite uses this installation's existing
development operator credentials and sends no production mutations.

Both services were deployed together. Existing dependency audit findings and the large frontend
bundle warning remain separate backlog items; they were not addressed in this change.
