# Shared Diagnostics Log Core Specification

## Purpose

Define the shared diagnostics model used by both log panels:

- the Geometry tab log panel
- the Debug tab log panel

This is not a single UI panel spec. It is the shared issue model, clustering
behavior, and log vocabulary that both panels should reuse.

## Reframed Concept

The log system should behave like a diagnostics cockpit, not a raw console dump.
Each panel can present different data, but both should share the same core
concepts:

- live event stream
- active issue queue
- root-cause inspector
- selected-object history
- system health summary

The key rule is correlation. Repeated messages should not spam the list. They
should collapse into a single issue cluster with a fingerprint, count, and clear
source reference.

---

## Design Goals

- Dock to the bottom of the tab that owns it.
- Collapse into a slim footer bar.
- Expand to a readable diagnostics panel.
- Show newest issues first.
- Support filtering by severity and category.
- Link every issue to the affected model object or input row.
- Make bug identification fast and repeatable.
- Collapse repeated events into issue fingerprints instead of duplicating rows.
- Show why an issue exists, not only that it exists.
- Preserve the panel state across reload when practical.

---

## Panel Behavior

### Collapsed State

- Show only total counts and a short status line.
- Keep the footer bar visible without consuming space.
- Show quick indicators for `Error`, `Warning`, and `Info`.
- Allow one-click expand.

### Half-Open State

- Show the latest warnings and errors.
- Keep filtering controls available.
- Show a compact issue list with minimal metadata.

### Full-Open State

- Show the full issue list.
- Show filters, search, and action buttons.
- Show expanded issue detail on selection.
- Allow jump-to-object and debug navigation.
- Allow switching between event stream, active issues, and selected-object history.

### Resize Rules

- User can drag the panel height.
- Panel should not cover the entire viewport by default.
- Main viewer should remain usable while the panel is open.

---

## Panel Modes

The log window should support these modes:

- Live Events
- Active Issues
- Selected Object
- Root Cause
- System Health

### Live Events

Use this view for recent activity, state changes, and validation events.

### Active Issues

Use this view for unresolved bugs and warnings that need attention.

### Selected Object

Use this view to show all issues and events related to the current selection.

### Root Cause

Use this view to show the chain of related failures that caused the visible bug.

### System Health

Use this view to show aggregate counts, hotspots, and recurring problem areas.

---

## Core Layout

### Header

The header should show:

- total issue count
- error count
- warning count
- info count
- unresolved count
- cluster count
- clear button
- export button
- collapse button

### Filter Row

Filters should include:

- All
- Errors
- Warnings
- Info
- Import
- Geometry
- Labels
- Restraints
- Properties
- Camera
- Navigation
- UI

### Search Row

Search must support:

- message text
- node name
- line number
- tag
- component type
- property name
- object id

### Main List

Each row should show:

- severity icon
- category
- object or row reference
- short message
- component type
- fingerprint or cluster id
- count
- confidence
- timestamp or sequence
- resolved/unresolved state

### Detail View

When a row is selected, show:

- full message text
- source object or row id
- expected value
- actual value
- violated rule
- related properties
- jump-to-target button
- mark-resolved button if applicable

### Issue Fingerprints

Every log entry should produce a stable fingerprint so repeated problems can be
grouped instead of duplicated.

Fingerprint inputs should include:

- rule id
- source object id or row id
- component type
- property name
- category
- severity
- source file or table

Fingerprint behavior:

- same fingerprint means same issue cluster
- repeated occurrences increment a count
- first seen and last seen timestamps should be tracked
- the list should show the cluster, not every duplicate occurrence
- expanding a cluster should reveal individual occurrences if needed

### Root Cause Chain

The selected issue should be able to show upstream and downstream relationships,
for example:

- import field missing
- derived property blank
- continuity break
- geometry mismatch
- label collapse or support omission

This makes the log useful for debugging the real source of the problem rather
than only the final visible symptom.

---

## Data Model

Each log item should contain:

- `id`
- `fingerprint`
- `severity`
- `category`
- `message`
- `timestamp`
- `firstSeen`
- `lastSeen`
- `count`
- `objectId`
- `rowId`
- `lineNo`
- `componentType`
- `propertyName`
- `expectedValue`
- `actualValue`
- `ruleId`
- `ruleText`
- `sourceFile`
- `sourceTable`
- `confidence`
- `impact`
- `status`
- `fixSuggestion`
- `relatedIds`
- `resolved`
- `tags`

### Severity Values

- `error`
- `warning`
- `info`
- `success` if needed

### Category Values

