# Geometry Tab Log Panel Specification

## Purpose

Create a collapsible bottom-docked log panel inside the Geometry tab that
captures runtime viewer issues, interaction events, and rendering anomalies.

This panel is for what the user sees in the model viewport:

- camera behavior
- orbit and pan behavior
- selection behavior
- label behavior
- restraint visibility
- sectioning / clipping behavior
- theme and axis mismatches
- performance and redraw issues

The panel must help diagnose visual and interaction bugs without leaving the
Geometry tab.

---

## Placement And Behavior

- Dock to the bottom of the Geometry tab.
- Collapse into a slim footer bar.
- Expand to a readable diagnostics pane.
- Stay usable while the viewport remains active.
- Remember last open or collapsed state if practical.
- Keep the viewer responsive while the log is open.

---

## Primary Use Cases

- detect camera drift, flip, and axis mismatch
- detect label repetition and label overlap
- detect selection mismatch
- detect restraint visibility failure
- detect section plane clipping issues
- detect theme rendering issues
- detect slow redraws or janky interaction

---

## Core Views

### Live Events

Show the most recent viewport and interaction events.

### Active Issues

Show unresolved geometry and viewer issues, grouped by fingerprint.

### Selected Object

Show all log items related to the selected pipe, support, or component.

### Root Cause

Show the issue chain behind a geometry problem.

### History

Show recent events for the current session or selection.

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
- `objectId`
- `componentType`
- `lineNo`
- `nodeName`
- `sourceFile`
- `ruleId`
- `ruleText`
- `expectedValue`
- `actualValue`
- `resolved`
- `tags`

### Geometry Categories

- `camera`
- `navigation`
- `selection`
- `labels`
- `restraints`
- `section`
- `theme`
- `axis`
- `render`
- `performance`

---

## Geometry Bug Types

The panel must recognize and report these problems:

- orbit is inverted or drifts
- 2D orbit does not stay planar
- camera target jumps unexpectedly
- selection highlight does not match the selected object
- label repetition appears on the same pipe stretch
- labels overlap too heavily
- restraints exist in data but are not rendered
- restraint active/fired state is not shown
- section plane clips the wrong objects
- axis convention and View Cube disagree
- theme switching resets state
- redraw stutters or pauses

---

## Interaction Rules

- Clicking a log row highlights the related viewport object.
- Clicking a log row can jump to the related model location.
- Hovering a row may preview the object if supported.
- Filters should update the list immediately.
- Search should support object id, line number, node, and message text.
- The current selection may auto-filter the log when enabled.

---

## Actions

- Clear all
- Copy selected
- Copy visible
- Export log
- Jump to object
- Focus related cluster
- Show root cause chain
- Show only this object
- Show only this run
- Mark resolved
- Unresolve

---

## Clustering Rules

- identical repeated events must collapse into one issue cluster
- repeated occurrences increment the count
- first seen and last seen timestamps must be tracked
- one root cause should not create many duplicate list rows
- the panel should show symptoms under the same cluster when possible

---

## Visual Rules

- show severity clearly
- keep the footer unobtrusive when collapsed
- make errors stronger than warnings
- avoid cluttering the viewport
- keep messages short but actionable
- keep the selected cluster detail readable

---

## Completion Criteria

The Geometry tab log panel is complete when:

- viewer issues are captured in real time
- geometry issues are grouped and readable
- clicking an issue helps the user locate the problem object
- root causes and symptoms are linked
- the panel does not interfere with navigation

