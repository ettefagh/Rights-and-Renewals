# Gemini CMS skill

Two delivery formats; neither adds CMS permissions or connects an editorial agent.

## Gemini app / Workspace

Create a skill using [app/skill.md](app/skill.md), or paste its instructions into
the skill editor. Name it `rights-renewals-cms-editor`. Supply the relevant live
schema/export and source evidence when using it. This short app variant does not
assume local file access or Python execution. The matching field reference is
[references/fields.md](rights-renewals-cms-editor/references/fields.md); provide
only the relevant collection excerpt to keep context small.

Google documents adding plain text or a skill.md file and invoking a saved skill
with `/SkillName`, `@SkillName`, or a natural-language request in its
[Gemini skills guide](https://services.google.com/fh/files/misc/gemini_skills_guide.pdf).
Account availability and interface can vary; the app skill was not created in a
signed-in Gemini account by this task.

## Gemini CLI

The `rights-renewals-cms-editor/` directory is self-contained: SKILL.md,
references and dependency-free Python field lookup. No Codex UI metadata is
included. User installation location: `~/.gemini/skills/rights-renewals-cms-editor/`.
Reload discovery with `/skills reload`; inspect with `/skills list`, then ask:

> Use the rights-renewals-cms-editor skill to prepare a draft-only logo update.

The following command is relative to the skill directory:

```sh
python scripts/fields.py --collection brand_policies --fields logo
```

CLI discovery/install behavior follows the official
[Gemini CLI guide](https://geminicli.com/docs/cli/using-agent-skills/).
Gemini CLI was unavailable on the build host; file installation and local
lookup validation do not prove runtime discovery, activation or CMS access.

## Maintenance

Derived from the [shared CMS skill](../rights-renewals-cms-editor/SKILL.md) and
[editor handbook](../../development-lead/CMS_EDITOR_HANDBOOK.md). The 163-field
reference remains the 12 November 2026 source snapshot, not a live schema query.
Regenerate/review both Gemini variants when their source changes; shared script
and reference files should remain byte-identical to the source skill. Main skill
files remain short; supporting references load only for the task at hand.
