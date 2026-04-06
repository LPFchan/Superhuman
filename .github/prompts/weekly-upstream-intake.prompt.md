---
name: "Weekly Upstream Intake"
description: "Review an OpenClaw upstream release or commit window, decide accept/adapt/decline, and produce a Superhuman weekly operator brief."
argument-hint: "Release tag, compare window, or refs to review"
agent: "agent"
---

Run the weekly Superhuman upstream intake workflow for the provided upstream window.

Use the canonical workflow and rules here:

- [upstream-intake.instructions.md](../instructions/upstream-intake.instructions.md)
- [SKILL.md](../skills/weekly-upstream-intake/SKILL.md)
- [weekly-upstream-intake-template.md](../../architecture/upstream-intake/weekly-upstream-intake-template.md)
- [operator-weekly-brief-template.md](../../architecture/upstream-intake/operator-weekly-brief-template.md)
- [intake-method.md](../../architecture/upstream-intake/intake-method.md)

Expected outputs:

1. A full internal record under [architecture/upstream-intake/reports/internal-records/README.md](../../architecture/upstream-intake/reports/internal-records/README.md)
2. A separate operator brief under [architecture/upstream-intake/reports/operator-briefs/README.md](../../architecture/upstream-intake/reports/operator-briefs/README.md)

Do not keep the result at release-note summary level.
Use internet lookup when vendor policy, pricing, legal terms, or external product behavior affects the decision.
Escalate anything that changes product direction, compatibility contracts, or security posture.
