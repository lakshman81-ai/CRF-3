/**
 * supports-tab.js — Special support list.
 */

import { SPECIAL_SUPPORTS } from '../data/report-data.js';

export function renderSupports(container) {
  container.innerHTML = `
    <div class="report-section" id="section-supports">
      <h3 class="section-heading">Special Support List</h3>
      <p class="tab-note">Springs, struts, and low-friction plates identified in the stress analysis.</p>
      <table class="data-table">
        <thead>
          <tr>
            <th>Node</th>
            <th>Tag Number</th>
            <th>Type</th>
            <th>Qty</th>
          </tr>
        </thead>
        <tbody>
          ${SPECIAL_SUPPORTS.map(row => `
            <tr>
              <td class="mono">${row.node ?? '—'}</td>
              <td class="mono">${row.tag}</td>
              <td>${row.type}</td>
              <td class="center">${row.qty}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}
