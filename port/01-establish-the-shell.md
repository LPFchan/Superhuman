# Phase 1: Establish the shell

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

3. Add a shell-facing persistence adapter.

- Implement a `SessionPersistenceAdapter` that receives OpenClaw session lifecycle events and writes normalized rows into SQLite.
- Make the adapter write-through and idempotent.
- Tolerate duplicate session-start and session-end events.
- Keep the existing OpenClaw session store authoritative for routing during this phase.

4. Define the first stable internal interfaces.

- `SessionRegistry`: resolve current session, main session, and agent session identity.
- `ChannelRegistry`: resolve inbound and outbound channel bindings.
- `PluginRegistry`: enumerate loaded plugins and capabilities.
- `WorkspaceBootstrap`: run startup automation and boot-time checks.
- `StateStore`: append and query normalized local state.

5. Add the smallest useful Claude-facing compatibility layer.

- Introduce a `ConversationWindow` abstraction exposing ordered messages, approximate token count, latest assistant turn ID, and latest user turn ID.
- Introduce a `ContextPressureSnapshot` exposing estimated input tokens, effective model context limit, remaining budget, and an overflow-risk flag.
- Introduce a no-op `CompactionManager` interface with `getSnapshot()`, `shouldCompact()`, `compact()`, and `recoverFromOverflow()`.
- Do not implement real compaction yet. The goal is to create the seam so later Claude ports do not force a shell rewrite.

Implementation notes:

- New state writes should be append-first and replayable.
- Boot and routing behavior must remain source-compatible with the existing shell.
- Session identity drift is a blocker for closing this phase.

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

Exit criteria:

- Workspace boot, session routing, and plugin loading behave exactly as before.
- SQLite state exists and is populated for every new session and message.
- Restarting the process does not corrupt session identity or duplicate durable state.
- The new context interfaces exist and are wired even though compaction remains a stub.

Out of scope:

- Real compaction logic.
- Multi-agent orchestration.
- Proactive behavior.
- Remote execution semantics beyond preserving existing shell behavior.