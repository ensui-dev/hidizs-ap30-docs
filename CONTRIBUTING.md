# Contributing

Corrections, measurements and new findings about the Hidizs AP30 are welcome.

## Where to go
| You have… | Use |
|---|---|
| an error, outdated or unclear text | an issue: **Correction** |
| a topic the docs don't cover | an issue: **Missing information** |
| a new measurement, observation or result | Discussions: **Findings** |
| a question | Discussions: **Q&A** |
| a player that won't boot | Discussions: **Recovery** (read [guides/recovery.md](guides/recovery.md) first) |
| a ready-made change to a page | a pull request |

## Labels
Issues and discussions are sorted with these labels. The forms add the first five automatically; maintainers add
the rest.

| Label | Colour | Meaning |
|---|---|---|
| `correction` | `#d73a4a` | Something in the docs is wrong, outdated or unclear |
| `missing` | `#fbca04` | Topic or detail the docs don't cover yet |
| `finding` | `#0075ca` | New measurement, observation or result about the AP30 |
| `question` | `#d876e3` | How does something on the AP30 or in its firmware work? |
| `recovery` | `#e99695` | Help with a player that won't boot or needs restoring |
| `needs-evidence` | `#c5def5` | Claim needs a source, measurement or firmware version before it goes in |
| `device-test` | `#5319e7` | Needs checking on a real AP30 (measurement, photo, behaviour) |
| `safety` | `#b60205` | Affects a procedure that writes to the player; review with extra care |
| `help wanted` | `#008672` | Needs someone with the right tool, skill or device to answer |
| `good first issue` | `#7057ff` | Small fix, good for a first contribution |
| `accessibility` | `#f143ab` | Barrier affecting people with disabilities |
| `duplicate` | `#cfd3d7` | Already reported or discussed elsewhere |
| `invalid` | `#e4e669` | Not about the AP30, or not reproducible |
| `wontfix` | `#ffffff` | Out of scope, or would break the docs' rules (vendor code, personal data, binaries) |

A firmware bug in the AP30 itself is a `finding`; an error in these docs is a `correction`.

## Rules for content (same as the [README](README.md#rules-for-this-collection))
* **Provenance tag on every claim:** [AP30] confirmed on the device or in its firmware (name the version),
  [TRM] / [DS] chip documentation, [EVK] Rockchip reference-board documents, [EM] Snowsky Echo Mini only,
  [WEB] a public source (link it), [?] a guess. Say how a measurement was made.
* **Your own words.** No decompiled or disassembled vendor code, no copied SDK source, no vendor images, fonts or
  text dumps. Register values, pin tables and command sequences as tables are fine.
* **No personal data.** No names, e-mail addresses, serial numbers, personal photos, or contents of anyone's backup.
* **No binaries.** Don't attach firmware images or flash backups to issues, discussions or pull requests.
* **Safety.** A procedure that writes to the player needs a warning box, the recovery path, and what must never be
  written.
* **Self-contained.** Link only to pages in this repository or to public URLs.

## Licence of contributions
By contributing you agree that your text, diagrams and page changes are licensed under
[CC BY 4.0](LICENSES/CC-BY-4.0.txt), and data tables and code snippets under [CC0 1.0](LICENSES/CC0-1.0.txt), as
described in [LICENSE](LICENSE).

## Behaviour
Be kind and patient; many readers are new to embedded hardware. Stay on topic, assume good faith, and don't share
anything that could hurt someone's device or privacy. Maintainers may edit or remove posts that break these rules.
The full rules and how to report a problem privately: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Security and safety
A dangerous mistake in a procedure: open a **Correction** issue and say it is a safety problem, so it is fixed first.
A security problem in the repository or the site, or an unpublished security issue in the player: report it
privately as described in [SECURITY.md](SECURITY.md).
