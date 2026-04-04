---
summary: "Plugin-author guide to the inherited OpenClaw compatibility contracts that remain canonical in Superhuman."
read_when:
  - You build or maintain plugins for Superhuman
  - You need to know which OpenClaw-shaped plugin contracts are still canonical
title: "Plugin Compatibility Contracts"
---

# Plugin Compatibility Contracts

Superhuman keeps OpenClaw plugin ecosystem compatibility as an intentional product feature.

If you are building a plugin during this migration wave, assume the inherited plugin-facing contracts below are still the canonical external surface unless the docs for that contract say otherwise.

## Contracts that remain canonical

- `openclaw/plugin-sdk/*`
- `openclaw.plugin.json`
- existing manifest `id` values
- `@openclaw/<id>` package naming where the ecosystem already depends on it
- `openclaw.install.npmSpec`
- `openclaw.channel.id`

## Contracts that are public product identity instead

These are not plugin-facing compatibility contracts:

- the product name `Superhuman`
- the CLI name `superhuman`
- the root package `@lpfchan/superhuman`
- public docs and UI branding
- canonical runtime defaults such as `~/.superhuman`

## Guidance for plugin authors

1. Keep importing documented SDK surfaces from `openclaw/plugin-sdk/*`.
2. Keep shipping `openclaw.plugin.json` as the plugin manifest artifact.
3. Do not rename manifest ids or package names just because the host product rebranded.
4. Treat any future Superhuman-named plugin contract as additive until the docs explicitly announce a versioned migration path.

## What Superhuman guarantees in this wave

- bundled and third-party-style plugins using the inherited SDK namespace keep working without source edits
- manifest discovery continues to honor `openclaw.plugin.json`
- install and catalog flows continue to recognize `@openclaw/*` identifiers where they already matter

## Related pages

- [Plugin architecture](/plugins/architecture)
- [SDK overview](/plugins/sdk-overview)
- [Compatibility Namespaces](/reference/compatibility-namespaces)
- [OpenClaw to Superhuman](/install/superhuman-migration)
