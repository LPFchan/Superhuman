# Plugin Compatibility And Contract Analysis

- Research id: `RSH-20260409-004`
- Opened: `2026-04-09 05-19-05 KST`
- Recorded by agent: `019d6de0-986d-75e2-8d79-d9ee201759ce`

## Question

Which inherited OpenClaw plugin surfaces are true compatibility contracts, and what still needs operator choice before later validation lanes become concrete?

## Key Findings

- `openclaw/plugin-sdk/*`, `@openclaw/*`, `openclaw.plugin.json`, manifest ids, install metadata, channel ids, and loader semantics are retained compatibility contracts for this wave.
- The Phase 5 downstream cleanup successfully avoided churn in those contracts.
- The posture is conservative and explicit, but later validation still needs named third-party canaries and a chosen primary external-style install workflow.
- Upstream intake already surfaced concrete high-risk plugin-adjacent areas, especially CLI backend posture and reply-dispatch genericization.

## Routing Outcome

- The durable compatibility rule is captured in `DEC-20260409-005`.
- The unresolved canary/install-path question remains active as `IBX-20260409-002`.
- Compatibility-sensitive upstream review continues in root `upstream-intake/`.

## Source Material

- `architecture/plugin-contract-map.md`
- `architecture/plugin-compatibility-matrix.md`
- `architecture/archive/phase-5-plugin-contract-diff-report.md`
- `architecture/archive/plugin-compatibility-report.md`
- `upstream-intake/reports/internal-records/UPS-20260407-001-v2026.4.5.md`

## Historical Accounting

This memo accounts for the plugin compatibility matrix and contract-analysis family, including the historical compatibility reports kept under `architecture/archive/`.
