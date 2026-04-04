# Naming Glossary

## Purpose

This glossary defines which names belong to public identity, provenance, compatibility, shared core, and downstream product work during the migration.

## Canonical Terms

| Term              | Meaning                                    | Use now                                                                                                  |
| ----------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `Superhuman`      | public product name                        | use for migration planning and all future public identity surfaces                                       |
| `OpenClaw`        | upstream product and legal provenance name | use only for provenance, compatibility, inherited namespaces, upstream references, or historical context |
| `openclaw`        | inherited lowercase namespace family       | keep where compatibility or current runtime contracts require it                                         |
| `src/superhuman/` | downstream product namespace               | keep as the dedicated downstream code boundary                                                           |
| `docs/`           | public docs root                           | keep as the only published docs tree                                                                     |
| `port/`           | former internal planning root              | retired in Phase 6; keep only in historical references                                                   |
| `architecture/`   | canonical internal docs root               | use for architecture, migration, UX, and audit material                                                  |

## Bucket Rules

### Public identity

- Use `Superhuman` for user-facing product naming once foundational values are fully ratified.
- Do not ship placeholders for package, repo, docs, or website identifiers.

### Provenance

- Use `OpenClaw` when explaining lineage, legal history, fork origin, or upstream references.
- Do not erase OpenClaw from license or provenance material.

### Compatibility namespace

- Use `openclaw/plugin-sdk/*`, `@openclaw/*`, `openclaw.plugin.json`, and related `openclaw.*` manifest metadata where ecosystem compatibility requires it.
- Treat inherited OpenClaw naming here as an intentional contract, not leftover branding.

### Shared core

- Prefer generic names in shared host/core code.
- Do not inject `Superhuman` into generic shared-core types or folders unless the code is intentionally downstream-owned.

### Downstream product layer

- Keep the dedicated `src/superhuman/` namespace.
- Inside that subtree, prefer domain names over redundant `super-*` filenames in the eventual normalized structure.
- During current implementation phases, existing `super-*` names are recognized as downstream-owned but slated for later cleanup under the migration plan.

## Frozen Naming Rules During Phase 1

1. No new public `OpenClaw` branding in product-facing surfaces unless it is a provenance or compatibility reference.
2. No new `super-*` files outside `src/superhuman/`.
3. No casual renames of plugin-facing OpenClaw-shaped contracts.
4. No second public docs tree.

## Canonical Package Identity

- canonical npm package: `@lpfchan/superhuman`

## Phase 1 Conclusion

The naming policy is now explicit enough to block further drift.
What remains unresolved is not the rule set; it is the final operator choice for the remaining public identifiers.
