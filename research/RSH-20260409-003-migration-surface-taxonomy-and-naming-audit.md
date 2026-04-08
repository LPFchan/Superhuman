# Migration Surface Taxonomy And Naming Audit

- Research id: `RSH-20260409-003`
- Opened: `2026-04-09 05-19-05 KST`
- Recorded by agent: `019d6de0-986d-75e2-8d79-d9ee201759ce`

## Question

How should Superhuman classify public identity, compatibility, internal planning, and obsolete draft surfaces so migration cleanup does not keep re-litigating where each document belongs?

## Key Findings

- `docs/` remains the only public docs root; `architecture/` is internal evidence, migration, research, and audit material.
- Public identity, compatibility namespace, shared core, and downstream product layer are distinct buckets with different naming and migration rules.
- `README.md` can stay product-facing while root canonical internal truth moves into `SPEC.md`, `STATUS.md`, `PLANS.md`, and the records trees.
- Obsolete front-door drafts should be preserved only as archive evidence, not as active positioning.

## Routing Outcome

- Root canonical surfaces were established outside `architecture/`.
- `architecture/` is now being treated as the internal evidence tree rather than a second repo-operating layer.
- Remaining public cleanup items continue to live in `STATUS.md` and `PLANS.md`.

## Source Material

- `architecture/current-surface-inventory.md`
- `architecture/docs-taxonomy-audit.md`
- `architecture/naming-glossary.md`
- `architecture/product-migration-plan.md`
- `architecture/archive/README.md`
- `architecture/archive/README.superhuman-draft.md`

## Historical Accounting

This memo accounts for the migration taxonomy, naming, and obsolete-front-door draft family. It is the root-side synthesis of why the repo now separates public product docs, root managed memory, and internal architecture evidence.
