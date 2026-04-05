# Claude Code Tweet Audit for Superhuman

Date: 2026-04-01

Scope:

- Audit the claims in the attached tweet against the local Claude Code source tree at `~/Documents/claude-code`.
- Decide which behaviors Superhuman should port, reject, or rewrite.
- Map each decision onto the existing Superhuman phase docs and the current architecture draft.

Method:

- This audit uses direct source inspection, not the tweet as authority.
- All Claude Code line references below are from the local checkout inspected on 2026-04-01.
- All Superhuman line references below are from the current working tree and will drift if the docs are edited later.
- The architecture doc and phase docs were updated after this audit so the port plan now reflects these conclusions directly.

## Executive verdict

The tweet is directionally useful, but mixed in precision.

- Several claims are directly supported by the Claude Code source: ant-only prompt gates, false-claims mitigation comments, prompt-level verification instructions, 2,000-line read defaults, 25,000-token read caps, 50,000-character tool-result persistence thresholds, 2,000-byte previews, AsyncLocalStorage subagent isolation, and post-compact restore budgets.
- Several conclusions in the tweet are too strong as written. The source clearly shows prompt-level verification guidance for ant users, but this audit did not find a hard runtime guarantee that every edit is followed by compile or test verification in the core tool execution path.
- The right Superhuman move is not to copy Claude Code's hidden or prompt-gated behavior. Superhuman should make these policies explicit, runtime-enforced, and observable.

## Claim matrix

| #     | Tweet claim                                          | Audit verdict | Superhuman decision                                          |
| ----- | ---------------------------------------------------- | ------------- | ------------------------------------------------------------ |
| 1     | Employee-only verification gate                      | Partly true   | Port the intent, reject the gating model                     |
| 2     | Context death spiral from compaction                 | Mostly true   | Port the capability, redesign for visibility                 |
| 3     | Brevity mandate causes shallow fixes                 | True          | Do not port as a hard instruction layer                      |
| 4     | Multi-agent swarm exists and is isolated             | True          | Port, but add explicit limits and accounting                 |
| 5     | Read tool has a 2,000-line blind spot                | True          | Port explicit chunked-read ergonomics, not the blind spot    |
| 6     | Large tool results are replaced with a short preview | True          | Port persisted-output support, but surface truncation loudly |
| 7     | Grep is not semantic code understanding              | True          | Do not accept grep-only rename/refactor workflows            |
| Bonus | New CLAUDE.md mechanical overrides                   | Mixed         | Convert the good parts into runtime policy and observability |

## Detailed audit

### 1. Employee-only verification gate

What the tweet claims:

- Anthropic employees get post-edit verification behavior and normal users do not.

What the source actually shows:

- `claude-code/query/config.ts:39` sets `isAnt: process.env.USER_TYPE === 'ant'`.
- `claude-code/constants/prompts.ts:211` adds an ant-only instruction: "Before reporting a task complete, verify it actually works: run the test, execute the script, check the output."
- `claude-code/constants/prompts.ts:237` contains the comment: "False-claims mitigation for Capybara v8 (29-30% FC rate vs v4's 16.7%)."
- `claude-code/tools/AgentTool/built-in/verificationAgent.ts:10-55` defines a dedicated verification agent that is explicitly told to run builds, tests, linters, type-checks, and adversarial probes.

What the source does not prove:

- This audit did not find a core `toolExecution`-level rule that automatically runs type-checks or tests after every file write.
- The strongest supported statement is: internal users get stronger prompt-level verification instructions and verification-oriented surfaces than external users.

Superhuman should or should not port:

- Should port: explicit verification before claiming success.
- Should not port: employee-only or hidden prompt gating.
- Should redesign: verification must be a visible runtime contract, not a buried prompt hint.

Superhuman implementation changes (phase + docs + code):

- Phase 1 state model.
  In `architecture/01-establish-the-shell.md:29-35`, change the SQLite substrate definition so `actions` stores verification stage, verifier kind, command, exit code, and verification summary, and `artifacts` stores verification outputs and attached logs. The closest existing code seam is the task registry store: `src/tasks/task-registry.paths.ts:20` (`resolveTaskRegistrySqlitePath`), `src/tasks/task-registry.store.ts:48-58` (default SQLite-backed store wiring), `src/tasks/task-registry.store.sqlite.ts:460-487` (`upsertTaskWithDeliveryStateToSqlite`, `upsertTaskDeliveryStateToSqlite`). In practice, verification evidence should either extend that SQLite schema or be recorded in a parallel state store with the same durability guarantees.
