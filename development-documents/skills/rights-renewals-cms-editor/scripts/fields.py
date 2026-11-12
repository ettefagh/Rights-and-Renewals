"""Read-only, dependency-free lookup of bundled CMS field guidance."""

import argparse
from pathlib import Path
import re
import sys


def sections(text):
    matches = list(re.finditer(r"^(#{3,4}) (.+?) — `([^`]+)`\s*$", text, re.M))
    result = {}
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        body = text[match.end():end]
        # The block-index introduction belongs to no collection.
        body = body.split("### Website section block fields", 1)[0]
        kind = "collection" if len(match[1]) == 3 else "block"
        result[(kind, match[3])] = (match[2], body)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    selector = parser.add_mutually_exclusive_group(required=True)
    selector.add_argument("--list", action="store_true", help="List section names only")
    selector.add_argument("--collection", help="Exact collection slug")
    selector.add_argument("--block", help="Exact block type")
    parser.add_argument("--fields", help="Comma-separated field paths; parent includes nested rows")
    args = parser.parse_args()
    if args.list and args.fields is not None:
        parser.error("--fields requires --collection or --block")

    source = Path(__file__).resolve().parents[1] / "references" / "fields.md"
    catalog = sections(source.read_text(encoding="utf-8-sig"))
    if args.list:
        for kind in ("collection", "block"):
            print(kind + ": " + ", ".join(key for group, key in catalog if group == kind))
        return

    kind = "collection" if args.collection else "block"
    key = args.collection or args.block
    if (kind, key) not in catalog:
        parser.error(f"Unknown {kind}: {key}. Use --list.")
    title, body = catalog[(kind, key)]
    requested = None
    if args.fields is not None:
        requested = {part.strip() for part in args.fields.split(",") if part.strip()}
        if not requested:
            parser.error("--fields must contain at least one field path")

    rows = []
    matched = set()
    for line in body.splitlines():
        match = re.match(r"^\| `([^`]+)` —", line)
        if not match:
            continue
        field = match[1]
        owners = requested and {item for item in requested if field == item or field.startswith(item + "[].")}
        if requested is None or owners:
            rows.append(line)
            if owners:
                matched.update(owners)
    if requested and requested - matched:
        parser.error("Unknown field(s): " + ", ".join(sorted(requested - matched)))
    print("Source snapshot: 12 November 2026; verify live schema before writing.")
    print(f"\n### {title} — `{key}`\n")
    print("| Field / editor label | Type | CMS requirement | Constraints / allowed values | What to fill and how to assess it |")
    print("| --- | --- | --- | --- | --- |")
    print("\n".join(rows))


if __name__ == "__main__":
    # Unicode source labels should also work on Windows non-UTF-8 consoles.
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    main()
