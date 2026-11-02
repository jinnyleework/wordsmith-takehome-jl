# Convention Step — Simulated on the Dataset

Nov 1, 2026 · @Jinny Lee

A run-through of step 2, "Agree the convention", on the real 220 files. The facts come from [convention-sim.py](convention-sim.py), a heuristic stand-in for the model's extraction. Its counts match the [Data Audit](data-audit.md): 12 files can't be tied to a counterparty, and 10 are recovered from the excerpt.

**Recommended default: counterparty → type, with employment as its own folder.** The user can still pick another convention or reorder the facets. See Design Decisions #15.

Re-run with:

```bash
python3 convention-sim.py "~/Downloads/contract repository dataset (2).csv" table.md
```

## Simulated conversation

**Assistant:** I've read all 220 files. They hold about 191 agreements across 28 counterparties and 10 types. 19 agreements have several versions, and 12 files don't name anyone I can identify. Your team has filed contracts four different ways: by type, by status and by year, and a `By Vendor` folder with no per-vendor folders. About 62 files sit in folders that follow no rule, such as Unsorted, Downloads, Desktop dump and To Review.

I'd recommend filing by **counterparty, then type**, so everything you have with one company is in one place, and an SOW sits next to the MSA that governs it. Employment contracts are the exception: they're with people, not companies, so I'd keep them in one Employment folder and flag them to HR. Here's how it looks on three of your files, next to two alternatives:

| | Pinnacle MSA v1 | corvus-data Lease FINAL\_v2 | Employment Agreement old (1) |
|---|---|---|---|
| **A. Counterparty → type** *(recommended, 30 top folders)* | `Pinnacle Insurance/MSA/` | `Corvus Data/Lease/` | `Employment/` |
| **B. Type → counterparty** (10 top folders) | `MSA/Pinnacle Insurance/` | `Lease/Corvus Data/` | `Employment/_Unidentified/` |
| **C. Type → status → year** (your old habit) | `MSA/Draft/No date/` | `Lease/Final/No date/` | `Employment/Unlabelled/2025/` |

This would be new for your team: no folder is named after a counterparty today.

**User:** A looks right. Can we add year underneath?

**Assistant:** I can, but most agreements have only one version, so most of the year folders would hold a single file. Year would work better in the filename, e.g. `Pinnacle Insurance – MSA – 2018-01-19.docx`. Should I put it there?

**User:** Yes. And what about status?

**Assistant:** If status is a folder level, **97 files** (draft, pending, final, or labelled both ways) would move again the moment they're signed. I'd leave it out of the folders and let the in-force rule handle it. Superseded versions go to an archive in the next step.

**User:** OK. Use this convention.

> *Decision card:* Convention: Counterparty → Type · Employment kept separate · filename: counterparty, type, ISO date · 220 files · **Undo**

## What the run shows

| Finding | Number | Design implication |
| --- | --- | --- |
| Top-level folders | 30 (28 counterparties, Employment, \_Unidentified) | Manageable to browse; the sidebar can list them alphabetically |
| Leaf folders holding one file | 77 of 122 | Two folder levels is the limit; push back when a third is added |
| Files that would move on signing if status is a folder | 97 | Raise the watch-out from the brief, with this number |
| Ambiguous dates, read day-first | 25 | State the assumption on the card; matters most inside version chains |
| Filenames with no date | 29 | The name drops the date rather than inventing one |
| New names that collide | 2 pairs: Vantage licences (2023), Harbourline employment (2023) | Vantage: likely duplicates, resolve first. Harbourline: probably two different people, so add the file ID, not a version suffix |
| Version chains sharing one folder | e.g. Pinnacle MSA ×4 | The convention doesn't pick the in-force file; superseded handling in the patterns step does |
| Orphan SOWs become visible | e.g. Greymoor: 2 SOWs, no MSA | A win for counterparty first: the gap shows in the folder |
| 5 Harbour View, Leith leases split | 7 files across Corvus, Ashworth, Marlin ×3, Bluewave, \_Unidentified | The cost of counterparty first: the clash is no longer visible in one folder, so the register and the one-off card must surface it |

*Heuristic caveats:* the type and status classifiers are regex rules, so a few labels are rough (e.g. `FINAL-…-redline` reads as Draft). The audit's figures win where they differ.

## Structure: Counterparty → Type

| Top folder | Files | Type folders (files if more than 1) |
| --- | --- | --- |
| Employment | 30 | (flat, flagged to HR) |
| Vantage Retail Group | 15 | Partnership 4, Licence 4, SOW 2, Amendment 2, Lease, DPA, MSA |
| Brightpath Health | 11 | Partnership 5, Licence 3, Lease 2, MSA |
| Crestline | 10 | NDA 6, SOW 2, Licence, Lease |
| \_Unidentified | 10 | Licence 2, DPA 2, MSA 2, NDA 2, SOW, Lease |
| Ashworth Textiles | 9 | Licence 4, Lease 2, Purchase, Amendment, SOW |
| Falcon Security | 9 | MSA 3, SOW 2, Purchase, Partnership, NDA, Lease |
| Tandem | 9 | MSA 4, SOW 3, Licence, Purchase |
| Acme Corp | 8 | MSA 3, Partnership 2, Lease, DPA, Amendment |
| Corvus Data | 8 | DPA 2, Lease, Amendment, Purchase, NDA, MSA, Partnership |
| Solara Energy | 8 | NDA 3, Partnership 3, Lease, Amendment |
| Foxglove Marketing | 7 | SOW 3, Amendment 2, Licence, NDA |
| Harbourline Shipping | 7 | Licence 2, DPA 2, Purchase 2, NDA |
| Bluewave Logistics | 6 | Lease 2, MSA, Licence, DPA, Partnership |
| Marlin | 6 | Lease 3, Licence, Partnership, MSA |
| Northgate | 6 | Purchase 2, NDA, Licence, Partnership, DPA |
| Riverstone Capital | 6 | NDA 2, Lease 2, SOW, Purchase |
| Silvergate | 6 | Purchase 2, SOW, NDA, Lease, Partnership |
| Cobalt Freight | 5 | Licence 2, NDA, MSA, Purchase |
| Elmtree Realty | 5 | SOW 2, DPA, Licence, Purchase |
| Halden | 5 | DPA, Licence, Purchase, Partnership, Lease |
| Pinnacle Insurance | 5 | MSA 4, SOW |
| Whitfield Legal Services | 5 | MSA 2, DPA 2, Lease |
| Ferrow Industries | 4 | Purchase 2, Partnership, Amendment |
| Granite | 4 | MSA, Purchase, Partnership, Licence |
| Lumen Analytics | 4 | DPA 2, Purchase, Lease |
| Meridian Cloud Systems | 4 | SOW 2, Amendment, Licence |
| Anchor Point Bank | 3 | Purchase, Lease, DPA |
| Greymoor Logistics | 3 | SOW 2, Lease |
| Oakridge Manufacturing | 2 | NDA, Licence |

## Every file: where it goes

Sorted by new folder, then date. "Status label" is what the filename claims, not proof of signature.

