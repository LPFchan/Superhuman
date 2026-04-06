---
name: "Weekly Upstream Intake"
description: "Review an OpenClaw upstream release or commit window, decide accept/adapt/decline, and produce a Superhuman weekly operator brief."
argument-hint: "Release tag, compare window, or refs to review"
agent: "agent"
---

Run the weekly Superhuman upstream intake workflow for the provided upstream window.

Requirements:

- Use the repo's upstream intake policy and autonomy boundary.
- Do not stop at release-note paraphrase; explain what each meaningful change actually means.
- Group duplicate or near-duplicate upstream work into one candidate decision where appropriate.
- For each candidate, determine:
  - exact vendor, provider, feature, contract, or path changing
  - exact local Superhuman surface affected
  - before state, after state, and concrete consequence
  - what is not changing
  - end-user or operator impact
  - breaking or migration risk
  - relevance to Superhuman's current stage of development
  - overlap with existing Superhuman implementation
  - whether upstream or local implementation should win
  - upside, downside, and maintenance tradeoffs
  - security or hardening collisions with existing Superhuman behavior
  - whether the change is about policy, implementation, or both
  - one literal user or operator scenario
  - minute compatibility details if the change lands
- If the answer depends on vendor policy, pricing, legal terms, or external product behavior, use internet lookup and prefer official sources.
- Rewrite any vague phrase like `vendor-specific`, `some cases`, `this path`, or `that surface` until the referent is named explicitly.
- Classify each item as `accept`, `adapt`, or `decline`.
- Escalate anything that changes product direction, compatibility contracts, or security posture.

Output shape:

1. A full internal record written under [architecture/upstream-intake/reports/internal-records/README.md](../../architecture/upstream-intake/reports/internal-records/README.md) using [architecture/upstream-intake/weekly-upstream-intake-template.md](../../architecture/upstream-intake/weekly-upstream-intake-template.md)
2. A separate weekly operator brief written under [architecture/upstream-intake/reports/operator-briefs/README.md](../../architecture/upstream-intake/reports/operator-briefs/README.md) using [architecture/upstream-intake/operator-weekly-brief-template.md](../../architecture/upstream-intake/operator-weekly-brief-template.md), with:
   - decisions requiring operator input

- decisions made autonomously

In the operator brief, keep the full reasoning in the internal record and translate only the essential decision shape into a conversational summary.
Do not mirror the internal-record fields as a rigid checklist unless explicitly asked.
Name the exact vendor, provider, feature, or path involved in each operator-facing item, but weave that into natural prose.
When helpful, use a short paragraph followed by a few compact bullets for options, recommendation, or blocked work.
