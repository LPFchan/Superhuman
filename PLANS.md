# Superhuman Plans

This document contains accepted future direction only.

## Planning Rules

- Only accepted future direction belongs here.
- Plans should be specific enough to guide execution later.
- Product or architecture rationale should link to `DEC-*` or `RSH-*` records when relevant.
- When a plan becomes current truth, reflect it into `SPEC.md` or `STATUS.md`.

## Approved Directions

### Work-First Project Workspace Shift

- Outcome: Superhuman becomes a durable project workspace rather than remaining defined primarily as a chat-first or admin-first assistant shell.
- Why this is accepted: the current repo and runtime already contain strong primitives, but the product surface under-expresses the intended operator value.
- Expected value: one coherent home for memory, direction, research, execution, approvals, and agent work.
- Preconditions: preserve current assistant utility while shifting the front-door experience.
- Earliest likely start: after migration-cleanup gating and root repo-surface adoption settle.
- Related ids: `RSH-20260409-001`, `SPEC.md`, `IBX-20260409-003`

### Root Repo-Managed Memory And Governance

- Outcome: Superhuman itself uses the repo-template framework at the repository root, with root truth/status/plan/inbox/research/decision/worklog surfaces.
- Why this is accepted: the project’s own repo must model the discipline Superhuman is supposed to provide.
- Expected value: coherent internal memory, durable provenance, and a canonical operating backbone for future agents.
- Preconditions: retire architecture-local mirrors and root-canonicalize upstream intake.
- Earliest likely start: now
- Related ids: `DEC-20260409-002`, `DEC-20260409-003`, `LOG-20260409-003`

### Mobile Cockpit First

- Outcome: mobile becomes a project cockpit for capture, approvals, redirection, status, and monitoring before it attempts to become a full coding IDE.
- Why this is accepted: the operator needs ubiquitous control of project work, but a mobile IDE-first path would dilute the more important workspace model.
- Expected value: coherent cross-device access to the same workspace without prematurely forcing Cursor-on-a-phone expectations.
- Preconditions: work-first UI model and root project memory surfaces must be stronger first.
- Earliest likely start: after the work-first recomposition has a stable desktop/control-plane shape.
- Related ids: `RSH-20260409-001`, `RSH-20260409-002`

### Upstream Intake As A First-Class Operating Surface

- Outcome: weekly upstream review remains a first-class subsystem of the workspace, not a side script.
- Why this is accepted: Superhuman still gains real value from OpenClaw, but only if those merges stay explicit, attributable, and operator-legible.
- Expected value: safer downstream maintenance, less policy drift, and clearer escalation boundaries.
- Preconditions: root canonical location, stable `UPS-*` identifiers, and clear autonomous maintenance rules.
- Earliest likely start: now
- Related ids: `DEC-20260409-003`, `DEC-20260409-004`, `UPS-20260407-001`

### Release-Ready Superhuman Identity Closeout

- Outcome: the migration wave exits pre-release posture with the remaining public-surface cleanup and verification gates complete.
- Why this is accepted: the repo has already done the hard naming and boundary work; what remains is finish quality, not existential direction.
- Expected value: clean release posture and less identity confusion across docs, UI, apps, and upgrade flows.
- Preconditions: remaining cleanup items and compatibility verification need to close.
- Earliest likely start: now
- Related ids: `LOG-20260409-001`, `IBX-20260409-001`, `IBX-20260409-002`

## Sequencing

### Near Term

- Initiative: root repo-managed surface adoption
  - Why now: it makes the project’s own memory model real instead of architectural theory
  - Dependencies: `DEC-20260409-002`, `DEC-20260409-003`
  - Related ids: `LOG-20260409-003`
- Initiative: release-candidate blocker closeout
  - Why now: current migration posture is late-cleanup and explicitly not yet release-ready
  - Dependencies: upgrade verification, docs cleanup, UI/app cleanup, compatibility checks
  - Related ids: `IBX-20260409-001`, `IBX-20260409-002`, `LOG-20260409-001`
- Initiative: root-canonical upstream intake
  - Why now: Superhuman is still downstream and weekly intake is already active
  - Dependencies: `DEC-20260409-003`, `DEC-20260409-004`
  - Related ids: `UPS-20260407-001`

### Mid Term

- Initiative: Work surface and Today-style operator cockpit
  - Why later: current runtime and queue/approval primitives should be recomposed into a work-first front door
  - Dependencies: `RSH-20260409-001`, `RSH-20260409-002`
  - Related ids: `IBX-20260409-003`
- Initiative: unified work item detail and visible trust posture
  - Why later: approvals, queue, transcript, and task state need one coherent operator surface
  - Dependencies: work-first product recomposition
  - Related ids: `RSH-20260409-001`