- Phase 2 runtime contract.
  In `architecture/02-harden-the-runtime-core.md:24-55`, replace the vague “safe runtime contract” wording with an explicit stage sequence: `tool execution -> verification plan -> verification execution -> completion decision -> completion report`. The nearest execution-status functions already present are `src/tasks/task-executor.ts:22-129` (`createQueuedTaskRun`, `createRunningTaskRun`, `startTaskRunByRunId`, `recordTaskRunProgressByRunId`, `completeTaskRunByRunId`, `failTaskRunByRunId`) and `src/tasks/task-registry.ts:1102-1389` (`createTaskRecord`, `markTaskRunningByRunId`, `recordTaskProgressByRunId`, `markTaskTerminalByRunId`, `setTaskRunDeliveryStatusByRunId`). The required change is not just “track verification”; it is: no task that edits code may transition to a success terminal state without a recorded `verified`, `not_verifiable`, or `verification_failed` outcome.
- Phase 2 transcript/reporting path.
  In `architecture/02-harden-the-runtime-core.md:49-55`, make truthful completion reporting a transcript-level guarantee. The nearest current hooks are `src/sessions/transcript-events.ts:12-33` (`onSessionTranscriptUpdate`, `emitSessionTranscriptUpdate`) and `src/gateway/chat-sanitize.ts:66-111` (`stripEnvelopeFromMessage`, `stripEnvelopeFromMessages`). The doc should say that verification status must survive transcript sanitization and replay as structured metadata, not only prose in the assistant message.
- Architecture doc changes.
  In `architecture/superhuman-architecture-technical.md:116-123`, add `Post-edit verification policy` and `Truthful completion reporting` under Agent Runtime Core responsibilities. In `architecture/superhuman-architecture-technical.md:331-338`, add `Verification event history` and `Verification artifacts` under Local State and Observability. This is the architectural expression of the code changes above, not a separate optional idea.

### 2. Context death spiral from compaction

What the tweet claims:

- Claude Code compacts around ~167k tokens and keeps only a narrow tail plus compressed summaries.

What the source actually shows:

- `claude-code/services/compact/autoCompact.ts:29-37` reserves up to 20,000 tokens for summary output.
- `claude-code/services/compact/autoCompact.ts:61-77` sets the autocompact threshold to effective context window minus 13,000 tokens.
- `claude-code/services/compact/compact.ts:122-130` sets `POST_COMPACT_MAX_FILES_TO_RESTORE = 5`, `POST_COMPACT_TOKEN_BUDGET = 50_000`, and `POST_COMPACT_MAX_TOKENS_PER_FILE = 5_000`.
- On a 200k-class model, that does in practice land close to the tweet's ~167k figure.

Superhuman should or should not port:

- Should port: autocompact, reactive compaction, collapse, and overflow recovery.
- Should not port: silent or opaque context loss.
- Should redesign: compaction state, dropped spans, restored files, and budget reasoning must be operator-visible.

Superhuman implementation changes (phase + docs + code):

- Phase 1 context seam.
  In `architecture/01-establish-the-shell.md:51-56`, redefine `ContextPressureSnapshot` and `CompactionManager` so they include persisted event payloads: threshold used, token estimate, collapse span IDs, restored file refs, and failure reason. The nearest current code seam for bootstrapping long-lived session state is `src/gateway/boot.ts:138-190` (`runBootOnce`), which already creates a controlled session run, and the nearest transcript/history seam is `src/gateway/cli-session-history.ts:17-38` (`augmentChatHistoryWithCliSessionImports`). The required practical change is: compaction metadata must be stored alongside the session/transcript flow, not only computed at runtime.
- Phase 3 compaction visibility.
  In `architecture/03-context-and-memory.md:24-40`, replace the broad wording with a concrete requirement list: persist `beforeTokens`, `afterTokens`, `threshold`, `collapsedSpanIds`, `restoredArtifacts`, `droppedArtifacts`, and `recoveryMode`. The best current code-level provenance hook is `src/sessions/input-provenance.ts:27-74` (`normalizeInputProvenance`, `applyInputProvenanceToUserMessage`, `isInterSessionInputProvenance`, `hasInterSessionUserProvenance`). The phase doc should say compaction and collapse must introduce the same kind of provenance-bearing metadata for summarized content.
