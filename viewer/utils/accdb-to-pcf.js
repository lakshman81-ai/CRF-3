/**
 * accdb-to-pcf.js
 * Implements the 3-stage data transformation:
 * Stage 1: ACCDB (Parsed) -> Universal CSV Format
 * Stage 2: Universal CSV -> Simplified PCF Data Table Format
 */

// ── Stage 1: ACCDB to Universal CSV ──────────────────────────────────────────

export function buildUniversalCSV(parsed) {
  if (!parsed || !parsed.elements) return [];

  const elements = parsed.elements;
  const bends = parsed.bends || [];
  const restraints = parsed.restraints || [];
  const rigids = parsed.rigids || [];
  const sifs = parsed.sifs || []; // Assuming parser provides this, else empty

  // Index auxiliary arrays by their pointers for O(1) lookup
  const bendIdx = {};
  bends.forEach(b => bendIdx[b.ptr] = b);

  const restIdx = {};
  restraints.forEach(r => restIdx[r.ptr] = r);

  const rigidIdx = {};
  rigids.forEach(r => rigidIdx[r.ptr] = r);

  const csvRows = [];

  elements.forEach(el => {
    // Stage 1 maps the raw parsed element properties into a flat, denormalized row
    // mimicking the ~130-column universal CSV from CAESAR-CII-Converter-2
    const row = {
      // Element Identity
      ELEMENTID: el.index,
      FROM_NODE: el.from,
      TO_NODE: el.to,
      LINE_NO: el.lineNo || '',

      // Geometry
      DELTA_X: el.dx || 0,
      DELTA_Y: el.dy || 0,
      DELTA_Z: el.dz || 0,
      DIAMETER: el.od || 0,
      WALL_THICK: el.wall || 0,
      INSUL_THICK: el.insul || 0,

      // Pointers
      BEND_PTR: el.bendPtr || 0,
      REST_PTR: el.restraintPtr || 0,
      RIGID_PTR: el.rigidPtr || 0,
      INT_PTR: el.sifPtr || 0,
      FLANGE_PTR: el.flangePtr || 0,
      REDUCER_PTR: el.reducerPtr || 0,

      // Material / Thermal / Press
      T1: el.T1 || 0,
      T2: el.T2 || 0,
      P1: el.P1 || 0,
      MATERIAL_NAME: el.material || '',
    };

    // Join Bends
    if (row.BEND_PTR && bendIdx[row.BEND_PTR]) {
      const b = bendIdx[row.BEND_PTR];
      row.BND_RADIUS = b.radius;
      row.BND_ANGLE1 = b.angle1;
      row.BND_NODE1 = b.node1;
      row.BND_NODE2 = b.node2;
    }

    // Join Restraints
    if (row.REST_PTR && restIdx[row.REST_PTR]) {
      const r = restIdx[row.REST_PTR];
      row.RST_NODE_NUM = r.node;
      row.RST_TYPE = r.type;
    }

    // Join Rigids
    if (row.RIGID_PTR && rigidIdx[row.RIGID_PTR]) {
      const r = rigidIdx[row.RIGID_PTR];
      row.RGD_WGT = r.weight;
    }

    csvRows.push(row);
  });

  return csvRows;
}

// ── Stage 2: Universal CSV to PCF Data Table ─────────────────────────────────

