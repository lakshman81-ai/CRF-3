/**
 * accdb-mdb.js — Binary Access database (ACCDB/MDB) reader for native CAESAR II files.
 *
 * CAESAR II stores its model in a Jet/ACE Access database. This module:
 *   1. Opens the database with mdb-reader (CDN, no build step)
 *   2. Enumerates all tables and logs their schema
 *   3. Looks for embedded CAESAR II neutral/XML text in any MEMO column
 *   4. Tries to extract pipe element rows from tables whose columns match
 *      CAESAR II field-name patterns (FROM_NODE, DIAMETER, WALL_THICK, etc.)
 *   5. Falls back to a clear diagnostic error with export instructions
 */

import { pipeLength } from '../utils/formatter.js';

// importmap keys (index.html)
const MDB_CDN    = 'mdb-reader';   // → esm.sh/mdb-reader@2
const BUFFER_CDN = 'https://esm.sh/buffer@6'; // Node.js Buffer polyfill for browser

// ── Column name matchers ───────────────────────────────────────────────────
// Each entry is a list of candidate names (checked case-insensitively, then
// by partial match). First match wins.
const COLS = {
  from:    ['FROM_NODE', 'FROM', 'FROMNODE', 'NODE_FROM', 'NODEFROM', 'FNODE'],
  to:      ['TO_NODE',   'TO',   'TONODE',   'NODE_TO',   'NODETO',   'TNODE'],
  dx:      ['DELTA_X',   'DX',   'DELTAX',   'D_X',  'LENGTH_X', 'X'],
  dy:      ['DELTA_Y',   'DY',   'DELTAY',   'D_Y',  'LENGTH_Y', 'Y'],
  dz:      ['DELTA_Z',   'DZ',   'DELTAZ',   'D_Z',  'LENGTH_Z', 'Z'],
  od:      ['DIAMETER',  'OD',   'OUTSIDE_DIAMETER', 'PIPE_OD', 'PIPE_DIAMETER'],
  wall:    ['WALL_THICK','WALL', 'WALLTHICK','THICKNESS', 'WALL_THICKNESS', 'WT'],
  insul:   ['INSUL_THICK','INSULATION','INSUL','INSUL_THICKNESS'],
  T1:      ['TEMP_EXP_C1','TEMPERATURE1','TEMP1','T1','OPER_TEMP','DESIGN_TEMP'],
  P1:      ['PRESSURE1', 'PRESSURE','P1','OPER_PRESSURE','DESIGN_PRESSURE'],
  density: ['PIPE_DENSITY','DENSITY','MATERIAL_DENSITY'],
  matName: ['MATERIAL_NAME','MATERIAL','MAT_NAME','MATERIAL_NUM'],
  corr:    ['CORR_ALLOW', 'CORROSION', 'CORROSION_ALLOWANCE', 'CA'],
};

function matchCol(colNames, key) {
  const upper = colNames.map(c => c.toUpperCase());
  const patterns = COLS[key] ?? [];
  // Exact match first
  for (const pat of patterns) {
    const i = upper.indexOf(pat.toUpperCase());
    if (i >= 0) return colNames[i];
  }
  // Partial-contain match
  for (const pat of patterns) {
    const i = upper.findIndex(c => c.includes(pat.toUpperCase()));
    if (i >= 0) return colNames[i];
  }
  return null;
}

function num(row, col, fallback = 0) {
  if (!col) return fallback;
  const v = parseFloat(row[col]);
  return isFinite(v) ? v : fallback;
}

// ── Main export ────────────────────────────────────────────────────────────

/**
 * @param {ArrayBuffer} arrayBuffer
 * @param {string}      fileName
 * @param {object[]}    log        — mutable; entries pushed here
 * @returns {object|null}  partial parsed result, or null on failure
 */
