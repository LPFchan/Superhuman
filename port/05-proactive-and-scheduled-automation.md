# Phase 5: Proactive and scheduled automation

Objective:

Reach the first version of Superhuman that can detect, schedule, initiate, and complete useful work without being manually driven at every step.

Depends on:

- [01-establish-the-shell.md](01-establish-the-shell.md)
- [02-harden-the-runtime-core.md](02-harden-the-runtime-core.md)
- [03-context-and-memory.md](03-context-and-memory.md)
- [04-orchestration-and-messaging.md](04-orchestration-and-messaging.md)

Repo-local target areas:

- `src/cron/`
- `src/bootstrap/`
- `src/gateway/boot.ts`
- `src/tasks/`
- `src/polls.ts`
- local state and notification surfaces introduced earlier

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
