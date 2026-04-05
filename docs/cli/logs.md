---
summary: "CLI reference for `superhuman logs` (tail gateway logs via RPC)"
read_when:
  - You need to tail Gateway logs remotely (without SSH)
  - You want JSON log lines for tooling
title: "logs"
---

# `superhuman logs`

Tail Gateway file logs over RPC (works in remote mode).

Related:

- Logging overview: [Logging](/logging)

## Examples

```bash
superhuman logs
superhuman logs --follow
superhuman logs --json
superhuman logs --limit 500
superhuman logs --local-time
superhuman logs --follow --local-time
```

Use `--local-time` to render timestamps in your local timezone.
