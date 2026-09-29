"""Cross-check Leicester seed rows against Leicester City's current FSA open data.

This produces review evidence only. A hygiene record is not permission to publish
a ChodhiQ provider, nor proof of a current phone number or business ownership.
"""

import csv
import re
import unicodedata
import urllib.request
import xml.etree.ElementTree as ET
from datetime import date
from difflib import SequenceMatcher
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / "project-docs" / "seed" / "leicester-review.csv"
OUTPUT = ROOT / "project-docs" / "seed" / "leicester-fsa-crosscheck.csv"
URL = "https://ratings.food.gov.uk/api/open-data-files/FHRS878en-GB.xml"
FOOD_CATEGORIES = {"Food & Drink", "Grocery & Food Retail", "Catering & Events"}


def normalize(value):
    value = unicodedata.normalize("NFKD", value or "")
    value = "".join(char for char in value if not unicodedata.combining(char))
    return re.sub(r"[^a-z0-9]+", " ", value.casefold()).strip()


def postcode(detail):
    found = re.search(r"\bLE[0-9]{1,2}\s*[0-9][A-Z]{2}\b", detail.upper())
    return re.sub(r"\s+", "", found.group()) if found else ""


def main():
    request = urllib.request.Request(URL, headers={"User-Agent": "ChodhiQ seed audit/1.0"})
    with urllib.request.urlopen(request, timeout=40) as response:
        root = ET.fromstring(response.read())
    extract_date = root.findtext("./Header/ExtractDate", "")
    establishments = []
    for item in root.findall(".//EstablishmentDetail"):
        establishments.append({
            "id": item.findtext("FHRSID", ""),
            "name": item.findtext("BusinessName", ""),
            "postcode": re.sub(r"\s+", "", item.findtext("PostCode", "").upper()),
            "address": ", ".join(filter(None, (item.findtext(f"AddressLine{n}") for n in range(1, 5)))),
        })
    with INPUT.open(encoding="utf-8-sig", newline="") as source:
        seed = list(csv.DictReader(source))
    output = []
    for row in seed:
        raw_name = row["name_as_extracted"].split(" | REVIEW:")[0]
        candidate_name = normalize(raw_name)
        candidate_postcode = postcode(row["detail_as_extracted"])
        result = {
            "raw_id": row["raw_id"],
            "pdf_name": raw_name,
            "pdf_postcode": candidate_postcode,
            "checked_on": date.today().isoformat(),
            "fsa_extract_date": extract_date,
            "assessment": "not_applicable" if row["category_as_printed"] not in FOOD_CATEGORIES else "no_clear_match",
            "fsa_id": "", "fsa_name": "", "fsa_postcode": "", "fsa_address": "", "fsa_url": "",
        }
        if result["assessment"] != "not_applicable" and candidate_name:
            ranked = sorted(
                establishments,
                key=lambda item: (
                    normalize(item["name"]) == candidate_name,
                    bool(candidate_postcode) and item["postcode"] == candidate_postcode,
                    SequenceMatcher(None, candidate_name, normalize(item["name"])).ratio(),
                ),
                reverse=True,
            )
            best = ranked[0]
            same_name = normalize(best["name"]) == candidate_name
            same_postcode = bool(candidate_postcode) and best["postcode"] == candidate_postcode
            similarity = SequenceMatcher(None, candidate_name, normalize(best["name"])).ratio()
            if same_name and same_postcode:
                result["assessment"] = "name_and_postcode_match"
            elif same_name:
                result["assessment"] = "name_match_postcode_conflict_or_missing"
            elif (same_postcode and similarity >= 0.75
                  and candidate_name.split()[0] == normalize(best["name"]).split()[0]):
                result["assessment"] = "possible_match_review"
            else:
                best = None
            if best is not None:
                result.update({
                    "fsa_id": best["id"], "fsa_name": best["name"],
                    "fsa_postcode": best["postcode"], "fsa_address": best["address"],
                    "fsa_url": f"https://ratings.food.gov.uk/business/{best['id']}",
                })
        output.append(result)
    if len(output) != 230:
        raise ValueError("Expected all 230 seed rows")
    with OUTPUT.open("w", encoding="utf-8-sig", newline="") as target:
        writer = csv.DictWriter(target, fieldnames=list(output[0]))
        writer.writeheader()
        writer.writerows(output)
    from collections import Counter
    print(f"FSA extract {extract_date}; {len(establishments)} Leicester City records")
    print(dict(Counter(row["assessment"] for row in output)))
    print(f"Wrote {OUTPUT}")


if __name__ == "__main__":
    main()
