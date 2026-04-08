# DEC-20260409-002: Repo-Template Adoption For Superhuman

Opened: 2026-04-09 05-19-05 KST
Recorded by agent: 019d6de0-986d-75e2-8d79-d9ee201759ce

## Metadata

- Status: accepted
- Related ids: LOG-20260409-003

## Decision

Superhuman adopts the repo-template framework for itself at the repository root.

## Context

- Superhuman’s product direction depends on repo-native truth, plans, research, decisions, worklogs, and upstream review.
- Keeping that operating model as an architecture-side draft would leave the product’s own repo outside the discipline it is supposed to provide.
- Root-managed surfaces make the project’s own memory model real and immediately usable by future orchestrator and worker agents.

## Options Considered

### Keep Repo-Template As Architecture-Side Guidance Only

- Upside: fewer immediate root-level changes
- Downside: the product would not use the discipline it is supposed to provide

### Vendor The Template Repo Packaging Directly

- Upside: fastest literal adoption path
- Downside: would import template-specific scaffolding that does not belong in a real product repo

### Adopt The Framework At The Repository Root Without Vendoring Template Packaging

- Upside: makes the repo-native memory model real while keeping Superhuman repo-specific
- Downside: requires a careful migration from architecture-local drafts to root-canonical surfaces

## Rationale

Superhuman should model the operating system it intends to become. Root-canonical adoption captures the discipline while avoiding template-repo packaging that would only add noise inside the product repo.

## Consequences

- The canonical repo-managed surfaces live at the repository root: `REPO.md`, `SPEC.md`, `STATUS.md`, `PLANS.md`, `INBOX.md`, `research/`, `records/`, and `upstream-intake/`.
- `architecture/` becomes the internal evidence, migration, research, and historical snapshot tree.
- Superhuman adopts repo-template’s framework, not its packaging. Template-specific `scaffold/`, template `skills/`, and `recreate-prompt.md` do not belong in this repo.
- Source material:
  - `architecture/repo-operating-model.md`
  - `architecture/repo-templates/README.md`
  - `architecture/superhuman-architecture-technical.md`
  - `architecture/superhuman-architecture-simple.md`
  - `architecture/Superhuman UX Research (revised).md`
- Related artifacts:
  - `REPO.md`
  - `SPEC.md`
  - `STATUS.md`
  - `PLANS.md`
  - `records/agent-worklogs/LOG-20260409-003-root-repo-template-adaptation-bootstrap.md`
