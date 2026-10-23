# Super-admin enterprise explorer

Deployed to the Docker installation on port 8085 on 18 October 2026. Verified live super-admin login, operational URL redirect, tree rendering, and operator dashboard loading.

- Super admins remain on `/super-admin`; other authenticated application paths redirect there before operational pages render.
- The operational sidebar and assistant are hidden for super admins. The large governance banner is removed.
- Organizations and plants share a searchable, keyboard-accessible tree with selection details. Themes and User Allocations retain separate tabs and existing APIs.
- Add Plant uses the selected organization. Save responses select the saved entity; refresh retains selection and expanded state. Unmatched plants remain visible in an unassigned group.
- Mobile shows tree or details with a back button. Existing organization/plant forms and backend validation remain in use.

Validation: frontend build; `node --test test/enterprise-explorer.test.cjs` from frontend (three passing tests); browser checks for super-admin login and operational URL redirect, hierarchy search, no matches, keyboard selection, refresh persistence, theme shortcut, allocation table, Add Plant organization default, mobile back navigation, and light/dark presentation. Mobile page width was 390px at a 390px viewport. Ordinary administrator navigation was checked on `/admin/users`.

No live create/edit/allocation saves were performed. Those end-to-end save checks and API-failure interaction checks remain for a disposable test installation. The existing administrator dashboard in the pending source expects provenance metadata absent from the currently running backend and failed during mixed-version preview; this is outside the explorer change. Deploy the prior backend/frontend changes together as already documented, not this entire frontend build alone.

The temporary preview used an IPv4 backend workaround because localhost's IPv6 connection resets in this environment. The workaround is not part of the product configuration.

Deployment notes: workflow and warehouse assignment migrations applied. Prepared balance corrections remain unapplied. Database and old container filesystem backups are in backups/. Docker image snapshot/tag operations failed due to unavailable old image layers; filesystem exports succeeded instead. Fixed WorkOrdersModule import order discovered by live startup and verified application module loading before restart. Superadmin and operator1 accepted the development credential during smoke checks; admin did not, and its credentials were not changed.
