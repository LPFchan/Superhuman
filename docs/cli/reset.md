---
summary: "CLI reference for `superhuman reset` (reset local state/config)"
read_when:
  - You want to wipe local state while keeping the CLI installed
  - You want a dry-run of what would be removed
title: "reset"
---

# `superhuman reset`

Reset local config/state (keeps the CLI installed).

```bash
superhuman backup create
superhuman reset
superhuman reset --dry-run
superhuman reset --scope config+creds+sessions --yes --non-interactive
```

Run `superhuman backup create` first if you want a restorable snapshot before removing local state.