- Phase 3 transcript replay.
  In `architecture/03-context-and-memory.md:36-40`, add a replay rule tied to `src/sessions/transcript-events.ts:12-33`: replayed messages must be able to tell the operator whether they are original, collapsed, restored, or imported. Without that, the system recreates the opacity the tweet is complaining about.
- Architecture doc changes.
  In `architecture/superhuman-architecture-technical.md:151-157`, add `operator-visible compaction events`, `restored-file and dropped-span accounting`, and `partial-context warnings`. In `architecture/superhuman-architecture-technical.md:331-338`, add `compaction event history` and `recovery failure visibility` as explicit observability surfaces.

### 3. Brevity mandate and minimalism bias

What the tweet claims:

- Claude Code has prompt directives pushing the model toward simpler and smaller changes.

What the source actually shows:

- `claude-code/constants/prompts.ts:197-203` says not to add features or refactor beyond the ask and says "Three similar lines of code is better than a premature abstraction."
- `claude-code/constants/prompts.ts:418` says: "Try the simplest approach first" and "Be extra concise."
- `claude-code/constants/prompts.ts:534-539` adds ant-only numeric output length anchors.

Superhuman should or should not port:

- Should not port this as a hard instruction layer.
- Should port a narrower version: avoid speculative abstraction, but do not structurally bias the system against fixing root causes.
- Should redesign: architectural quality rules should live in code-review policy, runtime policy, and verification, not only in tone-shaping prompt text.

Superhuman implementation changes (phase + docs + code):

- Phase 2 completion policy.
  In `architecture/02-harden-the-runtime-core.md:24-55`, add an explicit decision contract: every completion report must classify the change as `root-cause fix`, `local patch`, or `deferred structural fix`, and must say which category it landed in. The nearest persistence seam is `src/tasks/task-registry.ts:1102-1189` (`createTaskRecord`) plus the status/event append flow in `src/tasks/task-registry.ts:1191-1389`; those records already have `progressSummary`, `terminalSummary`, and event streams that can carry scope-truth metadata.
- Phase 2 transcript/reporting.
  Tie the above to `src/sessions/transcript-events.ts:12-33` so the structured classification survives into operator-visible history. The phase doc should state that this classification is not optional assistant prose; it is structured output attached to terminal task state.
- Architecture doc changes.
  In `architecture/superhuman-architecture-technical.md:21-27`, add a design rule that quality policy must live in runtime rules and persisted evidence rather than hidden prompt style. In `architecture/superhuman-architecture-technical.md:116-123`, add `root-cause-oriented completion policy` as a runtime-core responsibility.

### 4. Agent swarm and AsyncLocalStorage isolation

What the tweet claims:

- Subagents use AsyncLocalStorage isolation and there is no obvious hardcoded worker ceiling.

What the source actually shows:

- `claude-code/utils/agentContext.ts:1-24` describes AsyncLocalStorage-based agent isolation.
- `claude-code/utils/agentContext.ts:93-109` uses `AsyncLocalStorage<AgentContext>` for subagent and teammate context.
- `claude-code/tasks/InProcessTeammateTask/InProcessTeammateTask.tsx:1-8` explicitly says in-process teammates run in the same Node.js process using AsyncLocalStorage for isolation.
- `claude-code/tools/shared/spawnMultiAgent.ts` and related swarm files exist.
- This audit did not find a hardcoded global `MAX_WORKERS` or equivalent spawn ceiling in the worker/orchestration paths inspected.

Superhuman should or should not port:

- Should port: explicit coordinator and worker runtime.
- Should not port: uncapped fan-out as an implicit norm.
- Should redesign: worker count, budget, concurrency, and queueing policy should be explicit and inspectable.

Superhuman implementation changes (phase + docs + code):

