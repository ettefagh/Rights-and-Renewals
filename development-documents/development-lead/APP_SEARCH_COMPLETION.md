# App search completion

## Requested behaviour

Complete the existing wallet search rather than add a separate search surface.
Search local wallet records and the published CMS company-policy catalog. Keep
the canonical bundled catalog usable offline. Search terms and private wallet
records stay on the device; only a fixed public catalog request is permitted.

The launcher opens a native dialog. Its input owns combobox/listbox semantics;
keyboard and pointer users can select results, clear the query and close with
focus restored. Wiki results open the selected company in the in-app Wiki.
Wallet results open their selected record. Commands expose real navigation
actions and must not act on an arbitrary first wallet item or claim success for
unimplemented receipt import/audit workflows.

## Ownership and evidence

- Worker: search component, pure matching/command helpers and focused tests.
- Orchestrator: dashboard trigger, in-app Wiki integration, checks, review preview
  and evidence handoff.
- Independent reviewer: matching, privacy, navigation, keyboard/ARIA and fallback
  correctness; read-only review against current source.

Browser access was checked during this task and the tool still reports local
browser use disabled in Work settings. Rendered pointer/keyboard acceptance
therefore remains unverified until access is enabled. Old Python tests exercise
a separate OmnibarFSM model, not the actual Svelte component, so they cannot be
used as proof of app interaction.

## Delivered implementation

- Trigger: click, Ctrl/Cmd+K, or `/` outside editable controls. IME/repeated
  shortcut events do not reopen the dialog.
- Match across local title/provider/brand/category/tokens/notes and public policy
  names/slugs/categories/aliases. Case, accents, punctuation and multiword input
  are normalised. Results rank exact/prefix matches first and cap the combined
  list at eight. The input is bounded to 256 characters.
- Native modal dialog, input combobox, active-result identity, listbox options,
  polite result count, Arrow/Home/End selection, Enter, Escape, clear/close,
  selected-row scrolling and native focus return. Search clears on close.
- Published catalog comes from the existing bounded, validated public Wiki
  client with credentials omitted. The canonical bundled policies are the
  fallback. A visible source label distinguishes the two.
- Wiki selections open the in-app company card. Saved items open their own
  details. Empty search shows real Add/Wiki/Tax/CMS actions. No-match Add carries
  the query into the new capture title, and an already-open capture is preserved.
- Commands: `>add <title>`, `>wiki [brand]`, `>tax`, `>cms`/`>emdash`,
  `>claim <item>` and `>cancel <subscription>`. Claim/cancel show matching records
  for selection and review; they do not submit actions or open arbitrary URLs.
  Unsupported commands/arguments show guidance. Fake import/audit actions and
  unsupported tax-year promises were removed.

## Validation

Independent source review found no remaining material issue. The integrated
showcase suite passed 174 tests (including four search-helper cases). App check
passed with zero errors and two pre-existing EmailGate warnings. Official Svelte
autofixer reported no issues on the edited Svelte components; its general
suggestions about DOM refs/effects were reviewed as deliberate native-dialog
integration. No browser interaction pass is claimed.
