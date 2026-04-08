# LOG-20260409-010: Canonical Managed-Repo Model

Opened: 2026-04-09 08-21-17 KST
Recorded by agent: 019d6f5a-4b00-7390-a9c6-4527c1baa692

## Metadata

- Run type: orchestrator
- Goal: make the latest `LPFchan/repo-template` the canonical repo-management model for repos Superhuman creates, adopts, or manages
- Related ids: DEC-20260409-006

## Task

Broaden Superhuman's repo-template posture from "used by this repo" to "the default operating model for any repo Superhuman works with under its own management model."

## Scope

- In scope: canonical contract updates, root instruction updates, product-truth and planning updates, and one durable decision record
- In scope: aligning Superhuman with the latest repo-template scaffold and recreate prompt
- Out of scope: implementing automated repo-adoption tooling or changing public-facing product copy

## Entry 2026-04-09 08-21-17 KST

- Action: verified the current upstream and local repo-template baseline, then updated Superhuman's canonical docs to treat it as the default managed-repo model
- Files touched:
  - `REPO.md`
  - `AGENTS.md`
  - `SPEC.md`
  - `PLANS.md`
  - `STATUS.md`
  - `records/decisions/DEC-20260409-006-repo-template-as-canonical-managed-repo-model.md`
- Checks run:
  - `sed -n '1,260p' ~/Documents/repo-template/scaffold/REPO.md`
  - `sed -n '1,260p' ~/Documents/repo-template/scaffold/AGENTS.md`
  - `sed -n '1,260p' ~/Documents/repo-template/recreate-prompt.md`
  - `sed -n '1,220p' ~/Documents/repo-template/README.md`
  - repo-wide `rg` audit for current repo-template framing in root docs
- Output:
  - `REPO.md` now states that the latest `LPFchan/repo-template` is the canonical baseline for repos Superhuman creates, adopts, or manages
  - `AGENTS.md` now tells future agents how to apply that baseline to new repos and existing repos
  - `SPEC.md`, `PLANS.md`, and `STATUS.md` now reflect the broader managed-repo posture rather than treating repo-template as a self-only discipline
  - a new `DEC-*` records the policy so future repos can retrieve the rationale instead of inferring it from chat
- Blockers: none
- Next: if desired, add a dedicated procedural skill or workflow for repo-template-based repo creation and adoption
