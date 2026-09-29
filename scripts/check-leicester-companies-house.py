"""Research non-food seed names against public Companies House search results.

Results are candidate links, not proof that a storefront trades or that its
phone number is correct. Search is deliberately throttled and failures remain
explicit. Run: py scripts/check-leicester-companies-house.py [limit]
"""

import csv
import html
import re
import sys
import time
import urllib.parse
import urllib.request
from datetime import date
from difflib import SequenceMatcher
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / "project-docs" / "seed" / "leicester-review.csv"
OUTPUT = ROOT / "project-docs" / "seed" / "leicester-companies-house-crosscheck.csv"
FOOD = {"Food & Drink", "Grocery & Food Retail", "Catering & Events"}
POSTCODE = re.compile(r"\b[A-Z]{1,2}[0-9][A-Z0-9]?\s*[0-9][A-Z]{2}\b")


def clean(markup):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", markup))).strip()


def normalize(name):
    name = name.casefold().split(" | review:")[0]
    name = re.sub(r"\b(limited|ltd|leicester)\b", "", name)
    return re.sub(r"[^a-z0-9]+", " ", name).strip()


def parse_results(page):
    results = []
    for item in re.findall(r'<li class="type-company">(.*?)</li>', page, re.S):
        link = re.search(r'href="(/company/[^"]+)"[^>]*>(.*?)</a>', item, re.S)
        if not link:
            continue
        paragraphs = re.findall(r"<p[^>]*>(.*?)</p>", item, re.S)
        results.append({
            "name": clean(link.group(2)),
            "url": "https://find-and-update.company-information.service.gov.uk" + link.group(1),
            "address": clean(paragraphs[-1]) if paragraphs else "",
            "meta": clean(paragraphs[0]) if paragraphs else "",
        })
    return results


def search(name):
    query = urllib.parse.quote(name)
    url = f"https://find-and-update.company-information.service.gov.uk/search/companies?q={query}"
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 ChodhiQ research"})
    with urllib.request.urlopen(request, timeout=25) as response:
        return parse_results(response.read().decode("utf-8", errors="replace"))


def main():
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else None
    with INPUT.open(encoding="utf-8-sig", newline="") as source:
        rows = [row for row in csv.DictReader(source) if row["category_as_printed"] not in FOOD]
    if limit is not None:
        rows = rows[:limit]
    result_rows = []
    for index, row in enumerate(rows, 1):
        raw_name = row["name_as_extracted"].split(" | REVIEW:")[0]
        expected_postcode = POSTCODE.search(row["detail_as_extracted"].upper())
        expected_postcode = re.sub(r"\s+", "", expected_postcode.group()) if expected_postcode else ""
        result = {
            "raw_id": row["raw_id"], "pdf_name": raw_name,
            "pdf_postcode": expected_postcode, "checked_on": date.today().isoformat(),
            "assessment": "no_clear_company_match", "company_name": "",
            "registered_office": "", "company_url": "", "company_meta": "",
        }
        if row["raw_id"] == "221":
            result["assessment"] = "corrupted_pdf_row_unsearchable"
        else:
            try:
                candidates = search(raw_name)
                target = normalize(raw_name)
                ranked = sorted(candidates, key=lambda item: SequenceMatcher(None, target, normalize(item["name"])).ratio(), reverse=True)
                if ranked:
                    best = ranked[0]
                    similarity = SequenceMatcher(None, target, normalize(best["name"])).ratio()
                    company_postcode = POSTCODE.search(best["address"].upper())
                    company_postcode = re.sub(r"\s+", "", company_postcode.group()) if company_postcode else ""
                    if similarity >= 0.85:
                        result["assessment"] = (
                            "name_and_registered_postcode_candidate"
                            if expected_postcode and company_postcode == expected_postcode
                            else "name_only_company_candidate"
                        )
                        result.update({
                            "company_name": best["name"], "registered_office": best["address"],
                            "company_url": best["url"], "company_meta": best["meta"],
                        })
            except Exception as exc:
                result["assessment"] = "search_error"
                result["company_meta"] = type(exc).__name__
            time.sleep(0.8)
        result_rows.append(result)
        if index % 20 == 0:
            print(f"Checked {index}/{len(rows)} non-food names", flush=True)
    with OUTPUT.open("w", newline="", encoding="utf-8-sig") as target:
        writer = csv.DictWriter(target, fieldnames=list(result_rows[0]))
        writer.writeheader()
        writer.writerows(result_rows)
    from collections import Counter
    print(dict(Counter(row["assessment"] for row in result_rows)))
    print(f"Wrote {OUTPUT}")


if __name__ == "__main__":
    main()
