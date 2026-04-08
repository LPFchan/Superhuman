# Compatibility Watchlist

Use this watchlist during every weekly upstream intake review.

These surfaces need explicit scrutiny because they can break downstream compatibility, upgrade flow, or public contracts even when the upstream change looks routine.

| Surface                                                   | Why it is sensitive                                                         | Questions to ask every time                                                       |
| --------------------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Plugin SDK exports and types                              | Third-party and bundled plugins depend on these contracts                   | Does this change add, remove, rename, or reinterpret a plugin-facing contract?    |
| Plugin manifest, discovery, install, and package ids      | Changes here can break plugin loading or migration                          | Does this preserve existing plugin identity and install behavior?                 |
| Config schema, aliases, and migrations                    | Small config changes can create upgrade drift quickly                       | Is this a pure cleanup, or will it change what existing configs mean?             |
| Auth profiles, provider identity, and runtime state paths | These often affect onboarding, recovery, and upgrade continuity             | Does this change login, stored auth, provider routing, or state lookup semantics? |
| Reply delivery, routing, and dispatch seams               | Hidden changes here can break channels and plugins                          | Does this preserve shared dispatcher behavior and final-delivery semantics?       |
| Security hardening with compatibility implications        | Some hardening closes risky but real downstream assumptions                 | Are we fixing a bug, or changing an implicit contract someone may rely on?        |
| Onboarding and setup flows                                | Upstream onboarding can encode product assumptions Superhuman does not want | Is this generic setup improvement or upstream-specific product direction?         |
| Migration-sensitive runtime identity surfaces             | Paths, names, namespaces, and state keys are hard to change later           | Does this affect names, paths, or compatibility aliases that still matter?        |

Update this watchlist when a new compatibility-sensitive seam appears more than once in intake work.
