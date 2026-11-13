# Learning and quizzes

Select law_guides, glossary_terms, quizzes or quiz_questions; query only that
field section. Use precise jurisdiction, plain-language explanation, specific
official citations and actual nonfuture reviewed_on. Source repeaters may allow
zero rows, but legal educational claims still need relevant sources. Stable IDs
use lowercase words/numbers separated by hyphens; prevent duplicate identities.

A quiz has stable_id and explicit content_version; questions have matching
quiz_id, plus a consistent native quiz_reference. Optional source_law_guide does
not replace required source_label/source_url. Each question needs 2–8 complete
options with unique valid IDs, exactly one matching correct_option_id, a clear
prompt and sourced explanation.

The Quiz question_ids array controls public order, not numeric question order
alone. Keep both consistent (order 0–19, at most 20 listed questions). List IDs
without duplicates; each must resolve to a valid published question with matching
quiz_id. A missing/invalid question can remove the whole quiz from public output.
Native reference links alone do not populate these string IDs.

Review/publish questions before the quiz, within authorized scope. Change
content_version when prompts/options/answers/explanations/order change, so new
results are separated from existing local progress. This is explicit editorial
versioning, not an automatic CMS operation. Retain question identity when its
meaning is unchanged. Check the whole public quiz and source links afterward.
