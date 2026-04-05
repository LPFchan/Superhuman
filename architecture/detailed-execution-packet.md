# Detailed Execution Packet

This document consolidates the former `01` through `06` phase execution docs into one active execution packet.

Use this file as the detailed implementation companion to:

- `architecture/product-migration-plan.md` for migration-governance sequencing and status
- `architecture/superhuman-architecture-technical.md` for the target-system architecture summary
- `architecture/superhuman-architecture-simple.md` for the plain-English build order

The former per-phase packets are retained under `architecture/archive/` as historical snapshots.

## How To Use This Packet

1. Read the phase sections in order.
2. Treat earlier phases as hard dependencies for later ones unless a section explicitly states otherwise.
3. Preserve the execution rules and deliverable standards at the end of this file across all sections.

## Phase 1: Establish the shell

Objective:

Create a stable host environment with clean persistence and clear internal seams before importing runtime intelligence.

Depends on:

- Nothing earlier. This is the compatibility baseline for all later work.

Repo-local target areas:

- `src/gateway/boot.ts`
- `src/gateway/assistant-identity.ts`
- `src/agents/sandbox/`
- `src/plugin-sdk/`
- `src/sessions/`
- `src/bootstrap/`
- new local state area under `.superhuman/` or equivalent project-local path

Primary module ownership after shell modularization:

- Own `src/superhuman/state/super-state-db.ts` as the durable SQLite substrate and schema/bootstrap boundary.
- Own `src/superhuman/state/super-state-sessions.ts` as the canonical home for session, message, action, and artifact persistence.
- Own `src/superhuman/runtime/super-shell-runtime.ts` as the shell-facing composition layer for registries, boot checks, and persistence wiring.
- Keep `src/superhuman/super-state-store.ts` and `src/superhuman/super-gateway-runtime.ts` thin. They are composition surfaces, not the place to re-centralize later-phase behavior.
- Keep the substrate split intact too: schema/bootstrap belongs in `src/superhuman/state/super-state-schema.ts`, prepared statements in `src/superhuman/state/super-state-statements.ts`, and shared row or JSON helpers in `src/superhuman/state/super-state-shared.ts`.

Implementation scope:

1. Freeze the OpenClaw shell as the initial compatibility target.

- Keep the existing gateway boot flow, session-key model, channel registration, plugin discovery, and sandbox status logic intact.
- Do not import proactive or worker behavior yet.
- Limit behavior changes to additive instrumentation and storage hooks.

2. Introduce the Superhuman local state substrate from Hermes.

- Add a SQLite database under a deterministic project-local path such as `.superhuman/state.db`.
- Start with four tables only: `sessions`, `messages`, `actions`, `artifacts`.
- Add FTS5 indexing only for message content in this phase.
- Store normalized message text, session metadata, and action summaries, not every raw tool payload.
- Make `actions` capable of storing verification attempts, compaction decisions, worker-spawn events, and capability-negotiation outcomes.
- Make `artifacts` capable of storing persisted-preview/full-output relationships, verification logs, and partial-read descriptors.

3. Add a shell-facing persistence adapter.

- Implement a `SessionPersistenceAdapter` that receives OpenClaw session lifecycle events and writes normalized rows into SQLite.
- Make the adapter write-through and idempotent.
- Tolerate duplicate session-start and session-end events.
- Keep the existing OpenClaw session store authoritative for routing during this phase.
- Extend the adapter contract so transcript imports, transcript updates, and cross-session provenance can be persisted without relying on assistant prose.

4. Define the first stable internal interfaces.

- `SessionRegistry`: resolve current session, main session, and agent session identity.
- `ChannelRegistry`: resolve inbound and outbound channel bindings.
- `PluginRegistry`: enumerate loaded plugins and capabilities.
- `WorkspaceBootstrap`: run startup automation and boot-time checks.
- `StateStore`: append and query normalized local state.

5. Add the smallest useful Claude-facing compatibility layer.

- Introduce a `ConversationWindow` abstraction exposing ordered messages, approximate token count, latest assistant turn ID, and latest user turn ID.
- Introduce a `ContextPressureSnapshot` exposing estimated input tokens, effective model context limit, remaining budget, an overflow-risk flag, and persisted compaction-event references.
- Introduce a no-op `CompactionManager` interface with `getSnapshot()`, `shouldCompact()`, `compact()`, and `recoverFromOverflow()`.
- Add capability flags to the compatibility layer for semantic symbol operations and workspace-search-only fallbacks.
- Require the shell-facing interfaces to preserve partial-read, persisted-preview, and imported-history provenance as structured metadata.
- Do not implement real compaction yet. The goal is to create the seam so later Claude ports do not force a shell rewrite.

Implementation notes:

- New state writes should be append-first and replayable.
- Boot and routing behavior must remain source-compatible with the existing shell.
- Session identity drift is a blocker for closing this phase.
- This phase is where hidden runtime facts become visible state. If a later phase depends on verification status, worker lineage, preview/full artifact relationships, or partial-read provenance, the storage seam must already exist here.
- Compatibility caveat: missing behavior should be added as a typed capability or documented core seam, not via private reach-ins around plugin runtime, registry ownership, or channel/provider internals.
- Nomenclature policy: when this phase introduces Superhuman-owned files, modules, services, or helper APIs, give them explicit `super-*` / `Super*` names. Keep generic names only for shared OpenClaw or public contract surfaces that intentionally remain cross-system seams.
- Slot policy caveat: keep `plugins.slots.contextEngine` defaulting to `super-context`, while retaining `legacy` as an explicit compatibility option until shared ecosystem dependencies are gone.

