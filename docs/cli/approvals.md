---
summary: "CLI reference for `superhuman approvals` (exec approvals for gateway or node hosts)"
read_when:
  - You want to edit exec approvals from the CLI
  - You need to manage allowlists on gateway or node hosts
title: "approvals"
---

# `superhuman approvals`

Manage exec approvals for the **local host**, **gateway host**, or a **node host**.
By default, commands target the local approvals file on disk. Use `--gateway` to target the gateway, or `--node` to target a specific node.

Related:

- Exec approvals: [Exec approvals](/tools/exec-approvals)
- Nodes: [Nodes](/nodes)

## Common commands

```bash
superhuman approvals get
superhuman approvals get --node <id|name|ip>
superhuman approvals get --gateway
```

## Replace approvals from a file

```bash
superhuman approvals set --file ./exec-approvals.json
superhuman approvals set --node <id|name|ip> --file ./exec-approvals.json
superhuman approvals set --gateway --file ./exec-approvals.json
```

## Allowlist helpers

```bash
superhuman approvals allowlist add "~/Projects/**/bin/rg"
superhuman approvals allowlist add --agent main --node <id|name|ip> "/usr/bin/uptime"
superhuman approvals allowlist add --agent "*" "/usr/bin/uname"

superhuman approvals allowlist remove "~/Projects/**/bin/rg"
```

## Notes

- `--node` uses the same resolver as `superhuman nodes` (id, name, ip, or id prefix).
- `--agent` defaults to `"*"`, which applies to all agents.
- The node host must advertise `system.execApprovals.get/set` (macOS app or headless node host).
- Approvals files are stored per host at `~/.superhuman/exec-approvals.json`.
