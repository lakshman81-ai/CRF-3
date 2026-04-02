# Debug Tab Log Panel Specification

## Purpose

Create a diagnostics panel inside the Debug tab that captures import, parsing,
normalization, and data-quality issues.

This panel is for what the application knows from the source data:

- missing fields
- unit problems
- stale or fallback values
- continuity failures
- derived-value mismatches
- approval or review candidates
- row-level and table-level validation

The Debug tab log panel should help the user inspect source data and understand
why the imported model contains a problem.

---

## Placement And Behavior

- Dock to the bottom of the Debug tab.
- Collapse into a slim footer bar.
- Expand to a readable diagnostics pane.
- Stay usable while the debug table and property views remain active.
- Remember last open or collapsed state if practical.

---

## Primary Use Cases

- detect missing or invalid imported values
- detect unit mismatches
- detect stale defaults or fallback values
- detect continuity stitching failures
- detect row mapping problems
- detect property normalization issues
- detect approval-worthy values and unresolved warnings

---

## Core Views

### Import Issues

Show ACCDB parsing and field-level problems.

### Normalization Issues

Show data conversion, unit, and derived-value problems.

### Continuity Issues

Show broken From/To stitching and connectivity problems.

### Selected Row

Show every issue for the currently selected row or record.

### Root Cause

Show the chain from source field to derived problem.

---

## Data Model

Each log entry should include:

- `id`
- `fingerprint`
- `severity`
- `category`
- `message`
- `timestamp`
- `count`
- `firstSeen`
- `lastSeen`
- `tableName`
- `rowId`
- `lineNo`
- `fieldName`
- `componentType`
- `sourceValue`
- `normalizedValue`
- `derivedValue`
- `expectedValue`
- `actualValue`
- `ruleId`
- `ruleText`
- `confidence`
- `resolved`
- `approvalState`
- `tags`

### Debug Categories

- `import`
- `units`
- `normalization`
- `continuity`
- `properties`
- `stale`
- `approval`
- `schema`
- `validation`
- `export`

---

## Debug Bug Types

The panel must recognize and report these problems:

- required field missing
- source value not imported
- unit mismatch between source and target
- stale fallback value present
- duplicate or conflicting row mapping
- continuity break between connected rows
- derived value contradicts source value
- summary value contradicts raw data
- approval-required value not marked clearly
- warning repeated across multiple rows

---

## Interaction Rules

- Clicking a row highlights the related source record.
- Clicking a row can jump to the corresponding geometry if available.
- Hovering a row may preview the row details.
- Filters should update the list immediately.
- Search should support field name, row id, line number, message text, and rule id.
- The current row may auto-filter the log when enabled.

---

## Actions

- Clear all
- Copy selected
- Copy visible
- Export log
- Jump to row
- Open in geometry tab
- Compare raw vs normalized
- Show root cause chain
- Mark approved
- Mark resolved
- Unresolve

---

## Clustering Rules

- repeated identical data issues must collapse into one issue cluster
- repeated occurrences increment the count
- first seen and last seen timestamps must be tracked
- one bad source row should not create many duplicate list rows
- secondary symptoms should be grouped under the primary data issue when possible

---

## Visual Rules

- show severity clearly
- keep the footer unobtrusive when collapsed
- make errors stronger than warnings
- keep raw, normalized, and derived values visually distinct
- keep approval-state badges visible
- avoid overwhelming the user with duplicate validation messages

---

## Completion Criteria

The Debug tab log panel is complete when:

- import and normalization issues are captured in real time
- row-level problems are grouped and readable
- clicking an issue helps the user locate the problem row
- root causes and downstream symptoms are linked
- the panel supports approval and resolution workflows