export function normalizeToPCF(csvRows) {
  const segments = [];
  let i = 0;

  while (i < csvRows.length) {
    const row = csvRows[i];

    // Determine type heuristics (simplified from normalizer.ts)
    let type = 'PIPE';
    if (row.BEND_PTR > 0) type = 'PIPE'; // Usually leads to a bend
    else if (row.RIGID_PTR > 0) type = row.FLANGE_PTR > 0 ? 'FLANGE' : 'VALVE';
    else if (row.INT_PTR > 0) type = 'TEE';
    else if (row.REDUCER_PTR > 0) type = 'REDUCER';

    // Create base segment
    const baseSegment = {
      FROM_NODE: row.FROM_NODE,
      TO_NODE: row.TO_NODE,
      LINE_NO: row.LINE_NO,
      COMPONENT_TYPE: type,
      DELTA_X: row.DELTA_X,
      DELTA_Y: row.DELTA_Y,
      DELTA_Z: row.DELTA_Z,
      DIAMETER: row.DIAMETER,
      WALL_THICK: row.WALL_THICK,
      BEND_PTR: row.BEND_PTR || undefined,
      RIGID_PTR: row.RIGID_PTR || undefined,
      INT_PTR: row.INT_PTR || undefined,
      T1: row.T1,
      P1: row.P1,
      MATERIAL_NAME: row.MATERIAL_NAME
    };

    // Apply Support Tags if Restraint exists
    if (row.RST_TYPE) {
      baseSegment.SUPPORT_TAG = row.RST_TYPE;
    }

    segments.push(baseSegment);

    // Look-ahead for Bends (CAESAR II defines bends over 3 nodes usually)
    if (row.BEND_PTR > 0 && i + 2 < csvRows.length) {
      const r1 = csvRows[i + 1];
      const r2 = csvRows[i + 2];

      // Insert ghost segments
      segments.push({
        ...baseSegment,
        FROM_NODE: r1.FROM_NODE,
        TO_NODE: r1.TO_NODE,
        DELTA_X: r1.DELTA_X, DELTA_Y: r1.DELTA_Y, DELTA_Z: r1.DELTA_Z,
        COMPONENT_TYPE: 'GHOST'
      });
      segments.push({
        ...baseSegment,
        FROM_NODE: r2.FROM_NODE,
        TO_NODE: r2.TO_NODE,
        DELTA_X: r2.DELTA_X, DELTA_Y: r2.DELTA_Y, DELTA_Z: r2.DELTA_Z,
        COMPONENT_TYPE: 'GHOST'
      });

      // Insert the actual composite BEND segment
      segments.push({
        FROM_NODE: r1.FROM_NODE,
        TO_NODE: r2.TO_NODE,
        LINE_NO: baseSegment.LINE_NO,
        COMPONENT_TYPE: 'BEND',
        DELTA_X: r1.DELTA_X + r2.DELTA_X,
        DELTA_Y: r1.DELTA_Y + r2.DELTA_Y,
        DELTA_Z: r1.DELTA_Z + r2.DELTA_Z,
        DIAMETER: baseSegment.DIAMETER,
        WALL_THICK: baseSegment.WALL_THICK,
        CONTROL_NODE: r1.TO_NODE, // Intersect node
        T1: baseSegment.T1,
        P1: baseSegment.P1,
        MATERIAL_NAME: baseSegment.MATERIAL_NAME
      });

      i += 3; // Skip next two as they were consumed by the bend
    } else {
      i += 1;
    }
  }

  return segments;
}

// ── Stage 3: PCF Adapter for Renderer ─────────────────────────────────────────

export function adaptForRenderer(segments, originalParsed) {
  // The IsometricRenderer expects the "original" format with `dx, dy, dz`, `from`, `to`, `od`.
  // Here we map the PCF segments back into a format the renderer can digest without
  // breaking the rest of the application.

  const rendererElements = segments.map(seg => ({
    // Identity mapping
    from: seg.FROM_NODE,
    to: seg.TO_NODE,
    lineNo: seg.LINE_NO,

    // Geometry mapping
    dx: seg.DELTA_X,
    dy: seg.DELTA_Y,
    dz: seg.DELTA_Z,
    od: seg.DIAMETER,
    wall: seg.WALL_THICK,

    // Additional renderer fields
    T1: seg.T1,
    P1: seg.P1,
    material: seg.MATERIAL_NAME,

    // Component type handling (specifically bends)
    isBend: seg.COMPONENT_TYPE === 'BEND',
    isGhost: seg.COMPONENT_TYPE === 'GHOST',
    controlNode: seg.CONTROL_NODE,

    // Support tags
    support: seg.SUPPORT_TAG ? { type: seg.SUPPORT_TAG } : null
  }));

  return {
    ...originalParsed,
    elements: rendererElements
  };
}
