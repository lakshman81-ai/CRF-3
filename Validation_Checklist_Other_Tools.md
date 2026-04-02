# Validation Checklist: Other Viewer Tools

This document defines practical, testable criteria for the non-geometry parts of
the application.

Use it for import, data tables, analysis tabs, debug views, support workflows, and
diagnostic surfaces.

---

## How To Use

For each tool, mark it complete only when all of the following are true:

- the tool performs its intended visible action
- the relevant UI state updates correctly
- the result persists when expected
- no console or runtime error is introduced
- the tool does not break imported data, summaries, or diagnostics
- the behavior remains stable after reload

---

## Global Validation

- App loads without console errors.
- A valid project or input set opens successfully.
- The UI is visible and reachable.
- No hardcoded placeholder values appear in visible UI.
- Saved settings restore correctly after reload.
- Large data sets do not freeze the UI.
- Summary values remain consistent across tabs.
- Units remain consistent across tabs.

---

## Import / ACCDB Tool

### Validation Criteria

- ACCDB import completes successfully.
- Source units are read from the ACCDB units table.
- T1, T2, T3, P1, P2 are imported when available.
- Fluid density is imported when available.
- Insulation thickness is imported when available.
- Insulation density is imported when available.
- Missing values are blank or clearly marked, not invented.
- Stale or default values are not shown without approval.
- Import warnings are explicit and actionable.
- Invalid files fail gracefully.

### Expected Result

- The imported model matches the source data structure.
- Unit labels shown in the UI reflect the source file.

---

## Input Tab

### Validation Criteria

- Imported rows appear in the input table.
- Table columns match the parsed source fields.
- Units shown in the table match the import units.
- Missing data is visually obvious.
- Filtering and sorting work without losing row identity.
- Selecting a row highlights the related source object if supported.

### Expected Result

- The input tab is a faithful, readable representation of the imported model data.

---

## Summary Tab

### Validation Criteria

- Summary metrics match the imported data.
- Units are shown correctly.
- Derived values are consistent with raw values.
- Totals and counts do not contradict the source tables.
- No stale or repeated labels appear.

### Expected Result

- The tab provides a concise, trustworthy project summary.

---

## Stress Tab

### Validation Criteria

- Stress summary is shown at summary level, not node-by-node.
- Displacement summary is shown at summary level.
- Tabs load without error for valid input.
- Units are displayed correctly.
- No stale or hardcoded labels appear.

### Expected Result

- Analysis output is concise and presentation-ready.

---

## Debug Tab

### Validation Criteria

- Stale values are visible and clearly labeled.
- Missing values are easy to identify.
- Approval-worthy values are separated from fallback values.
- Data quality issues are readable.
- Selection or row focus updates the debug view.
- The debug tab does not mutate source data accidentally.

### Expected Result

- The debug tab helps identify data quality problems without guesswork.

---

## Nozzle Tab

### Validation Criteria

- Nozzle-related properties are shown clearly.
- Connection information is visible.
- Units are shown correctly.
- Missing nozzle properties are marked clearly.
- The tab remains stable on row selection and tab switching.

### Expected Result

- Nozzle data can be inspected without ambiguity.

---

## Supports Tab

### Validation Criteria

- Support / restraint rows are displayed correctly.
- Support type, node, and GUID are visible when available.
- Filters and sorting work correctly.
- Missing support mappings are obvious.
- Selection highlights the matching support-related object if supported.

### Expected Result

- Support data is easy to audit and reconcile with the model.

---

## Log Panels

The detailed log behavior is split across:

- `Geometry_Tab_Log_Panel_Spec.md`
- `Debug_Tab_Log_Panel_Spec.md`

The shared concepts are described in `Detail_Log_Panel_Spec.md`.

---

## Acceptance Rule

A non-geometry tool is considered complete only when:

- the feature is visible
- the feature works on real data
- the state is consistent after reload
- no regressions are introduced in the UI or data model
- the implementation is stable enough for repeated QA
