# Technical Feedback for Agent 4

This document turns the audit into direct implementation feedback for the Phase 4 owner. It focuses on where the phase fell short of its cited source material, how to improve the execution discipline, and what the revised deliverables and exit criteria should be.

## What you did well

- You did borrow the broad worker and mailbox shape from Claude rather than inventing a completely unrelated orchestration model.
- You introduced durable local mailbox and worker storage rather than leaving orchestration entirely in memory.
- You connected approval mirroring into the orchestration path, which is the right direction.

## Where you could do a better job

- You did not actually implement the coordinator contract that the phase doc claims to port. There is no coordinator mode, no coordinator prompt, and no normalized task-notification envelope equivalent to the cited Claude behavior.
- You enforce active-worker count, but not queued-worker count, and you do not persist refusal reasons when limits are hit.
- You defined a normalized orchestration task schema, but the runtime only fills a subset of it.
- Permission relay exists, but the delivery semantics are still much thinner than the cited inbox-routing behavior.
- `remote_peer` exists only as a type-level role, not as a real runtime path.

## How to do a better job

- Build the coordinator contract before expanding spawn mechanics. The worker system should be shaped around what the lead receives and how it reasons about workers, not just around launch plumbing.
- Make queue policy a runtime-enforced invariant with durable refusal outcomes.
- Fully populate orchestration metadata at the task-registry boundary instead of leaving many fields as dead schema.
- Implement mailbox delivery as a state machine with explicit idle delivery, queued delivery, drain behavior, and approval lifecycle.
- Either implement `remote_peer` as a real role or remove it from the phase scope.

## Revised deliverables

- A real coordinator runtime mode with a stable internal task-notification envelope.
- Queue policy with `maxConcurrentWorkersPerLead`, `maxQueuedWorkersPerLead`, `queueDrainPolicy`, and durable `refusalReason`.
- Fully populated orchestration metadata in task records:
  - `executionRole`
  - `workerBackend`
  - `controllerSessionKey`
  - `queueState`
  - `stableWorkerId`
  - `queueDelayMs`
  - `parentBudget`
  - `childBudget`
  - `spawnCount`
  - `budgetUsed`
  - `lastHeartbeatAt`
  - `lastActivityAt`
  - `refusalReason`
- A mailbox transport with explicit delivery-state transitions and full approval audit history.
- A real `remote_peer` path or removal of the unused role from the contract.

## Revised exit criteria

- Spawning beyond concurrency or queue caps returns a durable refusal with a machine-readable reason.
- Every worker output is normalized into a stable notification envelope before reaching the lead session.
- Leads can launch, continue, interrupt, stop, and approve workers consistently across in-process and out-of-process backends.
- Queue state, approval history, budget inheritance, and worker identity survive restart.
- `remote_peer` is either implemented as a real role or removed from the phase scope so the contract matches reality.
