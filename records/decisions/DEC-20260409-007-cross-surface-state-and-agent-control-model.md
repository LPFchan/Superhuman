# DEC-20260409-007: Cross-Surface State And Agent Control Model

Opened: 2026-04-09 19-54-56 KST
Recorded by agent: 019d6f5a-4b00-7390-a9c6-4527c1baa692

## Metadata

- Status: accepted
- Deciders: operator, orchestrator
- Related ids: RSH-20260409-007, LOG-20260409-011

## Decision

Adopt a cross-surface state model where:

- every desktop or mobile generic chat receives an `agent-id`, even if the chat never touches a repo
- `agent-id` identifies one user-facing agent conversation
- `run-id` identifies one bounded execution episode inside an agent conversation
- one agent conversation may contain multiple runs over time
- subagents receive their own `agent-id` and retain lineage to the host agent
- host agents monitor, grade, and integrate subagent output by default
- subagents do not silently commit by default
- capture packets are mutable off-Git bundles around raw input until handed off, routed, discarded, or absorbed
- first responders capture and hand off; project orchestrators interpret in repo context and decide routing
- approvals live off-Git first; only meaningful approval consequences are reflected into repo artifacts
- raw execution history is retained indefinitely by default as off-Git operational memory, with export, redaction, compaction, hard delete, and periodic secret redaction
- desktop and mobile share live-synced chat, run, approval, status, and project-context state
- messenger remains channel-native and does not automatically appear as a desktop generic-chat session

Adopt this product-level agent control vocabulary:

- `steer`
- `interrupt`
- `stop`
- `resume`
- `revert`
- `fork`
- `handoff`

## Context

Superhuman needs one shared runtime state model before desktop, mobile, and messenger surfaces hard-code different assumptions.

The operator wants low-friction generic chat, project-bound chats, agent operation, subagents, mobile monitoring, mobile approvals, messenger capture, and repo-native truth. Those can coexist only if conversation identity, execution identity, capture identity, and durable repo artifact identity stay separate.

## Options Considered

### Use Project As The Only Primary State Object

- Upside: simple product thesis
- Downside: loses continuity for generic chats, messenger-originated thoughts, and conversations before project triage

### Use Chat Session As The Only Primary State Object

- Upside: conversational continuity is easy
- Downside: repo truth, runs, approvals, commits, capture packets, and subagent lineage become buried in transcript semantics

### Use Agent-Id As Both Conversation And Run Identity

- Upside: fewer IDs
- Downside: one conversation can contain multiple bounded execution episodes; monitoring, retry, stop, and grading need a more precise execution boundary

### Keep A State Graph With Agent Conversations, Runs, Capture Packets, Raw Events, Approvals, Repo Artifacts, And Projects

- Upside: preserves conversational continuity without losing execution provenance
- Upside: lets generic chats become project-bound later
- Upside: lets mobile and desktop sync live state while messenger remains channel-native
- Downside: requires disciplined UI so internal state does not become visible complexity

## Rationale

The chosen model keeps the operator experience simple without flattening important runtime distinctions. `agent-id` gives every conversation a durable lookup identity. `run-id` gives each execution attempt an inspectable boundary. Capture packets keep first responders lightweight. Repo artifacts keep accepted truth and durable memory in Git. Project orchestrators, not first responders or messenger channels, make repo-contextual routing decisions.

The control vocabulary also matches the operator's mental model better than low-level process controls: steer the agent, interrupt it, stop it, resume it, revert its changes, fork a branch of work, or hand it off.

## Consequences

- Desktop and mobile generic chats must get `agent-id`s.
- Runtime implementation should introduce or preserve `run-id` as separate from `agent-id`.
- UI should show compact timeline events for important approvals, commits, decisions, routed capture packets, subagent results, host grades, and commit-history links inside relevant conversations.
- Subagent commit authority must be explicit if ever granted.
- Commit creation normally belongs to an authorized host, worker, orchestrator, or operator flow after reviewing subagent output.
- Approval records should be runtime objects first; durable repo artifacts should summarize approval consequences only when they affect execution history, decisions, plans, status, spec, or upstream outcomes.
- Full transcripts, terminal streams, tool outputs, notifications, screenshots, uploads, approval clicks, and raw events are retained off-Git indefinitely by default, but they are operational memory and must remain redaction/deletion/compaction capable.
- Tool-call IDs, message IDs, approval IDs, and notification IDs may exist internally but are not stable operator-facing artifact IDs by default.
- Exact DB schema, live-sync transport, event-log implementation, safe-point mechanics, and fork/handoff implementation remain later design work.
