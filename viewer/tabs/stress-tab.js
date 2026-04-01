/**
 * stress-tab.js — Stress compliance and displacement summary.
 */

import { STRESS_TABLE, DISPLACEMENT_TABLE } from '../data/report-data.js';
import { fmt, fmtPct, fmtSigned, fmtNode } from '../utils/formatter.js';
import { renderTableToggles } from '../utils/table-toggle.js';
import { state } from '../core/state.js';

export function renderStress(container) {
  const parsed = state.parsed;

  const stresses = (parsed && parsed.stresses) ? parsed.stresses : [];
  const displacements = (parsed && parsed.displacements) ? parsed.displacements : [];
  const stressUnit = stresses.length > 0 ? 'KPa' : 'MPa';

  container.innerHTML = `
    <div class="report-section" id="section-stress">
      <h3 class="section-heading">Stress Compliance Summary</h3>
      <table class="data-table stress-table">
        <thead>
          <tr>
            <th>Load Case</th>
            <th>Critical Node</th>
            <th>Calculated (${stressUnit})</th>
            <th>Allowable (${stressUnit})</th>
            <th>Ratio</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${stresses.map(row => `
            <tr>
              <td>${row.loadCase}</td>
              <td class="mono">${fmtNode(row.node)}</td>
              <td class="mono">${fmt(row.calc, 1)}</td>
              <td class="mono">${row.allow !== null ? fmt(row.allow, 1) : 'N/A'}</td>
              <td>
                <div class="ratio-wrap">
                  <div class="ratio-bar" style="--ratio:${row.ratio}%"></div>
                  <span class="ratio-text">${fmtPct(row.ratio)}</span>
                </div>
              </td>
              <td><span class="badge-${row.status === 'PASS' ? 'pass' : 'fail'}">${row.status === 'PASS' ? '✓ OK' : '✗ FAIL'}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <h3 class="section-heading" style="margin-top:2rem">Displacement Summary</h3>
      <table class="data-table disp-table">
        <thead>
          <tr>
            <th>Node</th>
            <th>DX (mm)</th>
            <th>DY (mm)</th>
            <th>DZ (mm)</th>
            <th>Load Case</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          ${displacements.map(row => {
            const maxD = Math.max(Math.abs(row.dx || 0), Math.abs(row.dy || 0), Math.abs(row.dz || 0));
            const note = maxD <= 10 ? '< 10mm ✓' : '> 10mm ✗';
            return `
            <tr>
              <td class="mono">${fmtNode(row.node)}</td>
              <td class="mono">${fmtSigned(row.dx)}</td>
              <td class="mono">${fmtSigned(row.dy)}</td>
              <td class="mono">${fmtSigned(row.dz)}</td>
              <td>${row.loadCase}</td>
              <td class="${note.includes('✓') ? 'note-pass' : ''}">${note}</td>
            </tr>
          `}).join('')}
        </tbody>
      </table>
    </div>
  `;
  renderTableToggles(container);
}
