---
summary: "How Superhuman migrates legacy OpenClaw-shaped config, state, env vars, and browser storage."
read_when:
  - You are upgrading from an OpenClaw-shaped install
  - You need to know which runtime paths and env vars are canonical now
title: "Config and State Migration"
---

# Config and State Migration

Superhuman now treats its own runtime identity as canonical while still reading legacy OpenClaw-shaped locations during the migration wave.

## Canonical paths now

- State root: `~/.superhuman`
- Config path: `~/.superhuman/superhuman.json`
- Primary CLI: `superhuman`
- Primary browser storage prefix: `superhuman.control.*`

## Legacy paths and names still read

For upgrade compatibility, Superhuman still reads inherited OpenClaw-shaped surfaces such as:

- `~/.openclaw`
- `~/.openclaw/openclaw.json`
- `OPENCLAW_*` env vars
- legacy browser storage keys used by earlier Control UI builds

New Superhuman names win when both old and new values are present.

## Migration behavior

During this wave, the intended behavior is:

1. Prefer Superhuman paths and env vars when they are present.
2. Read legacy OpenClaw-shaped values when Superhuman values are absent.
3. Migrate browser storage keys forward on first run.
4. Keep the old CLI name only as a compatibility alias while deprecation messaging remains in place.

## What this means for operators

- New installs should use `superhuman`, `~/.superhuman`, and `SUPERHUMAN_*` where available.
- Existing installs do not need a manual rename-first migration before upgrading.
- If you maintain scripts or service units, move them to the Superhuman names when convenient rather than waiting for the old names to disappear.

## Related pages

- [OpenClaw to Superhuman](/install/superhuman-migration)
- [Compatibility Namespaces](/reference/compatibility-namespaces)
- [Provenance](/reference/provenance)
