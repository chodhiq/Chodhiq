# Leicester business seed review

`leicester-review.csv` is an **unpublished research register**, extracted from
`ChodhiQ_Leicester_Business_Seed_Database.pdf` on 22 September 2026. It is not
a verified provider directory and must not be bulk-loaded into `public.providers`.
The PDF says its earlier verification notes are historical conversation notes,
not independent checks. The 230 raw IDs are preserved; they are not 230 proven
distinct operating businesses.

Each row keeps its PDF page, raw ID, category, name, detail line and notes line.
The `name_as_extracted` and other extracted fields may include PDF text encoding
artefacts. Treat them as source evidence, not clean customer-facing copy.
`possible_overlap_group` links eight pairs for manual review; it does not
authorize an automatic merge. Rows 21–30 need a legal entity versus storefront
check. Row 221 is quarantined because embedded source markup corrupts its name
and fields. Every row begins with `publish_approved=false` and no verification
source, date, reviewer, or provider ID.

`leicester-fsa-crosscheck.csv` compares all 230 raw IDs with the official
Leicester City Food Standards Agency extract dated 16 September 2026. It checks
the 112 food, grocery and catering rows; the other 118 are marked
`not_applicable`. Of the 112, 29 have an exact normalized name and postcode
match, 17 have a possible name variant at the same postcode, 13 have a name
match with a different or missing PDF postcode, and 53 have no clear match.
These are **automated candidate matches**, not reviewed verification decisions.
The FSA does not validate phone numbers, provider ownership, permission to list,
or whether a business is trading today. A missing match does not prove closure,
and a different postcode may represent a branch or relocation.

The 24 September refresh found the same 29 exact matches. Migration
`20260924120000_import_fsa_confirmed_leicester_food_businesses.sql` imports 28
of them using only the FSA-supported name, address and postcode. Raw row 32 is
excluded because its public name still contains an unresolved `?` encoding
artefact. Imported rows remain unclaimed and unverified: an FSA location match
does not earn a ChodhiQ verification badge or establish ownership.

`leicester-evidence.csv` records individually reviewed source findings. Its
`partial` and `insufficient` statuses do not authorize publication. Review it
alongside the raw register and cross-check; do not overwrite it when regenerating
the PDF extraction.

For each candidate, a reviewer should:

1. Confirm the business exists and operates in the claimed location using an
   independent current source, recording its URL and verification date.
2. Recheck name, address, postcode, phone, category, and any public description.
   Leave unknown values blank. Do not infer ownership, ethnicity, or cuisine
   from a name or from this PDF's discovery index.
3. Resolve overlaps by determining whether records describe the same storefront,
   separate branches, or a legal entity and trading name. Keep all raw IDs in
   the audit trail.
4. Resolve row 221 from a new reliable source. Its PDF text cannot be trusted.
5. Use the existing provider approval process before publishing a listing.
   Link approved records to their provider IDs and retain the verified source.

Regenerate the register from the supplied PDF with:

```powershell
py scripts/extract-leicester-seed.py 'C:\Users\ASUS\Downloads\ChodhiQ_Leicester_Business_Seed_Database.pdf'
```

Regeneration resets review columns. Do not run it after reviewers have entered
decisions without first preserving those decisions. The source PDF is read only.

Refresh the FSA comparison with `py scripts/check-leicester-fsa.py`; it fetches
the current Leicester City XML from the Food Standards Agency and overwrites only
the cross-check file.