- Initiative: explicit plugin-canary compatibility lane
  - Why later: the posture is already conservative, but future validation needs named canaries and install paths
  - Dependencies: operator choice on external-style install workflow
  - Related ids: `IBX-20260409-002`, `RSH-20260409-004`

### Deferred But Accepted

- Initiative: synchronized desktop and mobile project workspace
  - Why deferred: the repo-native memory model and cockpit surfaces must be stronger before cross-device polish matters
  - Revisit trigger: stable work-first operator cockpit on desktop/control UI
  - Related ids: `SPEC.md`, `RSH-20260409-001`
- Initiative: deeper proactive background project work
  - Why deferred: autonomy should scale only after current routing, memory, and trust surfaces are more legible
  - Revisit trigger: stable upstream-intake and work-item/operator-cockpit flows
  - Related ids: `RSH-20260409-002`, `DEC-20260409-004`
- Initiative: full mobile coding surface
  - Why deferred: mobile cockpit first remains the accepted sequence
  - Revisit trigger: workspace and cockpit model proven valuable first
  - Related ids: `RSH-20260409-001`

## Concrete Roadmap

This roadmap turns the routed `IBX-*` items into the next execution ladder for Superhuman.

### Roadmap 1: Release Gate Closure

- Source intake: `IBX-20260409-001`
- Objective: exit late migration-cleanup posture and make the repo honestly release-ready for this wave.
- Deliverables: public docs cleanup sweep, Control UI copy cleanup, app-display cleanup across platforms, and one final upgrade plus compatibility verification bundle.
- Owner: operator plus implementation agents.
- Exit signal: `STATUS.md` no longer lists migration cleanup as the release blocker for this wave.
- Related ids: `IBX-20260409-001`, `LOG-20260409-001`, `LOG-20260409-004`

### Roadmap 2: Compatibility Lane Lock-In

- Source intake: `IBX-20260409-002`
- Objective: turn the conservative plugin-compatibility posture into a concrete validation lane instead of a principle without named canaries.
- Deliverables: choose the pinned third-party OpenClaw plugin canaries, choose the primary external-style install workflow, and define the future compatibility lane that later release gates should protect.
- Owner: operator first, then orchestrator and implementation agents.
- Exit signal: the canary set and install path are chosen and reflected into durable decision or planning artifacts.
- Related ids: `IBX-20260409-002`, `RSH-20260409-004`, `DEC-20260409-005`, `LOG-20260409-004`

### Roadmap 3: Public Framing Ramp

- Source intake: `IBX-20260409-003`
- Objective: choose how quickly Superhuman’s public front door shifts from personal-assistant-first toward project workspace and operator cockpit framing.
- Deliverables: an operator decision packet comparing soft, hybrid, and hard framing ramps; a chosen ramp; and a scoped rewrite packet for `README.md`, key docs, and the first work-first control surface.
- Owner: operator first, then orchestrator, design, and implementation agents.
- Exit signal: one framing ramp is approved and the first rewrite scope is explicitly queued.
- Related ids: `IBX-20260409-003`, `RSH-20260409-001`, `RSH-20260409-002`, `LOG-20260409-004`

### Roadmap 4: Dreaming Trust Boundary

- Source intake: `IBX-20260409-004`
- Objective: decide whether dreaming remains a reviewable, plugin-owned, append-only memory assistant or is allowed to move toward stronger automatic memory writing.
- Deliverables: an operator decision packet, explicit trust and auditability rules, allowed write surfaces, and a phased implementation boundary for memory-related work.
- Owner: operator first, then memory and runtime agents.
- Exit signal: the trust posture is accepted in a durable decision and reflected into planning plus upstream-intake policy.
- Related ids: `IBX-20260409-004`, `UPS-20260407-001`, `DEC-20260409-004`, `LOG-20260409-004`

### What Comes Immediately After The Roadmap

- First build target: a work-first desktop or Control UI operator cockpit that centers capture, queue, approvals, runs, outcomes, and project memory.
- Explicit non-target: simultaneous desktop and mobile IDE parity.
- Why: the workspace model needs one strong shipped work surface before broader surface expansion makes sense.
- Related ids: `RSH-20260409-001`, `RSH-20260409-002`, `IBX-20260409-003`

## Explicit Holds

- Hold: dreaming or automatic memory-writing posture
  - Waiting on: operator decision about trust model and memory authority
  - Unblock condition: resolve the current upstream-intake escalation
  - Related ids: `IBX-20260409-004`, `UPS-20260407-001`
- Hold: exact external third-party plugin canary set
  - Waiting on: operator decision on which external-style plugin workflows matter most to protect
  - Unblock condition: choose canaries and primary external install path
  - Related ids: `IBX-20260409-002`, `RSH-20260409-004`
