# Validation Checklist: Geometry Viewer Tools

This document defines practical, testable criteria for each tool in the viewer.
Use it as a completion checklist during implementation, QA, and regression checks.

## How To Use

For each tool, mark it complete only when all of the following are true:

- the tool performs its intended visible action
- the relevant UI state updates correctly
- the result persists when expected
- no console or runtime error is introduced
- the tool does not break camera, selection, labels, or properties
- the behavior remains stable after reload

---

## Global Validation

- App loads without console errors.
- A valid model opens successfully.
- The viewport renders correctly on first load.
- UI controls are visible and reachable.
- No hardcoded placeholder values appear in visible UI.
- Saved settings restore correctly after reload.
- Theme switching does not clear model state.
- Selection remains stable during camera motion.
- Large files do not freeze the UI.

---

## Geometry Selection Tool

### Validation Criteria

- Clicking a pipe selects exactly that pipe or component.
- Selection highlight appears in the viewport.
- The property panel updates immediately.
- The selected object can be re-selected after camera motion.
- Multi-select shows a summary and individual entries if supported.
- Selection does not break navigation mode.

### Expected Result

- The selected object becomes the active inspection target.

---

## Pan Tool

### Validation Criteria

- Dragging translates the scene without rotating it.
- Pan direction matches the configured axis convention.
- Zoom level remains stable during pan.
- Selection and labels remain intact during pan.
- No jitter, snap-back, or drift occurs.

### Expected Result

- The scene moves predictably in screen space.

---

## 3D Orbit Tool

### Validation Criteria

- Left-drag rotates around the model target.
- Orbit feels smooth and continuous.
- Orbit respects the configured up axis.
- The camera target remains stable.
- No unwanted flip, inversion, or lock to a single axis occurs.
- Orbit does not destroy the current selection.

### Expected Result

- The model can be inspected from all directions in a controlled way.

---

## 2D Orbit / Plan Rotation Tool

### Validation Criteria

- Rotation stays in the intended planar mode.
- The plane rotates about the configured vertical axis.
- No unwanted tilt occurs.
- Repeated rotation does not drift the view.
- The behavior matches the chosen axis convention.

### Expected Result

- The user can rotate the plan view cleanly around the vertical axis.

---

## Fit / Home Tool

### Validation Criteria

- Fit centers the model or selection correctly.
- Fit includes all visible geometry when expected.
- Home restores the configured default view.
- Fit and Home preserve theme and display settings.
- Fit works in both perspective and orthographic modes.

### Expected Result

- The viewer returns to a known, usable view state.

---

## View Cube Tool

### Validation Criteria

- Face clicks change the view correctly.
- Cube labels match the axis convention.
- Cube orientation stays synchronized with the camera.
- Cube visibility can be toggled in settings.
- Cube does not block critical model content excessively.

### Expected Result

- The cube acts as a reliable navigation reference.

---

## Axis Tool

### Validation Criteria

- Axis gizmo shows the correct up / north / east mapping.
- Axis labels are readable.
- Axis settings apply immediately.
- Axis changes do not corrupt the camera target.
- Axis display persists after reload if enabled.

### Expected Result

- The user always knows the model orientation.

---

## Theme Tool

### Validation Criteria

- `IsoTheme` shows pencil / technical line-art presentation.
- `3D Theme` shows shaded model presentation.
- Switching themes preserves camera, selection, and section state.
- Labels remain readable in both themes.
- Restraints and symbols remain visible in both themes.

### Expected Result

- The viewer can switch between presentation modes without losing context.

---

## Label Tool

### Validation Criteria

- Labels are readable at default zoom.
- Labels do not repeat on every pipe segment by default.
- At least one label appears per visible pipe stretch.
- Hovered and selected objects can force labels visible.
- Labels reduce automatically when density is high.
- Label settings persist after reload.
- Labels do not heavily overlap when smart mode is enabled.

### Expected Result

- The model remains readable without label clutter.

---

## Property Panel Tool

### Validation Criteria

- Clicking a pipe opens the full property panel.
- The panel lists all available properties for the selected component.
- The panel includes T3, fluid density, insulation thickness, and insulation density.
- The panel shows raw and derived values if both exist.
- The panel groups properties by category.
- The panel updates immediately when selection changes.
- The panel handles missing fields gracefully.

### Expected Result

- The selected component is fully inspectable from the property panel.

---

## Restraint / Support Tool

### Validation Criteria

- Restraints appear as visible scene objects when enabled.
- Support names and GUIDs are displayed when enabled.
- Hovering a restraint shows hover emphasis.
- Selecting a restraint shows selected emphasis.
- Active or fired restraints show a distinct state.
- Restraints can be filtered by type or visibility.
- Sectioning does not silently remove restraint visibility state.

### Expected Result

- Restraints behave like first-class scene objects.

---

## Section / Cutting Plane Tool

### Validation Criteria

- Section plane can be enabled and disabled.
- Plane axis selection works.
- Offset slider changes the cut position.
- Cap on / off works correctly.
- Invert clip works correctly.
- Section state persists while moving the camera.
- Labels and restraints behave correctly inside and outside the cut.

### Expected Result

- The user can inspect internal routing without losing context.

---

## Selection / Visibility Tools

### Validation Criteria

- Isolate leaves only the selected object(s) visible.
- Hide removes selected objects from view.
- Unhide all restores hidden objects.
- Transparency / ghosting works without breaking picking.
- Focus selection brings the object into clear view.
- Hidden objects do not break selection logic.

### Expected Result

- The user can control visibility without losing model state.

---

## Search / Find Tool

### Validation Criteria

- Search finds objects by line number, tag, node, or support name.
- Search results can be selected directly.
- Search does not alter unrelated visibility state.
- Search works on the currently loaded model.
- Invalid or empty search input is handled cleanly.

### Expected Result

- The user can locate components quickly.

---

## Measure Tool

### Validation Criteria

- Distance measurement is correct.
- Angle measurement is correct.
- Measurement respects the axis convention.
- Measurement annotations are readable.
- Measurement mode can be exited cleanly.

### Expected Result

- The user can verify geometry without leaving the viewer.

---

## Saved Views / Bookmarks Tool

### Validation Criteria

- Current view can be saved as a bookmark.
- Bookmark restores the exact stored view.
- Bookmark list persists after reload if intended.
- Bookmark can be renamed and deleted.
- Bookmarks do not overwrite camera state unexpectedly.

### Expected Result

- The user can return to important inspection views.

---

## Settings / Gear Panel

### Validation Criteria

- Camera, navigation, axis, labels, properties, restraints, sectioning, and theme all have controls.
- Changing a setting updates the viewer immediately or on apply, consistently.
- Reset restores defaults.
- Settings persist where intended.
- The panel does not obscure important model content excessively.

### Expected Result

- The gear icon acts as the full viewer control center.

---

## Acceptance Rule

A tool is considered complete only when:

- the feature is visible
- the feature works on real data
- the state is consistent after reload
- no regressions are introduced in navigation, selection, labels, or properties
- the implementation is stable enough for repeated QA

## Scope Note

Import, input, summary, stress, debug, nozzle, support, and diagnostics-log
validation are covered in `Validation_Checklist_Other_Tools.md`.
