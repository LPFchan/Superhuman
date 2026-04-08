# LOG-20260409-008: Append-First Worklog Policy

Opened: 2026-04-09 08-05-09 KST
Recorded by agent: 019d6de0-986d-75e2-8d79-d9ee201759ce

## Metadata

- Run type: orchestrator
- Goal: update the repo contract and agent guidance so worklog provenance stays useful without creating a new `LOG-*` by default for every meaningful commit
- Related ids: LOG-20260409-007

## Task

Migrate the repo from an older “new log by habit” posture to an explicit append-first worklog policy while keeping commit artifact linkage strict.

## Scope

- In scope: `REPO.md`, `AGENTS.md`, and `records/agent-worklogs/README.md`
- In scope: preserving strict commit provenance while allowing commits to reference existing updated artifacts
- Out of scope: rewriting existing logs or weakening commit-trailer enforcement

## Entry 2026-04-09 08-06-00 KST

- Action: updated the canonical repo contract to prefer appending to the current relevant `LOG-*`
- Files touched: `REPO.md`
- Checks run: policy comparison against the current repo-template scaffold
- Output:
  - `records/agent-worklogs/` now explicitly prefers appended entries on the current relevant `LOG-*`
  - the repo contract now says not to create a new `LOG-*` just to satisfy provenance
  - normal commits may reference a relevant artifact whether newly created or updated
- Blockers: none
- Next: align the root agent instructions and the local worklog guide with the same append-first policy

## Entry 2026-04-09 08-07-00 KST

- Action: aligned the root agent instructions and local worklog README with the append-first policy
- Files touched: `AGENTS.md`, `records/agent-worklogs/README.md`
- Checks run: direct wording audit across the touched policy surfaces
- Output:
  - agents are now told to reuse the current relevant `LOG-*` unless a separate record improves clarity
  - the local worklog guide now defines when to reuse versus create
  - commit provenance guidance now points at existing updated artifacts as normal, not newly created logs by default
- Blockers: none
- Next: commit and push the policy change as a scoped documentation update
