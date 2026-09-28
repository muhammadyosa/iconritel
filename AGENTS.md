
- User role & menu access are fetched via shared React Query caches (keys user-role, menu-access) with one ref-counted realtime channel — avoids duplicate requests/channels across many components.
- Feature announcements are a curated client-side list with a per-user latest-seen marker in localStorage — shows shipped changes without altering database schema or permissions.
