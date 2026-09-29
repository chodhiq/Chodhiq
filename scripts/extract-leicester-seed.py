"""Extract the supplied Leicester PDF into a private, unpublished review register.

Usage: py scripts/extract-leicester-seed.py PATH_TO_PDF
Requires PyMuPDF. The PDF is read only; output stays in project-docs/seed.
"""

import csv
import re
import sys
from pathlib import Path

import pymupdf


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "project-docs" / "seed" / "leicester-review.csv"
ROW = re.compile(r"^#([0-9]{3}) (.+)$")
CATEGORY = re.compile(r"^[0-9]{2} (.+) \| ([0-9]+) raw entries$")
DUPLICATE_GROUPS = (
    (10, 40), (18, 25), (72, 200), (76, 199),
    (179, 198), (101, 203), (49, 228), (6, 197),
)


def extract(pdf_path: Path):
    doc = pymupdf.open(pdf_path)
    if len(doc) != 25:
        raise ValueError(f"Expected 25 pages, found {len(doc)}")
    records = []
    category = None
    declared = {}
    for page_number in range(2, 24):
        lines = [line.strip() for line in doc[page_number - 1].get_text().splitlines()]
        for line in lines:
            match = CATEGORY.match(line)
            if match:
                category = match.group(1)
                declared[category] = int(match.group(2))
                continue
            match = ROW.match(line)
            if match:
                records.append({
                    "raw_id": int(match.group(1)),
                    "name_as_extracted": match.group(2),
                    "category_as_printed": category,
                    "pdf_page": page_number,
                    "detail_as_extracted": "",
                    "notes_as_extracted": "",
                })
                continue
            if records and line.startswith("Tags / short info:"):
                records[-1]["notes_as_extracted"] = line
            elif records and " / " in line and not records[-1]["detail_as_extracted"]:
                records[-1]["detail_as_extracted"] = line
    ids = [row["raw_id"] for row in records]
    if len(ids) != 230 or set(ids) != set(range(1, 231)):
        raise ValueError("Raw IDs must contain each number from 1 to 230 exactly once")
    if len(declared) != 14 or sum(declared.values()) != 230:
        raise ValueError("Category totals do not match the PDF's 230 entries")
    observed = {name: sum(row["category_as_printed"] == name for row in records) for name in declared}
    if observed != declared:
        raise ValueError(f"Category row counts differ: {observed} versus {declared}")
    group_by_id = {
        raw_id: "/".join(f"{part:03}" for part in group)
        for group in DUPLICATE_GROUPS for raw_id in group
    }
    for row in records:
        raw_id = row["raw_id"]
        flags = []
        if raw_id in group_by_id:
            flags.append("possible_overlap")
        if 21 <= raw_id <= 30:
            flags.append("legal_entity_or_storefront_review")
        if raw_id == 221:
            flags.append("corrupted_source_row")
        if "\ufffd" in " ".join(str(value) for value in row.values()):
            flags.append("pdf_text_encoding_damage")
        row.update({
            "source_document": pdf_path.name,
            "possible_overlap_group": group_by_id.get(raw_id, ""),
            "review_flags": ";".join(flags),
            "review_status": "quarantined" if raw_id == 221 else "needs_independent_verification",
            "verified_source_url": "",
            "last_verified_at": "",
            "verified_by": "",
            "provider_id": "",
            "publish_approved": "false",
        })
    return sorted(records, key=lambda row: row["raw_id"])


def main():
    if len(sys.argv) != 2:
        raise SystemExit("Usage: py scripts/extract-leicester-seed.py PATH_TO_PDF")
    rows = extract(Path(sys.argv[1]))
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT.open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)
    print(f"Wrote {len(rows)} unpublished review rows to {OUTPUT}")


if __name__ == "__main__":
    main()
