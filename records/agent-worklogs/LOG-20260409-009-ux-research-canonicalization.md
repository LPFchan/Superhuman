# LOG-20260409-009: UX Research Canonicalization

Opened: 2026-04-09 08-12-16 KST
Recorded by agent: 019d6f5a-4b00-7390-a9c6-4527c1baa692

## Metadata

- Run type: orchestrator
- Goal: move the revised Superhuman UX direction out of the architecture evidence layer and into the canonical root research lane
- Related ids: RSH-20260409-006, RSH-20260409-001

## Task

Correct the placement of the revised UX memo so current product-direction research lives in `research/` rather than being mistaken for a canonical architecture-layer source.

## Scope

- In scope: create a root `RSH-*` memo for the expanded project-workspace thesis
- In scope: demote the architecture-local memo to a historical pointer
- Out of scope: changing accepted product truth in `SPEC.md` or sequencing in `PLANS.md`

## Entry 2026-04-09 08-12-16 KST

- Action: audited repo instructions, confirmed `architecture/` is evidence-only, and moved the living UX direction into the canonical research lane
- Files touched:
  - `research/RSH-20260409-006-project-workspace-ux-direction-and-surface-strategy.md`
  - `architecture/Superhuman UX Research (revised).md`
- Checks run:
  - `sed -n '1,260p' AGENTS.md`
  - `sed -n '1,220p' research/README.md`
  - `rg --files research | sort`
- Output:
  - created a canonical root research memo for the expanded project-workspace UX thesis
  - preserved the architecture-local file only as a compatibility and history pointer
  - aligned the UX direction with the repo's root canonical surface model
- Blockers: none
- Next: use the root research memo as the retrieval target for future workspace, mobile, messenger, and orchestrator UX planning