- Phase 4 spawn control.
  In `architecture/04-orchestration-and-messaging.md:25-56`, replace the generic orchestration wording with concrete invariants: `maxConcurrentWorkersPerLead`, `maxQueuedWorkersPerLead`, `childBudgetInheritance`, `spawnRefusalReason`, and `queueDrainPolicy`. The current code seam for durable task lifecycle is `src/tasks/task-executor.ts:22-129` and `src/tasks/task-registry.ts:1102-1603`; the current session-identity seam is `src/sessions/session-key-utils.ts:23-100` (`parseAgentSessionKey`, `isCronRunSessionKey`, `isCronSessionKey`, `isSubagentSessionKey`, `getSubagentDepth`). The phase doc should explicitly say worker fan-out is enforced through those identity and task records, not left as an informal prompt instruction.
- Phase 2 budget propagation.
  In `architecture/02-harden-the-runtime-core.md:30-37`, add a child-budget field set that must be recorded when a worker is created: `parentTurnBudget`, `childTurnBudget`, `spawnCount`, `concurrencySlot`, `queueDelayMs`. The nearest storage seam is `src/tasks/task-registry.store.sqlite.ts:432-487`; if the current schema cannot hold these fields, the schema has to change before worker swarming is introduced.
- Architecture doc changes.
  In `architecture/superhuman-architecture-technical.md:223-231`, add `worker cap policy`, `spawn budget accounting`, and `queue visibility`. In `architecture/superhuman-architecture-technical.md:331-338`, add `per-worker lifecycle, budget, queue, and spawn history`.

### 5. The 2,000-line blind spot

What the tweet claims:

- A single file read is capped at 2,000 lines and 25,000 tokens, so long files can be silently under-read.

What the source actually shows:

- `claude-code/tools/FileReadTool/prompt.ts:10-18` sets `MAX_LINES_TO_READ = 2000` and tells the model offset/limit can be used for long files.
- `claude-code/tools/FileReadTool/limits.ts:2-18` documents a `maxTokens` default of 25,000.
- `claude-code/tools/FileReadTool/FileReadTool.ts:181` throws when token output exceeds the cap and nudges callers to use offset and limit.

Superhuman should or should not port:

- Should port: explicit chunked-read support and strong nudges for targeted reading.
- Should not port: silent partial reads.
- Should redesign: every partial read or capped read must state that it is partial and what remains unread.

Superhuman implementation changes (phase + docs + code):

- Phase 2 tool contract.
  In `architecture/02-harden-the-runtime-core.md:11-20`, add a concrete tool-result envelope for reads: `isPartial`, `requestedRange`, `returnedRange`, `totalKnownLines`, `limitKind`, `continuationHint`. The nearest replay-safe text hooks are `src/gateway/chat-sanitize.ts:66-111` (`stripEnvelopeFromMessage`, `stripEnvelopeFromMessages`) and `src/runtime.ts:97-114` (`createNonExitingRuntime`, `writeRuntimeStdout`, `writeRuntimeJson`). The change needed in practice is: partial-read metadata must be emitted structurally so sanitization and JSON output preserve it.
- Phase 3 provenance.
  In `architecture/03-context-and-memory.md:24-40`, require that summaries, collapse records, and memory extraction carry through the read provenance from `src/sessions/input-provenance.ts:27-74`. That means a summary cannot cite file content as if it were fully observed if the underlying read artifact says it was partial.
- Transcript and history path.
  Use `src/sessions/transcript-events.ts:12-33` and `src/gateway/cli-session-history.ts:17-38` as the existing transcript/history merge points. The doc should specify that imported CLI history and local history both need the same partial-read markers so operators can distinguish complete context from windowed context.
- Architecture doc changes.
  In `architecture/superhuman-architecture-technical.md:151-157`, add `partial-read state and replayability`. In `architecture/superhuman-architecture-technical.md:331-338`, add `tool truncation and partial-read event history`.

### 6. Tool result blindness

What the tweet claims:

- Large tool results get persisted and replaced with a very short preview that can mislead the model about completeness.

What the source actually shows:

- `claude-code/constants/toolLimits.ts:13` sets `DEFAULT_MAX_RESULT_SIZE_CHARS = 50_000`.
- `claude-code/utils/toolResultStorage.ts:109` sets `PREVIEW_SIZE_BYTES = 2000`.
- `claude-code/utils/toolResultStorage.ts:154-182` persists oversized results and generates previews.
- `claude-code/constants/toolLimits.ts:33-49` also sets a per-message aggregate tool-result budget.

Superhuman should or should not port:

