---
name: rights-and-renewals
description: Reference workflow for German consumer policy, statutory warranty rules, and subscription terms.
---

# Rights & Renewals Agent Skill

Use this skill to look up published consumer policies and statutory information. The public MCP endpoint does not require OAuth sign-in.

## Available workflows

- `policy_lookup`: Look up published goods or subscription policies and their available sources.
- `statutory_law_lookup`: Retrieve statutory information for BGB §§ 434, 437, 438, 439, 475e, 477, 309 Nr. 9, 312k, and 355.
- `subscription_category_rules`: Look up statutory contract term and cancellation notice rules by category.

For policy questions, call `policy_lookup` with a relevant brand or service slug. For a statutory question, call `statutory_law_lookup` with the requested section. For subscription term questions, call `subscription_category_rules` with the relevant category. Report returned information as server output, not as legal advice.
