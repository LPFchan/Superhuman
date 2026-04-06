# Decision Carry-Forward

Use this register to preserve weekly intake outcomes that should automatically inform later reviews.

This exists to stop the same `accept` / `adapt` / `decline` question from being re-litigated every week without new evidence.

## Entry Template

- Candidate area:
- First decision date:
- Most recent confirmation date:
- Current standing decision: `accept` | `adapt` | `decline` | `defer`
- Carry-forward rationale:
- What new evidence would justify reopening this:
- Related report or ADR:

## Current Entries

- Candidate area: Generic local CLI backend support
- First decision date: 2026-04-07
- Most recent confirmation date: 2026-04-07
- Current standing decision: `adapt`
- Carry-forward rationale: Superhuman keeps generic local CLI backend support as part of the product promise, but should absorb upstream caution around vendor-specific policy-sensitive paths instead of mirroring them blindly
- What new evidence would justify reopening this: vendor terms materially change, local support burden becomes unacceptable, or product direction changes away from local-runtime flexibility
- Related report or ADR: `architecture/upstream-intake/reports/internal-records/2026-04-07-v2026.4.5.md`

- Candidate area: Legacy config alias cleanup
- First decision date: 2026-04-07
- Most recent confirmation date: 2026-04-07
- Current standing decision: `accept`
- Carry-forward rationale: Superhuman should aggressively canonicalize public config names before launch and keep legacy aliases only in normalization and doctor migration paths
- What new evidence would justify reopening this: a real installed-base migration burden appears or a retained compatibility namespace proves product-critical
- Related report or ADR: `architecture/upstream-intake/reports/internal-records/2026-04-07-v2026.4.5.md`

- Candidate area: Shared-core collision resolution
- First decision date: 2026-04-07
- Most recent confirmation date: 2026-04-07
- Current standing decision: `accept`
- Carry-forward rationale: if a fix belongs to shared core, prefer the upstream-shaped implementation; if it is tied to Superhuman-only surfaces, keep the local shape and adapt upstream ideas; if the patch changes policy, escalate the policy first
- What new evidence would justify reopening this: a repeated class of collisions shows the policy is too coarse or produces bad outcomes in practice
- Related report or ADR: `architecture/upstream-intake-policy.md`

- Candidate area: Dreaming trust model
- First decision date: 2026-04-07
- Most recent confirmation date: 2026-04-07
- Current standing decision: `defer`
- Carry-forward rationale: dreaming should extend memory rather than compete with it, but the final trust model still needs operator decisions on ownership, mutability, and recall strength
- What new evidence would justify reopening this: explicit product decision, a prototype that exposes new tradeoffs, or upstream changes that materially alter the design space
- Related report or ADR: `architecture/upstream-intake/reports/internal-records/2026-04-07-v2026.4.5.md`