- Should port: persisted-output handling for oversized tool results.
- Should not port: model-facing ambiguity about whether the output shown is complete.
- Should redesign: any persisted preview must carry structured metadata saying the shown output is partial, where the full output lives, and whether the agent has re-opened it.

Superhuman implementation changes (phase + docs + code):

- Phase 1 artifact model.
  In `architecture/01-establish-the-shell.md:29-35`, change the `artifacts` table definition so oversized tool outputs can be represented as two linked records: `preview artifact` and `full artifact`, with `previewBytes`, `fullBytes`, `storagePath`, and `reopenedAt`. The nearest durable code seam is the task registry SQLite store in `src/tasks/task-registry.paths.ts:20` and `src/tasks/task-registry.store.sqlite.ts:432-487`.
- Phase 2 evidence policy.
  In `architecture/02-harden-the-runtime-core.md:24-55`, add an explicit rule: a preview artifact cannot satisfy verification, summarization, or completion evidence unless the runtime has also recorded a follow-up read of the full artifact. The best current place to persist and expose that status is the task/event layer: `src/tasks/task-registry.ts:1102-1389` plus `src/sessions/transcript-events.ts:12-33`.
- Transcript/replay path.
  `src/gateway/chat-sanitize.ts:66-111` should be named in the doc as the replay boundary that must preserve `preview/full` provenance markers instead of stripping them to plain text.
- Architecture doc changes.
  In `architecture/superhuman-architecture-technical.md:21-23`, extend inspectability to include preview/full-output visibility. In `architecture/superhuman-architecture-technical.md:331-338`, add `preview/full-output provenance` and `artifact reopen history`.

### 7. Grep is not semantic code understanding

What the tweet claims:

- Text search is not sufficient for renames and signature changes.

What the source actually shows:

- The tweet's conclusion is correct even without a single decisive Claude Code line.
- The source and prompts lean heavily on text tools and read/write flows, while the read limits and preview flows above make semantic blind spots more dangerous in practice.

Superhuman should or should not port:

- Should not port grep-only rename/refactor assumptions.
- Should port: semantic symbol operations when the host environment supports them.
- Should redesign: runtime planning should understand capability differences between plain text search and language-server-backed symbol tools.

Superhuman implementation changes (phase + docs + code):

- Phase 1 capability advertisement.
  In `architecture/01-establish-the-shell.md:51-56`, expand the compatibility layer so the environment exposes explicit capability flags such as `supportsSymbolReferences`, `supportsSemanticRename`, and `supportsWorkspaceSearchOnly`. The closest current shell/session seams are `src/gateway/boot.ts:138-190` (`runBootOnce`) and `src/sessions/session-lifecycle-events.ts:13-20` (`onSessionLifecycleEvent`, `emitSessionLifecycleEvent`): those are the right places to thread session-scoped capability state into the environment model.
- Phase 2 planner classification.
  In `architecture/02-harden-the-runtime-core.md:37-43`, replace the generic tool classification list with an explicit distinction between `text_search`, `symbol_reference`, `symbol_rename`, and `workspace_navigation`. The current runtime-facing call boundary is thin, but `src/gateway/call.ts:913-933` (`callGatewayScoped`, `callGatewayCli`, `callGatewayLeastPrivilege`, `callGateway`) is the existing request/control seam where capability-routed behaviors can be introduced.
- Phase 6 remote negotiation.
  In `architecture/06-high-autonomy-execution-surfaces.md`, add a requirement that remote sessions publish the same semantic-code capability flags before accepting rename/refactor tasks. Without that, remote execution silently degrades into grep-only behavior.
- Architecture doc changes.
  In `architecture/superhuman-architecture-technical.md:296-304`, add `semantic-tool capability negotiation` and state that rename/refactor safety depends on the host capability set, not just the presence of generic search tools.

### Bonus. The tweet's proposed `CLAUDE.md` overrides

Good ideas in the override list:

- Require verification before claiming success.
- Be explicit about context pressure and phased execution.
- Encourage chunked reads for long files.
- Treat truncation as suspicious and re-scope searches.
- Treat rename/refactor work as a semantic-search problem where possible.

Bad or incomplete ideas in the override list:

- Forcing everything through prompt text is weaker than runtime enforcement.
- A universal "Step 0 delete dead code" rule is too blunt for every task.
- A universal "phase <= 5 files" rule is useful as an operational heuristic, not as a platform invariant.
- Unbounded swarm fan-out is not a safe default.

