# LOG-20260409-006: Repo Contract Rename To REPO.md

Opened: 2026-04-09 07-44-47 KST
Recorded by agent: 019d6de0-986d-75e2-8d79-d9ee201759ce

## Metadata

- Run type: orchestrator
- Goal: align the root canonical contract naming with current repo-template convention by moving `repo-operating-model.md` to `REPO.md`
- Related ids: DEC-20260409-002, LOG-20260409-003

## Task

Rename the root canonical rules document to `REPO.md` and update repo references so `REPO.md` is the canonical repo contract without rewriting repo truth.

## Scope

- In scope: root contract rename, root entrypoint updates, architecture pointers, and historical references that point at the current canonical path
- Out of scope: changing the underlying repo operating policy or altering historical decisions beyond the filename reference

## Entry 2026-04-09 07-45-00 KST

- Action: renamed the root canonical contract from `repo-operating-model.md` to `REPO.md`
- Files touched: `REPO.md`
- Checks run: repo-wide reference search for `repo-operating-model.md` and `REPO.md`
- Output: the root canonical contract now follows the current repo-template naming
- Blockers: none
- Next: update root and architecture entrypoints to point at `REPO.md`

## Entry 2026-04-09 07-46-00 KST

- Action: updated root agent instructions, architecture compatibility pointers, and durable historical records to reference `REPO.md` as canonical
- Files touched: `AGENTS.md`, `architecture/README.md`, `architecture/repo-operating-model.md`, `architecture/repo-templates/README.md`, `records/agent-worklogs/LOG-20260409-003-root-repo-template-adaptation-bootstrap.md`, `records/decisions/DEC-20260409-002-repo-template-adoption-for-superhuman.md`, `records/decisions/DEC-20260409-003-root-upstream-intake-canonicalization.md`, `records/decisions/DEC-20260409-004-autonomous-maintenance-boundary.md`, `research/RSH-20260409-005-external-audits-and-phase-feedback.md`
- Checks run: repo-wide reference search for stale canonical root-name references
- Output: `REPO.md` is now the only root canonical contract name, while `architecture/repo-operating-model.md` remains as an intentional retired pointer
- Blockers: none
- Next: commit and push the rename as a scoped provenance-bearing change
