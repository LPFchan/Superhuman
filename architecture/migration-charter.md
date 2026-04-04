# Product Migration Charter

## Purpose

This charter turns the product migration plan into an execution contract for the repository.

Phase 1 exists to prevent the repo from doing brand work, runtime migrations, or code-structure churn without first deciding which names are canonical, which OpenClaw-shaped surfaces are compatibility contracts, and which parts of the repo are downstream Superhuman ownership.

This charter does not authorize Phase 2 or later work by itself.
It records the decisions already fixed by policy, the decisions still blocked on operator input, the review roles for each category, and the freeze rules that apply while the rest of Phase 1 is underway.

## Current Status

- Public identity is still predominantly OpenClaw across package metadata, README, docs, UI, app manifests, contributor guidance, issue templates, runtime messaging, and operator scripts.
- The downstream product layer already exists under `src/superhuman/` and is material enough that it must be treated as a first-class migration surface rather than an experiment.
- Plugin compatibility is not incidental. The current system is explicitly built around `openclaw/plugin-sdk/*`, `@openclaw/*`, `openclaw.plugin.json`, and related manifest/runtime contracts.
- The foundational naming table is only partially resolved. Some values are explicit in policy, but public package and domain identifiers are still undecided in-repo.

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

## Phase 1 Freeze Rules

Until the Phase 1 acceptance gate is met:

- Do not add new public `OpenClaw` branding to README, docs homepage, docs nav, UI titles, app display names, package metadata, or contributor guidance unless it is clearly a provenance or compatibility note.
- Do not add new `super-*` or `Super*` filenames outside `src/superhuman/` unless they are explicitly classified as downstream-only work.
- Do not rename plugin-facing contracts casually. Anything under `openclaw/plugin-sdk/*`, `@openclaw/*`, `openclaw.plugin.json`, `openclaw.install.*`, `openclaw.channel.*`, or documented discovery/install flows is compatibility-sensitive by default.
- Do not move public docs into a second published tree. `docs/` remains the only public docs root.
- Do not treat unresolved canonical values as decided in shipped user-facing surfaces.

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

Phase 1 is in progress.

It is not yet complete because the CLI binary, npm package, repository URL, docs domain, and website URL still require operator input.
Phase 1 is complete.
