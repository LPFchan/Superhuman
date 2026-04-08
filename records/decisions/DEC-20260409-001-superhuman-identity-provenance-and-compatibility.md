# Superhuman Identity, Provenance, and Compatibility Posture

- Decision id: `DEC-20260409-001`
- Opened: `2026-04-09 05-19-05 KST`
- Recorded by agent: `019d6de0-986d-75e2-8d79-d9ee201759ce`
- Status: `accepted`

## Decision

Superhuman is the canonical product identity, while OpenClaw remains explicit legal and historical provenance plus an active compatibility namespace where ecosystem contracts still depend on it.

## Why

- The migration charter already ratified `Superhuman`, `superhuman`, `@lpfchan/superhuman`, and the downstream `src/superhuman/` boundary as the canonical public identity set.
- `PROVENANCE.md` makes clear that OpenClaw lineage should stay visible rather than being rewritten away.
- Plugin compatibility is not accidental baggage. It is an explicit product promise built on `openclaw/plugin-sdk/*`, `@openclaw/*`, `openclaw.plugin.json`, and related metadata/runtime contracts.

## Consequences

- `README.md` stays public-product-facing.
- `PROVENANCE.md` stays separate and permanent.
- Public product truth can move Superhuman-first without pretending the codebase has no OpenClaw lineage.
- Plugin-facing OpenClaw contracts stay stable by default unless a versioned replacement and migration path ship together.

## Source Material

- `README.md`
- `PROVENANCE.md`
- `architecture/migration-charter.md`
- `architecture/product-migration-plan.md`
- `architecture/naming-glossary.md`
- `architecture/current-surface-inventory.md`

## Related Artifacts

- `SPEC.md`
- `STATUS.md`
- `records/decisions/DEC-20260409-005-shared-core-boundary-and-plugin-contract-posture.md`
