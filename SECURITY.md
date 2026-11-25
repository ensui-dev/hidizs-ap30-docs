# Security and safety reports

This repository is documentation, not software for the player. Still, two kinds of problems deserve a private
report instead of a public issue.

## What to report privately

* **A security problem in this repository or the site** (ap30.ensui.dev): for example in the GitHub Actions workflow,
  the site build, or a dependency, or a page that could be used to attack readers.
* **A security issue in the AP30 itself that is not public yet**, if you are unsure whether publishing it could put
  owners at risk. We will help decide how and when to document it. Note that several properties of the player are
  already documented openly (for example that update images are not signed and that loader USB mode accepts writes),
  because owners need them for recovery: see [guides/recovery.md](guides/recovery.md) and
  [firmware/update_process.md](firmware/update_process.md).
* **A conduct problem** that is not tied to a single post (see [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)).

## What to report publicly

* **A dangerous mistake in a procedure** (a step that could brick a player, a wrong sector range, a missing warning):
  open an issue with the **Correction** form and say it is a safety problem, so it gets the `safety` label and is fixed
  first. Speed matters more than privacy here, because readers may be following the page right now.
* Any other error in the docs: see [CONTRIBUTING.md](CONTRIBUTING.md).

## How to report privately

Use GitHub's private reporting: the repository's **Security** tab → **Report a vulnerability**. Only the maintainers
can see the report. Please include:

* what the problem is and where (page, file, workflow, firmware version);
* how to reproduce or check it;
* what could happen if it were misused.

Do not attach firmware images, flash backups or personal data. If a file is needed, the maintainers will ask how to
exchange it.

## What happens next

* We aim to acknowledge a report within **7 days** and to tell you what we plan to do.
* Fixes to the repository or site are made as soon as possible. For a device issue we agree with you on what to
  publish and when; you will be credited unless you prefer not to be.
* This is a volunteer project with no bug bounty.

Problems in the AP30's firmware itself can only be fixed by Hidizs, which is not affiliated with this project. If you
report a firmware issue to Hidizs directly, we are happy to document it once it is public.

---

Licensed like the rest of the documentation: CC BY 4.0 (see [LICENSE](LICENSE)).
