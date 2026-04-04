---
summary: "Superhuman's fork lineage, legal provenance, and compatibility posture."
read_when:
  - You want the product's legal and historical origin
  - You need to understand why some OpenClaw-shaped identifiers still exist
title: "Provenance"
---

# Provenance

Superhuman began as a fork of OpenClaw and has since diverged into its own product direction.

That history is part of the repository, the license posture, and the compatibility story. It is not something this project is trying to hide.

## Why this page exists

This repository is migrating away from OpenClaw as the public product identity while still preserving:

- legal provenance
- historical origin
- upstream intake capability where it remains useful
- compatibility with the OpenClaw plugin ecosystem where Superhuman still intends to support it

## What stays OpenClaw-shaped on purpose

Some inherited names remain because they are compatibility contracts, not branding leftovers.

Examples include:

- selected `openclaw/plugin-sdk/*` imports
- selected `@openclaw/*` package names
- plugin manifest conventions such as `openclaw.plugin.json`
- selected install, discovery, and runtime compatibility seams needed by existing plugins

These surfaces are retained deliberately during the migration wave so installed and third-party plugins are not stranded by a branding pass.

## What is moving to Superhuman

Public-facing product identity is moving to Superhuman across:

- repository presentation
- docs front door
- UI shell identity
- app display names
- runtime defaults such as config and state naming

The migration is phased so compatibility and provenance are preserved while public identity becomes unambiguous.

## License and historical posture

Superhuman keeps the repository's MIT license and does not remove the project's OpenClaw origin from the record.

Branding changes are product changes, not provenance erasure.

## Related pages

- Migration guide: [OpenClaw to Superhuman](/install/superhuman-migration)
- Compatibility namespaces: [Compatibility Namespaces](/reference/compatibility-namespaces)
- Credits: [Credits](/reference/credits)
