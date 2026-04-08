# RSH-20260409-007: Desktop Mobile Messenger Information Architecture

Opened: 2026-04-09 08-33-50 KST
Recorded by agent: 019d6f5a-4b00-7390-a9c6-4527c1baa692

## Metadata

- Status: in progress
- Question: What concrete desktop, mobile, and messenger information architecture best expresses Superhuman's project-workspace model without prematurely freezing the wrong desktop structure?
- Trigger: extend `RSH-20260409-006` into a more concrete cross-surface IA exploration while keeping the work explicitly provisional
- Related ids: RSH-20260409-006, IBX-20260409-003

## Research Question

How should Superhuman divide responsibility across desktop, mobile, and messenger so all three feel like entrypoints into the same project workspace instead of three disconnected shells?

## Why This Belongs To This Repo

Superhuman's workspace thesis is now accepted, but the product still lacks a concrete surface map. Without an explicit IA exploration, future work risks either freezing an arbitrary desktop navigation too early or building mobile and messenger as shallow bolt-ons.

This research belongs in the repo because it will shape future control-surface recomposition, mobile scope, messenger integrations, and how canonical project memory is made legible to the operator.

## Findings

- Desktop should be the primary high-bandwidth workspace surface.
- Mobile should be a project cockpit first, optimized for capture, approvals, monitoring, summaries, and redirection.
- Messenger should be a lightweight edge surface for capture, approvals, summaries, status, and redirects rather than a canonical truth-authoring surface.
- All three surfaces should resolve into the same underlying project-workspace state, not parallel memory systems.
- There is likely a useful split between cross-project surfaces and inside-a-project surfaces.
- The desktop information architecture should not be frozen yet into final labels or tab groupings; it still needs more finesse and operator-fit thinking.

### Working Desktop IA Draft

These are working candidates, not final names:

- a cross-project home for attention, active work, and recent outcomes
- a project switcher or project index
- a project workspace overview that makes `STATUS`, active runs, recent decisions, and important plans legible
- a capture surface for new directives, follow-ups, and redirects
- a work or runs surface for active execution, blockers, and completions
- an approvals surface for risky or operator-level choices
- a memory surface for `SPEC`, `STATUS`, `PLANS`, research, decisions, and worklogs
- an upstream surface for recurring upstream review where relevant
- a control or settings layer kept clearly secondary

### Working Mobile IA Draft

These are working candidates, not final names:

- a `Today` or `Now` view for urgent status, blockers, and recent completions
- a fast capture entrypoint
- an approvals view
- a runs or monitoring view
- a compact project snapshot view for `STATUS`, accepted plans, and recent decisions
- lightweight inbox triage when the operator is away from desktop

### Working Messenger IA Draft

These are working interaction shapes, not full screens:

- quick capture into a named project
- approval cards with approve, deny, or redirect actions
- blocked, started, and completed run updates
- concise status summaries
- escalation summaries for upstream or product-level questions
- lightweight redirect commands such as routing something into research, plans, or inbox

## Promising Directions

- Treat desktop as the place where the operator understands and steers the whole workspace.
- Treat mobile as the place where the operator stays in control when away from desktop.
- Treat messenger as the lowest-friction intake and response surface.
- Keep the same project-memory backbone visible across all three, even if each surface reveals different slices of it.
- Delay final desktop labels and grouping decisions until the operator flow feels more intentional and less admin-derived.

## Dead Ends Or Rejected Paths

- Freezing the desktop IA too early around arbitrary labels that might simply mirror current control-plane internals.
- Treating messenger as a place where canonical truth is directly authored.
- Making mobile chase full coding-IDE parity before the cockpit model proves itself.
- Designing each surface independently instead of as views into the same project workspace.

## Recommended Routing

- Keep the settled cross-surface truths in `SPEC.md`.
- Keep accepted but still high-level sequencing in `PLANS.md`.
- Use this memo as the ongoing research home for desktop/mobile/messenger IA thinking until the desktop structure is mature enough to promote further.
- Do not yet lock detailed desktop navigation or final screen naming into `PLANS.md`.
