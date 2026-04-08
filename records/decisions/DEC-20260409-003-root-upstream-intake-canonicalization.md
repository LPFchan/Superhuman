# Root Upstream Intake Canonicalization

- Decision id: `DEC-20260409-003`
- Opened: `2026-04-09 05-19-05 KST`
- Recorded by agent: `019d6de0-986d-75e2-8d79-d9ee201759ce`
- Status: `accepted`

## Decision

The canonical upstream intake package for Superhuman lives at root `upstream-intake/`, not under `architecture/`.

## Why

- Upstream intake is an active operating subsystem, not just an architecture note.
- Superhuman is still downstream of OpenClaw, so recurring upstream review needs a durable, first-class home next to the rest of the root operating surfaces.
- Keeping the package inside `architecture/` would create a second canonical layer for an operational system the repo actively uses.

## Consequences

- Root `upstream-intake/` is canonical immediately.
- `architecture/weekly-upstream-intake-template.md` remains only as a compatibility entry point.
- `architecture/upstream-intake/README.md` becomes a pointer, not a mirrored package.
- Weekly artifacts use paired `UPS-*` identifiers across internal record and operator brief files.

## Source Material

- `architecture/upstream-intake-policy.md`
- `architecture/weekly-upstream-intake-template.md`
- `upstream-intake/README.md`
- `upstream-intake/intake-method.md`
- `upstream-intake/reports/README.md`
- `architecture/product-migration-plan.md`

## Related Artifacts

- `repo-operating-model.md`
- `upstream-intake/reports/internal-records/UPS-20260407-001-v2026.4.5.md`
- `upstream-intake/reports/operator-briefs/UPS-20260407-001-v2026.4.5-operator-brief.md`
- `records/agent-worklogs/LOG-20260409-003-root-repo-template-adaptation-bootstrap.md`
