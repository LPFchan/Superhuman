# Superhuman Architecture Draft

## Executive Summary

Superhuman should be built as a Claude-code-enriched OpenClaw core, hardened with selected Hermes runtime patterns.

That means:

- OpenClaw provides the shell: gateway, session topology, channels, plugin model, and assistant-environment framing.
- Claude Code provides the capability jump: context management, proactive loops, multi-agent orchestration, scheduled execution, remote execution, team memory, and advanced lifecycle automation.
- Hermes provides the hardening layer: clearer agent-loop discipline, stronger local state, memory snapshot semantics, hook structure, and capability-bundle design.

The target is not a coding CLI with extras. The target is a persistent assistant operating environment that can think, act, schedule, coordinate, remember, and safely operate across local, remote, and multi-agent contexts.

## Design Principles

1. Environment-first, not prompt-first.

Superhuman should treat the assistant environment as the primary object: sessions, channels, files, tasks, schedules, remote runtimes, and memory all belong to one operating environment.

2. Autonomous, but inspectable.

Every proactive or background action should be attributable, searchable, reversible where possible, and visible through logs, state, or timeline views. This includes compaction, verification, persisted previews, partial reads, and worker fan-out, not just user-visible task outcomes.

3. Capability layering.

The architecture should separate platform shell, runtime core, memory, orchestration, automation, and execution surfaces so each can evolve independently. Safety, quality, and completion guarantees should live in runtime policy and observable state, not only in hidden prompt wording.

4. Safe degradation.

When proactive, remote, or high-autonomy features fail, the system should degrade to a usable assistant, not collapse into undefined behavior.

5. Stable local core, optional cloud plane.

The local operating model should remain valuable on its own. Remote and cloud execution should extend the system, not define it.

## Source-of-Truth Mapping

### Base platform from OpenClaw

- Gateway and control-plane architecture.
- Session identity and environment framing.
- Channel-centric assistant posture.
- Plugin-oriented subsystem extension.
- Session-aware sandbox topology.

### Capability ports from Claude Code

- Context management: autocompact, reactive compact, context collapse.
- Automatic memory extraction and background consolidation.
- Proactive and assistant loop primitives.
- Multi-agent coordinator and worker runtime.
- Cross-session messaging and inbox semantics.
- Durable local scheduling and remote scheduled agents.
- Remote session protocol and cloud execution model.
- Team memory sync.
- Computer-use MCP integration, if desired.

### Hardening ports from Hermes

- Clearer agent-loop budgeting and execution discipline.
- SQLite-backed local state index and FTS search.
- Frozen prompt-snapshot memory semantics.
- Lightweight hook system.
- Capability-bundle toolset composition.
- Cleaner provider and backend abstraction boundaries.

## Target Architecture

## 1. Platform Shell

Purpose:

Provide the durable assistant environment: gateway, sessions, channels, workspace boot, plugin loading, and environment ownership.

Port source:

- Primary: OpenClaw.
- Supporting ports: selected Claude Code remote and channel features.

Key responsibilities:

- Session naming and role assignment.
- Channel registration and message routing.
- Workspace boot and startup automation.
- Plugin loading and environment-level configuration.
- High-level sandbox mode selection.

End goal:

Superhuman can live as a persistent assistant environment rather than a single interactive process.

Success indicators:

- A workspace can boot into a known assistant state.
- Channels, sessions, and plugins resolve consistently.
- Main versus non-main session behavior is explicit and testable.
- The environment can survive process restarts without semantic drift.

Module success definition:

- End goal: Persistent assistant environment.
- Done when: Boot, sessions, channels, plugins, and sandbox roles survive restarts and behave predictably.

## 2. Agent Runtime Core

Purpose:

Run the core agent loop safely and predictably across interactive, proactive, scheduled, and remote contexts.

Port source:

- Primary: Hermes execution discipline.
- Supporting: Claude Code query lifecycle and tool orchestration.

Key responsibilities:

- Iteration budgets.
- Tool-call batch safety.
- Destructive-command heuristics.
- Post-edit verification policy.
- Consistent interrupt and cancellation handling.
- Input and transcript sanitization.
- Structured propagation of partial-read and partial-result metadata.
- Semantic-versus-text tool capability awareness.
- Tool execution concurrency policy.

End goal:

Superhuman has a runtime core that remains understandable and safe even as autonomy increases.

Success indicators:

- Autonomous loops cannot spin indefinitely without budget accounting.
- Unsafe command patterns are intercepted before execution.
- Parallel tool execution is deterministic under policy.
- The system never reports success without recording whether verification ran and what passed or failed.
- Partial tool evidence is explicitly marked and never silently treated as complete evidence.
- Transcript replay does not degrade from corrupted or unsafe message content.

