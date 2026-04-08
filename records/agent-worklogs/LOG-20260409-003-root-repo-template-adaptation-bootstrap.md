# LOG-20260409-003: Root Repo-Template Adaptation Bootstrap

Opened: 2026-04-09 05-19-05 KST
Recorded by agent: 019d6de0-986d-75e2-8d79-d9ee201759ce

## Metadata

- Run type: orchestrator bootstrap
- Goal: record the bootstrap migration that made Superhuman itself a repo-template-managed repo at the repository root
- Related ids: DEC-20260409-002, DEC-20260409-003

## Task

Bootstrap the root repo-managed operating surfaces and account for the active architecture material in the new root system.

## Scope

- In scope: root canonical operating surfaces, upstream-intake promotion, and initial durable records
- Out of scope: later naming refinements such as the move from `repo-operating-model.md` to `REPO.md`

## Entry 2026-04-09 05-19-05 KST

- Action: completed the initial root repo-template adaptation bootstrap
- Files touched:
  - `REPO.md`
  - `SPEC.md`
  - `STATUS.md`
  - `PLANS.md`
  - `INBOX.md`
  - `research/`
  - `records/decisions/`
  - `records/agent-worklogs/`
  - `upstream-intake/`
- Checks run: migration accounting review across the root and architecture-local operating surfaces
- Output:
  - Established root canonical operating surfaces: `REPO.md`, `SPEC.md`, `STATUS.md`, `PLANS.md`, `INBOX.md`, `research/`, `records/decisions/`, `records/agent-worklogs/`, and root `upstream-intake/`.
  - Promoted `architecture/upstream-intake/` to root `upstream-intake/` and converted architecture-local entry points into pointers rather than mirrors.
  - Seeded initial `DEC-*`, `RSH-*`, `LOG-*`, and `UPS-*` records so active and archived architecture material is accounted for by the new root system.
  - Marked `architecture/` as the evidence, migration, UX, and historical tree instead of a second canonical repo-operating layer.
- Blockers: none
- Next: continue normalizing root conventions and historical references as the repo-template adoption settles
- Source material:
  - `architecture/repo-operating-model.md`
  - `architecture/repo-templates/README.md`
  - `architecture/README.md`
  - `architecture/upstream-intake-policy.md`
  - `architecture/weekly-upstream-intake-template.md`
- Related artifacts:
  - `records/decisions/DEC-20260409-002-repo-template-adoption-for-superhuman.md`
  - `records/decisions/DEC-20260409-003-root-upstream-intake-canonicalization.md`
  - `REPO.md`
  - `STATUS.md`
