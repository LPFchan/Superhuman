---
summary: "Which inherited OpenClaw-shaped identifiers remain canonical compatibility contracts in Superhuman."
read_when:
  - You see OpenClaw-shaped names in a Superhuman install
  - You need to know which identifiers are compatibility surfaces versus public branding
title: "Compatibility Namespaces"
---

# Compatibility Namespaces

Superhuman is the public product name.
Some inherited OpenClaw-shaped identifiers still remain on purpose because they are compatibility contracts, not leftover branding.

## What stays OpenClaw-shaped on purpose

These surfaces remain canonical during the current migration wave:

- `openclaw/plugin-sdk/*`
- selected `@openclaw/*` package names
- `openclaw.plugin.json`
- manifest `id` values already used by installed plugins
- plugin install metadata such as `openclaw.install.npmSpec`
- plugin channel metadata such as `openclaw.channel.id`
- selected legacy runtime env vars and state/config discovery paths used for upgrade compatibility

## What is already Superhuman

These surfaces are Superhuman-first or are actively being finished as part of the current migration wave:

- README and repository presentation
- docs site branding and homepage
- Control UI branding
- canonical app display branding direction
- canonical CLI name: `superhuman`
- canonical package name: `@lpfchan/superhuman`
- canonical state root: `~/.superhuman`
- canonical config path: `~/.superhuman/superhuman.json`

Some platform bundle identifiers and other low-level app/runtime identifiers still remain OpenClaw-shaped until their migration paths are explicit.

## How to reason about mixed naming

Use this rule:

- if it is user-facing product identity, prefer Superhuman
- if it is a plugin, SDK, manifest, install, or upgrade compatibility contract, preserve the inherited OpenClaw-shaped identifier until a versioned migration path exists

## Why Superhuman does this

The migration is product-first, not ecosystem-destructive.
Superhuman can rebrand the public product without stranding plugin authors, bundled plugins, or existing installs that still depend on inherited identifiers.

## Related pages

- [Provenance](/reference/provenance)
- [OpenClaw to Superhuman](/install/superhuman-migration)
- [Config and state migration](/install/config-state-migration)
- [Plugin compatibility contracts](/plugins/compatibility-contracts)
