# Phase 4: Orchestration and messaging

Objective:

Turn the system into a coordinated multi-agent runtime rather than a single assistant process with ad hoc spawning.

Depends on:

- [01-establish-the-shell.md](01-establish-the-shell.md)
- [02-harden-the-runtime-core.md](02-harden-the-runtime-core.md)
- [03-context-and-memory.md](03-context-and-memory.md)

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
