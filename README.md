# SQL Query Generator — Google Apps Script

> A Google Sheets sidebar tool that automatically generates BigQuery UPDATE statements
> for database record correction workflows.
> Reduced 4–4.5 hour manual tasks to 1.5 hours — a **67% time reduction**.

---

## Overview

This tool is built directly into Google Sheets as a sidebar interface. It reads structured
correction data from a sheet, applies business logic to determine the correct query pattern,
and outputs ready-to-review BigQuery UPDATE statements — one per affected record — directly
into the sheet.

The sidebar collects two runtime inputs (table name and date limit) and passes them to the
generation engine, which handles all query construction automatically.

---

## The Problem

Correcting data inconsistencies in a live BigQuery environment required writing SQL manually:

- Reviewing error records to identify what needed fixing and how
- Determining which query pattern applied to each case (standard vs extended correction)
- Manually constructing UPDATE statements for each record — parameterising email, site names,
  location IDs, state, and country fields correctly
- Validating syntax before execution

For a batch of inconsistencies, this process consumed **4 to 4.5 hours per occurrence**.
Manual SQL construction also introduced occasional syntax errors that required additional
debugging time.

---

## The Solution

A Google Apps Script tool embedded in Google Sheets that:

1. Opens as a **sidebar panel** inside the sheet — no separate app to run
2. Accepts **table name** and **date limit** as inputs via the sidebar form
3. Reads each data row and **automatically selects the correct query pattern**
4. Generates a parameterised BigQuery UPDATE statement for every record
5. **Writes the output directly to Column I** of the same sheet — ready for review and execution

---

## Impact

| Metric | Before | After | Improvement |
|---|---|---|---|
| Time per correction batch | 4–4.5 hours | 1.5 hours | **67% reduction** |
| Manual SQL writing | 100% manual | Automated | Eliminated |
| Script selection logic | Manual judgment | Automatic | Consistent |
| Output location | Separate document | Column I, same sheet | Immediate |

---

## How It Works

### User flow

```
Open Google Sheets
       │
       ▼
Custom Menu → Open Query Generator
       │
       ▼
Sidebar opens → Enter: table name + date limit
       │
       ▼
Click Generate
       │
       ▼
Script reads Column A–H, row by row
       │
       ├── Column C value = "Unknown Site"?
       │          │
       │          ├── YES → Script 2 (Extended): adds state + country to SET clause
       │          └── NO  → Script 1 (Standard): core fields only
       │
       ├── Column B value = "Unknown Site"?
       │          │
       │          ├── YES → Adjusts SET + WHERE for site name fallback logic
       │          └── NO  → Standard site name handling
       │
       ▼
Generated UPDATE query written to Column I
       │
       ▼
Review Column I → Execute against BigQuery
```

### Automatic script selection

The tool has two query modes, selected automatically based on Column C:

| Condition | Mode | Extra fields in SET clause |
|---|---|---|
| Column C ≠ "Unknown Site" | Script 1 — Standard | None |
| Column C = "Unknown Site" | Script 2 — Extended | `state`, `country` |

### Generated query structure

```sql
UPDATE
  your_table_name
SET
  outsideHomeLocation = FALSE,
  scanSiteName = 'value',
  levelId = 'value',
  -- Script 2 only:
  state = 'value',
  country = 'value_value'
WHERE
  email = 'value'
  AND DATE(_PARTITIONTIME) > "date-limit"
  AND ScanSiteName = 'value';
```

> **Note:** `_PARTITIONTIME` is a BigQuery pseudo-column used for partition pruning.
> This tool generates BigQuery-compatible SQL syntax.

---

## Input Sheet Format

The script reads columns A through H starting at row 2. Column I is reserved for output.

| Column | Field | Description |
|---|---|---|
| A | Email | Record identifier — used in WHERE clause |
| B | Scan site name | Current site name in the record |
| C | Trigger field | If `"Unknown Site"` → activates Script 2 (extended mode) |
| D | Level ID | Location level identifier |
| E | State | State value — used in Script 2 only |
| F | Country (part 1) | Country prefix — used in Script 2 only |
| G | Country (part 2) | Country suffix — used in Script 2 only |
| H | User site name | Fallback site name — used when Column B is `"Unknown Site"` |
| **I** | **Output** | **Generated SQL UPDATE query (written by the script)** |

---

## Tech Stack

| Component | Technology |
|---|---|
| Runtime | Google Apps Script (JavaScript) |
| UI | `HtmlService` — sidebar rendered inside Google Sheets |
| Sheet access | `SpreadsheetApp` service |
| Query target | Google BigQuery (SQL syntax with `_PARTITIONTIME`) |
| Trigger | User-initiated via custom menu |

---

## Setup

### Prerequisites

- Google account with access to Google Sheets
- A BigQuery table you need to run corrections against
- Input data in the column format described above (from row 2 onward)

### Steps

**1. Copy the files into Apps Script**

- Open your Google Sheet
- Go to **Extensions → Apps Script**
- Replace the default `Code.gs` content with the code from `Code.gs` in this repo
- Create a new HTML file: click **+** next to Files → name it `Sidebar`
- Paste the contents of `Sidebar.html` from this repo into that file
- Save both files (`Ctrl + S`)

**2. Reload the sheet**

- Close the Apps Script editor
- Reload your Google Sheet
- A new menu item **"Query Tools"** (or your configured name) will appear in the menu bar

**3. Authorise on first run**

- Click **Query Tools → Open Query Generator**
- Google will prompt you to authorise the script
- Grant access to Sheets (required to read input data and write output)

**4. Run the tool**

- The sidebar opens on the right side of the sheet
- Enter the **target table name** (e.g. `project.dataset.table_name`)
- Enter the **date limit** (e.g. `2024-01-01`) — used in the `_PARTITIONTIME` filter
- Click **Generate**
- Results appear in Column I

**5. Review before executing**

- Scan the generated queries in Column I before running against BigQuery
- Pay particular attention to rows where Script 2 was triggered (where Column C was "Unknown Site")

---

## File Structure

```
repo/
├── Code.gs          Main script: menu, sidebar launcher, query generation engine
├── Sidebar.html     Sidebar UI: form inputs, styling, calls generateQueries(config)
└── README.md        This file
```

### Code.gs structure

```
onOpen()              Creates custom menu in the Sheets UI on open
showSidebar()         Opens the HTML sidebar panel (300px width)
generateQueries()     Core engine — reads sheet, applies logic, writes SQL to Column I
  ├── Row loop        Iterates A2:H[lastRow], skips empty rows
  ├── Script selection  Checks Column C for "Unknown Site" trigger
  ├── SET builder     Constructs SET clause conditionally
  ├── WHERE builder   Constructs WHERE clause with partition date filter
  └── Output writer   Writes results to Column I via setValues()
```

---

## Notes

- Empty rows (no value in Column A) are skipped and output an empty string to Column I
- The `config` object (`tableName`, `dateLimit`) is passed from the sidebar form — no hardcoded values in the script
- The `_PARTITIONTIME` filter is BigQuery-specific — if targeting a different database, this clause will need adjustment
- The tool does not execute queries — it generates them for human review before execution

---

## Context

Built for maintaining data integrity across a database serving **550–650 automotive client accounts**.
Used in production to process batches of location and site data inconsistencies arising from
client data imports and API sync operations.

---

*Built by [Arnab Bharati](https://linkedin.com/in/arnab-bharati-ai) · Part of a broader
AI automation toolkit for support operations*
