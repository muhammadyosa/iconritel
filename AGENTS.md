
- User role & menu access are fetched via shared React Query caches (keys user-role, menu-access) with one ref-counted realtime channel — avoids duplicate requests/channels across many components.
- Feature announcements are a curated client-side list with a per-user latest-seen marker in localStorage — shows shipped changes without altering database schema or permissions.
- Mobile navigation uses fixed slots with Menu in the center and the shared UserMenu at the right; drawer links close after selection so the destination remains visible.
- GitHub Pages CI uses Node 22 and npm ci with a synchronized public-registry package-lock.json; the workflow first checks that Pages is enabled and skips build/deploy with a notice otherwise, so a missing Pages setup never produces failed runs.

- Traffic-specific incident inputs share TrafficConstraintFields and serialize through the canonical ticket formatter; restore them from ticketResult when editing to preserve existing storage schema.
