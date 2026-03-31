/**
 * nozzle-tab.js — Equipment nozzle load compliance.
 */

import { NOZZLE_LOADS } from '../data/report-data.js';
import { state } from '../core/state.js';

export function renderNozzle(container) {
  const flanges = state.parsed?.flanges || [];
  
  container.innerHTML = `
    <div class="report-section" id="section-nozzle">
      ${state.scopeToggles.nozzle ? `
      <h3 class="section-heading">Equipment Nozzle Load Compliance</h3>
      <p class="tab-note">Method: Equivalent Pressure Method per vendor allowables.</p>
      <table class="data-table">
        <thead>
          <tr>
            <th>Equipment Tag</th>
            <th>Description</th>
            <th>Status</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          ${NOZZLE_LOADS.map(row => `
            <tr>
              <td class="mono">${row.equipment}</td>
              <td>${row.description}</td>
              <td><span class="badge-${row.status === 'PASS' ? 'pass' : 'fail'}">${row.status === 'PASS' ? '✓ OK' : '✗ FAIL'}</span></td>
              <td>${row.note}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>` : ''}

      ${state.scopeToggles.flange ? `
      <h3 class="section-heading" style="margin-top: 2rem;">Flange Leakage Checks</h3>
      <p class="tab-note">Extracted ${flanges.length} flange checks from CAESAR II OUTPUT_FLANGE.</p>
      ${flanges.length > 0 ? `
      <table class="data-table">
        <thead>
          <tr>
            <th>Location</th>
            <th>Method</th>
            <th>Status</th>
            <th>Max %</th>
          </tr>
        </thead>
        <tbody>
          ${flanges.map(f => `
            <tr>
              <td class="mono">${f.location}</td>
              <td>${f.method}</td>
              <td><span class="badge-${f.status === 'PASS' ? 'pass' : 'fail'}">${f.status === 'PASS' ? '✓ OK' : '✗ FAIL'}</span></td>
              <td>${f.maxPct}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      ` : '<p class="muted">No flange leakage data found in this ACCDB file.</p>'}
      ` : ''}
    </div>
  `;
}