Source extraction map:

- OpenClaw shell and boot lifecycle:
  - `openclaw-audit/src/gateway/boot.ts:35-59` for `BOOT_FILENAME` and boot file loading semantics.
  - `openclaw-audit/src/gateway/boot.ts:138-192` for `runBootOnce(...)`, especially the session snapshot, boot invocation, and mapping restore flow.
- OpenClaw sandbox and session topology:
  - `openclaw-audit/src/agents/sandbox/runtime-status.ts:50-88` for `resolveSandboxRuntimeStatus(...)`.
  - `openclaw-audit/src/agents/sandbox/runtime-status.ts:137-186` for user-facing sandbox policy reasoning and remediation formatting.
- OpenClaw plugin framing:
  - `openclaw-audit/src/plugin-sdk/plugin-entry.ts:137` for `definePluginEntry(...)` as the plugin entry contract.
- Hermes local state substrate:
  - `hermes-agent-audit/hermes_state.py:116-159` for `class SessionDB` initialization, WAL setup, and schema ownership.
  - `hermes-agent-audit/hermes_state.py:363-382` for `create_session(...)` as the baseline session-write API.
  - `hermes-agent-audit/hermes_state.py:420-487` for `update_token_counts(...)` and session accounting semantics.
- Claude-facing seam to define now but not fully implement:
  - `claude-code/query/config.ts:29-42` for `buildQueryConfig()` and the shape of per-query immutable config.
  - `claude-code/services/compact/autoCompact.ts:72-90` for `getAutoCompactThreshold(...)` as the minimal threshold interface the shell should prepare for.

Deliverables:

- A deterministic local SQLite state store.
- A persistence adapter wired to the existing shell lifecycle.
- Stable registry interfaces for sessions, channels, plugins, bootstrap, and state.
- Context-management seam types defined and reachable from the shell.
- Capability advertisement and provenance-bearing shell interfaces for later semantic-tool, compaction, and artifact work.

Exit criteria:

- Workspace boot, session routing, and plugin loading behave exactly as before.
- SQLite state exists and is populated for every new session and message.
- Restarting the process does not corrupt session identity or duplicate durable state.
- The new context interfaces exist and are wired even though compaction remains a stub.
- Verification events, preview/full artifact links, partial-read markers, and capability flags have a durable home in state even if later phases do not use them yet.

Out of scope:

- Real compaction logic.
- Multi-agent orchestration.
- Proactive behavior.
- Remote execution semantics beyond preserving existing shell behavior.

## Phase 2: Harden the runtime core

Objective:

Make all execution modes share one safe runtime contract before adding memory and autonomy.

Depends on:

