---
name: weekly-upstream-intake
description: "Run the weekly OpenClaw upstream intake review. Use for release triage, commit-window review, accept/adapt/decline decisions, operator escalations, compatibility analysis, and weekly upstream reports."
argument-hint: "Upstream release, compare window, or refs to review"
---

# Weekly Upstream Intake

Use this skill when Superhuman needs a repeatable review of upstream OpenClaw changes.

## What This Skill Produces

- a structured `accept` / `adapt` / `decline` decision record for each important upstream change or grouped change set
- a separate plain-language operator brief that explains what matters and why
- explicit escalation packets for product or compatibility decisions that cannot be made autonomously

## When To Use

- weekly upstream sync review
- release note triage
- merge-window planning
- deciding whether upstream fixes should land as-is or be adapted
- preparing a report for the operator before merging upstream work

## Procedure

1. Define the upstream scope.
   - Capture the release tag, compare window, or commit range.
   - Record the current Superhuman branch or baseline.

2. Gather upstream evidence.
   - Start with release notes.
   - Read underlying commits, PRs, docs, or code when the release notes do not explain the practical impact.

3. Group changes into candidate decisions.
   - Combine near-duplicate commits into one decision when they solve the same problem.
   - Separate product-shaping work from routine bug fixes.

4. Analyze each candidate deeply.
   - Follow the drill-down and ambiguity rules in [upstream-intake.instructions.md](../../instructions/upstream-intake.instructions.md) and [architecture/upstream-intake/intake-method.md](../../../architecture/upstream-intake/intake-method.md).
   - Make sure each candidate covers the exact upstream and local surfaces, the before/after/consequence, what is not changing, overlap or collision with local work, tradeoffs, compatibility details, and at least one literal user or operator scenario.
   - If any of this depends on vendor policy, pricing, legal terms, or external product behavior, use internet lookup and prefer official sources.

5. Decide `accept`, `adapt`, or `decline`.
   - Use existing repo policy, not personal preference.
   - If the change is blocked on product direction, public contract risk, or security-vs-compatibility tradeoffs, escalate.

6. Fill the canonical template.
   - Use [architecture/upstream-intake/weekly-upstream-intake-template.md](../../../architecture/upstream-intake/weekly-upstream-intake-template.md).
   - Use [architecture/upstream-intake/intake-method.md](../../../architecture/upstream-intake/intake-method.md) to keep the analysis and recommendation shape consistent.
   - Write the full record under [architecture/upstream-intake/reports/internal-records/README.md](../../../architecture/upstream-intake/reports/internal-records/README.md).
   - Keep rationale short but concrete.

7. Produce the operator brief.
   - Use [architecture/upstream-intake/operator-weekly-brief-template.md](../../../architecture/upstream-intake/operator-weekly-brief-template.md) for the lighter summary.
   - Store it as a separate artifact under [architecture/upstream-intake/reports/operator-briefs/README.md](../../../architecture/upstream-intake/reports/operator-briefs/README.md).
   - Follow the operator brief template and instruction file instead of restating their field or formatting rules here.
   - Keep the full reasoning in the internal record; the operator brief is the shorter human-facing translation.

## Escalation Triggers

Escalate instead of guessing when the change:

- affects plugin-facing contracts or migration-sensitive compatibility surfaces
- changes onboarding, user workflow, or product positioning
- conflicts with an existing Superhuman-owned implementation and the winning policy is not already explicit
- requires declining or locally overriding a security-relevant upstream change
- removes a compatibility layer or changes a public contract

## Output Quality Bar

- Plain-language explanations, not release-note paraphrases
- Explicit tradeoffs
- Explicit compatibility details
- Clear autonomous-vs-operator split
- Recommendation grounded in current Superhuman policy and architecture
