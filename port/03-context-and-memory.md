# Phase 3: Context and memory

Objective:

Give Superhuman long-session durability and useful long-term memory without destabilizing prompts or operator trust.

Depends on:

- [01-establish-the-shell.md](01-establish-the-shell.md)
- [02-harden-the-runtime-core.md](02-harden-the-runtime-core.md)

Repo-local target areas:

- `extensions/memory-core/index.ts`
- `extensions/memory-core/src/`
- `src/context-engine/`
- `src/gateway/cli-session-history.ts`
- `src/sessions/`
- local state store introduced in Phase 1
- new context-compaction and collapse services if the existing tree has no natural home yet

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
