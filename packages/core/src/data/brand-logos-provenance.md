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

The current 20-brand seed has no local logo vector for Mindfactory, Gymshark, McFIT / RSG Group, Urban Sports Club, or Disney+. Those brands and any unknown slug use an accessible text monogram. No replacement mark is drawn.
