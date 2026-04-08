# Shared-Core Boundary And Plugin Contract Posture

- Decision id: `DEC-20260409-005`
- Opened: `2026-04-09 05-19-05 KST`
- Recorded by agent: `019d6de0-986d-75e2-8d79-d9ee201759ce`
- Status: `accepted`

## Decision

Shared core remains upstream-shaped where practical, the downstream Superhuman product layer stays concentrated under `src/superhuman/`, and plugin-facing OpenClaw contracts remain stable by default.

## Why

- The migration plan and Phase 5 reports already converged on explicit boundary discipline rather than whole-system churn.
- Plugin compatibility is a product commitment, not a temporary migration courtesy.
- The repo needs a stable rule for resolving collisions: generic shared-core fixes should generally follow upstream shape, while Superhuman-owned product behavior belongs in the downstream subtree.

## Consequences

- New shared-core imports of `src/superhuman/**` require explicit bridge justification.
- Domain-oriented `src/superhuman/` ownership remains the default downstream organization.
- `openclaw/plugin-sdk/*`, `@openclaw/*`, `openclaw.plugin.json`, install metadata, channel ids, and loader semantics stay compatibility-sensitive surfaces.
- Future contract changes require versioned replacements, aliases, or migration paths rather than drive-by renames.

## Source Material

- `architecture/plugin-contract-map.md`
- `architecture/plugin-compatibility-matrix.md`
- `architecture/product-migration-plan.md`
- `architecture/archive/phase-5-boundary-documentation.md`
- `architecture/archive/phase-5-plugin-contract-diff-report.md`
- `architecture/archive/plugin-compatibility-report.md`

## Related Artifacts

- `SPEC.md`
- `STATUS.md`
- `research/RSH-20260409-004-plugin-compatibility-and-contract-analysis.md`
- `records/agent-worklogs/LOG-20260409-002-phase-5-boundary-and-plugin-validation.md`