- `import`
- `geometry`
- `continuity`
- `labels`
- `properties`
- `restraints`
- `camera`
- `navigation`
- `theme`
- `section`
- `ui`
- `performance`

---

## Bug Identification Rules

The panel must identify bugs using rule-based validation, not only manual review.

### Import Validation

Flag a bug when:

- a required field is missing
- a unit field is missing or inconsistent
- a stale default value is shown
- a source table value is not imported
- a value is outside allowed bounds

### Geometry Validation

Flag a bug when:

- coordinates break continuity
- zero-length geometry is created unexpectedly
- a component is rendered with wrong orientation
- a selected object does not match the displayed properties
- label placement conflicts with geometry or sectioning

### Label Validation

Flag a bug when:

- labels repeat unnecessarily on the same pipe stretch
- labels overlap excessively
- label content does not match the selected object
- label density is too high for current zoom

### Restraint Validation

Flag a bug when:

- restraint data exists but the symbol is not shown
- support name or GUID is missing from the viewport or panel
- active/fired restraint state is not visible
- restraint visibility does not match filter state

### Viewer State Validation

Flag a bug when:

- camera settings are not preserved
- axis convention and View Cube disagree
- theme changes reset selection unexpectedly
- sectioning hides the wrong objects
- selection, isolate, or transparency state is inconsistent

### Correlation Rules

The panel should correlate related messages into a single bug story when:

- the same object triggers repeated failures
- one validation failure causes multiple downstream warnings
- a property issue appears in geometry, labels, and properties at once
- a support or continuity issue affects several neighboring components

The log window should present one primary issue cluster and list the secondary
symptoms beneath it.

### Noise Control

The log window should reduce noise by default:

- repeated identical events must increment a count instead of creating new rows
- low-value informational messages should be collapsible by default
- the same rule firing on the same object should update the existing cluster
- warnings that repeat across multiple objects should be grouped by pattern
- routine state changes should be separated from actual bugs

---

## Example Issue Types

### Import Issue

```text
[ERROR][Import][Line 12][PIPE]
Missing required property: T2
Expected: numeric value or blank
Actual: undefined
Rule: imported property must be available to the property panel
```

### Continuity Issue

```text
[WARNING][Continuity][Line 48][PIPE]
EP1 continuity break
Expected: current EP1 equals previous EP2
Actual: values differ by 2 mm
Rule: stitched geometry must remain continuous
```

### Label Issue

```text
[INFO][Labels][Run SYS-177A]
Repeated label collapsed across pipe stretch
Expected: one label per stretch
Actual: 5 repeated labels detected
Rule: smart label thinning enabled
```

### Restraint Issue

```text
[ERROR][Restraints][Node N-104]
Restraint exists in data but is not rendered
Expected: visible support glyph
Actual: no viewport symbol
Rule: restraint objects must be shown when support visibility is enabled
```

---

## Interaction Rules

- Clicking a log item should jump to the related object.
- Clicking a row should highlight the corresponding model element.
- Hovering an item may preview the object if supported.
- Search results should be selectable from the list.
- Filters should update the list without reloading the app.
- When a selection exists, the log may auto-filter to that object or group.
- Resolved issues may be hidden or dimmed.
- Errors should remain visible until fixed or explicitly acknowledged.

---

## Actions

The panel should provide these actions:

- Clear all
- Copy selected
- Copy visible
- Export log
- Jump to object
- Open in debug view
- Mark resolved
- Unresolve
- Expand all
- Collapse all
- Focus related cluster
- Show root cause chain
- Show only this object
- Show only this run

---

## Validation Sources

The panel should collect issues from:

- ACCDB import parsing
- unit conversion
- data normalization
- continuity stitching
- geometry generation
- property population
- label generation
- restraint generation
- camera and axis state
- theme and display settings
- section / clipping logic
- render-time selection and visibility state

---

## Visual Design Rules

- Use severity colors that remain readable on both light and dark backgrounds.
- Make error rows visually stronger than warnings.
- Keep text compact but readable.
- Use icons sparingly and consistently.
- Avoid cluttering the viewport with log content.
- Keep the footer bar understated when collapsed.

---

## Persistence Rules

- Remember the last panel height if practical.
- Remember the last collapsed or open state if practical.
- Preserve log history only as long as it is useful.
- Allow the user to clear the log intentionally.

---

## Completion Criteria

The detail log panel is complete when:

- it can be collapsed and expanded smoothly
- it shows meaningful validation issues from live data
- it helps identify real bugs in imported data and viewer state
- it links issues to the model or source row
- it supports filtering, search, and jump-to-object
- it remains usable while the main viewer is active
