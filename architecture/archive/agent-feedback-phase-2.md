# Technical Feedback for Agent 2

This document turns the audit into direct implementation feedback for the Phase 2 owner. It focuses on where the phase fell short of its cited source material, how to improve the execution discipline, and what the revised deliverables and exit criteria should be.

## What you did well

- This was the strongest phase.
- The runtime-stage model, iteration budgets, and tool-batch planning are real ports of Hermes ideas rather than implementations invented from doc prose.
- You wired the runtime staging into multiple execution surfaces instead of keeping it isolated to one path.

## Where you could do a better job

- You stopped short of making verification a hard runtime contract. Code-editing runs still fall back to implicit `not_verifiable` behavior instead of requiring an explicit verification plan and verification execution path.
- You defined child-budget and orchestration-related task fields, but you did not consistently populate them in durable task state.
- Transcript hygiene stayed too text-centric. The phase doc requires replay-safe structured metadata for verification, partial reads, and persisted previews, but the implementation mainly sanitizes strings.
- The command-risk classifier is narrower than the phase contract suggests. It focuses mostly on `bash` and `exec` rather than fully owning the shell/process risk boundary.

## How to do a better job

- Treat verification as a first-class runtime stage machine, not a best-effort annotation at the end.
- If a field is in the task schema, wire it through the real launch, execution, queue, and completion paths. Do not stop at defining types.
- Promote transcript metadata to structured replay-safe annotations instead of relying on prose or sanitized text.
- Apply the same runtime contract across all lanes by collapsing legacy path-specific exceptions wherever possible.

## Revised deliverables

- A mandatory verification pipeline with explicit `verification_planning` and `verification_execution` stages.
- Durable child-budget task metadata including `parentBudget`, `childBudget`, `spawnCount`, `queueDelayMs`, and `budgetUsed`.
- Replay-safe structured annotations for verification status, partial reads, and persisted previews.
- Broader command-risk coverage across shell and process execution surfaces, not only `bash` and `exec`.

## Revised exit criteria

- No code-editing task can reach a success terminal state without an explicit `verified`, `not_verifiable`, or `verification_failed` outcome.
- Task records persist child-budget and queue metadata for every spawned worker path.
- Replayed transcripts preserve structured verification and evidence metadata.
- Interactive, background, scheduled, and remote lanes all expose the same runtime-stage semantics.