export async function parseBinaryAccdb(arrayBuffer, fileName, log) {
  // ── 1. Polyfill Buffer + load mdb-reader ─────────────────────────────────
  // mdb-reader uses Node.js Buffer methods (e.g. .copy()) internally.
  // In the browser we must polyfill globalThis.Buffer BEFORE importing the
  // library so its module-level Buffer references resolve to the polyfill.
  let MDBReader;
  try {
    if (typeof globalThis.Buffer === 'undefined' || typeof globalThis.Buffer.from !== 'function') {
      const bufMod = await import(BUFFER_CDN);
      globalThis.Buffer = bufMod.Buffer ?? bufMod.default?.Buffer ?? bufMod.default ?? bufMod;
    }
    const mod = await import(/* @vite-ignore */ MDB_CDN);
    MDBReader = mod.default ?? mod.MDBReader ?? mod;
    if (typeof MDBReader !== 'function') throw new Error('MDBReader is not a constructor');
  } catch (e) {
    log.push({ level: 'ERROR', msg: `mdb-reader library failed to load: ${e.message}` });
    log.push({ level: 'INFO',  msg: 'Requires internet access to load CDN libraries. Alternatively export from CAESAR II as a neutral text file.' });
    return null;
  }

  // ── 2. Open database ─────────────────────────────────────────────────────
  // Pass a proper Buffer (not a raw Uint8Array) so .copy() and other
  // Node.js Buffer methods are available to mdb-reader internals.
  let reader;
  try {
    const buf = globalThis.Buffer.from(arrayBuffer);
    reader = new MDBReader(buf);
  } catch (e) {
    log.push({ level: 'ERROR', msg: `Cannot open as Access database: ${e.message}` });
    log.push({ level: 'INFO',  msg: 'The file may use an unsupported Access version, be password-protected, or be corrupted.' });
    return null;
  }

  const tableNames = reader.getTableNames();
  log.push({ level: 'INFO', msg: `ACCDB opened — ${tableNames.length} table(s): ${tableNames.join(', ')}` });

  // ── Find JOBNAME and FLANGE info globally ──────────────────────────────
  let jobName = null;
  let flanges = [];
  for (const tName of tableNames) {
    try {
      const t = reader.getTable(tName);
      const tCols = t.getColumnNames().map(c => c.toUpperCase());
      // Extract JobName
      if (!jobName && tCols.some(c => c.includes('JOBNAME') || c.includes('PROJECT'))) {
        const tr = t.getData()[0];
        if (tr) {
          const jk = Object.keys(tr).find(k => k.toUpperCase().includes('JOBNAME') || k.toUpperCase() === 'JOB');
          if (jk && tr[jk]) jobName = String(tr[jk]).trim();
        }
      }
      // Extract Flange
      if (tName.toLowerCase().includes('output_flange')) {
        const fRows = t.getData();
        for (const fr of fRows) {
           const node = fr['NODE'] || fr['NODE_NUM'] || '—';
           const method = String(fr['METHOD'] || 'Equivalent Pressure').replace('method', '').trim();
           const maxPct = fr['RATIO'] || fr['MAX_PERCENT'] || fr['PERCENT'] || '—';
           const status = fr['STATUS'] || fr['PASSFAIL'] || (parseFloat(maxPct) <= 100 ? 'PASS' : parseFloat(maxPct) > 100 ? 'FAIL' : 'PASS');
           flanges.push({ 
             location: `Node ${node}`, 
             method: method, 
             standard: 'Generic', 
             status: String(status).toUpperCase() === 'FAIL' || status === '1' ? 'FAIL' : 'PASS',
             maxPct: typeof maxPct === 'number' ? maxPct.toFixed(1) : parseFloat(maxPct).toFixed(1)
           });
        }
      }
    } catch(e) {}
  }

  // ── 3. Strategy A — look for embedded CAESAR II neutral/XML text ──────────
  for (const name of tableNames) {
    try {
      const table = reader.getTable(name);
      const cols  = table.getColumnNames();
      const rows  = table.getData();
      for (const col of cols) {
        for (const row of rows.slice(0, 10)) {
          const val = row[col];
          if (typeof val === 'string' && val.length > 200) {
            if (/^#\$\s*(VERSION|ELEMENTS|CONTROL)/m.test(val)) {
              log.push({ level: 'OK', msg: `Found embedded CAESAR II neutral text in table "${name}", column "${col}"` });
              return { embeddedText: val, jobName, flanges };
            }
            if (val.includes('<CAESARII') || val.includes('<PIPINGMODEL')) {
              log.push({ level: 'OK', msg: `Found embedded CAESARII XML text in table "${name}", column "${col}"` });
              return { embeddedText: val, jobName, flanges };
            }
          }
        }
      }
    } catch { /* skip unreadable tables */ }
  }

  // ── 4. Strategy B — find table with FROM/TO node + geometry columns ───────
  for (const name of tableNames) {
    try {
      const table = reader.getTable(name);
      const cols  = table.getColumnNames();

      const fromCol = matchCol(cols, 'from');
      const toCol   = matchCol(cols, 'to');
      const odCol   = matchCol(cols, 'od');
      const dxCol   = matchCol(cols, 'dx');
      const dyCol   = matchCol(cols, 'dy');
      const dzCol   = matchCol(cols, 'dz');

      // Need at minimum: FROM + TO + either geometry (dx/dy/dz) or size (OD)
      if (!fromCol || !toCol || (!odCol && !dxCol)) continue;

      const wallCol   = matchCol(cols, 'wall');
      const insulCol  = matchCol(cols, 'insul');
      const t1Col     = matchCol(cols, 'T1');
      const p1Col     = matchCol(cols, 'P1');
      const densCol   = matchCol(cols, 'density');
      const matCol    = matchCol(cols, 'matName');
      const corrCol   = matchCol(cols, 'corr');

      log.push({ level: 'INFO', msg: `Pipe-like table "${name}": FROM="${fromCol}" TO="${toCol}" OD="${odCol ?? '—'}" DX="${dxCol ?? '—'}" columns: ${cols.length}` });

      const rows = table.getData();
      log.push({ level: 'INFO', msg: `  → ${rows.length} row(s)` });

      const elements = [];
      const nodes    = {};

      // Carry-forward (same pattern as XML parser)
      let pOd = 0, pWall = 0, pInsul = 0, pT1 = 0, pT2 = 0, pP1 = 0, pDens = 7.833e-3, pMat = 'CS', pCorr = 0;

      // Origin for first node
      const firstFrom = parseInt(rows[0]?.[fromCol]) || 0;
      if (firstFrom > 0) nodes[firstFrom] = { x: 0, y: 0, z: 0 };

      for (let i = 0; i < rows.length; i++) {
        const row  = rows[i];
        const from = parseInt(row[fromCol]) || 0;
        const to   = parseInt(row[toCol])   || 0;
        if (!from || !to || from === to) continue;

        const dx = num(row, dxCol);
        const dy = num(row, dyCol);
        const dz = num(row, dzCol);

        const rawOd = num(row, odCol);
        const od    = rawOd > 0 ? rawOd : pOd;

        const wall  = num(row, wallCol,  pWall)  || pWall;
        const insul = num(row, insulCol, pInsul) || pInsul;
        const T1    = num(row, t1Col,    pT1)    || pT1;
        const P1    = num(row, p1Col,    pP1)    || pP1;
        const density = num(row, densCol, pDens) || pDens;
        const material = (matCol && row[matCol]) ? String(row[matCol]).trim() : pMat;
        const corrosion = num(row, corrCol, pCorr) || pCorr;

        pOd = od || pOd;  pWall = wall || pWall;  pInsul = insul || pInsul;
        pT1  = T1 || pT1; pP1   = P1  || pP1;    pDens  = density || pDens;
        pMat = material || pMat;  pCorr = corrosion || pCorr;

        if (!nodes[from]) nodes[from] = { x: 0, y: 0, z: 0 };
        const origin = nodes[from];
        const toPos  = { x: origin.x + dx, y: origin.y + dy, z: origin.z + dz };
        if (!nodes[to]) nodes[to] = toPos;

        elements.push({
          index: i, from, to, dx, dy, dz, od, wall, insul,
          T1, T2: 0, P1, corrosion,
          E_cold: 203390.7, E_hot: 178960.6, density, poisson: 0.292,
          material,
          length:  pipeLength(dx, dy, dz),
          fromPos: { ...origin },
          toPos:   { ...toPos },
          hasBend: false,
        });
      }

      // ── Find JOBNAME and FLANGE info globally ──────────────────────────────
      let jobName = null;
      let flanges = [];
      for (const tName of tableNames) {
        try {
          const t = reader.getTable(tName);
          const tCols = t.getColumnNames().map(c => c.toUpperCase());
          // Extract JobName
          if (!jobName && tCols.some(c => c.includes('JOBNAME') || c.includes('PROJECT'))) {
            const tr = t.getData()[0];
            if (tr) {
              const jk = Object.keys(tr).find(k => k.toUpperCase().includes('JOBNAME') || k.toUpperCase() === 'JOB');
              if (jk && tr[jk]) jobName = String(tr[jk]).trim();
            }
          }
          // Extract Flange
          if (tName.toLowerCase().includes('output_flange')) {
            const fRows = t.getData();
            for (const fr of fRows) {
               // Standardise output_flange format based on generic CAESAR II keys
               const node = fr['NODE'] || fr['NODE_NUM'] || '—';
               const method = fr['METHOD'] || 'Equivalent Pressure';
               const maxPct = fr['RATIO'] || fr['MAX_PERCENT'] || fr['PERCENT'] || '—';
               const status = fr['STATUS'] || fr['PASSFAIL'] || (parseFloat(maxPct) <= 100 ? 'PASS' : parseFloat(maxPct) > 100 ? 'FAIL' : 'PASS');
               flanges.push({ 
                 location: `Node ${node}`, 
                 method: String(method), 
                 standard: 'Generic', 
                 status: String(status).toUpperCase() === 'FAIL' || status === '1' ? 'FAIL' : 'PASS',
                 maxPct: maxPct 
               });
            }
          }
        } catch(e) {}
      }

      if (elements.length > 0) {
        log.push({ level: 'OK', msg: `Extracted ${elements.length} element(s) from ACCDB table "${name}"` });
        return {
          elements, nodes,
          bends: [], restraints: [], forces: [], rigids: [], flanges,
          units: {}, meta: { sourceTable: name, jobName },
          format: 'ACCDB-TABLE',
        };
      }

      log.push({ level: 'WARN', msg: `Table "${name}" matched structure but yielded 0 valid elements` });
    } catch (e) {
      log.push({ level: 'WARN', msg: `Table "${name}" unreadable: ${e.message}` });
    }
  }

  // ── 5. Nothing found — dump full schema for diagnostics ──────────────────
  log.push({ level: 'WARN', msg: 'No CAESAR II pipe data recognized. Full table schema:' });
  for (const name of tableNames) {
    try {
      const table    = reader.getTable(name);
      const cols     = table.getColumnNames();
      const rowCount = table.getData().length;
      log.push({ level: 'INFO', msg: `  "${name}": ${rowCount} row(s) | ${cols.join(', ')}` });
    } catch (e) {
      log.push({ level: 'WARN', msg: `  "${name}": unreadable — ${e.message}` });
    }
  }

  log.push({ level: 'ERROR', msg: 'No pipe element data could be extracted from this Access database.' });
  log.push({ level: 'INFO',  msg: 'Export from CAESAR II: File → Neutral File → select all sections → save (generates a text file you can load here).' });
  return null;
}
