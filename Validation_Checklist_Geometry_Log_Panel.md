# Validation Checklist: Geometry Tab Log Panel

Use this checklist for the collapsible log panel inside the Geometry tab.

---

## Core Validation

- Panel opens and collapses smoothly.
- Bottom-docked footer state works.
- Panel height can be resized.
- Main viewport remains usable while the log is open.
- No console or runtime errors appear when geometry events are logged.

---

## Data Capture Validation

- Camera issues are logged.
- Orbit and pan issues are logged.
- Selection issues are logged.
- Label issues are logged.
- Restraint visibility issues are logged.
- Section / clipping issues are logged.
- Axis and View Cube issues are logged.
- Theme rendering issues are logged.
- Performance / redraw issues are logged.

---

## Clustering Validation

- Repeated identical events collapse into one issue cluster.
- Cluster counts increase when the same problem repeats.
- First seen and last seen timestamps are tracked.
- Duplicate rows are not spammed into the list.

---

## Interaction Validation

- Clicking a log row highlights the related object.
- Clicking a log row can jump to the related object.
- Search works on object id, line number, node, and message text.
- Filters update the list immediately.
- The selected object can auto-filter the log if enabled.

---

## Root Cause Validation

- The panel can show a root-cause chain.
- Secondary symptoms can be grouped under a primary geometry issue.
- The user can focus on the related cluster.

---

## Completion Rule

The geometry log panel is complete only when it captures viewer issues, clusters
duplicates, links to objects, and stays usable during navigation.

