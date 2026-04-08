# RSH-20260409-006: Project Workspace UX Direction And Surface Strategy

Opened: 2026-04-09 08-12-16 KST
Recorded by agent: 019d6f5a-4b00-7390-a9c6-4527c1baa692

## Metadata

- Status: completed
- Question: What UX direction and cross-surface strategy best fit Superhuman's ambition to become a durable project workspace rather than remaining defined by chat, control panels, or coding-client mimicry?
- Trigger: revise the macro-scale UX research so it fits the accepted repo/workspace operating model
- Related ids: RSH-20260409-001, IBX-20260409-003, DEC-20260409-006, RSH-20260409-007

## Research Question

What product framing, memory model, and surface strategy would let Superhuman become the way one ambitious operator runs projects with agents across desktop, mobile, messenger, and repo-native memory?

## Why This Belongs To This Repo

This question is not abstract product branding work. It affects the repo's canonical operating model, surface priorities, orchestration rules, and how future agents should route work into durable project memory.

If the repo claims Superhuman is becoming a project workspace, but the supporting UX thinking remains trapped in an architecture-side memo, the project's most important product direction becomes harder to retrieve and easier to misapply.

## Findings

- The strongest product noun is `project workspace`, not `chat`, `thread`, or `work item`.
- Superhuman's differentiator is not "another coding client." It is a coherent workspace for memory, direction, research, execution, and ongoing maintenance.
- Repo-native memory is part of the user experience, not just internal hygiene. `SPEC.md`, `STATUS.md`, `PLANS.md`, `INBOX.md`, `research/`, `records/decisions/`, `records/agent-worklogs/`, and `upstream-intake/` form the workspace backbone.
- The same workspace model should extend across repos Superhuman creates, adopts, or manages through the latest `LPFchan/repo-template` baseline rather than stopping at this repo alone.
- The orchestrator should own routing. New intake should not directly mutate truth docs or collapse durable project memory back into conversation history.
- Messenger surfaces make the most sense as capture, notification, approval, summary, and quick-redirection channels rather than canonical authoring surfaces.
- Mobile should mature as a project cockpit before it tries to become a full mobile IDE.
- Desktop should become the primary high-bandwidth workspace surface, combining prompting, code interaction, active work monitoring, approvals, trust controls, and project memory browsing.
- Research needs its own explicit lane. One-off exploratory sessions should produce `RSH-*` memos when they yield reusable learning, while raw execution remains in `LOG-*`.
- Auditability is a UX feature, not back-office paperwork. Stable artifact IDs, timestamps, `agent-id`, and commit provenance are part of the trust model.
- The main risk is building desktop, mobile, and messenger shells before the shared workspace protocol is stable, which would recreate fragmentation under a more polished UI.

## Promising Directions

- Build the product around one visible workspace backbone rather than around chat or topology views.
- Make capture possible from anywhere, but keep truth writing deliberate and orchestrated.
- Surface the repo-managed memory model clearly in the product instead of hiding it behind generic transcript views.
- Build a work-first desktop surface that centers current reality, active runs, approvals, project memory, and code context.
- Treat weekly upstream review as native workspace behavior rather than side automation.
- Keep worker agents powerful but bounded, with the orchestrator responsible for routing, synthesis, and truth protection.

## Dead Ends Or Rejected Paths

- Making `work item` the top-level product identity. It helps organize action, but it still undershoots the larger workspace ambition.
- Treating messenger integrations as canonical authoring surfaces. That would blur intake with truth.
- Trying to achieve desktop and mobile IDE parity first. That spreads effort across the wrong constraint too early.
- Letting every agent write directly to `SPEC.md`, `STATUS.md`, or `PLANS.md` without orchestrated routing.
- Leaving the strongest UX direction only in `architecture/`, which is no longer the canonical operating layer.

## Recommended Routing

- Keep durable product-truth implications in `SPEC.md`.
- Keep accepted sequencing such as mobile-cockpit-first and workspace-first evolution in `PLANS.md`.
- Keep the managed-repo baseline and portfolio-level governance implication in `REPO.md`, `SPEC.md`, and `DEC-20260409-006`.
- Keep current public-reality caveats in `STATUS.md` and public docs rather than overstating what is already shipped.
- Treat this memo as the canonical root research artifact for the expanded workspace-direction thesis.
- Retain `architecture/Superhuman UX Research (revised).md` only as a historical pointer to this memo and the root canonical docs.