Superhuman decision:

- Convert the good parts into runtime policy, tool metadata, and observable state.
- Do not rely on user-authored instruction files as the primary safety mechanism.

## `superhuman-architecture-technical.md` alignment

### 1. Design Principles

Current anchors:

- `architecture/superhuman-architecture-technical.md:21-27`

Changes now reflected in the doc:

- Extend "Autonomous, but inspectable" so it explicitly covers compaction, truncation, preview persistence, verification status, and partial-read state.
- Add that safety and quality guarantees must live in runtime policy and observable state, not only in prompt wording.

### 2. Agent Runtime Core

Current anchors:

- `architecture/superhuman-architecture-technical.md:105-134`

Changes now reflected in the doc:

- Add these responsibilities near `:118-123`:
  - post-edit verification policy
  - truthful completion reporting
  - structured partial-result and partial-read propagation
  - semantic-versus-text tool capability awareness
- Add these success indicators near `:131-134`:
  - the system never reports success without recording whether verification ran and what passed or failed
  - partial tool evidence is explicitly marked and never silently treated as full evidence

### 3. Context and Conversation Management

Current anchors:

- `architecture/superhuman-architecture-technical.md:141-170`

Changes now reflected in the doc:

- Add these responsibilities near `:151-157`:
  - operator-visible compaction events
  - restored-file and dropped-span accounting
  - partial-read provenance through collapse and replay
- Add a success indicator that summarized history remains auditable with provenance, not just readable.

### 4. Memory System

Current anchors:

- `architecture/superhuman-architecture-technical.md:175-205`

Changes now reflected in the doc:

- Add a requirement that memory extraction and consolidation must preserve provenance for truncated, partial, or preview-derived evidence.
- Add a requirement that memory writes cannot silently convert partial evidence into authoritative memory without attribution.

### 5. Orchestration Layer

Current anchors:

- `architecture/superhuman-architecture-technical.md:213-241`

Changes now reflected in the doc:

- Add worker-cap and spawn-budget policy.
- If verification workers are adopted, name them explicitly as a runtime role or task class.

### 6. Execution Surfaces

Current anchors:

- `architecture/superhuman-architecture-technical.md:286-314`

Changes now reflected in the doc:

- Add environment capability negotiation for semantic code tools versus plain text tools.
- State that refactor and rename safety depends on host capability, not just tool availability by name.

### 7. Local State and Observability

Current anchors:

- `architecture/superhuman-architecture-technical.md:320-338`

Changes now reflected in the doc:

## Phase doc alignment

The corresponding phase docs now carry the same conclusions at the implementation-plan level:

- `architecture/01-establish-the-shell.md` now treats verification events, preview or full artifact links, partial-read markers, and semantic-tool capability flags as Phase 1 state concerns.
- `architecture/02-harden-the-runtime-core.md` now treats verification as a runtime stage, completion reporting as a contract, and text search versus semantic symbol operations as distinct tool classes.
- `architecture/03-context-and-memory.md` now treats compaction and memory as provenance-preserving systems rather than silent prompt rewriting.
- `architecture/04-orchestration-and-messaging.md` now treats worker caps, queue state, and budget inheritance as persisted orchestration policy.
- `architecture/05-proactive-and-scheduled-automation.md` now requires proactive and scheduled work to inherit the same verification, provenance, and capability rules as interactive work.
- `architecture/06-high-autonomy-execution-surfaces.md` now requires remote execution to preserve verification and provenance state and to advertise semantic-tool capability explicitly.

- Add verification history and evidence artifacts.
- Add compaction event history.
- Add persisted-preview/full-output provenance.
- Add partial-read and truncation event history.
- Add worker fan-out and child-budget history.

## Final recommendation

Superhuman should port the capabilities exposed by the tweet, not the hidden-gated implementation style behind them.

- Port: verification discipline, compaction, collapse, worker orchestration, chunked reads, persisted oversized outputs, and semantic-tool awareness.
- Reject: ant-only safety, silent truncation, silent partial reads, unbounded worker fan-out, and prompt-only quality control.
- Rewrite: make every one of these behaviors explicit in runtime policy, persisted state, and operator-visible history.
