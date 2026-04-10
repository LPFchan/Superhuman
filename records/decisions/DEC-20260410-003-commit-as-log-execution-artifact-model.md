# DEC-20260410-003: Commit-Backed LOG Execution Artifact Baseline

Opened: 2026-04-10 13-58-24 KST
Recorded by agent: 019d7499-e2cb-7923-ad65-19a4bdb04d64

## Metadata

- Status: accepted
- Deciders: operator, orchestrator
- Related ids: DEC-20260409-006

## Decision

This decision is written in template-first terms so it can be proposed upstream to `LPFchan/repo-template` and then adopted locally with the smallest viable diff.

Repos using this operating model keep the `LOG-*` namespace as the stable execution-artifact id space, but routine Git-backed execution records move from legacy markdown `LOG-*` files into commit metadata and commit bodies.

Under this model:

- one commit should represent one workstream
- one workstream should normally produce one commit
- the commit becomes the default storage backend for the execution artifact
- the stable execution id is carried by a `commit: LOG-YYYYMMDD-NNN` trailer
- `artifacts:` remains in place for related durable artifacts such as `RSH-*`, `DEC-*`, and `UPS-*`

Commit bodies should use the repo's structured execution shape. That shape should be enforced by `scripts/committer`, local commit hooks, and CI.

Markdown `LOG-*` files become exception-only. They remain available for:

- non-Git execution
- failed or abandoned investigations with no corresponding commit
- automation or operational runs where no Git change exists
- cases where forcing the execution record into a commit would lose clarity

Legacy markdown `LOG-*` history stays valid during migration, but routine committed work should stop creating new markdown `LOG-*` files once the new policy is implemented.

## Context

- The current repo-template-style operating model separates execution history into markdown `LOG-*` files and also requires commits to reference stable artifacts.
- In practice, routine committed work often ends up describing the same execution episode twice:
  - once in the commit
  - once in the repo's execution-history surface
- That duplication is especially expensive for agents because it adds ceremony without adding much new information when commit hygiene is already expected.
- The desired reform is to let a normal clean commit be the execution artifact itself rather than forcing a second default write surface for the same workstream.
- Any adoption of that reform still needs a graceful migration path rather than a sudden loss of old history:
  - stable `LOG-*` ids should remain useful
  - existing logs should migrate where possible
  - the legacy markdown `LOG-*` path should retire deliberately rather than disappearing chaotically

## Options Considered

### Keep Markdown `LOG-*` As The Default Execution Artifact

- Upside: preserves the current baseline operating model without change
- Upside: stable ids already exist and are understood by current tooling
- Downside: duplicates routine committed work across commit history and legacy markdown `LOG-*` files
- Downside: increases agent overhead for ordinary code changes

### Replace `LOG-*` Entirely With Commit SHAs

- Upside: removes one namespace
- Upside: execution records live directly in git history
- Downside: SHAs are a poor stable abstraction for workstream identity under rebase, squash, or migration
- Downside: loses a clean exception path for non-Git execution

### Keep `LOG-*` As A Stable Id Namespace But Store Routine Execution In Commits

- Upside: removes most commit-plus-legacy-markdown duplication
- Upside: preserves stable execution ids independent of SHA
- Upside: keeps an exception path for non-Git or no-commit execution
- Upside: allows a gradual migration instead of a forced rewrite of old history
- Downside: requires repo-contract, tooling, and CI changes
- Downside: needs explicit one-commit-one-workstream discipline

## Rationale

The duplication problem is real, but the `LOG-*` namespace still solves a useful identity problem. The cleanest reform is not to delete execution ids, but to move their default storage from legacy markdown `LOG-*` files into commit bodies and commit trailers.

That lets repos using this operating model keep:

- stable execution ids
- machine-parseable execution structure
- a non-Git exception path

while removing the routine need to describe the same work twice.

Keeping `artifacts:` for related durable artifacts avoids inventing another trailer concept. The execution artifact and related durable research or decision artifacts have different jobs and should stay distinct.

## Consequences

- The baseline repo contract must change from "commits reference a normal execution artifact" to "routine commits are the normal execution artifact and carry a stable `LOG-*` id through `commit:`."
- A new explicit repo rule is required: one commit should map to one workstream.
- Commit helpers must be updated to:
  - require `commit: LOG-YYYYMMDD-NNN`
  - preserve `project`, `agent`, `role`, and `artifacts`
  - enforce the structured commit-body format
- Commit-validation hooks and CI must validate the new shape.
- Markdown execution-history directories become legacy and exception-only rather than the default execution-history store.
- Existing markdown `LOG-*` files need a graceful migration path:
  - new routine committed work should stop creating them
  - existing logs remain readable and valid during transition
  - logs that can be cleanly resolved into structured commits may be retired later
  - unresolved, non-Git, or exception-only logs may remain
- The operating model should preserve lineage from legacy `LOG-*` records into commit-backed `LOG-*` ids during migration.
- `RSH-*`, `DEC-*`, and other durable artifacts remain separate and continue to be referenced through `artifacts:`.
- Source material:
  - `REPO.md`
  - `AGENTS.md`
- Related artifacts:
  - `REPO.md`
  - `AGENTS.md`

## Superhuman-Specific Adoption Notes

- Superhuman should adopt this baseline through local changes to:
  - `scripts/committer`
  - `scripts/check-commit-standards.sh`
  - `git-hooks/commit-msg`
  - `.github/workflows/commit-standards.yml`
- Superhuman should keep `artifacts:` for related durable records such as `RSH-*`, `DEC-*`, and `UPS-*`.
- Superhuman should migrate existing markdown `LOG-*` files gradually:
  - stop creating new routine markdown `LOG-*` files for committed work once the policy lands
  - keep exception-only markdown logs for non-Git and no-commit execution
  - retire legacy logs only when their execution record is cleanly representable in structured commits
