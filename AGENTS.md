
- User role & menu access are fetched via shared React Query caches (keys user-role, menu-access) with one ref-counted realtime channel — avoids duplicate requests/channels across many components.
- Feature announcements are a curated client-side list with a per-user latest-seen marker in localStorage — shows shipped changes without altering database schema or permissions.
- Mobile navigation uses fixed slots with Menu in the center and the shared UserMenu at the right; drawer links close after selection so the destination remains visible.
- GitHub Pages CI uses Node 22 and npm ci with a synchronized public-registry package-lock.json; configure Pages before deployment so dependency installs are reproducible and hosting prerequisites fail clearly.
