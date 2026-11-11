
- User role & menu access are fetched via shared React Query caches (keys user-role, menu-access) with one ref-counted realtime channel — avoids duplicate requests/channels across many components.
- Feature announcements are a curated client-side list with a per-user latest-seen marker in localStorage — shows shipped changes without altering database schema or permissions.
- Mobile navigation uses fixed slots with Menu in the center and the shared UserMenu at the right; drawer links close after selection so the destination remains visible.
- GitHub Pages CI uses Node 22 and npm ci with a synchronized public-registry package-lock.json; the workflow first checks that Pages is enabled and skips build/deploy with a notice otherwise, so a missing Pages setup never produces failed runs.

- Traffic-specific incident inputs share TrafficConstraintFields and serialize through the canonical ticket formatter; restore them from ticketResult when editing to preserve existing storage schema.

- Dashboard Status Distribution derives chart, total, percentages, summary, and drill-down from the filtered shared live incident list; reconcile realtime deletes by refetch when the payload omits the app incident ID, because the database may expose only its UUID.

- Surveillance is a client-side Report tool with a pure queue parser/formatter and editable text output; it reuses existing Report tab gating and never writes incident data.
- Page tab bars wrap to a new row at every width (no `sm:flex-nowrap` on TabsList) — the horizontal scroll wrapper hides its scrollbar, so a non-wrapping bar pushes the last tab out of view with no way to reach it.

- Incident analytics read the permanent `incident_archive` table (filled by a trigger on tickets) through pure rules in `src/lib/nocAnalytics.ts` — live tickets are auto-deleted after resolution, so analytics must never depend on the live list.
