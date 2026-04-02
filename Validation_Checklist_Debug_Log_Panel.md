# Validation Checklist: Debug Tab Log Panel

Use this checklist for the diagnostics log panel inside the Debug tab.

---

## Core Validation

- Panel opens and collapses smoothly.
- Bottom-docked footer state works.
- Panel height can be resized.
- Debug views remain usable while the log is open.
- No console or runtime errors appear when debug issues are logged.

---

## Data Capture Validation

- Import issues are logged.
- Unit mismatch issues are logged.
- Stale value issues are logged.
- Continuity breaks are logged.
- Derived-value mismatches are logged.
- Approval-required values are logged.
- Schema or missing-field issues are logged.

---

## Clustering Validation

- Repeated identical data issues collapse into one issue cluster.
- Cluster counts increase when the same problem repeats.
- First seen and last seen timestamps are tracked.
- Duplicate validation rows are not spammed into the list.

---

## Interaction Validation

- Clicking a log row highlights the related source row.
- Clicking a log row can jump to geometry if supported.
- Search works on row id, line number, field name, and message text.
- Filters update the list immediately.
- The selected row can auto-filter the log if enabled.

---

## Approval Validation

- The panel can mark items as approved.
- The panel can mark items as resolved.
- The panel can unresolve items.
- Approval state is visible and persistent when expected.

---

## Completion Rule

The debug log panel is complete only when it captures data-quality issues,
clusters duplicates, links to source rows, and supports approval workflows.

