# DEC-20260409-004: Autonomous Maintenance Boundary

Opened: 2026-04-09 05-19-05 KST
Recorded by agent: 019d6de0-986d-75e2-8d79-d9ee201759ce

## Metadata

- Status: accepted
- Related ids: UPS-20260407-001

## Decision

Superhuman keeps bounded autonomous maintenance: low-risk shared-core fixes, focused tests, internal reports, and documentation cleanup may proceed without asking, while product-shaping, compatibility-sensitive, release, naming, and policy decisions require operator escalation.

## Context

- Superhuman benefits from regular upstream intake and agentic maintenance, but only if autonomy stays legible and bounded.
- The repo already has an explicit maintenance boundary and escalation rubric; adopting repo-template at root should preserve, not blur, that line.
- Product-shaping questions such as CLI positioning and dreaming trust posture are still operator decisions even when the implementation work is agent-executed.

## Options Considered

### Broad Autonomous Maintenance

- Upside: less operator interruption
- Downside: risks silent product-shaping drift and compatibility mistakes

### Require Approval For Nearly Everything

- Upside: maximal operator control
- Downside: undermines the practical value of recurring agent maintenance

### Keep Bounded Autonomous Maintenance With Explicit Escalation

- Upside: preserves momentum on low-risk maintenance while keeping policy and product changes visible
- Downside: requires clear classification and routing discipline

## Rationale

The repo needs enough autonomy to keep maintenance practical, but not so much that significant product or compatibility choices disappear into agent execution. A bounded model keeps that line visible.

## Consequences

- Weekly upstream intake continues to classify changes as `accept`, `adapt`, or `decline`.
- Workers can proceed on low-risk maintenance when prior policy is already explicit.
- The orchestrator must escalate unresolved product, architecture, workflow, or policy calls with concrete options and tradeoffs.
- Deferred operator calls stay visible in `INBOX.md`, `PLANS.md`, or `upstream-intake/` rather than disappearing into chat.
- Source material:
  - `architecture/autonomous-maintenance-boundary.md`
  - `architecture/upstream-intake-policy.md`
  - `architecture/product-migration-plan.md`
  - `upstream-intake/reports/internal-records/UPS-20260407-001-v2026.4.5.md`
  - `upstream-intake/reports/operator-briefs/UPS-20260407-001-v2026.4.5-operator-brief.md`
- Related artifacts:
  - `REPO.md`
  - `PLANS.md`
  - `INBOX.md`
  - `upstream-intake/decision-carry-forward.md`