Module success definition:

- End goal: Safe, understandable execution.
- Done when: Tool execution is bounded, parallelism is controlled, and unsafe actions are intercepted.

## 3. Context and Conversation Management

Purpose:

Let long-lived sessions stay useful under heavy context growth.

Port source:

- Primary: Claude Code.

Key responsibilities:

- Autocompact thresholds.
- Reactive fallback on overflow.
- Context collapse and replayable summary commits.
- Overflow recovery paths.
- Operator-visible compaction events.
- Restored-file and dropped-span accounting.
- Partial-read provenance through collapse and replay.
- Manual compaction entry points for operators.

End goal:

Superhuman can operate across long-running coding and assistant sessions without context collapse turning into quality collapse.

Success indicators:

- Long sessions remain operational without frequent manual resets.
- Overflow events recover automatically in most cases.
- Context history remains inspectable after summarization, with provenance for collapsed, restored, imported, and partial content.
- Context management behavior is observable in logs and UI.

Module success definition:

- End goal: Long-session quality retention.
- Done when: Multi-hour sessions remain coherent without repeated manual resets.

## 4. Memory System

Purpose:

Combine modular memory storage, durable extraction, shared team memory, and stable prompt behavior.

Port source:

- Base storage shape: OpenClaw pluginized memory.
- Automation and consolidation: Claude Code.
- Prompt-stability semantics: Hermes.

Key responsibilities:

- File-backed memory storage.
- Automatic end-of-turn extraction.
- Background consolidation and dreaming.
- Repo-shared team memory sync.
- Frozen prompt snapshot during active session.
- Provenance preservation for truncated, partial, or preview-derived evidence.
- Injection and secret scanning on memory writes.

End goal:

Superhuman learns continuously without turning memory into an unstable prompt side channel.

Success indicators:

- Valuable memories are extracted without manual prompting.
- Shared repo memory syncs safely.
- Memory writes do not destabilize active prompt caching.
- Memory extraction and consolidation do not silently upgrade partial evidence into authoritative memory without attribution.
- Dangerous memory content is rejected automatically.

Module success definition:

- End goal: Continuous durable learning.
- Done when: Useful memories accumulate automatically without destabilizing active prompts.

## 5. Orchestration Layer

Purpose:

Support team-lead, worker, subagent, and cross-session collaboration patterns.

Port source:

- Primary: Claude Code.
- Supporting: Hermes delegation concepts.

Key responsibilities:

- Coordinator persona.
- In-process workers.
- Out-of-process workers.
- Cross-session messaging.
- Permission relay and approval flow.
- Worker cap and queue policy.
- Spawn-budget accounting.
- Task notifications, worker lifecycle, and status aggregation.

End goal:

Superhuman can coordinate multiple agents as one coherent working system, not just spawn isolated subprocesses.

Success indicators:

- Workers can be launched, continued, stopped, and resumed cleanly.
- Permission approvals can be delegated and routed.
- Cross-session messages arrive reliably and are attributable.
- Worker fan-out remains bounded and inspectable under load.
- Multi-agent work improves throughput without destroying operator visibility.

Module success definition:

- End goal: Multi-agent teamwork.
- Done when: Workers can coordinate real tasks with observable lifecycle and approvals.

## 6. Automation Layer

Purpose:

Move from reactive assistance to controlled proactive behavior.

Port source:

- Primary: Claude Code KAIROS and proactive surfaces.
- Supporting: OpenClaw boot and channel model.

Key responsibilities:

- Proactive ticks.
- Scheduled local tasks.
- Scheduled remote tasks.
- Boot-time checks.
- Notification and file-delivery actions.
- PR subscriptions and event-driven follow-ups.
- Automation logging with provenance and evidence links.

End goal:

Superhuman behaves like a persistent operator that notices, acts, and reports, rather than waiting for prompts.

Success indicators:

- The assistant can wake itself, decide to act, and record why.
- Scheduled tasks survive restarts when intended.
- Remote triggers execute with correct repo and environment context.
- Notifications and action logs are visible, attributable, and linked to the verification, compaction, and artifact evidence they depended on.

Module success definition:

- End goal: Useful autonomy.
- Done when: The system can notice and act without prompts, while producing clear logs and notifications.

## 7. Execution Surfaces

Purpose:

Unify local, remote, scheduled, and optionally computer-use execution behind one model.

Port source:

