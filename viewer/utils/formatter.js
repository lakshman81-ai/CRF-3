/**
 * formatter.js — Number formatting and unit conversion helpers.
 */

/**
 * Format a number to fixed decimal places, return '—' for null/undefined.
 * @param {number|null} val
 * @param {number} dp  decimal places
 */
export function fmt(val, dp = 2) {
  if (val === null || val === undefined || isNaN(val)) return '—';
  return Number(val).toFixed(dp);
}

/**
 * Format with a + sign for positive values (displacements).
 */
export function fmtSigned(val, dp = 1) {
  if (val === null || val === undefined || isNaN(val)) return '—';
  const n = Number(val);
  return (n >= 0 ? '+' : '') + n.toFixed(dp);
}

/**
 * Format a ratio (0–100) as a percentage string, e.g. "33.1%".
 */
export function fmtPct(val) {
  if (val === null || val === undefined) return '—';
  return Number(val).toFixed(1) + '%';
}

/**
 * Derive material label from density (kg/m³ or kg/cm³).
 * CAESAR II stores density in kg/cm³ → 7.833e-3 = CS.
 */
export function materialFromDensity(densityKgPerCm3) {
  const d = Number(densityKgPerCm3);
  if (!d) return '—';
  if (d > 0.0075 && d < 0.009) return 'CS';   // Carbon Steel ~7833 kg/m³
  if (d > 0.0065 && d < 0.0075) return 'SS304'; // Stainless ~7900 -> narrow CS range above
  if (d > 0.009) return 'CS-HT';
  return 'CS';
}

/**
 * Format a node ID nicely (integer if whole number).
 */
export function fmtNode(val) {
  const n = Number(val);
  return Number.isInteger(n) ? String(n) : fmt(n, 0);
}

/**
 * Compute pipe length from delta components (mm).
 */
export function pipeLength(dx, dy, dz) {
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
