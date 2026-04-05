---
summary: "CLI reference for `superhuman voicecall` (voice-call plugin command surface)"
read_when:
  - You use the voice-call plugin and want the CLI entry points
  - You want quick examples for `voicecall call|continue|status|tail|expose`
title: "voicecall"
---

# `superhuman voicecall`

`voicecall` is a plugin-provided command. It only appears if the voice-call plugin is installed and enabled.

Primary doc:

- Voice-call plugin: [Voice Call](/plugins/voice-call)

## Common commands

```bash
superhuman voicecall status --call-id <id>
superhuman voicecall call --to "+15555550123" --message "Hello" --mode notify
superhuman voicecall continue --call-id <id> --message "Any questions?"
superhuman voicecall end --call-id <id>
```

## Exposing webhooks (Tailscale)

```bash
superhuman voicecall expose --mode serve
superhuman voicecall expose --mode funnel
superhuman voicecall expose --mode off
```

Security note: only expose the webhook endpoint to networks you trust. Prefer Tailscale Serve over Funnel when possible.
