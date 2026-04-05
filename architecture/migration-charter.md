# Product Migration Charter

## Purpose

This charter turns the product migration plan into an execution contract for the repository.

Phase 1 exists to prevent the repo from doing brand work, runtime migrations, or code-structure churn without first deciding which names are canonical, which OpenClaw-shaped surfaces are compatibility contracts, and which parts of the repo are downstream Superhuman ownership.

This charter does not authorize Phase 2 or later work by itself.
It records the ratified decisions, the review roles for each category, and the standing guardrails that remain in effect after Phase 1.

## Current Status

- Public identity is now predominantly Superhuman across package metadata, the README front door, docs shell, and canonical runtime defaults, though deeper docs, UI copy, and app-facing surfaces still need cleanup.
- The downstream product layer under `src/superhuman/` is established and must continue to be treated as a first-class migration surface rather than an experiment.
- Plugin compatibility is not incidental. The current system is explicitly built around `openclaw/plugin-sdk/*`, `@openclaw/*`, `openclaw.plugin.json`, and related manifest/runtime contracts.
- The foundational naming table is fully resolved in-repo for this migration wave.

## Canonical Decisions

These values are already fixed for Phase 1 and can be used without additional approval.

| Decision                          | Canonical value                         | Status                |
| --------------------------------- | --------------------------------------- | --------------------- |
| Product name                      | `Superhuman`                            | ratified              |
| CLI binary                        | `superhuman`                            | ratified              |
| npm package                       | `@lpfchan/superhuman`                   | ratified              |
| Repository URL                    | `https://github.com/LPFchan/Superhuman` | ratified              |
| Docs URL                          | `https://superhuman.lost.plus/docs`     | ratified              |
| Website URL                       | `https://superhuman.lost.plus`          | ratified              |
| Public docs root                  | `docs/`                                 | ratified              |
| Internal planning root            | `architecture/`                         | active canonical root |
| Future internal architecture root | `architecture/`                         | ratified target       |
| State directory                   | `~/.superhuman`                         | ratified target       |
| Config path                       | `~/.superhuman/superhuman.json`         | ratified target       |
| Local storage prefix              | `superhuman.control.*`                  | ratified target       |
| Web component tag                 | `superhuman-app`                        | ratified target       |
| Plugin posture                    | `OpenClaw-compatible by default`        | ratified              |
| Downstream namespace              | `src/superhuman/`                       | ratified              |

## Operator Decisions Required

There are no remaining foundational naming decisions blocked in Phase 1.

## Phase 1 Approval Roles

Until named individuals are assigned, Phase 1 uses role-based approval.

| Decision area                         | Required approver role                 |
| ------------------------------------- | -------------------------------------- |
| Canonical naming and product identity | operator                               |
| Provenance and legal posture          | operator with legal review when needed |
| Public docs taxonomy                  | docs owner or operator                 |
| Plugin compatibility contracts        | plugin platform owner or operator      |
| Runtime migration behavior            | operator                               |
| Downstream/shared-core boundary       | operator                               |

## Surface Buckets

Every reviewed surface in this wave must be placed into one of these buckets.

1. `public identity`
2. `compatibility namespace`
3. `shared core`
4. `downstream product layer`

The working inventory for those classifications lives in `architecture/current-surface-inventory.md`.

## Standing Naming and Compatibility Guardrails

These rules remain in effect after the Phase 1 gate and should be treated as default policy unless the operator explicitly changes the migration contract:

- Do not add new public `OpenClaw` branding to README, docs homepage, docs nav, UI titles, app display names, package metadata, or contributor guidance unless it is clearly a provenance or compatibility note.
- Do not add new `super-*` or `Super*` filenames outside `src/superhuman/` unless they are explicitly classified as downstream-only work.
- Do not rename plugin-facing contracts casually. Anything under `openclaw/plugin-sdk/*`, `@openclaw/*`, `openclaw.plugin.json`, `openclaw.install.*`, `openclaw.channel.*`, or documented discovery/install flows is compatibility-sensitive by default.
- Do not move public docs into a second published tree. `docs/` remains the only public docs root.
- Do not casually override the ratified canonical values in shipped user-facing surfaces.

## Phase 1 Deliverables

- `architecture/migration-charter.md`
- `architecture/current-surface-inventory.md`
- `architecture/plugin-contract-map.md`
- `architecture/plugin-compatibility-matrix.md`
- `architecture/naming-glossary.md`

## Acceptance Gate

Phase 1 is complete only when all of the following are true:

- Public-facing surfaces are classified at subsystem level.
- Downstream Superhuman-owned surfaces are explicitly inventoried.
- Plugin-facing contracts are mapped with a keep, alias, or migrate decision and an owner role.
- Foundational decisions are either ratified or explicitly marked blocked on operator input.
- New naming drift is frozen by policy.

## Current Gate Result

Phase 1 is complete.

Its deliverables are present in this directory and the foundational naming set is ratified for this migration wave.
The freeze rules above remain active as standing guardrails for later phases; they are no longer blockers waiting on unresolved names.
