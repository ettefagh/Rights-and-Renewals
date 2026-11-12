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
  details. Empty search shows real Add/Wiki/Tax actions. No-match Add carries
  the query into the new capture title, and an already-open capture is preserved.
- Commands: `>add <title>`, `>wiki [brand]`, `>tax`,
  `>claim <item>` and `>cancel <subscription>`. Claim/cancel show matching records
  for selection and review; they do not submit actions or open arbitrary URLs.
  Unsupported commands/arguments show guidance. Fake import/audit actions and
  unsupported tax-year promises were removed.

Following consumer-UI feedback, the **Open CMS** suggestion and `>cms`/`>emdash`
command handlers were removed from the app search. Duplicated header/footer CMS
shortcuts were also removed from the consumer app. Public policy retrieval stays
available; it does not expose an editorial-workspace action in the search menu.

Consumer-action cleanup shipped at `ba7ef6ea7d5d4a97e11f0b6d277a68a95b6ba6d3`
in Pages deployment `https://aff48974.rightsandrenewals-app.pages.dev`. The seven
focused search tests passed, including unsupported CMS/EmDash command assertions.
The app check passed (0 errors, 2 existing EmailGate warnings), edited Svelte
autofixers found no issues, and the production build passed. Served production
bundle `WalletApp.BWmy3uHN.js` matched local bytes and omitted both the Open CMS
action and editorial-dashboard shortcut strings. The public Wiki remains intact.

## Validation

Independent source review found no remaining material issue. The integrated
showcase suite passed 174 tests (including four search-helper cases). App check
passed with zero errors and two pre-existing EmailGate warnings. Official Svelte
autofixer reported no issues on the edited Svelte components; its general
suggestions about DOM refs/effects were reviewed as deliberate native-dialog
integration. No browser interaction pass is claimed.

Production app source `470ea0d7ce7c5272ba4b0f269a71450fecae1079` built successfully
and deployed to `https://rightsandrenewals-app.pages.dev/`, with immutable Pages
deployment `https://806cd576.rightsandrenewals-app.pages.dev`. Production homepage
and immutable deployment returned 200. The production `WalletApp.mOA8AUI_.js`
bytes matched the local built artifact by SHA-256 and contained the new search
dialog. The CMS Wiki API returned 20 published policies with the exact production
wallet CORS origin. The immutable Pages hostname is not an added CMS CORS origin;
use the production alias for live CMS catalog access. No CMS/database changes
were needed for this app release.

## Reported missing results follow-up

The user's screenshot shows an older launcher label and layout than the bundle
currently returned by production. An already-open page is not proof of the new
bundle executing; browser inspection remains disabled, so this distinction is
unresolved until the user reloads or browser access is enabled.

Source inspection also found concrete current-search failure paths. The older
vanilla app and current Dexie app both use `WarrantyWalletDB` version 1, but the
older rows use `name`/`merchant`/`priceEur`. Spreading missing or invalid
`searchTokens`, normalising non-string fields, and calling `toFixed` on an invalid
price can abort the result computation. Serial-number search was also missing.
The follow-up uses read-only compatible projections, not a database migration or
storage reset. Unknown price remains unavailable rather than becoming zero.

The static header policy did not allow the public CMS origin, but production's
SSR homepage returned no CSP header, so this is not a verified cause of the
reported failure. The static connect/image directives now include only the
exact production CMS origin. The SSR app shell explicitly revalidates on load;
no IndexedDB, receipt, local storage or authentication data is cleared.

Follow-up verification: 177 integrated tests passed, including seven search
cases covering mixed record shapes, missing/malformed tokens, unknown prices,
serial numbers and independent Wiki matching. Rows without a usable string or
numeric record ID are skipped rather than creating an unselectable result.
App check again passed with zero errors and two existing EmailGate warnings.
The edited omnibar passed Svelte autofix with no issues. Independent source
review reported no material blocker; live browser reproduction remains blocked.
