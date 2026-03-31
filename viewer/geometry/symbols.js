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
export function createAnchorSymbol(pos) {
  const size = 0.02; // 20 mm in scene units
  const geo  = new THREE.BoxGeometry(size, size, size);
  const mesh = new THREE.Mesh(geo, MAT_ANCHOR);
  mesh.position.set(pos.x * SCALE, pos.z * SCALE, -pos.y * SCALE);
  return mesh;
}

/**
 * Guide symbol — grey ring disc at node position.
 * @param {object} pos  {x, y, z} in mm
 */
export function createGuideSymbol(pos) {
  const geo  = new THREE.RingGeometry(0.008, 0.016, 8);
  const mesh = new THREE.Mesh(geo, MAT_GUIDE);
  mesh.position.set(pos.x * SCALE, pos.z * SCALE, -pos.y * SCALE);
  return mesh;
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
