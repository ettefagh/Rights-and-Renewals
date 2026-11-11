# Brand logo provenance

The logos are local build assets in `apps/app/public/brand-logos/` and `apps/showcase/public/brand-logos/`. The UI loads these files locally; no logo request is sent to a third party at runtime. Each SVG has a fixed `width`, `height`, and `viewBox` for stable layout.

## developer-icons

- Repository: <https://github.com/xandemon/developer-icons>
- Revision: `4a10a1bdb1cc799956c089fc897332511d80ad52` (the `main` revision read for this implementation)
- License: MIT; copyright Sandesh Katwal aka xandemon, 2024. The full license text is included as `DEVELOPER_ICONS_LICENSE.txt` beside the copied assets in both public directories.
- Exact source paths and local files:
  - `icons/apple-dark.svg` → `apple.svg`
  - `icons/github-dark.svg` → `github.svg`
  - `icons/microsoft.svg` → `microsoft.svg`
  - `icons/notion.svg` → `notion.svg`
  - `icons/youtube.svg` → `youtube.svg`

## Simple Icons

- Installed source package: `@iconify-json/simple-icons@1.2.101`, whose `info.json` identifies Simple Icons `16.36.0` and CC0 1.0.
- Upstream project and license: <https://github.com/simple-icons/simple-icons>, CC0 1.0 Universal.
- The sanitized vector path bodies were taken from the installed `icons.json` entries. The package metadata reports `palette: false`, and these single-color vector bodies use `currentColor`; rendering them on a white tile retains their source monochrome treatment and keeps them visible in either app theme.
- Exact icon entries and local files:
  - `spotify` → `spotify.svg`
  - `mediamarkt` → `mediamarkt.svg`
  - `amazon` → `amazon.svg`
  - `netflix` → `netflix.svg`
  - `adobe` → `adobe.svg`
  - `deutschebahn` → `deutsche-bahn.svg`
  - `jetbrains` → `jetbrains.svg`
  - `saturn` → `saturn.svg`
  - `otto` → `otto.svg`
  - `vodafone` → `vodafone.svg`

## Monogram fallback

All 20 current catalog brands have local identity assets. Unknown slugs retain an accessible text monogram. No replacement mark is drawn.

## Dashboard Icons — Disney+

- Source: https://github.com/homarr-labs/dashboard-icons
- Pinned revision: d767d7327db7f8ebd3715b552523f61889eea41c
- Original file: svg/disney-plus.svg, copied unchanged to both apps as disney-plus.svg.
- Repository license: Apache-2.0; complete text stored alongside assets as DASHBOARD_ICONS_LICENSE.txt. Brand trademarks remain their respective owners.
- SHA-256: cdc480ea45b4fe48c3503e118d763f959ec9affdb645c1a71467b24b108a15ee.
- ViewBox: 0 0 512 512. Source PNG visually inspected on 11 November 2026; it depicts the Disney+ wordmark and arc on its dark tile.

## Official site identity assets

Discovered in each brand homepage link metadata and fetched unchanged on 11 November 2026. These are brand-owned site identity assets, not assets relicensed by this project. Each was visually inspected; no unrelated icons were substituted. Original PNG/ICO files are served locally in both apps.

| Brand | Source URL | SHA-256 |
| --- | --- | --- |
| Gymshark | https://www.gymshark.com/apple-touch-icon.png | 49a1cb6f3428bf3aa1bcd11b9118e531a997bb7034028bec41d520966e6eb958 |
| Mindfactory | https://www.mindfactory.de/templates/mindfactory_new/images/squares/favicon-96x96.png | ed4aadd85c76519efbe6648de99830e1cd97e019a476c9222bea15e9151c5f23 |
| McFIT | https://www.mcfit.com/favicon/apple-icon-72x72.png | e2e39af7f494f88085b9a41cc2f10256ec2ca806e44267c7f3a99f3864577c19 |
| Urban Sports Club | https://urbansportsclub.com/favicon-dark.ico | 712b449f387b8d982191556cdbbebfa7e150464823a5ca6266d6673900ced4c8 |
