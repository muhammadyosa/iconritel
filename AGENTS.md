
- User role & menu access are fetched via shared React Query caches (keys user-role, menu-access) with one ref-counted realtime channel — avoids duplicate requests/channels across many components.
