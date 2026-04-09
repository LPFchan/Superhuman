# RSH-20260409-006: Project Workspace UX Direction And Surface Strategy

Opened: 2026-04-09 08-12-16 KST
Recorded by agent: 019d6f5a-4b00-7390-a9c6-4527c1baa692

## Metadata

- Status: completed
- Question: What UX direction and cross-surface strategy best fit Superhuman's ambition to become a durable project workspace rather than remaining defined by chat, control panels, or coding-client mimicry?
- Trigger: revise the macro-scale UX research so it fits the accepted repo/workspace operating model
- Related ids: RSH-20260409-001, IBX-20260409-003, DEC-20260409-006, RSH-20260409-007

## Question

What product framing, memory model, and surface strategy would let Superhuman become the way one ambitious operator runs projects with agents across desktop, mobile, messenger, and repo-native memory?

## Why This Memo Exists

This question is not abstract product branding work. It affects the repo's canonical operating model, surface priorities, orchestration rules, and how future agents should route work into durable project memory.

If the repo claims Superhuman is becoming a project workspace, but the supporting UX thinking remains trapped in an architecture-side memo, the project's most important product direction becomes harder to retrieve and easier to misapply.

This memo is a reconciliation of the older architecture-local UX audit, the later repo-template/workspace decision, and the current lightweight research guidance. It keeps the newer conclusion that `project workspace` is the top-level object, while restoring the older audit's sharper interaction model for operator attention.

## Reconciled Thesis

Superhuman should become an intent-centered operator cockpit inside a durable project workspace.

The `project workspace` is the product container: one synchronized home for truth, status, plans, inbox, research, decisions, agent execution, commits, upstream review, code context, active work, and operator control.

The `work item` is the operator-attention object inside that container. It is how a captured intent, approval, queue entry, automation, delegated agent run, bug report, research branch, upstream intake, or messenger request becomes something visible enough to approve, run, block, finish, audit, and revisit.

## Preserved Original UX Thesis

The architecture-local research originally argued that Superhuman should not be a chat app with admin panels. Its useful product promise was:

> Show me what needs my attention, what will happen next, and what already happened.

That promise still fits. The update is that the promise now belongs inside a broader repo-aware project workspace rather than replacing the workspace noun with `work item`.

The original work-item lifecycle is still a useful product lens:

`captured -> clarified -> proposed -> awaiting approval -> queued -> running -> blocked or completed`

Each meaningful work item should be able to expose source, summary, proposed actions, trust level, execution state, approval state, run/queue history, artifacts, outcome, and audit trail.

## Findings That Remain Accepted

- The strongest product noun is `project workspace`, not `chat`, `thread`, or `work item`.
- `work item` remains the strongest noun for one visible unit of operator attention inside a project workspace.
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

## Screen Model From The Older Audit

The old audit's screen model should stay in play as an input, not as frozen navigation:

| Surface          | Preserved intent                                                                                           |
| ---------------- | ---------------------------------------------------------------------------------------------------------- |
| Work             | Prioritized queue of waiting approvals, active runs, blocked work, queued follow-ups, and recent outcomes  |
| Work Item Detail | Canonical detail page for source thread, summary, proposed actions, approvals, run timeline, and artifacts |
| Capture          | Universal composer / command bar for new requests, redirects, follow-ups, and trust-mode changes           |
| Automations      | Scheduled, delegated, and background work expressed as ongoing responsibilities rather than raw cron data  |
| Control          | Agents, channels, routing, nodes, and config; important, but secondary to work and attention               |

## Current-Codebase Audit To Preserve

The older memo classified the product gap as composition-first rather than backend-invention-first:

- Current navigation was topology-first (`navigation.ts:4`, tab set around `navigation.ts:26`) and lacked a primary work / queue / attention surface.
- Queue already existed, but was visually treated as a small chat footer artifact (`chat.ts:1216`) instead of a first-class work surface.
- Approval plumbing existed (`app-gateway.ts:428`, `exec-approval.ts:57`), but the UI framed approvals as global interrupts instead of contextual decisions attached to a parent work item.
- The command model was already strong (`commands-registry.shared.ts:116`, approval commands around `commands-registry.shared.ts:185`, slash command registry) and should stay as a power layer rather than the whole product.
- Overview emphasized telemetry and system health (`overview-cards.ts:103`, `overview-attention.ts:35`) more than "what needs me now."
- Queue and background-task behavior were already documented (`queue.md:8`, `tasks.md:10`), but the Control UI did not expose them as first-class product surfaces.

Treat those file references as historical implementation seams from the audit date; verify current paths before coding against them.

## Promising Directions

- Build the product around one visible workspace backbone rather than around chat or topology views.
- Make capture possible from anywhere, but keep truth writing deliberate and orchestrated.
- Surface the repo-managed memory model clearly in the product instead of hiding it behind generic transcript views.
- Build a work-first desktop surface that centers current reality, active runs, approvals, project memory, and code context.
- Build a unified work-item detail surface by composing existing transcript/session, queue, task, approval, artifact, worklog, decision, research, and commit context instead of starting a disconnected ledger.
- Make trust mode a visible global / work-request-level control.
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

## Historical Versions Consulted

- `531dddcf83^:architecture/Superhuman UX Research (revised).md` for the original operator-cockpit/work-item audit.
- `cc421faf92:research/RSH-20260409-006-project-workspace-ux-direction-and-surface-strategy.md` for the first root research migration.
- current `SPEC.md`, `PLANS.md`, and `REPO.md` for accepted workspace / repo-template direction.
