# Superhuman UX Research (revised)

## Prompt

You are doing a product-level UX audit of Superhuman’s user-facing interaction model.

This is not a praise pass on reference projects, and it is not an internal architecture review. The goal is to define a differentiated user-facing model for Superhuman that could exceed Claude Code, Hermes Agent, and OpenClaw in day-to-day operator experience.

Context:

- Superhuman already has strong internal primitives for commands, approvals, queueing, routing, sessions, and background work.
- The likely weakness is not missing capability, but that the current product surface still feels admin-first and chat-first rather than work-first.
- You must distinguish between true missing capabilities and capabilities that already exist but are poorly surfaced.

Reference inputs:

- Claude Code (~/Documents/claude-code/)
- Hermes Agent (~/Documents/hermes-agent-audit/)
- OpenClaw (~/Documents/openclaw-audit/)

Your job:

1. Define the primary user-facing object for Superhuman.
2. Define the primary interaction loop for that object.
3. For each reference project, separate:
   - visible UX patterns worth adapting
   - invisible architecture patterns worth borrowing
   - anti-patterns or product traps to avoid
4. Propose one coherent Superhuman interaction model rather than a bag of imported features.
5. Map that model onto the current Superhuman codebase and classify recommendations as:
   - already possible, needs better UI composition
   - partially supported, needs extension
   - missing capability, needs new system
6. Recommend the smallest set of high-leverage product changes that would materially shift the experience.

Constraints:

- Do not optimize for praise, lineage, or “surpassing” rhetoric.
- Do not list features without naming the user problem they solve.
- Do not assume chat should remain the primary surface.
- Do not assume admin/config/navigation patterns should stay prominent.
- Prefer a model that can be built from existing primitives if possible.
- Call out what Superhuman should explicitly not copy from each reference.

Required output format:

1. Product thesis
2. Primary user-facing object and lifecycle
3. Reference matrix:
   - Claude Code
   - Hermes Agent
   - OpenClaw
4. Proposed Superhuman interaction model
5. Screen model / information architecture
6. Current-codebase mapping
7. Top 5 highest-leverage changes
8. Top 3 risks if Superhuman follows the wrong direction

Final rule:
If the current repo already has the primitive needed for a recommendation, say that explicitly. Do not pretend a UI composition problem is a missing system.

## UX Thesis

The strongest direction is to make Superhuman an intent-centered operator cockpit, not a chat app with admin panels.

- Primary product thesis: every inbound message, draft, request, approval, automation, or delegated run should become a single visible work item with source, summary, proposed actions, trust level, execution state, and audit trail.
- Primary user-facing noun: work item.
- Internal mapping: one work item can be backed by a session, queued messages, approval requests, and background tasks, but the user should not have to think in those backend nouns first.
- Core lifecycle: `captured -> clarified -> proposed -> awaiting approval -> queued -> running -> blocked or completed.`
- Product promise: “Show me what needs my attention, what will happen next, and what already happened.”

### What to borrow, at the philosophy level:

- From Claude Code: trust should be a visible dial, not a hidden policy.
- From Hermes: one source of truth should feed every surface, not just CLI.
- From OpenClaw: continuity of route and identity should be deterministic and boring.

### What not to borrow:

- Do not copy Claude Code’s code-tool-centric worldview as the top-level UX.
- Do not copy Hermes’ command density as the primary user experience.
- Do not copy OpenClaw’s topology-first control panel as the main front door.

### A screen model that fits this thesis:

1. Work
   A prioritized queue of work items: waiting approvals, active runs, blocked items, queued followups, and recent completions.

2. Work Item Detail
   The canonical detail page: source thread, summary, proposed actions, approval cards, run timeline, artifacts, final outcome.

3. Capture
   A universal composer and command bar for new requests, redirects, followups, and trust-mode changes.

4. Automations
   Scheduled, delegated, and background work, but expressed as ongoing responsibilities rather than raw cron/admin data.

5. Control
   Agents, channels, routing, nodes, and config. Important, but clearly secondary.

That is the key shift: chat becomes a view inside a work item, not the product’s root identity.

## Control UI Audit

The current Control UI already has much of the required substrate. The problem is composition.

1. The navigation is topology-first, not work-first. The top-level groups in navigation.ts:4 are chat, control, agent, and settings, and the tab set in navigation.ts:26 is dominated by admin nouns. There is no primary “work”, “queue”, or “attention” surface. That makes the product feel like a control plane before it feels like an assistant.

2. Queue exists, but it is visually treated as a footer artifact instead of a first-class object. The queued messages UI in chat.ts:1216 is literally a small list at the bottom of chat. That is capability without product expression. If queueing matters, it should be one of the main surfaces.

3. Approvals are implemented, but they are handled as global interrupts rather than contextual decisions. Approval events are pushed into UI state in app-gateway.ts:428 and rendered from the head of a queue in exec-approval.ts:57. That gives you safety, but not enough context, consequence framing, or continuity with the parent work item.

4. The command model is already strong and should be preserved. Shared built-in commands come from commands-registry.shared.ts:116, including approval-related commands in commands-registry.shared.ts:185, and the UI already derives slash commands from that registry in slash-commands.ts. This is a strength. The mistake would be exposing it as the main product instead of a power layer.

5. Overview is telemetry-first, not attention-first. The cards in overview-cards.ts:103 optimize for cost, sessions, skills, and cron. The attention section in overview-attention.ts:35 is useful, but still reads like system health. What is missing is a “what needs me now” model: pending approvals, stuck work, expiring decisions, routed followups, and completed delegations.

6. The repo already documents queue and tasks as first-class runtime behavior, but the Control UI does not expose them as first-class product surfaces. Queue behavior is clearly defined in queue.md:8. Background tasks are clearly defined in tasks.md:10. Yet the current nav in navigation.ts:4 has no task surface, and there is no dedicated task view under ui. That is a real product gap, not just wording.

The highest-leverage changes are these:

- Add a new top-level Work surface that merges queued followups, pending approvals, active runs, blocked items, and recent completions into one list.
- Reframe Overview into Today. Keep metrics, but subordinate them to operator attention: what is waiting, what is running, what is blocked, what just finished.
- Turn queue entries and approvals into the same card system. Each card should show source, summary, exact action, expiry, confidence/risk, and jump-to-context.
- Make trust mode a visible global control in the header, not just an implicit backend policy. Claude Code is right about visible trust posture.
- Build a unified Work Item Detail by composing existing session transcript, queue state, approval history, and task timeline. Do not create another disconnected ledger.

The natural implementation seams are already there: navigation.ts:4, app-view-state.ts:41, chat.ts, overview.ts, app-gateway.ts:428, queue.md:8, and tasks.md:10. That is why I would treat this as a product recomposition project first, not a backend invention project.
