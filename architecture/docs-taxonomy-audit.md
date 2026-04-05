# Docs Taxonomy Audit

## Purpose

This audit records the current English docs taxonomy after the Phase 6 public-docs cleanup.

The goal is not to rewrite every page in one pass.
The goal is to classify the public docs tree so future cleanup can happen without re-litigating which material belongs in product docs versus internal architecture docs.

## Classification Rules

- `keep and rebrand`: public product docs that should read as Superhuman
- `keep mostly upstream-shaped but update framing`: public technical docs where the contract remains compatibility-sensitive
- `retire`: public pages that should disappear once replacements exist
- `move to internal architecture docs`: planning, migration mechanics, or audit material that does not belong in published product docs

## Section Audit

| Docs area                                | Classification                                 | Notes                                                                                        |
| ---------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `docs/index.md`                          | keep and rebrand                               | public homepage already rewritten as Superhuman                                              |
| `docs/start/**`                          | keep and rebrand                               | onboarding and getting-started flows should speak in Superhuman-first terms                  |
| `docs/install/**`                        | keep and rebrand                               | install, upgrade, and migration guidance are public product docs                             |
| `docs/gateway/**`                        | keep mostly upstream-shaped but update framing | many pages describe shared host behavior and should keep compatibility-aware wording         |
| `docs/plugins/**`                        | keep mostly upstream-shaped but update framing | plugin docs must preserve inherited SDK and manifest contracts                               |
| `docs/providers/**`                      | keep mostly upstream-shaped but update framing | provider docs are mostly generic and should not absorb unnecessary product-specific branding |
| `docs/channels/**`                       | keep mostly upstream-shaped but update framing | channel setup docs remain public and compatibility-sensitive                                 |
| `docs/reference/**`                      | keep and rebrand                               | provenance, migration posture, and technical reference remain public                         |
| planning or migration execution material | move to internal architecture docs             | now lives under `architecture/` rather than `docs/`                                          |

## Specific Phase 6 Outcomes

- `docs/` remains the only public docs root.
- `architecture/` is now the internal planning and migration root.
- Provenance and migration pages are public.
- Compatibility namespaces and plugin compatibility contracts now have dedicated public pages.
- Public docs cleanup is still incomplete in deeper gateway, install, and channel/operator pages.

## Residual Cleanup Queue

- Continue replacing OpenClaw-first wording in deeper `docs/start/**` pages where the surface is now clearly public product identity.
- Keep compatibility-sensitive plugin and gateway docs conservative until a versioned migration path exists.
- Do not move planning, audit, or execution playbooks back into `docs/`.
