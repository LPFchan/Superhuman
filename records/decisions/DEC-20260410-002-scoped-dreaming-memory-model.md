# DEC-20260410-002: Scoped Dreaming Memory Model

Opened: 2026-04-10 13-58-24 KST
Recorded by agent: 019d7499-e2cb-7923-ad65-19a4bdb04d64

## Metadata

- Status: accepted
- Deciders: operator, orchestrator
- Related ids: IBX-20260409-004, UPS-20260407-001, DEC-20260409-004

## Decision

Superhuman adopts a scoped, background dreaming model with two memory scopes: workspace/project memory and personal/global memory.

Dreaming is a strict waterfall:

- `light` extracts candidate claims from weighted visible-on-screen evidence
- `REM` synthesizes recurring claims from pending `light` candidates
- `deep` writes canonical workspace memory into repo-visible `MEMORY.md`

`deep` may not promote raw signals directly.

Dreaming uses off-Git `DRM-*` claim artifacts for `light` and `REM`. A `DRM-*` is a structured claim artifact, not a raw event stream and not a run-sized daily or weekly file.

Each `DRM-*` carries:

- scope
- stage
- evidence pointers
- status

The status model is:

- `pending`
- `promoted`
- `retired`
- `blocked`

Only `pending` `DRM-*` artifacts stay in the active set. `promoted`, `retired`, and `blocked` artifacts move to cold history.

Global memory is off-Git. Workspace memory is canonicalized in repo-visible `MEMORY.md`.

Retrieval order is:

1. current task and current user instruction
2. workspace memory
3. global memory
4. workspace insights
5. global insights

Raw dream artifacts do not participate in ordinary recall.

When scope is unclear, dreaming is workspace-first. Promotion from workspace-level material into global memory happens automatically only through repeated cross-workspace evidence. Separate operator confirmation is not required for that promotion path.

Dreaming is silent background infrastructure. `MEMORY.md` remains the user-visible canonical memory surface.

## Context

- Superhuman wants dreaming only if it extends memory rather than competing with it.
- Upstream OpenClaw now ships a first-party dreaming model with staged promotion, separate artifacts, and `light -> REM -> deep` semantics, but Superhuman still needed to choose its own scope, trust, and storage posture.
- `claude-code` demonstrates a project-scoped consolidation model, but Superhuman needs stronger scope separation because it is explicitly becoming a cross-platform workspace and operator system rather than only a per-project coding tool.
- The previous open questions were no longer just whether dreaming should exist, but where it lives, how it promotes, which memory surface it writes to, and how it avoids duplicating or over-trusting derived claims.
- The operator explicitly chose:
  - workspace/project memory plus personal/global memory
  - workspace-first on uncertainty
  - strict waterfall semantics
  - off-Git `DRM-*` claim artifacts for `light` and `REM`
  - repo-visible `MEMORY.md` as canonical workspace memory
  - repeated cross-workspace evidence for global promotion without separate confirmation
  - source eligibility across visible-on-screen surfaces, with typed and weighted trust rather than equal trust

## Options Considered

### Single-Scope Memory With No Workspace/Global Split

- Upside: simpler mental model
- Upside: fewer promotion rules
- Downside: mixes personal operator traits with repo-local behavior and project-specific facts
- Downside: makes cross-project contamination much more likely

### Strong Automatic Writer With Deep Promotion From Raw Signals

- Upside: simpler implementation path
- Upside: more "magical" memory behavior sooner
- Downside: makes the `light` and `REM` tiers largely cosmetic
- Downside: weakens trust boundaries and makes provenance harder to explain

### Scoped Waterfall Dreaming With Off-Git Claim Artifacts

- Upside: preserves meaningful tiering and trust boundaries
- Upside: keeps global memory separate from workspace memory
- Upside: allows repeated-evidence promotion without stuffing full history into model context
- Upside: keeps the canonical user-facing memory surface small and legible
- Downside: requires explicit off-Git claim storage and queue handling
- Downside: exact schema, retention, and threshold details still need implementation work

## Rationale

The operator wants dreaming to be real, transparent in outcome, and mostly invisible in operation. That combination only works if the system separates:

- raw operational history
- staged dream claims
- canonical memory

Treating `DRM-*` as structured claim artifacts for `light` and `REM` preserves that separation without introducing repo-visible bureaucracy. Making `deep` write only canonical `MEMORY.md` keeps the visible memory surface simple.

The workspace/global split is necessary, but a forced binary on first observation would be too brittle. Workspace-first handling plus repeated cross-workspace promotion gives the system a conservative default while still allowing transparent global memory formation over time.

The strict waterfall is the point of the tiering. If `deep` can promote raw signals directly, the earlier tiers lose their real function and become only decorative preprocessing.

## Consequences

- Dreaming now has an accepted architecture-level scope, status, and promotion model.
- `DRM-*` is reserved for off-Git structured `light` and `REM` claim artifacts, not raw chat/tool/terminal/web event logs.
- Workspace memory must stay in repo-visible `MEMORY.md`.
- Global memory must stay off-Git.
- Source eligibility and source trust are separate concepts. Visible-on-screen inputs may feed dreaming, but implementations must type and weight them rather than treating them as equally trustworthy.
- Queueing and catch-up behavior are part of the accepted direction:
  - `light` is cheap and frequent
  - `REM` is slower and more reflective
  - `deep` is expensive and conservative
  - missed runs should catch up rather than silently skipping accumulated work
- Exact `DRM-*` schema, storage backend, cadence numbers, and promotion thresholds remain implementation follow-up work rather than unresolved product-policy blockers.
- Source material:
  - `upstream-intake/reports/internal-records/UPS-20260407-001-v2026.4.5.md`
  - `upstream-intake/reports/operator-briefs/UPS-20260407-001-v2026.4.5-operator-brief.md`
  - local `claude-code` checkout:
    - `memdir/paths.ts`
    - `services/autoDream/consolidationPrompt.ts`
  - OpenClaw upstream:
    - `extensions/memory-core/src/dreaming.ts`
    - `extensions/memory-core/src/dreaming-phases.ts`
    - `extensions/memory-core/src/dreaming-command.ts`
    - `src/memory-host-sdk/dreaming.ts`
- Related artifacts:
  - `STATUS.md`
  - `PLANS.md`
  - `REPO.md`
