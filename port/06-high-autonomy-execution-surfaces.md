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

Implementation scope:

1. Port the remote session protocol into a first-class execution plane.

- Add a `RemoteSessionManager` equivalent that owns event ingress, message egress, reconnect behavior, remote permission requests, and remote control responses.
- Require remote sessions to use the same runtime-stage model as local sessions.

2. Add a remote permission bridge.

- Let a local operator-facing session render and answer remote tool approvals using the same permission model as local tools.
- Degrade unknown remote tools into stubbed inspectable requests instead of hard failures.

3. Add remote environment abstraction.

- Define explicit environment kinds: `local`, `remote`, `scheduled_remote`, `computer_use`.
- Make each environment declare capabilities rather than acting as a bare transport endpoint.

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

Exit criteria:

- Remote sessions can be created, resumed, controlled, and audited through the same operator surfaces as local sessions.
- Remote permission requests reuse the same approval semantics as local ones.
- Capability negotiation is explicit by environment kind.
- Optional computer-use execution is policy-bound, inspectable, and cleanly torn down.
- Provider or backend changes do not require rewriting core runtime logic.

Out of scope:

- Reworking earlier phase contracts instead of extending them.
- Making computer-use mandatory for the base product.