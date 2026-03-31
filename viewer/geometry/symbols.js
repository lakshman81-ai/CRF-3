/**
 * symbols.js — Engineering symbols for anchors, guides, and load arrows.
 * Uses THREE.MeshBasicMaterial (no lighting) for paper-iso look.
 */

import * as THREE from 'three';
import { SCALE } from './pipe-geometry.js';

const MAT_ANCHOR  = new THREE.MeshBasicMaterial({ color: 0xcc2200 });
const MAT_GUIDE   = new THREE.MeshBasicMaterial({ color: 0x888888 });
const MAT_LOAD    = new THREE.MeshBasicMaterial({ color: 0xe0a000 });

/**
 * Anchor symbol — solid red box at node position.
 * @param {object} pos  {x, y, z} in mm
 */
// Helper to create a Box mesh (wireframe option for pencil style)
function createBox(pos, hw, material, wireframe = false) {
  const geo = new THREE.BoxGeometry(hw, hw, hw);
  const mesh = new THREE.Mesh(geo, material);
  if (wireframe) {
    const edges = new THREE.EdgesGeometry(geo);
    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: material.color }));
    mesh.add(line);
    mesh.material.transparent = true;
    mesh.material.opacity = 0.2;
  }
  mesh.position.copy(pos);
  return mesh;
}

// Helper to create a Disc (cylinder) mesh
function createDisc(pos, normal, outerRadius, thickness, material) {
  const geo = new THREE.CylinderGeometry(outerRadius, outerRadius, thickness, 16);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.copy(pos);
  const axis = new THREE.Vector3(0, 1, 0);
  mesh.quaternion.setFromUnitVectors(axis, normal.clone().normalize());
  return mesh;
}

export function createAnchorSymbol(pos) {
  const p = new THREE.Vector3(pos.x * SCALE, pos.z * SCALE, -pos.y * SCALE);
  const group = new THREE.Group();

  const r = 0.015; // 15mm scaled base radius
  const strapR = r * 1.2;
  const baseW = r * 3;

  // Clamping strap
  const strap = createDisc(p, new THREE.Vector3(1, 0, 0), strapR, r * 0.4, MAT_ANCHOR);
  group.add(strap);

  // Base block (pencil style: wireframe or light opacity)
  const basePos = p.clone().add(new THREE.Vector3(0, -r * 1.5, 0));
  const base = createBox(basePos, baseW, MAT_ANCHOR, true);
  group.add(base);

  return group;
}

/**
 * Guide symbol — pencil style guide based on PCF Fixer logic
 * @param {object} pos  {x, y, z} in mm
 */
export function createGuideSymbol(pos) {
  const p = new THREE.Vector3(pos.x * SCALE, pos.z * SCALE, -pos.y * SCALE);
  const group = new THREE.Group();

  const r = 0.015;
  const loopR = r * 1.2;
  const loopThickness = r * 0.15;

  // Guide loop
  const loop = createDisc(p, new THREE.Vector3(1, 0, 0), loopR, loopThickness, MAT_GUIDE);
  group.add(loop);

  // Slide pad
  const padPos = p.clone().add(new THREE.Vector3(0, -r, 0));
  const pad = createBox(padPos, r * 1.5, MAT_GUIDE, true);
  pad.scale.set(1, 0.2, 1);
  group.add(pad);

  return group;
}

/**
 * Applied force arrow — yellow ArrowHelper pointing in force direction.
 * @param {object} pos  node position {x, y, z} in mm
 * @param {object} force  {fx, fy, fz} in N
 */
export function createForceArrow(pos, force) {
  const dir = new THREE.Vector3(force.fx, force.fz, -force.fy).normalize();
  if (dir.length() < 0.01) return null;

  const origin = new THREE.Vector3(pos.x * SCALE, pos.z * SCALE, -pos.y * SCALE);
  const length = 0.05;
  const arrow = new THREE.ArrowHelper(dir, origin, length, 0xe0a000, 0.015, 0.01);
  return arrow;
}
