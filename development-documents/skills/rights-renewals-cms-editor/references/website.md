# Webpages

Pages controls supported showcase content, not wallet forms/search/navigation.
`home` controls home content; `agent-setup` controls agent setup. Other valid
non-reserved slugs use the generic page route. System routes take precedence.
Do not create pages named wiki/api/_emdash to replace them.

Use `fields.py --collection pages` and `--block <type>` as needed.
Title must fit the public reader's 180-character limit even if an older schema
omits it. Description max 320; sections max 30. Generic pages can render both
legacy portable-text content and sections: preserve existing material deliberately.

Blocks: hero, copy_section, feature_list, faq, cta. Placement defaults to content;
home-intro and agent-intro must match their special page slot and require heading.
Other placements can disappear from those templates. Hero needs heading; copy
needs heading or body; feature/FAQ need at least one complete row, at most 12.

Every rendered CTA needs cta_label + safe cta_url + stable cta_id together,
including optional hero/copy CTAs. Keep action identity for same purpose and block
_key for ordinary edits; no personal identifiers in IDs/URLs. Editor manages
_type/_version. Invalid blocks can be omitted silently: preview actual output.

Native SEO fields when enabled: seo.title, seo.description, seo.image,
seo.canonical, seo.noIndex. Generic route consumes them; special home/agent
templates have their own metadata behavior. Verify overrides before claiming
they are displayed. Avoid inadvertent exclusion from indexing.

Posts fields/taxonomies are separate from brand category. Reuse controlled
category/tag terms. A schema URL pattern is not proof of an implemented article
route; confirm an actual consumer before promising publication.
