---
summary: "What changes as Superhuman migrates from an OpenClaw-shaped fork to its own product identity."
read_when:
  - You have an existing OpenClaw-shaped install
  - You want to understand what will change and what will stay compatible
title: "OpenClaw to Superhuman"
---

# OpenClaw to Superhuman

Superhuman is migrating from an OpenClaw-shaped fork into its own public product identity.

This guide explains the migration posture during the current migration wave.

## What is changing

Over the migration wave, Superhuman will move public-facing identity from OpenClaw to Superhuman across:

- repository metadata and README
- docs front door and navigation
- Control UI branding
- app display names
- CLI, package, config, and state defaults

Runtime defaults and compatibility reads have already landed.
What remains is finishing the public-surface cleanup, app-facing display cleanup, and the final verification gate.

## What stays compatible during this wave

Superhuman is keeping OpenClaw plugin ecosystem compatibility as a first-class product feature.

That means selected inherited surfaces remain valid during this migration wave, including:

- selected `openclaw/plugin-sdk/*` SDK imports
- selected `@openclaw/*` package names
- plugin manifest and discovery conventions consumed by existing plugins
- compatibility reads for legacy OpenClaw-shaped runtime locations until the runtime migration is complete
- compatibility reads for legacy OpenClaw-shaped runtime locations while upgrade support remains in place

## What to expect if you already use an OpenClaw-shaped install

The intended migration behavior is:

- old CLI name remains as a compatibility alias before removal is considered
- legacy config and state locations are discovered and migrated rather than silently ignored
- old environment variable names remain readable while new names become canonical
- docs and upgrade flows explain which identifiers are compatibility namespaces versus public product identity

## What is already decided

- Product name: `Superhuman`
- CLI binary: `superhuman`
- npm package: `@lpfchan/superhuman`
- Repository: `https://github.com/LPFchan/Superhuman`
- Website: `https://superhuman.lost.plus`
- Docs: `https://superhuman.lost.plus/docs`
- State root target: `~/.superhuman`
- Config path target: `~/.superhuman/superhuman.json`

## What this page is not

This page is not the full release-readiness checklist.
It is the public statement of migration direction and compatibility posture while the remaining cleanup and verification work lands.

## Related pages

- Provenance: [Provenance](/reference/provenance)
- Compatibility namespaces: [Compatibility Namespaces](/reference/compatibility-namespaces)
- Config and state migration: [Config and State Migration](/install/config-state-migration)
- Release policy: [Releasing](/reference/RELEASING)
