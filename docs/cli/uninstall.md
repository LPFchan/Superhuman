---
summary: "CLI reference for `superhuman uninstall` (remove gateway service + local data)"
read_when:
  - You want to remove the gateway service and/or local state
  - You want a dry-run first
title: "uninstall"
---

# `superhuman uninstall`

Uninstall the gateway service + local data (CLI remains).

```bash
superhuman backup create
superhuman uninstall
superhuman uninstall --all --yes
superhuman uninstall --dry-run
```

Run `superhuman backup create` first if you want a restorable snapshot before removing state or workspaces.
