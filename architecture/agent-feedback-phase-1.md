# Technical Feedback for Agent 1

This document turns the audit into direct implementation feedback for the Phase 1 owner. It focuses on where the phase fell short of its cited source material, how to improve the execution discipline, and what the revised deliverables and exit criteria should be.

## What you did well

- You preserved the OpenClaw shell instead of rewriting it.
- The boot integration stayed faithful to the existing shell flow.
- The SQLite and FTS substrate was a real borrow from Hermes, not a hand-wavy placeholder.

## Where you could do a better job

- You cited sandbox and plugin-entry material in `architecture/01-establish-the-shell.md`, but you did not actually turn those references into new shell-facing seams. The implementation preserved existing behavior, but it did not extract the cited contracts into typed Superhuman-owned interfaces.
- You undershot the Phase 1 context seam. The shipped `ContextPressureSnapshot` and noop compaction seam were smaller than the contract the phase doc claimed to establish.
- You did not deliver explicit session-scoped capability advertisement for semantic symbol operations versus workspace-search-only fallback.
- You created `actions` and `artifacts`, but you did not fully shape them around verification evidence, preview/full relationships, and partial-read provenance even though the phase doc says those are foundational state concerns.

## How to do a better job

- For seam-building phases, treat the shape of the interface as the real deliverable. If the doc cites a reference, the seam should visibly encode the reference behavior even if the implementation behind it is still a stub.
- Distinguish clearly between "preserved upstream behavior" and "ported reference behavior." If you are only delegating to existing OpenClaw code, do not imply that you created a new compatibility seam for that behavior.
- Convert every cited source line into either:
  - a new type,
  - a new persisted field,
  - or a new adapter contract.

## Revised deliverables

- A typed shell capability snapshot with explicit flags for symbol references, semantic rename, and workspace-search-only fallback.
- A richer `ContextPressureSnapshot` including configured context limit, reserved output budget, autocompact threshold, blocking threshold, and references to persisted compaction events.
- A typed `actions` model for verification and provenance events.
- A typed `artifacts` model for preview/full-output relationships and partial-read descriptors.
- A sandbox-facing compatibility seam that exposes existing OpenClaw sandbox/runtime policy state without changing current behavior.

## Revised exit criteria

- `src/superhuman/super-runtime-seams.ts` matches the full Phase 1 contract rather than a reduced placeholder subset.
- Every new session persists session, message, action, and artifact rows with structured provenance-ready fields.
- Session-scoped capability flags are queryable without inferring them from ad hoc tool-name checks.
- Boot, routing, plugin loading, and sandbox behavior remain source-compatible with current OpenClaw behavior.
