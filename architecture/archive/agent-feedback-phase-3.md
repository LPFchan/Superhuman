# Technical Feedback for Agent 3

This document turns the audit into direct implementation feedback for the Phase 3 owner. It focuses on where the phase fell short of its cited source material, how to improve the execution discipline, and what the revised deliverables and exit criteria should be.

## What you did well

- You borrowed real Claude compaction and collapse ideas rather than only describing them.
- The read-time projection model is a meaningful implementation of collapse as a separate subsystem.
- The frozen memory prompt concept is a real Hermes-derived seam, not just an after-the-fact explanation.
- You implemented actual extraction, consolidation, and team-sync behavior instead of leaving the whole phase aspirational.

## Where you could do a better job

- You did not fully persist compaction and collapse as first-class durable state in the main state store. The context snapshot table stores numeric diagnostics, but not the rich collapse/recovery payloads the phase doc now requires.
- Provenance enforcement is still too prompt-driven. Extraction and consolidation rely heavily on worker instructions instead of typed runtime checks that prevent evidence laundering.
- Team memory sync is directionally correct, but still lighter than the source material the phase cites.
- The memory threat scan is much thinner than the Hermes material you cited.

## How to do a better job

- Move collapse and recovery metadata into durable SQLite state rather than leaving it in sidecar JSON or transient return payloads.
- Replace prompt-only provenance rules with code-level validation so partial, preview-derived, imported, and collapsed evidence cannot silently become authoritative durable memory.
- Treat sync state as a real subsystem with explicit pull state, push state, retry state, and blocked-file records.
- Strengthen memory prompt threat scanning to match the risk model you cited from Hermes.

## Revised deliverables

- A durable collapse ledger with committed spans, staged spans, dropped spans, restored artifacts, recovery mode, and before/after token counts.
- Extraction and consolidation records that carry explicit source provenance and evidence-quality metadata.
- Stronger frozen-memory prompt scanning aligned more closely with Hermes threat detection.
- A durable team-memory sync state object plus event history.

## Revised exit criteria

- Operators can inspect exactly what was collapsed, what was dropped, what was restored, and why.
- Memory extraction and consolidation cannot write unqualified durable memory from partial-read, preview-only, imported, or collapsed evidence.
- Team-memory sync retries conflicts correctly and records both pull and push decisions durably.
- Frozen memory prompt content remains stable for the session unless policy explicitly refreshes it.