| ID | Current file | Current folder | New folder | New name | Status label | Note |
|---|---|---|---|---|---|---|
| F0179 | Acme Corp Amendment old.docx | /Legal/Archive/Old Deals | /Acme Corp/Amendment/ | Acme Corp – Amendment.docx | Unlabelled | no date |
| F0105 | acme-corp-Data Processing Addendum-executed (1).pdf | /Legal/Contracts/Real Estate | /Acme Corp/DPA/ | Acme Corp – DPA.pdf | Signed | no date |
| F0042 | Acme Corp\_Lease Agreement\_COPY\_20230128.doc | /Legal/Unsorted | /Acme Corp/Lease/ | Acme Corp – Lease – 2023-01-28.doc | Unlabelled |  |
| F0087 | Acme\_MSA\_copy\_20180329.docx | /Legal/NDAs/Misc | /Acme Corp/MSA/ | Acme Corp – MSA – 2018-03-29.docx | Unlabelled |  |
| F0024 | ACME\_CORP-MSA-FINAL(2)-2019-draft not final.doc | /Shared/Legal Docs/Employees | /Acme Corp/MSA/ | Acme Corp – MSA – 2019.doc | Conflicting |  |
| F0148 | Acme Corp Master Agreement draft 15.06.2019 PLEASE READ.doc | /Legal/Contracts/2023 | /Acme Corp/MSA/ | Acme Corp – MSA – 2019-06-15.doc | Draft |  |
| F0120 | Acme\_\_Corp\_\_Joint Venture Agreement\_\_draft.pdf | /Legal/Templates (do not use) | /Acme Corp/Partnership/ | Acme Corp – Partnership.pdf | Draft | no date |
| F0206 | Acme\_Corp\_Partnership Agreement\_FINAL\_Mar2019\_clean version.doc | /Legal/Contracts/2023 | /Acme Corp/Partnership/ | Acme Corp – Partnership – 2019-03.doc | Final |  |
| F0193 | old  DPA ANCHOR\_POINT\_BANK 05-09-24.pdf | /Legal/Contracts | /Anchor Point Bank/DPA/ | Anchor Point Bank – DPA – 2024-09-05.pdf | Unlabelled | ambiguous, read day-first |
| F0116 | AnchorPointBank\_Lease Agreement\_v1\_Oct2019.doc | /Legal/NDAs | /Anchor Point Bank/Lease/ | Anchor Point Bank – Lease – 2019-10.doc | Unlabelled |  |
| F0095 | old\_\_Anchor Point Bank\_\_Purchase Agreement\_\_20240326.doc | /Shared/Legal Docs | /Anchor Point Bank/Purchase/ | Anchor Point Bank – Purchase – 2024-03-26.doc | Unlabelled |  |
| F0068 | ASHWORTH\_TEXTILES\_Contract Amendment\_DRAFT\_10-06-23\_unsigned.pdf | /Legal/Contracts | /Ashworth Textiles/Amendment/ | Ashworth Textiles – Amendment – 2023-06-10.pdf | Conflicting | ambiguous, read day-first |
| F0096 | 20240313  Property Lease backup.pdf | /Legal/Archive | /Ashworth Textiles/Lease/ | Ashworth Textiles – Lease – 2024-03-13.pdf | Unlabelled | counterparty from excerpt |
| F0195 | ASHWORTH\_TEXTILES\_Lease Agreement\_DRAFT\_20250115.pdf | /Legal/NDAs/Misc | /Ashworth Textiles/Lease/ | Ashworth Textiles – Lease – 2025-01-15.pdf | Draft |  |
| F0001 | Software License-final.pdf | /Legal/Contracts/Real Estate | /Ashworth Textiles/Licence/ | Ashworth Textiles – Licence.pdf | Final | no date; counterparty from excerpt |
| F0073 | ASHWORTH\_TEXTILES License Agreement v3 01-13-19.pdf | /Legal/Contracts/2019 | /Ashworth Textiles/Licence/ | Ashworth Textiles – Licence – 2019-01-13.pdf | Unlabelled |  |
| F0046 | AshworthTextiles\_Software License\_Draft\_Oct2020.doc | /Legal/Archive/Old Deals | /Ashworth Textiles/Licence/ | Ashworth Textiles – Licence – 2020-10.doc | Draft |  |
| F0207 | Ashworth\_Textiles\_License Agreement\_reviewed\_2023.pdf | /Legal/Contracts/2023 | /Ashworth Textiles/Licence/ | Ashworth Textiles – Licence – 2023.pdf | Unlabelled |  |
| F0008 | ashworth-textiles-Purchase Agreement-v3-2023.pdf | /Legal/Contracts/Misc | /Ashworth Textiles/Purchase/ | Ashworth Textiles – Purchase – 2023.pdf | Unlabelled |  |
| F0180 | 2020-backup-Work Order-ashworth-textiles.pdf | /Legal/Contracts/By Vendor | /Ashworth Textiles/SOW/ | Ashworth Textiles – SOW – 2020.pdf | Unlabelled |  |
| F0157 | Bluewave Logistics\_DPA\_pending signature\_22.04.2024.docx | /Legal/Contracts/By Vendor | /Bluewave Logistics/DPA/ | Bluewave Logistics – DPA – 2024-04-22.docx | Pending |  |
| F0026 | Dec2019 Property Lease FINAL Bluewave\_Logistics.docx | /Legal/Contracts/By Vendor | /Bluewave Logistics/Lease/ | Bluewave Logistics – Lease – 2019-12.docx | Final |  |
| F0182 | Bluewave  Property Lease v3 20221030.pdf | /Legal/Contracts/2022 | /Bluewave Logistics/Lease/ | Bluewave Logistics – Lease – 2022-10-30.pdf | Unlabelled |  |
| F0109 | Bluewave\_IP License\_old\_2017.pdf | /Legal/NDAs | /Bluewave Logistics/Licence/ | Bluewave Logistics – Licence – 2017.pdf | Unlabelled |  |
| F0003 | 03-05-26\_draft\_Bluewave\_MSA.doc | /Legal/Unsorted | /Bluewave Logistics/MSA/ | Bluewave Logistics – MSA – 2026-05-03.doc | Draft | ambiguous, read day-first |
| F0159 | Bluewave  Logistics\_Joint Venture Agreement\_Draft\_Jul2019.pdf | /Legal/Templates (do not use) | /Bluewave Logistics/Partnership/ | Bluewave Logistics – Partnership – 2019-07.pdf | Draft |  |
| F0085 | 08-08-21-Brightpath-OLD-Property Lease.pdf | /Legal/Contracts/Misc | /Brightpath Health/Lease/ | Brightpath Health – Lease – 2021-08-08.pdf | Unlabelled |  |
| F0057 | Brightpath\_Partnership Agreement\_draft\_20.09.2021\_PLEASE READ.docx | /Legal/Contracts/2022 | /Brightpath Health/Lease/ | Brightpath Health – Lease – 2021-09-20.docx | Draft |  |
| F0161 | IP License\_2020\_Brightpath\_Health.doc | /Legal/Contracts | /Brightpath Health/Licence/ | Brightpath Health – Licence – 2020.doc | Unlabelled |  |
| F0060 | Brightpath\_Health\_License Agreement\_pending signature\_02-13-21.pdf | /Legal/Contracts/By Vendor | /Brightpath Health/Licence/ | Brightpath Health – Licence – 2021-02-13.pdf | Pending |  |
| F0069 | Brightpath Software License v2 2023.pdf | /Legal/Signed | /Brightpath Health/Licence/ | Brightpath Health – Licence – 2023.pdf | Unlabelled |  |
| F0025 | brightpath-health-Master Agreement-v2\_FINAL-03.12.2017 (1).doc | /Shared/Legal Docs/Vendors | /Brightpath Health/MSA/ | Brightpath Health – MSA – 2017-12-03.doc | Final | ambiguous, read day-first |
| F0198 | v2\_BrightpathHealth\_16.09.2021\_Partnership Agreement.pdf | /Shared/Legal Docs/Employees | /Brightpath Health/Partnership/ | Brightpath Health – Partnership – 2021-09-16.pdf | Unlabelled |  |
| F0164 | Brightpath\_Health-Joint Venture Agreement-FINAL\_v2-19.09.2021.pdf | /Legal/Contracts/2023 | /Brightpath Health/Partnership/ | Brightpath Health – Partnership – 2021-09-19.pdf | Final |  |
| F0020 | BRIGHTPATH\_HEALTH\_Joint Venture Agreement\_signed\_09-20-21.doc | /Shared/Legal Docs/Employees | /Brightpath Health/Partnership/ | Brightpath Health – Partnership – 2021-09-20.doc | Signed |  |
| F0107 | Brightpath Health Partnership Agreement DRAFT 08-30-23.docx | /Shared/Legal Docs | /Brightpath Health/Partnership/ | Brightpath Health – Partnership – 2023-08-30.docx | Draft |  |
| F0058 | BRIGHTPATH\_HEALTH\_Partnership Agreement\_08-10-25.pdf | /Legal/Contracts/By Vendor | /Brightpath Health/Partnership/ | Brightpath Health – Partnership – 2025-10-08.pdf | Unlabelled | ambiguous, read day-first |
| F0210 | v1 IP License CobaltFreight.doc | /Legal/Contracts/By Vendor | /Cobalt Freight/Licence/ | Cobalt Freight – Licence.doc | Unlabelled | no date |
| F0145 | Software  License\_Cobalt\_Freight\_Nov2020\_pending signature.doc | /Legal/Contracts/To Review | /Cobalt Freight/Licence/ | Cobalt Freight – Licence – 2020-11.doc | Pending |  |
| F0070 | final Cobalt\_Freight 23.12.2024 MSA.pdf | /Shared/Legal Docs/Employees | /Cobalt Freight/MSA/ | Cobalt Freight – MSA – 2024-12-23.pdf | Final |  |
| F0006 | cobalt-freight-Non-Disclosure-Signed-Feb2024.pdf | /Legal/Unsorted/Desktop dump 2021 | /Cobalt Freight/NDA/ | Cobalt Freight – NDA – 2024-02.pdf | Signed |  |
| F0138 | COBALT\_FREIGHT\_Supplier Agreement\_20170218\_redline.pdf | /Legal/Archive | /Cobalt Freight/Purchase/ | Cobalt Freight – Purchase – 2017-02-18.pdf | Draft |  |
| F0035 | final-Corvus-Amendment (1).pdf | /Legal/Archive | /Corvus Data/Amendment/ | Corvus Data – Amendment.pdf | Final | no date |
| F0072 | Corvus-DPA-FINAL\_v2-10-03-19.pdf | /Legal/Downloads | /Corvus Data/DPA/ | Corvus Data – DPA – 2019-03-10.pdf | Final | ambiguous, read day-first |
| F0076 | draft not final\_\_v2\_\_DPA\_\_Corvus Data\_\_10-04-19.doc | /Legal/Contracts/2021 | /Corvus Data/DPA/ | Corvus Data – DPA – 2019-04-10.doc | Conflicting | ambiguous, read day-first |
| F0004 | corvus-data\_Lease\_FINAL\_v2\_clean  version.pdf | /Legal/Downloads | /Corvus Data/Lease/ | Corvus Data – Lease.pdf | Final | no date |
| F0154 | CORVUS\_DATA MSA Draft 13.03.2020 old-do not use.doc | /Legal/Contracts/By Vendor | /Corvus Data/MSA/ | Corvus Data – MSA – 2020-03-13.doc | Draft |  |
| F0132 | Corvus\_Data-NDA-final-2023 (1).docx | /Legal/Contracts | /Corvus Data/NDA/ | Corvus Data – NDA – 2023.docx | Final |  |
| F0196 | corvus-data\_Partnership Agreement\_FINAL\_v2\_Sep2023.doc | /Shared/Legal Docs/Employees | /Corvus Data/Partnership/ | Corvus Data – Partnership – 2023-09.doc | Final |  |
| F0104 | Supplier Agreement\_executed\_20260109.doc | /Legal/Contracts/By Vendor | /Corvus Data/Purchase/ | Corvus Data – Purchase – 2026-01-09.doc | Signed | counterparty from excerpt |
| F0217 | CRESTLINE\_MEDIA\_executed\_Property Lease (1).pdf | /Legal/Templates (do not use) | /Crestline/Lease/ | Crestline – Lease.pdf | Signed | no date |
| F0074 | License Agreement copy 2019.docx | /Legal/Downloads | /Crestline/Licence/ | Crestline – Licence – 2019.docx | Unlabelled | counterparty from excerpt |
| F0150 | Crestline\_Media-Confidentiality Agreement-reviewed.pdf | /Legal/Templates (do not use) | /Crestline/NDA/ | Crestline – NDA.pdf | Unlabelled | no date |
| F0155 | crestline-media Non-Disclosure FINAL(2) 2025.doc | /Legal/Unsorted/Desktop dump 2021 | /Crestline/NDA/ | Crestline – NDA – 2025.doc | Final |  |
| F0045 | Crestline Media\_Mutual NDA\_v1\_Mar2025.docx | /Shared/Legal Docs/Employees | /Crestline/NDA/ | Crestline – NDA – 2025-03.docx | Unlabelled |  |
| F0152 | CrestlineMedia\_MNDA\_FINAL\_08.03.2025.docx | /Legal/Contracts/2023 | /Crestline/NDA/ | Crestline – NDA – 2025-03-08.docx | Final | ambiguous, read day-first |
| F0108 | crestline-media-Confidentiality Agreement-FINAL-20250706.pdf | /Legal/Contracts | /Crestline/NDA/ | Crestline – NDA – 2025-07-06.pdf | Final |  |
| F0203 | Crestline  Media\_NDA\_draft\_07-10-25.pdf | /Shared/Legal Docs | /Crestline/NDA/ | Crestline – NDA – 2025-10-07.pdf | Draft | ambiguous, read day-first |
| F0084 | CRESTLINE\_MEDIA\_v1\_Work Order\_27.02.2017.pdf | /Shared/Legal Docs | /Crestline/SOW/ | Crestline – SOW – 2017-02-27.pdf | Unlabelled |  |
| F0169 | CrestlineMedia\_Work Order\_Signed\_Nov2024.pdf | /Shared/Legal Docs/Employees | /Crestline/SOW/ | Crestline – SOW – 2024-11.pdf | Signed |  |
| F0012 | ELMTREE\_REALTY\_DPA\_v1\_28.09.2024\_clean version.pdf | /Legal/Contracts/Backup - DO NOT DELETE | /Elmtree Realty/DPA/ | Elmtree Realty – DPA – 2024-09-28.pdf | Unlabelled |  |
| F0075 | ElmtreeRealty-Software License-COPY-21.09.2019.pdf | /Shared/Legal Docs/Vendors | /Elmtree Realty/Licence/ | Elmtree Realty – Licence – 2019-09-21.pdf | Unlabelled |  |
| F0117 | ELMTREE\_REALTY  Vendor Agreement copy 2017.pdf | /Legal/Templates (do not use) | /Elmtree Realty/Purchase/ | Elmtree Realty – Purchase – 2017.pdf | Unlabelled |  |
| F0130 | Work Order\_Elmtree Realty\_Final.doc | /Legal/Templates (do not use) | /Elmtree Realty/SOW/ | Elmtree Realty – SOW.doc | Final | no date |
| F0194 | Elmtree Statement of Work FINAL(2) 2022 (1).pdf | /Legal/Contracts/Real Estate | /Elmtree Realty/SOW/ | Elmtree Realty – SOW – 2022.pdf | Final |  |
| F0033 | Cobalt\_\_Employment Agreement\_\_v3\_\_internal only.doc | /Legal/Contracts/2021 | /Employment/ | Cobalt Freight – Employment.doc | Unlabelled | no date; personal data, flag to HR |
| F0050 | Harbourline Shipping\_Employment Agreement\_signed.pdf | /Legal/Signed | /Employment/ | Harbourline Shipping – Employment.pdf | Signed | no date; personal data, flag to HR |
| F0086 | AcmeCorp\_Offer  Letter\_old.docx | /Legal/Unsorted/Desktop dump 2021 | /Employment/ | Acme Corp – Employment.docx | Unlabelled | no date; personal data, flag to HR |
| F0114 | Greymoor\_\_Logistics\_\_Employment Contract\_\_old.pdf | /Shared/Legal Docs/Employees | /Employment/ | Greymoor Logistics – Employment.pdf | Unlabelled | no date; personal data, flag to HR |
| F0118 | CRESTLINE\_MEDIA-Employment  Contract-executed.docx | /Legal/Contracts | /Employment/ | Crestline – Employment.docx | Signed | no date; personal data, flag to HR |
| F0185 | meridian-cloud-systems\_Offer Letter\_OLD (1).doc | /Legal/Contracts/2021 | /Employment/ | Meridian Cloud Systems – Employment.doc | Unlabelled | no date; personal data, flag to HR |
| F0214 | Lumen\_Analytics\_Employment Agreement\_FINAL\_PLEASE READ.pdf | /Legal/Archive/Old Deals | /Employment/ | Lumen Analytics – Employment.pdf | Final | no date; personal data, flag to HR |
| F0220 | RiverstoneCapital\_Employment  Agreement\_Final.docx | /Legal/Unsorted/Desktop dump 2021 | /Employment/ | Riverstone Capital – Employment.docx | Final | no date; personal data, flag to HR |
| F0219 | Oakridge Employment Agreement 2018.doc | /Legal/NDAs/Misc | /Employment/ | Oakridge Manufacturing – Employment – 2018.doc | Unlabelled | personal data, flag to HR |
| F0190 | Anchor Point Bank\_Employment Agreement\_FINAL\_v2\_13.04.2019.doc | /Legal/NDAs/Misc | /Employment/ | Anchor Point Bank – Employment – 2019-04-13.doc | Final | personal data, flag to HR |
| F0007 | Offer Letter\_FINAL(2)\_09.06.2019.doc | /Shared/Legal Docs/Employees | /Employment/ | Unidentified – Employment – 2019-06-09.doc | Final | ambiguous, read day-first; no counterparty; personal data, flag to HR |
| F0081 | GreymoorLogistics\_Employment Contract\_FINAL\_13.02.2020.pdf | /Legal/Contracts | /Employment/ | Greymoor Logistics – Employment – 2020-02-13.pdf | Final | personal data, flag to HR |
| F0135 | GREYMOOR\_LOGISTICS\_Employment Agreement\_draft\_02-14-20.pdf | /Legal/NDAs | /Employment/ | Greymoor Logistics – Employment – 2020-02-14.pdf | Draft | personal data, flag to HR |
| F0172 | Greymoor-Employment Agreement-reviewed-15.02.2020.pdf | /Shared/Legal Docs | /Employment/ | Greymoor Logistics – Employment – 2020-02-15.pdf | Unlabelled | personal data, flag to HR |
| F0047 | oakridge-manufacturing\_Employment Agreement\_DRAFT\_15.03.2020.pdf | /Legal/Contracts/2019 | /Employment/ | Oakridge Manufacturing – Employment – 2020-03-15.pdf | Draft | personal data, flag to HR |
| F0113 | Brightpath Health\_Employment Contract\_Signed\_26.07.2020.pdf | /Legal/Contracts/2021 | /Employment/ | Brightpath Health – Employment – 2020-07-26.pdf | Signed | personal data, flag to HR |
| F0165 | SolaraEnergy\_Employment Agreement\_OLD\_12-12-20.pdf | /Shared/Legal Docs/Vendors | /Employment/ | Solara Energy – Employment – 2020-12-12.pdf | Unlabelled | personal data, flag to HR |
| F0015 | Vantage Retail Group-Employment Agreement-old-23.01.2021 (1).doc | /Shared/Legal Docs/Vendors | /Employment/ | Vantage Retail Group – Employment – 2021-01-23.doc | Unlabelled | personal data, flag to HR |
| F0021 | Jun2021  internal only Employment Contract v3 HARBOURLINE\_SHIPPING.docx | /Legal/Templates (do not use) | /Employment/ | Harbourline Shipping – Employment – 2021-06.docx | Unlabelled | personal data, flag to HR |
| F0098 | northgate-partners\_Employment  Contract\_Signed\_Jul2021.docx | /Legal/Contracts/2019 | /Employment/ | Northgate – Employment – 2021-07.docx | Signed | personal data, flag to HR |
| F0166 | pending signature-Oakridge-Offer Letter-2022.docx | /Legal/Downloads | /Employment/ | Oakridge Manufacturing – Employment – 2022.docx | Pending | personal data, flag to HR |
| F0131 | signed\_Employment Contract\_Jan2022\_unsigned\_ashworth-textiles.pdf | /Shared/Legal Docs/Employees | /Employment/ | Ashworth Textiles – Employment – 2022-01.pdf | Conflicting | personal data, flag to HR |
| F0051 | SilvergateFoods\_Employment Agreement\_executed\_20220330 (1).pdf | /Legal/Downloads | /Employment/ | Silvergate – Employment – 2022-03-30.pdf | Signed | personal data, flag to HR |
| F0019 | 2023-Harbourline-draft-Employment Agreement.docx | /Legal/Contracts/2021 | /Employment/ | Harbourline Shipping – Employment – 2023.docx | Draft | personal data, flag to HR |
| F0094 | FINAL Harbourline 2023 Offer Letter redline.docx | /Legal/Unsorted/Desktop dump 2021 | /Employment/ | Harbourline Shipping – Employment – 2023.docx | Draft | personal data, flag to HR |
| F0115 | 04-19-23-OLD-Offer Letter-Ashworth\_Textiles.doc | /Legal/NDAs/Misc | /Employment/ | Ashworth Textiles – Employment – 2023-04-19.doc | Unlabelled | personal data, flag to HR |
| F0044 | LumenAnalytics\_Employment Agreement\_FINAL\_11-15-24\_DO NOT SEND.doc | /Shared/Legal Docs/Employees | /Employment/ | Lumen Analytics – Employment – 2024-11-15.doc | Final | personal data, flag to HR |
| F0088 | Granite Peak Mining\_Offer Letter\_v1\_09-02-25.pdf | /Legal/Contracts/Backup - DO NOT DELETE | /Employment/ | Granite – Employment – 2025-02-09.pdf | Unlabelled | ambiguous, read day-first; personal data, flag to HR |
| F0002 | Employment Agreement old 20250917 (1).pdf | /Legal/Signed | /Employment/ | Unidentified – Employment – 2025-09-17.pdf | Unlabelled | no counterparty; personal data, flag to HR |
| F0049 | Cobalt Employment Agreement copy 2026.docx | /Legal/Archive | /Employment/ | Cobalt Freight – Employment – 2026.docx | Unlabelled | personal data, flag to HR |
| F0201 | Draft Lease Oct2018 Falcon\_Security (1).pdf | /Legal/Contracts/2020 | /Falcon Security/Lease/ | Falcon Security – Lease – 2018-10.pdf | Draft |  |
| F0176 | Apr2017\_Master Services Agreement\_Falcon\_Security\_draft\_draft not final.pdf | /Legal/Contracts/Misc | /Falcon Security/MSA/ | Falcon Security – MSA – 2017-04.pdf | Conflicting |  |
| F0112 | clean version\_04-17-17\_FALCON\_SECURITY\_v1\_MSA.pdf | /Shared/Legal Docs/Vendors | /Falcon Security/MSA/ | Falcon Security – MSA – 2017-04-17.pdf | Unlabelled |  |
| F0216 | FALCON\_SECURITY Master Agreement FINAL 18.04.2017.pdf | /Legal/Contracts/Backup - DO NOT DELETE | /Falcon Security/MSA/ | Falcon Security – MSA – 2017-04-18.pdf | Final |  |
| F0177 | Falcon\_Security\_executed\_MNDA\_2022.docx | /Shared/Legal Docs | /Falcon Security/NDA/ | Falcon Security – NDA – 2022.docx | Signed |  |
| F0106 | v1\_01-30-20\_Falcon  Security\_Collab Agreement\_internal only.docx | /Legal/NDAs | /Falcon Security/Partnership/ | Falcon Security – Partnership – 2020-01-30.docx | Unlabelled |  |
| F0091 | Supplier Agreement final 20200331.pdf | /Legal/Contracts/2021 | /Falcon Security/Purchase/ | Falcon Security – Purchase – 2020-03-31.pdf | Final | counterparty from excerpt |
| F0136 | FalconSecurity-SOW-reviewed-2022.doc | /Shared/Legal Docs/Employees | /Falcon Security/SOW/ | Falcon Security – SOW – 2022.doc | Unlabelled |  |
| F0056 | Falcon Security-FINAL-Oct2023-SOW (1).doc | /Legal/Unsorted | /Falcon Security/SOW/ | Falcon Security – SOW – 2023-10.doc | Final |  |
| F0197 | Ferrow Industries\_Amendment\_backup\_09-19-18.doc | /Legal/Contracts/2020 | /Ferrow Industries/Amendment/ | Ferrow Industries – Amendment – 2018-09-19.doc | Unlabelled |  |
| F0066 | Ferrow Partnership Agreement FINAL\_v2 2018.pdf | /Legal/Signed | /Ferrow Industries/Partnership/ | Ferrow Industries – Partnership – 2018.pdf | Final |  |
| F0101 | 20220113\_Vendor Agreement\_pending signature\_Ferrow.docx | /Legal/Contracts/Misc | /Ferrow Industries/Purchase/ | Ferrow Industries – Purchase – 2022-01-13.docx | Pending |  |
| F0188 | Ferrow\_Industries-Vendor Agreement-DRAFT-03.02.2023.doc | /Legal/Unsorted | /Ferrow Industries/Purchase/ | Ferrow Industries – Purchase – 2023-02-03.doc | Draft | ambiguous, read day-first |
| F0039 | FoxgloveMarketing-Contract Amendment-copy-20210714.doc | /Legal/Contracts/To Review | /Foxglove Marketing/Amendment/ | Foxglove Marketing – Amendment – 2021-07-14.doc | Unlabelled |  |
| F0144 | Foxglove\_Marketing\_Amendment\_reviewed\_2022\_DO NOT SEND (1).docx | /Legal/Contracts/2020 | /Foxglove Marketing/Amendment/ | Foxglove Marketing – Amendment – 2022.docx | Unlabelled |  |
| F0079 | FOXGLOVE\_MARKETING\_Software License\_copy\_2026.pdf | /Legal/Contracts/2022 | /Foxglove Marketing/Licence/ | Foxglove Marketing – Licence – 2026.pdf | Unlabelled |  |
| F0124 | foxglove-marketing-MNDA-v1-2019.pdf | /Legal/Contracts/Real Estate | /Foxglove Marketing/NDA/ | Foxglove Marketing – NDA – 2019.pdf | Unlabelled |  |
| F0054 | foxglove-marketing-Work Order-COPY-Jul2018.pdf | /Shared/Legal Docs/Vendors | /Foxglove Marketing/SOW/ | Foxglove Marketing – SOW – 2018-07.pdf | Unlabelled |  |
| F0151 | Statement of Work 10-30-24 FoxgloveMarketing reviewed (1).doc | /Legal/Contracts/By Vendor | /Foxglove Marketing/SOW/ | Foxglove Marketing – SOW – 2024-10-30.doc | Unlabelled |  |
| F0218 | foxglove-marketing-SOW-signed-20241103.docx | /Legal/Contracts/Misc | /Foxglove Marketing/SOW/ | Foxglove Marketing – SOW – 2024-11-03.docx | Signed |  |
| F0133 | GranitePeakMining-Software License-Signed-10-22-24.doc | /Legal/Signed | /Granite/Licence/ | Granite – Licence – 2024-10-22.doc | Signed |  |
| F0038 | Master Agreement-draft-May2025-Granite.docx | /Shared/Legal Docs/Employees | /Granite/MSA/ | Granite – MSA – 2025-05.docx | Draft |  |
| F0099 | Granite Collab Agreement Final 20240305.doc | /Shared/Legal Docs/Vendors | /Granite/Partnership/ | Granite – Partnership – 2024-03-05.doc | Final |  |
| F0041 | GranitePeakMining-Purchase Agreement-old-2017.pdf | /Legal/Contracts/2020 | /Granite/Purchase/ | Granite – Purchase – 2017.pdf | Unlabelled |  |
| F0209 | Sep2024-Greymoor\_Logistics-Lease-backup.pdf | /Legal/Archive/Old Deals | /Greymoor Logistics/Lease/ | Greymoor Logistics – Lease – 2024-09.pdf | Unlabelled |  |
| F0125 | Greymoor Logistics-SOW-old.doc | /Legal/Contracts/To Review | /Greymoor Logistics/SOW/ | Greymoor Logistics – SOW.doc | Unlabelled | no date |
| F0010 | Greymoor\_Logistics\_v2\_FINAL\_2019\_SOW.pdf | /Legal/Contracts/Real Estate | /Greymoor Logistics/SOW/ | Greymoor Logistics – SOW – 2019.pdf | Final |  |
| F0022 | Halden Data Processing Addendum pending signature 20210217.doc | /Legal/Unsorted | /Halden/DPA/ | Halden – DPA – 2021-02-17.doc | Pending |  |
| F0184 | DRAFT\_HALDEN\_&\_CO\_Lease.docx | /Legal/Downloads | /Halden/Lease/ | Halden – Lease.docx | Draft | no date |
| F0062 | internal only\_20171116\_Software License\_halden-&-co\_Signed.docx | /Legal/Contracts/2021 | /Halden/Licence/ | Halden – Licence – 2017-11-16.docx | Signed |  |
| F0083 | Joint Venture Agreement-v3-20180412.docx | /Legal/Archive | /Halden/Partnership/ | Halden – Partnership – 2018-04-12.docx | Unlabelled | counterparty from excerpt |
| F0077 | Halden&Co-Supplier Agreement-backup-20180224.docx | /Legal/Archive/Old Deals | /Halden/Purchase/ | Halden – Purchase – 2018-02-24.docx | Unlabelled |  |
| F0065 | Harbourline\_Shipping\_Data Processing Agreement\_old\_2017\_PLEASE READ.pdf | /Legal/Contracts/2021 | /Harbourline Shipping/DPA/ | Harbourline Shipping – DPA – 2017.pdf | Unlabelled |  |
| F0170 | HarbourlineShipping\_DPA\_COPY\_24.01.2017.doc | /Legal/Contracts/Backup - DO NOT DELETE | /Harbourline Shipping/DPA/ | Harbourline Shipping – DPA – 2017-01-24.doc | Unlabelled |  |
| F0023 | Software  License-Signed.doc | /Legal/Contracts | /Harbourline Shipping/Licence/ | Harbourline Shipping – Licence.doc | Signed | no date; counterparty from excerpt |
| F0137 | Harbourline\_Shipping\_IP License\_v3\_20170628.doc | /Legal/Contracts/To Review | /Harbourline Shipping/Licence/ | Harbourline Shipping – Licence – 2017-06-28.doc | Unlabelled |  |
| F0078 | Mutual NDA copy 04-05-20 Harbourline\_Shipping.doc | /Legal/Contracts/2020 | /Harbourline Shipping/NDA/ | Harbourline Shipping – NDA – 2020-05-04.doc | Unlabelled | ambiguous, read day-first |
| F0111 | Purchase Agreement HarbourlineShipping copy Mar2021 internal only.docx | /Legal/Contracts/Misc | /Harbourline Shipping/Purchase/ | Harbourline Shipping – Purchase – 2021-03.docx | Unlabelled |  |
| F0067 | HarbourlineShipping\_Vendor Agreement\_Draft\_11.12.2022.pdf | /Legal/Unsorted | /Harbourline Shipping/Purchase/ | Harbourline Shipping – Purchase – 2022-12-11.pdf | Draft | ambiguous, read day-first |
| F0167 | Lumen\_Data Processing Agreement\_v2\_FINAL\_10-09-24.docx | /Legal/Signed | /Lumen Analytics/DPA/ | Lumen Analytics – DPA – 2024-09-10.docx | Final | ambiguous, read day-first |
| F0090 | Lumen\_Data Processing Agreement\_v3\_Oct2024.pdf | /Legal/Contracts/Misc | /Lumen Analytics/DPA/ | Lumen Analytics – DPA – 2024-10.pdf | Unlabelled |  |
| F0199 | Lumen\_Property Lease\_v2\_01-23-26.doc | /Legal/Contracts/2019 | /Lumen Analytics/Lease/ | Lumen Analytics – Lease – 2026-01-23.doc | Unlabelled |  |
| F0100 | 22.02.2026-Purchase Agreement-SIGNED-Lumen Analytics.docx | /Legal/Signed | /Lumen Analytics/Purchase/ | Lumen Analytics – Purchase – 2026-02-22.docx | Signed |  |
| F0186 | MARLIN\_CONSULTING-Property Lease-FINAL\_v2-Jul2025.doc | /Legal/Contracts/2021 | /Marlin/Lease/ | Marlin – Lease – 2025-07.doc | Final |  |
| F0103 | marlin-consulting\_signed\_Lease\_29.07.2025.pdf | /Legal/Contracts/Backup - DO NOT DELETE | /Marlin/Lease/ | Marlin – Lease – 2025-07-29.pdf | Signed |  |
| F0174 | MARLIN\_CONSULTING\_Property Lease\_executed\_2026.pdf | /Legal/Contracts/To Review | /Marlin/Lease/ | Marlin – Lease – 2026.pdf | Signed |  |
| F0146 | MARLIN\_CONSULTING-IP License-FINAL\_v2-25.08.2017 (1).pdf | /Shared/Legal Docs/Vendors | /Marlin/Licence/ | Marlin – Licence – 2017-08-25.pdf | Final |  |
| F0168 | v3\_Master Services Agreement\_12.08.2023\_Marlin.doc | /Shared/Legal Docs/Employees | /Marlin/MSA/ | Marlin – MSA – 2023-08-12.doc | Unlabelled | ambiguous, read day-first |
| F0160 | Collab Agreement-pending signature-Feb2021.pdf | /Legal/Contracts/2021 | /Marlin/Partnership/ | Marlin – Partnership – 2021-02.pdf | Pending | counterparty from excerpt |
| F0043 | Contract Amendment\_meridian-cloud-systems\_14.08.2017.pdf | /Legal/NDAs | /Meridian Cloud Systems/Amendment/ | Meridian Cloud Systems – Amendment – 2017-08-14.pdf | Unlabelled |  |
| F0202 | Meridian\_License  Agreement\_Draft\_Aug2022.pdf | /Legal/Unsorted/Desktop dump 2021 | /Meridian Cloud Systems/Licence/ | Meridian Cloud Systems – Licence – 2022-08.pdf | Draft |  |
| F0175 | Meridian Work Order FINAL.pdf | /Legal/Signed | /Meridian Cloud Systems/SOW/ | Meridian Cloud Systems – SOW.pdf | Final | no date |
| F0149 | Meridian Cloud Systems Work Order signed Oct2025.doc | /Legal/Unsorted/Desktop dump 2021 | /Meridian Cloud Systems/SOW/ | Meridian Cloud Systems – SOW – 2025-10.doc | Signed |  |
| F0128 | Northgate\_20260329\_OLD\_DPA.pdf | /Legal/Unsorted | /Northgate/DPA/ | Northgate – DPA – 2026-03-29.pdf | Unlabelled |  |
| F0097 | v3\_IP License.doc | /Legal/Unsorted | /Northgate/Licence/ | Northgate – Licence.doc | Unlabelled | no date; counterparty from excerpt |
| F0027 | Northgate\_Confidentiality Agreement\_Draft\_Dec2019.pdf | /Legal/Contracts/Real Estate | /Northgate/NDA/ | Northgate – NDA – 2019-12.pdf | Draft |  |
| F0122 | NORTHGATE\_PARTNERS\_Joint Venture Agreement\_signed\_02-14-22\_redline.doc | /Legal/Archive | /Northgate/Partnership/ | Northgate – Partnership – 2022-02-14.doc | Signed |  |
| F0173 | NorthgatePartners\_Purchase Agreement\_backup\_Apr2019.docx | /Legal/NDAs | /Northgate/Purchase/ | Northgate – Purchase – 2019-04.docx | Unlabelled |  |
| F0061 | Northgate\_Partners\_Vendor  Agreement\_backup\_Jul2024.pdf | /Shared/Legal Docs/Employees | /Northgate/Purchase/ | Northgate – Purchase – 2024-07.pdf | Unlabelled |  |
| F0141 | Oakridge Manufacturing\_License Agreement\_reviewed\_Aug2021.pdf | /Legal/Contracts/Misc | /Oakridge Manufacturing/Licence/ | Oakridge Manufacturing – Licence – 2021-08.pdf | Unlabelled |  |
| F0082 | Oakridge MNDA OLD 2021.doc | /Shared/Legal Docs | /Oakridge Manufacturing/NDA/ | Oakridge Manufacturing – NDA – 2021.doc | Unlabelled |  |
| F0011 | Master Agreement-v1-for review-Pinnacle\_Insurance.docx | /Legal/Contracts | /Pinnacle Insurance/MSA/ | Pinnacle Insurance – MSA.docx | Draft | no date |
| F0181 | PINNACLE\_INSURANCE-Master Services Agreement-FINAL\_v2-2018.pdf | /Legal/Contracts/2021 | /Pinnacle Insurance/MSA/ | Pinnacle Insurance – MSA – 2018.pdf | Final |  |
| F0123 | pinnacle-insurance-Master Services Agreement-FINAL-20180115-redline.pdf | /Legal/NDAs | /Pinnacle Insurance/MSA/ | Pinnacle Insurance – MSA – 2018-01-15.pdf | Draft |  |
| F0064 | Pinnacle Insurance-MSA-signed-19.01.2018.docx | /Legal/Contracts/Real Estate | /Pinnacle Insurance/MSA/ | Pinnacle Insurance – MSA – 2018-01-19.docx | Signed |  |
| F0110 | Pinnacle Insurance SOW v2 31.12.2025.docx | /Shared/Legal Docs/Vendors | /Pinnacle Insurance/SOW/ | Pinnacle Insurance – SOW – 2025-12-31.docx | Unlabelled |  |
| F0129 | riverstone-capital Property Lease final Apr2017.docx | /Legal/Contracts/2022 | /Riverstone Capital/Lease/ | Riverstone Capital – Lease – 2017-04.docx | Final |  |
| F0030 | Riverstone\_Capital\_Lease Agreement\_FINAL\_v2\_May2025.docx | /Legal/Contracts/Real Estate | /Riverstone Capital/Lease/ | Riverstone Capital – Lease – 2025-05.docx | Final |  |
| F0029 | pending signature-08-12-20-RiverstoneCapital-NDA.pdf | /Legal/Contracts/2020 | /Riverstone Capital/NDA/ | Riverstone Capital – NDA – 2020-12-08.pdf | Pending | ambiguous, read day-first |
| F0200 | 25.01.2021-signed-Riverstone\_Capital-Mutual NDA.docx | /Legal/Unsorted/Desktop dump 2021 | /Riverstone Capital/NDA/ | Riverstone Capital – NDA – 2021-01-25.docx | Signed |  |
| F0121 | Supplier  Agreement Riverstone\_Capital 2021 Draft.docx | /Legal/Contracts/To Review | /Riverstone Capital/Purchase/ | Riverstone Capital – Purchase – 2021.docx | Draft |  |
| F0048 | Riverstone Capital\_\_SOW\_\_02-04-20.pdf | /Legal/Contracts/Real Estate | /Riverstone Capital/SOW/ | Riverstone Capital – SOW – 2020-04-02.pdf | Unlabelled | ambiguous, read day-first |
| F0093 | Silvergate\_Foods\_Lease Agreement\_copy\_2022.pdf | /Legal/Contracts/Misc | /Silvergate/Lease/ | Silvergate – Lease – 2022.pdf | Unlabelled |  |
| F0052 | Mutual NDA\_20201212\_Silvergate\_v1.pdf | /Legal/Contracts/2019 | /Silvergate/NDA/ | Silvergate – NDA – 2020-12-12.pdf | Unlabelled |  |
| F0147 | Joint Venture Agreement SilvergateFoods 2025.pdf | /Legal/NDAs | /Silvergate/Partnership/ | Silvergate – Partnership – 2025.pdf | Unlabelled |  |
| F0208 | FINAL\_SILVERGATE\_FOODS\_Purchase Agreement.pdf | /Legal/Unsorted/Desktop dump 2021 | /Silvergate/Purchase/ | Silvergate – Purchase.pdf | Final | no date |
| F0171 | Silvergate\_Vendor Agreement\_v2\_14.05.2017.doc | /Legal/Contracts/Backup - DO NOT DELETE | /Silvergate/Purchase/ | Silvergate – Purchase – 2017-05-14.doc | Unlabelled |  |
| F0031 | Silvergate-Work Order-final.pdf | /Legal/Archive/Old Deals | /Silvergate/SOW/ | Silvergate – SOW.pdf | Final | no date |
| F0213 | Contract Amendment\_Signed\_20240724\_solara-energy.doc | /Legal/Contracts/2019 | /Solara Energy/Amendment/ | Solara Energy – Amendment – 2024-07-24.doc | Signed |  |
| F0032 | SOLARA\_ENERGY Lease DRAFT Aug2022.pdf | /Legal/Contracts/By Vendor | /Solara Energy/Lease/ | Solara Energy – Lease – 2022-08.pdf | Draft |  |
| F0119 | SOLARA\_ENERGY\_NDA\_SIGNED\_Oct2020.pdf | /Legal/Contracts/To Review | /Solara Energy/NDA/ | Solara Energy – NDA – 2020-10.pdf | Signed |  |
| F0013 | 31.07.2022-Mutual NDA.docx | /Legal/Signed | /Solara Energy/NDA/ | Solara Energy – NDA – 2022-07-31.docx | Unlabelled | counterparty from excerpt |
| F0071 | Solara Confidentiality Agreement 20250402 pending signature.doc | /Legal/Contracts/2022 | /Solara Energy/NDA/ | Solara Energy – NDA – 2025-04-02.doc | Pending |  |
| F0063 | 2017-Joint Venture Agreement-FINAL\_v2-SolaraEnergy.pdf | /Legal/Downloads | /Solara Energy/Partnership/ | Solara Energy – Partnership – 2017.pdf | Final |  |
| F0191 | Solara Energy Partnership Agreement draft 12-24-17.docx | /Legal/Archive/Old Deals | /Solara Energy/Partnership/ | Solara Energy – Partnership – 2017-12-24.docx | Draft |  |
| F0080 | FINAL(2) Partnership Agreement Solara Energy 25.12.2017.doc | /Legal/Contracts/Misc | /Solara Energy/Partnership/ | Solara Energy – Partnership – 2017-12-25.doc | Final |  |
| F0143 | Tandem Software License COPY 01-19-20.docx | /Legal/Contracts/2023 | /Tandem/Licence/ | Tandem – Licence – 2020-01-19.docx | Unlabelled |  |
| F0126 | Tandem\_Master Services Agreement\_draft\_2021.pdf | /Shared/Legal Docs/Employees | /Tandem/MSA/ | Tandem – MSA – 2021.pdf | Draft |  |
| F0189 | tandem-software\_Master  Services Agreement\_FINAL\_v2\_Jan2021 (1).pdf | /Shared/Legal Docs | /Tandem/MSA/ | Tandem – MSA – 2021-01.pdf | Final |  |
| F0156 | TANDEM\_SOFTWARE-Master Agreement-FINAL-20210115.docx | /Legal/Signed | /Tandem/MSA/ | Tandem – MSA – 2021-01-15.docx | Final |  |
| F0089 | TandemSoftware\_MSA\_COPY\_02-20-23.doc | /Legal/Contracts/Real Estate | /Tandem/MSA/ | Tandem – MSA – 2023-02-20.doc | Unlabelled |  |
| F0183 | Tandem Software-Purchase Agreement-OLD-09-08-25.docx | /Legal/Contracts/By Vendor | /Tandem/Purchase/ | Tandem – Purchase – 2025-08-09.docx | Unlabelled | ambiguous, read day-first |
| F0158 | Tandem\_20180723\_SOW\_SIGNED.docx | /Legal/Unsorted | /Tandem/SOW/ | Tandem – SOW – 2018-07-23.docx | Signed |  |
| F0163 | TANDEM\_SOFTWARE\_SOW\_COPY\_10-27-18.doc | /Legal/NDAs/Misc | /Tandem/SOW/ | Tandem – SOW – 2018-10-27.doc | Unlabelled |  |
| F0018 | Tandem-SOW-COPY-2023.pdf | /Shared/Legal Docs/Vendors | /Tandem/SOW/ | Tandem – SOW – 2023.pdf | Unlabelled |  |
| F0040 | vantage-retail-group\_\_Addendum\_\_Draft\_\_2023.pdf | /Legal/Unsorted/Desktop dump 2021 | /Vantage Retail Group/Amendment/ | Vantage Retail Group – Amendment – 2023.pdf | Draft |  |
| F0055 | vantage-retail-group\_Addendum\_FINAL(2)\_20251031\_internal only.docx | /Legal/Contracts/Misc | /Vantage Retail Group/Amendment/ | Vantage Retail Group – Amendment – 2025-10-31.docx | Final |  |
| F0192 | Vantage Retail Group\_DPA.doc | /Legal/Archive/Old Deals | /Vantage Retail Group/DPA/ | Vantage Retail Group – DPA.doc | Unlabelled | no date |
| F0037 | vantage-retail-group 04.10.2023 FINAL\_v2 Collab Agreement PLEASE READ.doc | /Legal/Contracts/2019 | /Vantage Retail Group/Lease/ | Vantage Retail Group – Lease – 2023-10-04.doc | Final | ambiguous, read day-first |
| F0014 | vantage-retail-group\_2023\_FINAL(2)\_Software License (1).pdf | /Legal/NDAs | /Vantage Retail Group/Licence/ | Vantage Retail Group – Licence – 2023.pdf | Final |  |
| F0017 | Vantage\_\_Retail\_\_Group Software License FINAL\_\_v2 2023.pdf | /Shared/Legal Docs | /Vantage Retail Group/Licence/ | Vantage Retail Group – Licence – 2023.pdf | Final |  |
| F0140 | vantage-retail-group-License Agreement-reviewed-20230812-old-do not use.pdf | /Legal/Contracts/To Review | /Vantage Retail Group/Licence/ | Vantage Retail Group – Licence – 2023-08-12.pdf | Unlabelled |  |
| F0036 | Vantage\_Retail\_Group-IP License-v2-06-15-25 (1).doc | /Legal/NDAs/Misc | /Vantage Retail Group/Licence/ | Vantage Retail Group – Licence – 2025-06-15.doc | Unlabelled |  |
| F0204 | VANTAGE\_RETAIL\_GROUP Oct2020 Master Services Agreement OLD.doc | /Legal/Contracts/To Review | /Vantage Retail Group/MSA/ | Vantage Retail Group – MSA – 2020-10.doc | Unlabelled |  |
| F0005 | VANTAGE\_RETAIL\_GROUP\_Collab Agreement\_FINAL(2)\_2020.docx | /Legal/Contracts/Misc | /Vantage Retail Group/Partnership/ | Vantage Retail Group – Partnership – 2020.docx | Final |  |
| F0142 | Vantage-Collab Agreement-v1-10-05-23-clean version.pdf | /Legal/Unsorted | /Vantage Retail Group/Partnership/ | Vantage Retail Group – Partnership – 2023-05-10.pdf | Unlabelled | ambiguous, read day-first |
| F0212 | Vantage Retail Group\_Joint Venture Agreement\_draft\_03.10.2023\_clean version.doc | /Legal/Contracts/Real Estate | /Vantage Retail Group/Partnership/ | Vantage Retail Group – Partnership – 2023-10-03.doc | Draft | ambiguous, read day-first |
| F0053 | vantage-retail-group\_Joint Venture Agreement\_signed\_04.10.2023.docx | /Legal/Contracts/2022 | /Vantage Retail Group/Partnership/ | Vantage Retail Group – Partnership – 2023-10-04.docx | Signed | ambiguous, read day-first |
| F0028 | Vantage SOW FINAL\_v2.doc | /Legal/Unsorted/Desktop dump 2021 | /Vantage Retail Group/SOW/ | Vantage Retail Group – SOW.doc | Final | no date |
| F0059 | Apr2025\_Vantage Retail Group\_draft\_Statement of Work.pdf | /Legal/Contracts/2022 | /Vantage Retail Group/SOW/ | Vantage Retail Group – SOW – 2025-04.pdf | Draft |  |
| F0215 | Data Processing Addendum redline whitfield-legal-services copy (1).doc | /Legal/Contracts/2023 | /Whitfield Legal Services/DPA/ | Whitfield Legal Services – DPA.doc | Draft | no date |
| F0211 | WHITFIELD\_LEGAL\_SERVICES\_DPA\_FINAL\_2019.pdf | /Legal/Unsorted | /Whitfield Legal Services/DPA/ | Whitfield Legal Services – DPA – 2019.pdf | Final |  |
| F0102 | WhitfieldLegalServices Property Lease Jan2023 Draft.doc | /Legal/Templates (do not use) | /Whitfield Legal Services/Lease/ | Whitfield Legal Services – Lease – 2023-01.doc | Draft |  |
| F0178 | final-Whitfield  Legal Services-MSA-06.01.2026 (1).docx | /Legal/Signed | /Whitfield Legal Services/MSA/ | Whitfield Legal Services – MSA – 2026-01-06.docx | Final | ambiguous, read day-first |
| F0205 | 02-02-26 whitfield-legal-services Master Services Agreement v2.doc | /Legal/Contracts/2022 | /Whitfield Legal Services/MSA/ | Whitfield Legal Services – MSA – 2026-02-02.doc | Unlabelled |  |
| F0016 | Nov2024\_v1\_Data Processing Agreement.pdf | /Legal/Unsorted/Desktop dump 2021 | /_Unidentified/DPA/ | Unidentified – DPA – 2024-11.pdf | Unlabelled | no counterparty |
| F0034 | DPA\_v2\_May2025.docx | /Shared/Legal Docs/Vendors | /_Unidentified/DPA/ | Unidentified – DPA – 2025-05.docx | Unlabelled | no counterparty |
| F0162 | 10-23-23\_Lease\_v3.docx | /Legal/Contracts/2022 | /_Unidentified/Lease/ | Unidentified – Lease – 2023-10-23.docx | Unlabelled | no counterparty |
| F0187 | IP License OLD Apr2017.docx | /Legal/Downloads | /_Unidentified/Licence/ | Unidentified – Licence – 2017-04.docx | Unlabelled | no counterparty |
| F0009 | IP License-FINAL\_v2-20210622.doc | /Legal/Contracts/2020 | /_Unidentified/Licence/ | Unidentified – Licence – 2021-06-22.doc | Final | no counterparty |
| F0092 | Master Agreement\_27.11.2017\_v2.doc | /Legal/Contracts/Backup - DO NOT DELETE | /_Unidentified/MSA/ | Unidentified – MSA – 2017-11-27.doc | Unlabelled | no counterparty |
| F0127 | Master Agreement-Signed-03.02.2018.pdf | /Legal/Downloads | /_Unidentified/MSA/ | Unidentified – MSA – 2018-02-03.pdf | Signed | ambiguous, read day-first; no counterparty |
| F0139 | MNDA v3 2020.pdf | /Legal/Contracts/By Vendor | /_Unidentified/NDA/ | Unidentified – NDA – 2020.pdf | Unlabelled | no counterparty |
| F0153 | Confidentiality Agreement\_executed\_Jul2023.doc | /Legal/Contracts/2019 | /_Unidentified/NDA/ | Unidentified – NDA – 2023-07.doc | Signed | no counterparty |
| F0134 | executed\_17.06.2018\_Statement of Work.doc | /Legal/Contracts/2023 | /_Unidentified/SOW/ | Unidentified – SOW – 2018-06-17.doc | Signed | no counterparty |