- Local and gateway shell: OpenClaw.
- Remote and cloud session model: Claude Code.
- Backend abstraction discipline: Hermes.

Key responsibilities:

- Local interactive execution.
- Local background execution.
- Remote and cloud execution.
- Session ingress and event transport.
- Environment capability negotiation, including semantic code-tool support.
- Optional computer-use surface.
- Provider and backend abstraction.

End goal:

Superhuman can run the same assistant behavior across different environments without splitting into separate products.

Success indicators:

- Local and remote sessions behave like the same assistant with different execution planes.
- Scheduled remote jobs can be created and inspected from the same control plane.
- Rename and refactor safety depends on explicit host capabilities, not on assuming generic search is sufficient.
- Provider or backend swaps do not require core logic rewrites.

Module success definition:

- End goal: One assistant across planes.
- Done when: Local, remote, scheduled, and optional UI-control modes share policy and identity.

## 8. Local State and Observability

Purpose:

Make the assistant inspectable, searchable, and debuggable.

Port source:

- Primary: Hermes SQLite state model.
- Supporting: Claude Code analytics, task state, and append-only logs.

Key responsibilities:

- Transcript storage.
- FTS search.
- Token and cost tracking.
- Task and action history.
- Verification history and evidence artifacts.
- Compaction event history.
- Persisted-preview and full-output provenance.
- Partial-read and truncation event history.
- Worker fan-out and child-budget history.
- Append-only memory and action logs.
- Failure and recovery visibility.

End goal:

Superhuman should be operable like infrastructure, not opaque like a chatbot.

Success indicators:

- Sessions and actions are queryable after the fact.
- Costs and token usage are attributable.
- Background and proactive actions are visible in searchable history.
- Failures can be debugged from stored evidence rather than guesswork.

Module success definition:

- End goal: Operable system.
- Done when: Sessions, costs, actions, and failures are searchable and explainable.

## Integration Order

Detailed implementation playbooks now live in [port/README.md](port/README.md). The main architecture document keeps the phase ordering and dependency logic, while the `port/` docs hold agent-ready execution detail.

### Phase 1: Establish the shell

Focus:

- Freeze the OpenClaw shell behavior and add the first durable local-state substrate.
- Define the internal session, channel, plugin, state, and context seams before importing Claude-style runtime behavior.

Execution doc:

- [port/01-establish-the-shell.md](port/01-establish-the-shell.md)

### Phase 2: Harden the runtime core

Focus:

- Introduce a single runtime loop contract with budgeting, tool-batch policy, command risk gating, and unified cancellation.
- Make all execution modes share one execution engine before memory and autonomy work lands.

Execution doc:

- [port/02-harden-the-runtime-core.md](port/02-harden-the-runtime-core.md)

### Phase 3: Bring in Claude context and memory intelligence

Focus:

- Add real context-pressure accounting, compaction, collapse, extraction, consolidation, and safe shared memory sync.
- Keep memory prompt behavior stable by applying Hermes-style snapshot semantics.

Execution doc:

- [port/03-context-and-memory.md](port/03-context-and-memory.md)

### Phase 4: Add orchestration and messaging

Focus:

- Introduce lead, worker, subagent, and remote-peer roles with durable mailbox transport and permission relay.
- Normalize worker lifecycle, task notifications, and approval history before adding more automation.

Execution doc:

- [port/04-orchestration-and-messaging.md](port/04-orchestration-and-messaging.md)

### Phase 5: Add proactive and scheduled automation

Focus:

- Port proactive wake loops, durable scheduling, remote scheduled agents, and notification surfaces.
- Keep every autonomous trigger attributable through structured logs and visible action history.

Execution doc:

- [port/05-proactive-and-scheduled-automation.md](port/05-proactive-and-scheduled-automation.md)

### Phase 6: Add optional high-autonomy execution surfaces

Focus:

- Add remote-first execution, permission bridging, environment capability negotiation, and optional computer-use support.
- Finalize provider and backend abstraction only after the main runtime, memory, orchestration, and automation layers are stable.

Execution doc:

- [port/06-high-autonomy-execution-surfaces.md](port/06-high-autonomy-execution-surfaces.md)

## Final Target State

The finished Superhuman system should feel like this:

- OpenClaw's environment and gateway model defines where the assistant lives.
- Claude Code's advanced runtime and hidden assistant features define what it can do.
- Hermes' hardening patterns define how reliably and cleanly it does it.

The result is a persistent assistant operating system for technical work: one that can boot into context, coordinate agents, manage memory, survive long sessions, schedule its own work, use remote execution when needed, and remain inspectable enough to trust.
