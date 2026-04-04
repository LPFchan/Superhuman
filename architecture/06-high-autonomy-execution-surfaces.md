# Phase 6: High-autonomy execution surfaces

Objective:

Make local, remote, scheduled, and optional high-autonomy execution modes all feel like one system, governed by one policy and one state model.

Depends on:

- [01-establish-the-shell.md](01-establish-the-shell.md)
- [02-harden-the-runtime-core.md](02-harden-the-runtime-core.md)
- [03-context-and-memory.md](03-context-and-memory.md)
- [04-orchestration-and-messaging.md](04-orchestration-and-messaging.md)
- [05-proactive-and-scheduled-automation.md](05-proactive-and-scheduled-automation.md)

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

## Note From Phase 4

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
