/**
 * geometry-tab.js — Wires the geometry tab UI controls to IsometricRenderer.
 */

import { state } from '../core/state.js';
import { emit, on } from '../core/event-bus.js';

// Inline legend colours — avoids static Three.js import at module load time
const OD_COLORS = [
  { od: 406.4,   color: 0xe07020, label: 'Ø406.4 mm' },
  { od: 323.85,  color: 0x1a6ec7, label: 'Ø323.85 mm' },
  { od: 168.275, color: 0x1a9c7a, label: 'Ø168.275 mm' },
];

let _renderer = null;
let _initialized = false;

/**
 * Render the geometry tab shell (canvas + controls).
 * The IsometricRenderer is created lazily on first render.
 */
export async function renderGeometry(container) {
  container.innerHTML = `
    <div class="geo-tab" id="section-geometry">
      <div class="geo-controls">
        <!-- Removed internal file loader, rely on universal drag-drop -->
        <button class="btn-secondary" id="geo-reset-btn">⟳ Reset View</button>

        <span class="control-sep"></span>

        <label class="control-label" style="margin-left:auto;">
          <select id="legend-select">
            <optgroup label="Legend">
              <option value="pipelineRef">Pipeline Ref</option>
              <option value="material">Material</option>
              <option value="T1">T1 (°C)</option>
              <option value="T2">T2 (°C)</option>
              <option value="P1">P1 (bar)</option>
            </optgroup>
            <optgroup label="Heat Map">
              <option value="HeatMap:T1">Heat Map: T1</option>
              <option value="HeatMap:T2">Heat Map: T2</option>
              <option value="HeatMap:P1">Heat Map: P1</option>
            </optgroup>
          </select>
        </label>

        <label class="toggle-inline">
          <input type="checkbox" id="tog-labels" ${state.geoToggles.nodeLabels ? 'checked' : ''}> Node Labels
        </label>
        <label class="toggle-inline">
          <input type="checkbox" id="tog-supports" ${state.geoToggles.supports ? 'checked' : ''}> Supports
        </label>
      </div>

      <div class="geo-body">
        <div class="canvas-wrap" id="canvas-wrap">
          <div class="canvas-placeholder" id="canvas-placeholder">
            Load an .ACCDB file or click "Use Sample" to render the isometric model
          </div>
        </div>

        <div class="geo-legend-panel" id="legend-panel">
          <div class="legend-title">OD Legend</div>
          ${OD_COLORS.map(c => `
            <div class="legend-row">
              <span class="legend-swatch" style="background:#${c.color.toString(16).padStart(6,'0')}"></span>
              <span>${c.label}</span>
            </div>
          `).join('')}
          <div class="legend-row"><span class="legend-swatch swatch-anchor"></span><span>Anchor ▣</span></div>
          <div class="legend-row"><span class="legend-swatch swatch-guide"></span><span>Guide ○</span></div>
          <div class="legend-row"><span class="legend-swatch swatch-load"></span><span>Applied Load ↓</span></div>
        </div>
      </div>

      <div class="geo-status" id="geo-status">Ready</div>
    </div>
  `;

  _wireControls(container);

  // If we already have parsed data, re-init renderer
  if (state.parsed) {
    await _ensureRenderer(container);
    _renderer?.rebuild();
  }

  on('parse-complete', async () => {
    await _ensureRenderer(container);
    _setStatus(container, `${state.parsed?.elements?.length ?? 0} elements · ${Object.keys(state.parsed?.nodes ?? {}).length} nodes`);
    _renderer?.rebuild();
  });
}

async function _ensureRenderer(container) {
  if (_renderer && _initialized) return;

  const wrap = container.querySelector('#canvas-wrap');
  const placeholder = container.querySelector('#canvas-placeholder');
  if (!wrap) return;

  // Remove placeholder
  if (placeholder) placeholder.remove();

  // Lazy import to avoid loading Three.js until needed
  const { IsometricRenderer } = await import('../geometry/isometric-renderer.js');
  _renderer = new IsometricRenderer(wrap);
  _initialized = true;
}

function _wireControls(container) {

  container.querySelector('#geo-reset-btn')?.addEventListener('click', () => {
    _renderer?.resetView();
  });

  container.querySelector('#legend-select')?.addEventListener('change', e => {
    state.legendField = e.target.value;
    emit('legend-changed', state.legendField);
  });

  container.querySelector('#tog-labels')?.addEventListener('change', e => {
    state.geoToggles.nodeLabels = e.target.checked;
    emit('geo-toggle', state.geoToggles);
  });

  container.querySelector('#tog-supports')?.addEventListener('change', e => {
    state.geoToggles.supports = e.target.checked;
    emit('geo-toggle', state.geoToggles);
  });
}

function _setStatus(container, msg) {
  const el = container.querySelector('#geo-status');
  if (el) el.textContent = msg;
}
