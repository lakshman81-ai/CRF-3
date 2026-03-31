/**
 * pipe-geometry.js — Helpers to build Three.js geometry for pipe segments and bends.
 *
 * Isometric viewer uses LineMaterial (Line2) for thick lines on white background.
 * All coordinates are in millimetres; scene scale: 1 unit = 1 mm.
 */

import * as THREE from 'three';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { Line2 }        from 'three/addons/lines/Line2.js';

/** Colour palette by OD (mm) — matches legend */
export const OD_COLORS = [
  { od: 406.4,   color: 0xe07020, label: 'Ø406.4 mm' },  // orange
  { od: 323.85,  color: 0x1a6ec7, label: 'Ø323.85 mm' }, // blue
  { od: 168.275, color: 0x1a9c7a, label: 'Ø168.275 mm' },// teal
];
const FALLBACK_COLOR = 0x444444;

export function colorForOD(od) {
  // Nearest match within 1 mm tolerance
  const match = OD_COLORS.find(c => Math.abs(c.od - od) < 1);
  return match ? match.color : FALLBACK_COLOR;
}

/** Material color palette for legend mode */
const MATERIAL_COLORS = [
  { key: 'CS',  color: 0x3a7bd5, label: 'Carbon Steel' },
  { key: 'SS',  color: 0x27ae60, label: 'Stainless Steel' },
  { key: 'AS',  color: 0xe67e22, label: 'Alloy Steel' },
  { key: 'CU',  color: 0x8e44ad, label: 'Copper' },
  { key: 'AL',  color: 0x16a085, label: 'Aluminium' },
];

export function colorForMaterial(material = 'CS') {
  const k = material.toUpperCase().slice(0, 2);
  const match = MATERIAL_COLORS.find(m => m.key === k);
  return match ? match.color : FALLBACK_COLOR;
}

/**
 * Interpolate a heat gradient: blue(0) → cyan → green → yellow → red(1)
 * @param {number} t  0.0–1.0
 * @returns {number}  hex color
 */
export function heatMapColor(t) {
  t = Math.max(0, Math.min(1, t));
  let r, g, b;
  if (t < 0.25) {
    // blue → cyan
    const s = t / 0.25;
    r = 0; g = Math.round(255 * s); b = 255;
  } else if (t < 0.5) {
    // cyan → green
    const s = (t - 0.25) / 0.25;
    r = 0; g = 255; b = Math.round(255 * (1 - s));
  } else if (t < 0.75) {
    // green → yellow
    const s = (t - 0.5) / 0.25;
    r = Math.round(255 * s); g = 255; b = 0;
  } else {
    // yellow → red
    const s = (t - 0.75) / 0.25;
    r = 255; g = Math.round(255 * (1 - s)); b = 0;
  }
  return (r << 16) | (g << 8) | b;
}

/**
 * Determine color for an element given the current render mode and precomputed min/max.
 * @param {object} el  parsed element
 * @param {string} mode  legendField value (e.g. 'T1', 'HeatMap:T1', 'material', 'pipelineRef')
 * @param {{ min: number, max: number }} range  { min, max } for heat map scaling
 */
export function colorForMode(el, mode, range = { min: 0, max: 100 }) {
  if (mode.startsWith('HeatMap:')) {
    const field = mode.split(':')[1];
    const val = el[field] ?? 0;
    const { min, max } = range;
    const t = max === min ? 0.5 : (val - min) / (max - min);
    return heatMapColor(t);
  }
  switch (mode) {
    case 'material': return colorForMaterial(el.material);
    case 'T1':       return colorForOD(el.od); // keep OD base; label shows value
    case 'T2':       return colorForOD(el.od);
    case 'P1':       return colorForOD(el.od);
    default:         return colorForOD(el.od); // pipelineRef → OD based
  }
}


/**
 * Create a thick Line2 segment between two THREE.Vector3 points.
 * @param {THREE.Vector3} a
 * @param {THREE.Vector3} b
 * @param {number} color  hex
 * @param {number} lineWidth  pixels (default 3)
 * @param {THREE.WebGLRenderer} renderer  needed for LineMaterial resolution
 */
export function createPipeLine(a, b, color, lineWidth = 3, renderer) {
  const geo = new LineGeometry();
  geo.setPositions([a.x, a.y, a.z, b.x, b.y, b.z]);

  const mat = new LineMaterial({
    color,
    linewidth: lineWidth,
    resolution: renderer
      ? new THREE.Vector2(renderer.domElement.clientWidth, renderer.domElement.clientHeight)
      : new THREE.Vector2(800, 600),
  });

  const line = new Line2(geo, mat);
  line.computeLineDistances();
  return line;
}

/**
 * Create a bend arc approximated by N straight segments (CatmullRom curve).
 * @param {THREE.Vector3} startPt  start of element with bend
 * @param {THREE.Vector3} midPt    approximate elbow centre (mid-point of arc)
 * @param {THREE.Vector3} endPt    end of element
 * @param {number} color
 * @param {number} lineWidth
 * @param {THREE.WebGLRenderer} renderer
 * @param {number} segments  number of line segments (default 12)
 */
export function createBendArc(startPt, midPt, endPt, color, lineWidth = 3, renderer, segments = 12) {
  const curve = new THREE.CatmullRomCurve3([startPt, midPt, endPt]);
  const pts = curve.getPoints(segments);

  const positions = [];
  for (const p of pts) positions.push(p.x, p.y, p.z);

  // Line2 requires pairs; build as polyline
  const pairPositions = [];
  for (let i = 0; i < pts.length - 1; i++) {
    pairPositions.push(pts[i].x, pts[i].y, pts[i].z, pts[i + 1].x, pts[i + 1].y, pts[i + 1].z);
  }

  const geo = new LineGeometry();
  geo.setPositions(pairPositions);

  const mat = new LineMaterial({
    color,
    linewidth: lineWidth,
    resolution: renderer
      ? new THREE.Vector2(renderer.domElement.clientWidth, renderer.domElement.clientHeight)
      : new THREE.Vector2(800, 600),
  });

  const line = new Line2(geo, mat);
  line.computeLineDistances();
  return line;
}

/**
 * Scale coordinates from mm to scene units.
 * CAESAR II: X = East, Y = North (horizontal), Z = Up (elevation).
 * Three.js isometric: we map directly (X=East, Y=Up/elev=Z_caesarII, Z=North_caesarII).
 * So: threeX = caesarX, threeY = caesarZ, threeZ = -caesarY  (RH system, Y up)
 * Scale: divide by 1000 to go from mm → m-ish (keeps numbers manageable).
 */
export const SCALE = 1 / 1000;

export function toThree(pos) {
  return new THREE.Vector3(
    pos.x * SCALE,
    pos.z * SCALE,   // Z is elevation → Three Y (up)
    -pos.y * SCALE   // Y horizontal → Three -Z (into scene)
  );
}
