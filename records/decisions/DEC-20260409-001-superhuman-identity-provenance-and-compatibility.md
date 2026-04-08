# DEC-20260409-001: Superhuman Identity, Provenance, And Compatibility Posture

Opened: 2026-04-09 05-19-05 KST
Recorded by agent: 019d6de0-986d-75e2-8d79-d9ee201759ce

## Metadata

- Status: accepted
- Related ids: DEC-20260409-005

## Decision

Superhuman is the canonical product identity, while OpenClaw remains explicit legal and historical provenance plus an active compatibility namespace where ecosystem contracts still depend on it.

## Context

- The migration charter already ratified `Superhuman`, `superhuman`, `@lpfchan/superhuman`, and the downstream `src/superhuman/` boundary as the canonical public identity set.
- `PROVENANCE.md` makes clear that OpenClaw lineage should stay visible rather than being rewritten away.
- Plugin compatibility is not accidental baggage. It is an explicit product promise built on `openclaw/plugin-sdk/*`, `@openclaw/*`, `openclaw.plugin.json`, and related metadata/runtime contracts.

## Options Considered

### Make Superhuman The Only Visible Identity

- Upside: simpler public-facing naming
- Downside: erases real lineage and pressures compatibility-sensitive surfaces into unnecessary churn

### Keep A Mixed Or Ambiguous Product Identity

- Upside: less short-term migration effort
- Downside: leaves the repo and product posture unclear about what is canonical

### Make Superhuman Canonical While Preserving OpenClaw Provenance And Compatibility

- Upside: keeps public identity clear without pretending the codebase has no history
- Upside: preserves compatibility-sensitive contracts intentionally
- Downside: requires more explicit documentation about lineage and namespace boundaries

## Rationale

Superhuman needs one canonical product identity, but the repo should not falsify its origins or quietly drop compatibility promises. Preserving provenance and compatibility explicitly produces a cleaner long-term posture than either erasure or ambiguity.

## Consequences

- `README.md` stays public-product-facing.
- `PROVENANCE.md` stays separate and permanent.
- Public product truth can move Superhuman-first without pretending the codebase has no OpenClaw lineage.
- Plugin-facing OpenClaw contracts stay stable by default unless a versioned replacement and migration path ship together.
- Source material:
  - `README.md`
  - `PROVENANCE.md`
  - `architecture/migration-charter.md`
  - `architecture/product-migration-plan.md`
  - `architecture/naming-glossary.md`
  - `architecture/current-surface-inventory.md`
- Related artifacts:
  - `SPEC.md`
  - `STATUS.md`
  - `records/decisions/DEC-20260409-005-shared-core-boundary-and-plugin-contract-posture.md`