- [Phase 1](#phase-1-establish-the-shell)

Repo-local target areas:

- `src/runtime.ts`
- `src/gateway/call.ts`
- `src/gateway/chat-abort.ts`
- `src/gateway/chat-sanitize.ts`
- `src/process/`
- `src/security/`
- `src/sessions/`
- local state tables and adapters introduced in Phase 1

Primary module ownership after shell modularization:

- Own `src/superhuman/state/super-state-runtime.ts` as the durable store surface for runtime invocations, stage events, iteration budgets, and abort state.
- Own the Superhuman runtime-core modules that project into that store, including `src/superhuman/super-agent-runtime.ts`, `src/superhuman/super-tool-batch-planner.ts`, `src/superhuman/super-command-risk-classifier.ts`, `src/superhuman/super-runtime-verification.ts`, and `src/superhuman/super-transcript-hygiene.ts`.
- Extend Phase 1 composition seams additively; do not move runtime-core behavior back into `src/superhuman/super-state-store.ts` or `src/superhuman/super-gateway-runtime.ts`.
- If Phase 2 needs more durable state, add it to `src/superhuman/state/super-state-runtime.ts` or a new Phase 2-owned sibling module first. Do not widen `src/superhuman/state/super-state-db.ts` back into a mixed schema-plus-runtime file.

Implementation scope:

1. Replace the ad hoc agent loop contract with an explicit runtime loop API.

- Introduce an `AgentRuntime` service responsible for one turn of model execution.
- Split the loop into explicit stages: prompt assembly, model call, tool planning, tool execution, verification planning, verification execution, post-tool continuation, terminal response.
- Emit structured state-store events at each stage boundary.
- Require terminal success to record a verification outcome of `verified`, `not_verifiable`, or `verification_failed` when code-editing tools ran.

2. Port Hermes-style iteration budgeting.

- Add an `IterationBudget` object per runtime invocation.
- Track maximum iterations, used iterations, refunded iterations, and exhaustion reason.
- Give tool-driven subagents independent child budgets with configurable caps.
- Persist child-budget inheritance, spawn count, concurrency slot, and queue delay for spawned workers.
- Treat `execute_code`-style programmatic tool calls as refundable work rather than full model turns.

3. Port tool batch safety classification.

- Add tool metadata flags: `never_parallel`, `parallel_safe`, `path_scoped`, `interactive_only`, `destructive_possible`.
- Implement a `ToolBatchPlanner` that decides between concurrent and sequential execution.
- Allow `path_scoped` concurrency only when target scopes do not overlap.
- Distinguish `text_search`, `symbol_reference`, `symbol_rename`, `workspace_navigation`, `partial_reading`, and `persisted_preview` capability classes so the planner can make semantics-aware decisions instead of treating all search or read tools as equivalent.

4. Port command-safety heuristics.

- Add a `CommandRiskClassifier` for shell and process tools.
- Detect destructive deletion patterns, overwrite redirection, dangerous `git reset/clean/checkout` usage, and home-directory secret access patterns.
- Gate risky actions before execution. Do not attempt advanced remediation in this phase.

5. Add transcript hygiene and message sanitization.

- Normalize invalid Unicode and lone surrogate code points before model submission.
- Strip transient runtime warnings from replayed history.
- Separate turn-local annotations from replay-safe transcript content.
- Preserve verification status, partial-read metadata, preview/full-output provenance, and imported-history provenance as structured replay-safe annotations rather than flattening them into plain text.

6. Unify interrupt and cancellation semantics.

- Introduce an `AbortGraph` or equivalent cancellation tree.
- Derive main runtime, tool execution, worker sessions, and scheduled invocations from that shared abstraction.

Implementation notes:

- Runtime-stage event emission should become the default debugging path for later phases.
- Budget and cancellation state must be inspectable from local state, not only in memory.
- Command-safety gating must fail closed for clearly destructive actions.
- Completion reporting is part of the runtime contract, not a style preference. If the runtime cannot verify edited code, that fact must be persisted and exposed in the terminal state.
- Partial tool evidence must never be silently upgraded into complete evidence for summaries, verification, or final completion reports.
- Compatibility caveat: when runtime behavior is missing, add it as a typed capability or documented core seam instead of bypassing plugin runtime, registry ownership, or channel/provider boundaries with private reach-ins.
- Nomenclature policy: runtime-core code that is Superhuman-specific should use explicit `super-*` / `Super*` naming for files and local APIs. Preserve generic names only where the surface is intentionally shared with OpenClaw or exposed as a stable public contract.
- Slot policy caveat: runtime evolution should assume `super-context` is the default engine and `legacy` remains an explicit compatibility fallback, not a removed pathway.

Source extraction map:

- Hermes runtime loop discipline:
  - `hermes-agent-audit/run_agent.py:170-205` for `IterationBudget`.
  - `hermes-agent-audit/run_agent.py:270-312` for `_should_parallelize_tool_batch(...)`.
  - `hermes-agent-audit/run_agent.py:443-563` for `class AIAgent` constructor shape and runtime ownership.
- Hermes message and transcript hygiene:
  - `hermes-agent-audit/run_agent.py:335-441` for surrogate sanitization and replay cleanup helpers.
- Claude runtime staging and orchestration:
  - `claude-code/query.ts:295` for `buildQueryConfig()` consumption at query entry.
  - `claude-code/query.ts:1267` for stop-hook integration in the loop tail.
  - `claude-code/query/stopHooks.ts:65-155` for post-turn background lifecycle handling.
- Claude proactive activation boundary:
  - `claude-code/main.tsx:2197-2206` for proactive-mode prompt injection and activation conditions.
  - `claude-code/cli/print.ts:3876-3889` for runtime proactive toggling through control requests.

Deliverables:

- A first-class runtime service with explicit stages.
- Iteration budget enforcement and child-budget propagation.
- A tool batch planner and risk classifier wired into execution.
- Sanitized replayable transcripts and unified cancellation semantics.
- Structured verification outcomes and structured partial-result metadata carried through the runtime.

Exit criteria:

- Interactive, background, scheduled, and remote executions use the same runtime stages.
- Infinite or runaway tool loops terminate by budget, not by accident.
- Tool batches execute deterministically under declared policy.
- Unsafe shell actions are classified before execution.
- Replayed history is stable and free of turn-local garbage.
- Successful code-editing runs cannot be reported without a recorded verification outcome.
- Rename and refactor planning can tell when only text-search capability is available.

Out of scope:

- Context compaction and collapse.
- Memory extraction and consolidation.
- Multi-agent mailbox transport.
- Proactive scheduling behavior.

## Phase 3: Context and memory

Objective:

Give Superhuman long-session durability and useful long-term memory without destabilizing prompts or operator trust.

Depends on:

- [Phase 1](#phase-1-establish-the-shell)
- [Phase 2](#phase-2-harden-the-runtime-core)

Repo-local target areas:

- `extensions/memory-core/index.ts`
- `extensions/memory-core/src/`
- `src/context-engine/`
- `src/gateway/cli-session-history.ts`
- `src/sessions/`
- local state store introduced in Phase 1
- new context-compaction and collapse services if the existing tree has no natural home yet

Primary module ownership after shell modularization:

- Own `src/superhuman/state/super-state-context.ts` as the durable home for context-pressure snapshots, compaction or collapse diagnostics, and team-memory sync state.
- Own `src/superhuman/runtime/super-context-services.ts` as the gateway-facing assembly point for context and compaction services.
- Own the surrounding context and memory modules, including `src/superhuman/super-compaction-manager.ts`, `src/superhuman/super-context-pressure.ts`, and the Superhuman context-engine integrations that sit above the Phase 1 shell seam.
- Add new context durability through `src/superhuman/state/super-state-context.ts` or a new Phase 3-owned sibling module, not by stuffing more mixed concerns back into `src/superhuman/state/super-state-db.ts`.

Implementation scope:

1. Implement real context-pressure accounting.

- Back `ContextPressureSnapshot` with actual token estimation.
- Compute total estimated input tokens, reserved output budget, effective context window, autocompact threshold, and hard blocking threshold.
- Persist each snapshot at turn boundaries so context failures are debuggable later.
- Persist compaction and collapse event payloads alongside the snapshot: threshold used, recovery mode, restored artifacts, and dropped spans.

2. Port autocompact and reactive compaction.

- Compact proactively when the threshold is crossed before a model call.
- Compact reactively after provider overflow or `prompt_too_long` errors.
- Add a circuit breaker that stops repeated doomed compaction attempts after a bounded number of failures.
- Require the operator-visible result to say whether the model is now working from original content, collapsed content, restored files, or a mixed state.

3. Port context collapse as a separate subsystem.

- Maintain a collapse store with committed summaries, staged spans, and replay metadata.
- Project the visible conversation view at read time instead of destructively rewriting the main log.
- Drain staged collapse spans before falling back to reactive compact.
- Carry forward partial-read, persisted-preview, and imported-history provenance so collapse cannot silently make partial evidence look complete.

4. Build the memory pipeline in three layers.

- Storage: keep OpenClaw-style pluginized file-backed memory storage and retrieval.
- Extraction: port Claude end-of-turn extraction as a forked subagent restricted to approved memory roots.
- Prompt semantics: apply Hermes frozen-snapshot rules so memory prompt content stays fixed for the active session unless policy explicitly refreshes it.
- Require extraction and consolidation to preserve source provenance for truncated, partial, preview-derived, or collapsed evidence instead of flattening it into authoritative memory.

5. Implement AutoDream-style consolidation.

- Add a background consolidator that scans sessions touched since the last consolidation point.
- Run it on time and session-count gates, not every turn.
- Constrain writes to memory roots and exploration outside them to read-only.
- Record touched files and emit a visible completion summary.
- Refuse to treat preview-only or partial-read evidence as equivalent to fully read source content during consolidation.

6. Add team memory sync only after local memory is stable.

- Implement repo-scoped shared memory with pull, push, hash-based delta uploads, conflict retry on checksum mismatch, and secret scanning before upload.
- Store sync metadata in local state for auditability.

Implementation notes:

- Treat compaction and collapse as operator-visible system behavior, not invisible prompt rewriting.
- Extraction and consolidation must be sandboxed more tightly than the main assistant.
- Memory stability is a release blocker for later proactive features.
- Replay must remain provenance-aware: original, imported, collapsed, restored, partial, and preview-derived states must remain distinguishable in stored history.
- Compatibility caveat: if the OpenClaw ecosystem needs new context or memory behavior, add it through typed context-engine or runtime capability seams rather than private reach-ins around plugin runtime or registry ownership.
- Nomenclature policy: Superhuman-owned context, memory, compaction, and collapse modules introduced here should use explicit `super-*` / `Super*` names, while shared context-engine or plugin-contract seams keep their generic naming.
- Slot policy caveat: `super-context` should remain the default slot target, with `legacy` preserved as an opt-in compatibility path while shared runtime callers still rely on it.

Source extraction map:

- Claude context pressure and compaction:
  - `claude-code/services/compact/autoCompact.ts:72-90` for threshold calculation.
  - `claude-code/query.ts:441-446` for `applyCollapsesIfNeeded(...)` call timing.
  - `claude-code/query.ts:1094-1108` for `recoverFromOverflow(...)` collapse-drain behavior.
- Claude extraction and dream pipeline:
  - `claude-code/services/extractMemories/extractMemories.ts:527-598` for extraction runner and `executeExtractMemories(...)` export.
  - `claude-code/query/stopHooks.ts:149-155` for extraction and dream dispatch points.
  - `claude-code/services/autoDream/autoDream.ts:122-193` for `initAutoDream()` and the gated scheduling logic.
  - `claude-code/services/autoDream/autoDream.ts:319-323` for `executeAutoDream(...)` entrypoint.
- Claude KAIROS memory semantics:
  - `claude-code/memdir/memdir.ts:319-348` for assistant-mode daily append-only memory log prompt.
  - `claude-code/memdir/memdir.ts:432-437` for KAIROS-specific daily-log mode activation.
- OpenClaw memory storage model:
  - `openclaw-audit/extensions/memory-core/index.ts:1-31` for plugin registration, memory runtime, prompt section, and CLI registration.
  - `openclaw-audit/extensions/memory-core/index.ts:32-53` for `memory_search` and `memory_get` tool registration.
- Hermes prompt-stability and memory safety rules:
  - `hermes-agent-audit/tools/memory_tool.py:42-75` for delimiter and threat-scan setup.
  - `hermes-agent-audit/tools/memory_tool.py:75-92` for `_scan_memory_content(...)`.
  - `hermes-agent-audit/tools/memory_tool.py:93-121` for the frozen snapshot design in `MemoryStore`.
- Claude team memory sync:
  - `claude-code/services/teamMemorySync/index.ts:121-128` for `createSyncState()`.
  - `claude-code/services/teamMemorySync/index.ts:770-806` for `pullTeamMemory(...)`.
  - `claude-code/services/teamMemorySync/index.ts:889-1004` for `pushTeamMemory(...)` delta and conflict flow.

Deliverables:

- Real context-pressure snapshots and persisted diagnostics.
- Proactive compaction, reactive compaction, and replayable collapse.
- A three-layer memory pipeline with extraction and stable prompt semantics.
- Background consolidation and audited team-memory sync.
- Provenance-preserving summaries and memory extraction that do not launder partial evidence into unqualified memory.

Exit criteria:

- Multi-hour sessions remain usable without manual resets.
- Overflow events recover through compaction or collapse most of the time.
- Memory extraction adds useful durable state with low operator intervention.
- Background consolidation improves memory structure without mutating unrelated state.
- Team memory sync converges safely across collaborators and rejects secret-bearing files.
- Operators can tell which summary and memory facts came from full reads versus partial, preview-derived, imported, or collapsed context.

Out of scope:

- Worker orchestration and mailbox transport.
- Proactive wake loops and scheduled automation.
- Remote session bridges and computer-use support.

## Phase 4: Orchestration and messaging

Objective:

Turn the system into a coordinated multi-agent runtime rather than a single assistant process with ad hoc spawning.

Depends on:

- [Phase 1](#phase-1-establish-the-shell)
- [Phase 2](#phase-2-harden-the-runtime-core)
- [Phase 3](#phase-3-context-and-memory)

Repo-local target areas:

- `src/agents/`
- `src/sessions/`
- `src/tasks/`
- `src/channels/`
- `src/pairing/`
- local state and runtime contracts from earlier phases
- new mailbox and coordinator services if no existing package owns them cleanly

Primary module ownership after shell modularization:

- Own `src/superhuman/runtime/super-orchestration-services.ts` as the gateway-facing composition layer for orchestration startup and teardown.
- Own the orchestration surfaces that hang off that layer, including `src/superhuman/super-orchestration-runtime.ts` and `src/superhuman/super-orchestration-store.ts`.
- Extend earlier shell and state seams by adding role-aware and mailbox-aware behavior through your domain modules rather than re-centralizing orchestration logic inside `src/superhuman/super-gateway-runtime.ts`.
- Route orchestration durability through the phase-owned state modules. Do not turn `src/superhuman/state/super-state-db.ts` or `src/superhuman/super-state-store.ts` back into catch-all homes for mailbox or worker behavior.

Implementation scope:

1. Introduce explicit execution roles.

- Add runtime role types for this phase: `lead`, `worker`, `subagent`.
- Store role and parent-child linkage in the state database.
- Record per-worker budget inheritance and queue state in the durable task model, not only the live runtime.

2. Port the coordinator contract before implementing worker UI.

- Add a coordinator system prompt and runtime mode that treats worker outputs as internal signals.
- Make workers addressable by stable IDs.
- Normalize every worker result into a machine-readable task-notification envelope.
- Add explicit spawn refusal reasons and queue placement outcomes when worker caps are reached.

3. Implement two worker backends.

- In-process workers for low-latency delegation.
- Out-of-process workers for stronger isolation.
- Expose the same control surface from both: launch, send follow-up, interrupt, stop, collect terminal result, emit progress.
- Enforce `maxConcurrentWorkersPerLead` and `maxQueuedWorkersPerLead` as runtime policy rather than prompt advice.

4. Implement inbox and mailbox transport.

- Add durable local mailbox storage for agent-to-agent and session-to-session messages.
- Require sender, recipient, timestamp, delivery status, message type, and optional correlation ID on every message.
- Support immediate delivery when idle and queued delivery when busy.

5. Implement permission relay.

- Serialize worker permission requests into mailbox messages.
- Let lead sessions approve, deny, or modify worker tool inputs.
- Persist the full approval history in local state.

6. Add task-state normalization.

- Standardize status, prompt, budget used, tool count, duration, last heartbeat or last activity, and final result for every worker task.
- Standardize spawn count, queue delay, parent budget, child budget, and refusal reason for every worker task.

Implementation notes:

- Treat worker identity and message durability as foundational data-model decisions, not UI details.
- In-process and out-of-process workers must converge on the same lifecycle API.
- Permission relay must be inspectable from the operator perspective before proactive automation can depend on it.
- Worker fan-out must be bounded by persisted policy. Unbounded swarm behavior is explicitly out of scope.
- Compatibility caveat: orchestration should extend OpenClaw through typed runtime and task capabilities, not by privately bypassing plugin runtime, registry ownership, or channel/provider seams.
- Nomenclature policy: orchestration and mailbox code that is owned by Superhuman should use explicit `super-*` / `Super*` naming for files and local APIs. Keep generic names only for shared task, gateway, or compatibility contracts that other OpenClaw surfaces still consume.
- Tool contract caveat: if orchestration changes user-facing tool results such as `sessions_spawn`, preserve compatibility aliases during the transition rather than forcing immediate consumers onto a new shape.

Source extraction map:

- Claude multi-agent spawning and mailbox flow:
  - `claude-code/tools/shared/spawnMultiAgent.ts:513-727` for mailbox-seeded worker startup.
  - `claude-code/tools/shared/spawnMultiAgent.ts:899-948` for in-process teammate spawn and immediate execution handoff.
  - `claude-code/utils/swarm/spawnInProcess.ts:104-208` for `spawnInProcessTeammate(...)` internals.
- Claude mailbox transport:
  - `claude-code/utils/teammateMailbox.ts:134-156` for `writeToMailbox(...)`.
- Claude inbox routing and permission relay:
  - `claude-code/hooks/useInboxPoller.ts:126-160` for poller contract and delivery rules.
  - `claude-code/hooks/useInboxPoller.ts:256-378` for permission request routing.
  - `claude-code/hooks/useInboxPoller.ts:845-954` for idle delivery and queued-message drain behavior.
- Claude coordinator contract:
  - `claude-code/coordinator/coordinatorMode.ts:120-255` for lead/worker semantics and task-notification envelope shape.
- Hermes delegation influence:
  - `hermes-agent-audit/toolsets.py:160-185` around `delegation` and `code_execution` toolset composition as the simpler capability model to borrow, not as the orchestration transport itself.

Deliverables:

- Stable execution roles and role-aware persistence.
- Coordinator runtime mode and normalized worker notification envelopes.
- Durable mailbox transport with delivery-state handling.
- Permission relay and worker task-state normalization.
- Worker cap, queue, and budget accounting that survive restarts.
- Phase contract matches runtime reality by deferring `remote_peer` until a real transport exists.

Exit criteria:

- Leads can launch, observe, continue, and stop workers via a stable API.
- Worker outputs arrive as normalized task notifications.
- Permission approvals can cross process or session boundaries without ambiguity.
- Message delivery survives busy periods and process restarts.
- Worker fan-out remains bounded, attributable, and inspectable under load.

Out of scope:

- Proactive wake loops and scheduled automation.
- Remote environment negotiation.
- `remote_peer` runtime transport and negotiation.
- Computer-use capability surfaces.

## Phase 5: Proactive and scheduled automation

Objective:

Reach the first version of Superhuman that can detect, schedule, initiate, and complete useful work without being manually driven at every step.

Depends on:

- [Phase 1](#phase-1-establish-the-shell)
- [Phase 2](#phase-2-harden-the-runtime-core)
- [Phase 3](#phase-3-context-and-memory)
- [Phase 4](#phase-4-orchestration-and-messaging)

Repo-local target areas:

- `src/cron/`
- `src/bootstrap/`
- `src/gateway/boot.ts`
- `src/tasks/`
- `src/polls.ts`
- local state and notification surfaces introduced earlier

Primary module ownership after shell modularization:

- Own `src/superhuman/state/super-state-automation.ts` as the durable state surface for automation loop state and automation-event logs.
- Own `src/superhuman/runtime/super-automation-services.ts` as the gateway-facing composition layer for automation, notifications, subscriptions, and remote scheduling startup.
- Own the supporting Superhuman automation modules that now plug into that layer, including `src/superhuman/super-automation-runtime.ts`, `src/superhuman/super-notification-center.ts`, `src/superhuman/super-subscription-manager.ts`, `src/superhuman/super-remote-schedule-runtime.ts`, and `src/superhuman/super-proactive-loop.ts`.
- Keep automation-specific state and startup logic in those phase-owned modules. Do not push scheduling behavior back into `src/superhuman/super-gateway-runtime.ts` or widen `src/superhuman/state/super-state-db.ts` into an automation monolith.

Phase 5 cut line against existing cron:

- Reuse the existing OpenClaw cron substrate as the durable local scheduling base instead of rewriting it.
- Treat `src/cron/` scheduling, persistence, wake modes, delivery, CLI, and run-log surfaces as shared host infrastructure that Superhuman builds on.
- Keep generic cron contracts generic when they are intentionally host-wide or plugin-facing.
- Add new Superhuman-owned policy and orchestration layers around that substrate using explicit `super-*` / `Super*` naming.
- The minimum reuse set for this phase is:
  - durable job storage and migration in `src/cron/store.ts`, `src/cron/service.store.ts`, and related migration helpers
  - scheduler lifecycle and enqueue mechanics in `src/cron/service.ts`, `src/cron/service/ops.ts`, `src/cron/service/jobs.ts`, and timer helpers
  - job shape, wake-mode, payload, delivery, and failure-alert contracts in `src/cron/types.ts` and `src/cron/types-shared.ts`
  - existing CLI and gateway control surfaces for create/list/status/run/edit flows
  - existing cron run logs as a host-level audit feed, not the only Superhuman observability surface
- The minimum new Superhuman-owned work for this phase is:
  - a proactive loop manager with explicit `active`, `paused`, `sleeping`, and `disabled` state
  - a sleep or defer mechanism that decides when not to act and when to wake again
  - Superhuman automation policy that routes scheduled work through the same runtime, verification, provenance, and capability gates as interactive work
  - automation-event logging in the Superhuman state model so trigger source, reason, plan, actions taken, and result are queryable alongside other runtime state
  - remote scheduled-agent surfaces and structured external subscription ingestion when they are not already provided by the shared host
- Non-goal: do not fork or duplicate the generic cron scheduler just to make it look Superhuman-specific. Phase 5 should wrap and extend the host scheduler where possible, then add only the missing autonomy-specific behavior.

Implementation scope:

1. Add a proactive loop manager.

- Implement a `ProactiveLoop` service that injects periodic synthetic wake events when the runtime is idle.
- Keep wake events as first-class messages with explicit provenance, not hidden prompt hacks.
- Support `active`, `paused`, `sleeping`, and `disabled` states.

2. Add a `Sleep` or equivalent defer mechanism.

- Let the assistant explicitly declare there is nothing useful to do and schedule a later wake.
- Use this to prevent proactive mode from degenerating into constant low-value activity.

3. Port local scheduling.

- Add durable and session-only scheduled jobs.
- Support one-shot jobs, recurring jobs, persisted durable jobs, jitter windows, and missed-job recovery on restart.
- Enqueue scheduled jobs into the same runtime loop rather than bypassing it.
- Preserve the same verification, partial-result, and capability-negotiation constraints as interactive runs instead of letting scheduled jobs bypass them.

4. Port remote scheduled agents.

- Add a remote trigger service that can create cloud or remote scheduled executions with repo source, model selection, connector or plugin attachments, and a self-contained prompt payload.
- Make remote jobs discoverable and runnable from the same control plane as local schedules.
- Require remote scheduled jobs to publish environment capabilities before attempting semantic rename or refactor tasks.

5. Port notification and delivery surfaces.

- Add outbound notifications with explicit type taxonomy: task complete, approval requested, proactive action taken, scheduled run fired, remote run failed.
- Add file-delivery support for agent-generated artifacts intended for the operator.

6. Port PR and external event subscriptions.

- Add a subscription manager that converts external events into queued user-visible work items.
- Minimum support: PR review or comment events and CI result subscriptions.
- Require events to arrive as structured input messages, not raw channel text.

7. Integrate automation logging.

- Record trigger source, reason, plan, actions taken, and result for every proactive or scheduled action.
- Make these records queryable from local state and visible in operator surfaces.
- Record whether the automation acted on verified evidence, partial reads, persisted previews, or collapsed summaries.

Implementation notes:

- Proactive mode should be a scheduler plus policy layer, not a permanent prompt mutation.
- Sleep and wake transitions need explicit state persistence.
- Every autonomous action must leave enough evidence for a human to reconstruct why it happened.
- Automation may depend on earlier phases, but it must not weaken them. Scheduled or proactive runs do not get looser verification or provenance rules than interactive runs.
- Compatibility caveat: automation features that need new host behavior should land as typed capabilities or documented core seams, not private reach-ins around plugin runtime, registry ownership, or channel/provider integration boundaries.
- Nomenclature policy: Superhuman-specific proactive, scheduling, and notification services added in this phase should use explicit `super-*` / `Super*` naming, while generic names remain reserved for shared scheduler, gateway, or plugin-facing contracts.
- Slot policy caveat: automation should assume `super-context` by default and treat `legacy` only as a compatibility fallback, not as dead code to strip opportunistically.

Source extraction map:

- Claude proactive activation and tick loop:
  - `claude-code/main.tsx:2197-2206` for the proactive prompt contract.
  - `claude-code/cli/print.ts:1831-1845` for scheduled proactive tick injection.
  - `claude-code/cli/print.ts:2477-2482` for idle-triggered proactive tick scheduling.
- Claude local scheduling:
  - `claude-code/tools/ScheduleCronTool/prompt.ts:13-60` for cron gating and runtime assumptions.
  - `claude-code/tools/ScheduleCronTool/CronCreateTool.ts:39-145` for durable/session-only create semantics.
  - `claude-code/utils/cronScheduler.ts:1-125` for scheduler contract and lifecycle.
  - `claude-code/hooks/useScheduledTasks.ts:40-118` for REPL integration and task enqueue behavior.
- Claude remote scheduled agents:
  - `claude-code/skills/bundled/scheduleRemoteAgents.ts:174-330` for remote trigger configuration shape and workflow.
- Claude notification, file delivery, and PR subscriptions:
  - `claude-code/tools.ts:42-51` for `SendUserFileTool`, `PushNotificationTool`, and `SubscribePRTool` feature-gated inclusion.
  - `claude-code/commands.ts:101-102` for `subscribe-pr` command exposure.
  - `claude-code/memdir/memdir.ts:319-348` for append-only assistant daily logs as the audit trail pattern.
- OpenClaw automation surface:
  - `openclaw-audit/src/gateway/boot.ts:138-192` for boot-time agent execution as the shell-level automation anchor.

Deliverables:

- A proactive loop service with explicit state transitions.
- Durable local scheduling and discoverable remote scheduling.
- Notification and artifact delivery surfaces.
- Structured subscription ingestion and searchable automation logs.

Exit criteria:

- Idle sessions can wake, evaluate state, and decide to act or sleep.
- Scheduled tasks survive restarts according to durability policy.
- Remote scheduled jobs have the same identity and observability model as local ones.
- Notifications and file deliveries are attributable to concrete actions and triggers.
- External event subscriptions feed directly into the runtime as structured work.
- Proactive and scheduled actions preserve the same evidence, verification, and capability constraints as manual runs.

Out of scope:

- Remote execution-plane unification.
- Optional computer-use support.
- Final provider and backend portability layer.

## Phase 6: High-autonomy execution surfaces

Objective:

Make local, remote, scheduled, and optional high-autonomy execution modes all feel like one system, governed by one policy and one state model.

Depends on:

- [Phase 1](#phase-1-establish-the-shell)
- [Phase 2](#phase-2-harden-the-runtime-core)
- [Phase 3](#phase-3-context-and-memory)
- [Phase 4](#phase-4-orchestration-and-messaging)
- [Phase 5](#phase-5-proactive-and-scheduled-automation)

Repo-local target areas:

- `src/gateway/`
- `src/channels/`
- `src/agents/`
- `src/mcp/`
- `src/runtime.ts`
- local state, permission, scheduling, and orchestration services from earlier phases

Primary module ownership after shell modularization:

- This split does not assign a new Phase 6-specific shell file. Extend the earlier phase-owned modules additively instead of reclaiming them into one new monolith.
- Treat `src/superhuman/super-gateway-runtime.ts` as a shared composition root that should stay thin while Phase 6 work lands in explicit remote, environment, and high-autonomy modules.
- Treat `src/superhuman/state/super-state-db.ts` the same way: it remains substrate plumbing, while new autonomy state should land in explicit phase-owned modules rather than re-centralizing schema, mapping, and policy together.

Implementation scope:

1. Port the remote session protocol into a first-class execution plane.

- Add a `RemoteSessionManager` equivalent that owns event ingress, message egress, reconnect behavior, remote permission requests, and remote control responses.
- Require remote sessions to use the same runtime-stage model as local sessions.

2. Add a remote permission bridge.

- Let a local operator-facing session render and answer remote tool approvals using the same permission model as local tools.
- Degrade unknown remote tools into stubbed inspectable requests instead of hard failures.
- Preserve verification state, partial-result metadata, and artifact provenance across the permission bridge rather than collapsing them into opaque remote output.

3. Add remote environment abstraction.

- Define explicit environment kinds: `local`, `remote`, `scheduled_remote`, `computer_use`.
- Make each environment declare capabilities rather than acting as a bare transport endpoint.
- Require capability declarations to include semantic code-tool support, workspace-search-only fallback, and artifact/provenance replay support.

4. Add optional computer-use plane only after policy unification.

- Treat computer-use as another capability surface under the same policy engine.
- Require session lock ownership, per-session approval state, display selection state, permission dialog integration, and cleanup on turn end.
- Keep computer-use unavailable to proactive behavior until interactive safety is proven.

5. Add provider and backend portability.

- Finalize a provider adapter interface so model providers, shell backends, browser backends, and remote executors all plug into stable contracts.
- Remove assumptions that one default transport or provider path exists.

Implementation notes:

- Remote execution must inherit the exact same runtime accounting and approval model as local execution.
- Environment kind should become a first-class planning input for tool policy and capability negotiation.
- Computer-use support should remain optional and explicitly gated.
- Remote execution must not silently downgrade rename, refactor, verification, or provenance-sensitive tasks when the remote environment lacks the required capabilities.
- Compatibility caveat: new remote or high-autonomy behavior should be negotiated through typed capabilities and documented contracts, not by bypassing plugin runtime, registry ownership, or channel/provider seams with private integrations.
- Nomenclature policy: Superhuman-owned remote, scheduled-remote, and high-autonomy execution surfaces introduced here should use explicit `super-*` / `Super*` naming, while environment, provider, and plugin-facing contracts keep generic names when they are intentionally shared.
- Slot policy caveat: remote and cross-plane execution should continue to tolerate explicit `legacy` selection for compatibility even while `super-context` remains the default context-engine slot target.

Source extraction map:

- Claude remote execution plane:
  - `claude-code/remote/RemoteSessionManager.ts:95-214` for remote session lifecycle, control requests, and message flow.
  - `claude-code/remote/remotePermissionBridge.ts:1-74` for synthetic permission request bridging.
- Claude optional computer-use plane:
  - `claude-code/utils/computerUse/gates.ts:45-69` for `getChicagoEnabled()` and rollout policy.
  - `claude-code/utils/computerUse/mcpServer.ts:60-105` for `createComputerUseMcpServerForCli()` and server startup.
  - `claude-code/utils/computerUse/wrapper.tsx:248-318` for `getComputerUseMCPToolOverrides(...)` and per-tool dispatch.
  - `claude-code/main.tsx:1611-1613` for shell-level computer-use gating.
- Hermes backend and provider portability discipline:
  - `hermes-agent-audit/run_agent.py:443-563` for the agent constructor parameters covering provider, backend, and session or runtime options.
  - `hermes-agent-audit/toolsets.py:72-185` for capability grouping independent of backend selection.

Deliverables:

- Remote session lifecycle management with reconnect and control handling.
- Remote permission bridging onto the local approval surface.
- Explicit environment kinds and capability negotiation.
- Optional computer-use support behind the unified policy layer.
- Stable provider and backend adapter contracts.
- Remote propagation of verification, provenance, and semantic-tool capability state.

Exit criteria:

- Remote sessions can be created, resumed, controlled, and audited through the same operator surfaces as local sessions.
- Remote permission requests reuse the same approval semantics as local ones.
- Capability negotiation is explicit by environment kind.
- Optional computer-use execution is policy-bound, inspectable, and cleanly torn down.
- Provider or backend changes do not require rewriting core runtime logic.
- Remote runs cannot silently fall back from semantic tooling or verified evidence to grep-only or preview-only behavior without surfacing that downgrade.

Out of scope:

- Reworking earlier phase contracts instead of extending them.
- Making computer-use mandatory for the base product.

### Note From Phase 4

Please treat `remote_peer` as a real backend, not just another `executionRole` string.

Phase 4 now gives you a coordinator contract worth preserving:

- lead sessions expect normalized `<task-notification>` envelopes
- mailbox semantics distinguish queued, started, terminal, and approval events
- refusal outcomes are durable and machine-readable
- approval history is persisted and inspectable

What I would strongly encourage in phase 6:

- Make remote sessions implement the same lifecycle surface as local workers:
  - launch
  - continue
  - interrupt
  - stop
  - terminal result
  - progress
  - approval request / approval resolution
- Keep the same notification envelope shape for remote results, so the coordinator never has to care whether the worker is local or remote.
- Preserve durable queue/refusal semantics instead of bypassing them through a separate remote transport shortcut.
- Make capability negotiation explicit before remote work starts, especially for semantic tooling, verification, and artifact replay.
- Treat remote permission bridging as a first-class state machine, not a fire-and-forget proxy.
- Do not collapse remote provenance into opaque text blobs; keep verification, provenance, and artifact state structured.

What I would avoid:

- Reintroducing special-case coordinator logic for remote runs.
- Letting remote workers silently degrade from semantic tools to grep-only without surfacing it.
- Making `remote_peer` a doc-only promise again.
- Bypassing the orchestration store just because a remote transport has its own event stream.

Ideal outcome:

- `remote_peer` looks like just another worker backend from the coordinator's point of view.
- The coordinator/mailbox/task-notification contract from phase 4 stays stable.
- A lead session can reason about local, out-of-process, and remote workers through one model, with differences exposed through declared capabilities rather than transport-specific control flow.

## Cross-Phase Execution Rules

- Keep the shell operable at the end of every phase; no phase may require a later phase to make the product usable again.
- Prefer additive seams and adapters over whole-system rewrites.
- Persist enough state to debug failures as features land.
- Do not merge proactive or remote behavior ahead of the runtime and memory contracts they depend on.
- When a phase introduces a new service, define its storage model, control API, and observability surface together.

## Shared Deliverable Standard

- The phase has a clear set of repo-local touch points.
- The phase has explicit source extraction references from Claude Code, OpenClaw, or Hermes.
- The phase exposes testable exit criteria.
- The phase defines what is still out of scope so later phases do not leak backward.
