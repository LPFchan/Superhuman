# DEC-20260409-005: Shared-Core Boundary And Plugin Contract Posture

Opened: 2026-04-09 05-19-05 KST
Recorded by agent: 019d6de0-986d-75e2-8d79-d9ee201759ce

## Metadata

- Status: accepted
- Related ids: LOG-20260409-002, RSH-20260409-004

## Decision

Shared core remains upstream-shaped where practical, the downstream Superhuman product layer stays concentrated under `src/superhuman/`, and plugin-facing OpenClaw contracts remain stable by default.

## Context

- The migration plan and Phase 5 reports already converged on explicit boundary discipline rather than whole-system churn.
- Plugin compatibility is a product commitment, not a temporary migration courtesy.
- The repo needs a stable rule for resolving collisions: generic shared-core fixes should generally follow upstream shape, while Superhuman-owned product behavior belongs in the downstream subtree.

## Options Considered

### Push Superhuman-Specific Behavior Throughout Shared Core

- Upside: fewer explicit bridge seams in the short term
- Downside: blurs ownership and makes upstream sync harder

### Break Plugin-Facing OpenClaw Contracts Aggressively

- Upside: cleaner local branding
- Downside: violates an explicit compatibility promise and creates avoidable ecosystem churn

### Keep Shared Core Upstream-Shaped And Concentrate Product-Specific Behavior Downstream

- Upside: preserves a stable boundary for both upstream sync and local product work
- Upside: protects plugin-sensitive contracts while still allowing Superhuman-specific evolution
- Downside: requires more discipline around bridges and namespace ownership

## Rationale

Explicit boundary discipline scales better than repo-wide churn. Keeping shared core upstream-shaped where practical, while placing Superhuman-specific behavior in a downstream boundary, gives the fork a cleaner long-term structure and keeps compatibility-sensitive surfaces legible.

## Consequences

- New shared-core imports of `src/superhuman/**` require explicit bridge justification.
- Domain-oriented `src/superhuman/` ownership remains the default downstream organization.
- `openclaw/plugin-sdk/*`, `@openclaw/*`, `openclaw.plugin.json`, install metadata, channel ids, and loader semantics stay compatibility-sensitive surfaces.
- Future contract changes require versioned replacements, aliases, or migration paths rather than drive-by renames.
- Source material:
  - `architecture/plugin-contract-map.md`
  - `architecture/plugin-compatibility-matrix.md`
  - `architecture/product-migration-plan.md`
  - `architecture/archive/phase-5-boundary-documentation.md`
  - `architecture/archive/phase-5-plugin-contract-diff-report.md`
  - `architecture/archive/plugin-compatibility-report.md`
- Related artifacts:
  - `SPEC.md`
  - `STATUS.md`
  - `research/RSH-20260409-004-plugin-compatibility-and-contract-analysis.md`
  - `records/agent-worklogs/LOG-20260409-002-phase-5-boundary-and-plugin-validation.md`
