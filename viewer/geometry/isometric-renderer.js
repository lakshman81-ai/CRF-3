/**
 * isometric-renderer.js — Three.js paper-isometric scene for CAESAR II geometry.
 *
 * Uses OrthographicCamera at (1,1,1).normalize() × D for true isometric projection.
 * White background, bold line pipes, engineering symbols — looks like a paper iso drawing.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { createPipeLine, createBendArc, colorForMode, OD_COLORS, toThree } from './pipe-geometry.js';
import { createAnchorSymbol, createGuideSymbol, createForceArrow } from './symbols.js';
import { createNodeLabel, createSegmentLabel, computeStretches } from './labels.js';
import { materialFromDensity } from '../utils/formatter.js';
import { state } from '../core/state.js';
import { on } from '../core/event-bus.js';

export class IsometricRenderer {
  constructor(canvasContainer) {
    this._container = canvasContainer;
    this._scene = null;
    this._camera = null;
    this._renderer = null;
    this._css2d = null;
    this._controls = null;
    this._animId = null;
    this._pipeGroup   = new THREE.Group();
    this._symbolGroup = new THREE.Group();
    this._labelGroup  = new THREE.Group();
    this._init();

    on('parse-complete', () => this.rebuild());
    on('geo-toggle',     () => this._applyToggles());
    on('legend-changed', () => this._rebuildAll());
  }

  _init() {
    const w = this._container.clientWidth  || 800;
    const h = this._container.clientHeight || 500;

    this._scene = new THREE.Scene();
    this._scene.background = new THREE.Color(0xffffff);

    const aspect = w / h;
    const frustum = 1.5;
    this._camera = new THREE.OrthographicCamera(
      -frustum * aspect, frustum * aspect,
      frustum, -frustum,
      0.01, 1000
    );
    const D = 5;
    this._camera.position.set(D, D, D);
    this._camera.lookAt(0, 0, 0);

    this._renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this._renderer.setSize(w, h);
    this._renderer.setPixelRatio(window.devicePixelRatio);
    this._container.appendChild(this._renderer.domElement);

    this._css2d = new CSS2DRenderer();
    this._css2d.setSize(w, h);
    this._css2d.domElement.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;';
    this._container.style.position = 'relative';
    this._container.appendChild(this._css2d.domElement);

    this._controls = new OrbitControls(this._camera, this._renderer.domElement);
    this._controls.enableDamping = true;
    this._controls.dampingFactor = 0.05;
    this._controls.screenSpacePanning = true;

    this._scene.add(this._pipeGroup, this._symbolGroup, this._labelGroup);

    const ro = new ResizeObserver(() => this._onResize());
    ro.observe(this._container);

    this._animate();
  }

  _animate() {
    this._animId = requestAnimationFrame(() => this._animate());
    this._controls.update();
    this._renderer.render(this._scene, this._camera);
    this._css2d.render(this._scene, this._camera);
  }

  _onResize() {
    const w = this._container.clientWidth;
    const h = this._container.clientHeight;
    if (!w || !h) return;
    const aspect = w / h;
    const frustum = 1.5;
    this._camera.left   = -frustum * aspect;
    this._camera.right  =  frustum * aspect;
    this._camera.top    =  frustum;
    this._camera.bottom = -frustum;
    this._camera.updateProjectionMatrix();
    this._renderer.setSize(w, h);
    this._css2d.setSize(w, h);
  }

  /** Compute min/max range for a field across all elements */
  _computeRange(elements, field) {
    const vals = elements.map(e => e[field] ?? 0).filter(v => v !== 0);
    if (!vals.length) return { min: 0, max: 100 };
    return { min: Math.min(...vals), max: Math.max(...vals) };
  }

  /** Rebuild pipes + labels + legend */
  rebuild() {
    this._clearGroup(this._pipeGroup);
    this._clearGroup(this._symbolGroup);
    this._clearGroup(this._labelGroup);

    const data = state.parsed;
    if (!data?.elements?.length) return;

    const { elements, nodes, restraints = [], forces = [] } = data;
    const legendField = state.legendField;
    const isHeatMap = legendField.startsWith('HeatMap:');
    const heatField = isHeatMap ? legendField.split(':')[1] : null;
    const range = heatField ? this._computeRange(elements, heatField) : { min: 0, max: 100 };

    // Build pipe lines with mode-aware coloring
    for (const el of elements) {
      const a = toThree(el.fromPos);
      const b = toThree(el.toPos);
      const col = colorForMode(el, legendField, range);

      if (el.bend) {
        const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
        const arc = createBendArc(a, mid, b, col, 3, this._renderer);
        this._pipeGroup.add(arc);
      } else {
        const seg = createPipeLine(a, b, col, 3, this._renderer);
        this._pipeGroup.add(seg);
      }
    }

    // Restraint / force symbols
    for (const r of restraints) {
      const pos = nodes[r.node];
      if (!pos) continue;
      const sym = r.isAnchor ? createAnchorSymbol(pos) : createGuideSymbol(pos);
      this._symbolGroup.add(sym);
    }

    const forceByNode = new Map(forces.map(f => [f.node, f]));
    for (const [nodeId, pos] of Object.entries(nodes)) {
      const f = forceByNode.get(Number(nodeId));
      if (f) {
        const arrow = createForceArrow(pos, f);
        if (arrow) this._symbolGroup.add(arrow);
      }
    }

    this._rebuildLabels();
    this._updateLegendPanel(elements, legendField, range);
    this._fitToScene();
  }

  /** Rebuild only labels + legend (called on legend-changed) */
  _rebuildAll() {
    const data = state.parsed;
    if (!data?.elements?.length) return;
    const { elements } = data;
    const legendField = state.legendField;
    const isHeatMap = legendField.startsWith('HeatMap:');
    const heatField = isHeatMap ? legendField.split(':')[1] : null;
    const range = heatField ? this._computeRange(elements, heatField) : { min: 0, max: 100 };

    // Recolor existing pipe meshes
    let idx = 0;
    for (const child of this._pipeGroup.children) {
      const el = elements[idx++];
      if (el && child.material) {
        child.material.color.setHex(colorForMode(el, legendField, range));
      }
    }

    this._rebuildLabels();
    this._updateLegendPanel(elements, legendField, range);
  }

  _rebuildLabels() {
    this._clearGroup(this._labelGroup);
    const data = state.parsed;
    if (!data?.elements?.length) return;

    const { elements, nodes } = data;
    const showLabels = state.geoToggles.nodeLabels;

    // Node number labels
    if (showLabels) {
      for (const [nodeId, pos] of Object.entries(nodes)) {
        const lbl = createNodeLabel(Number(nodeId), pos);
        this._labelGroup.add(lbl);
      }
    }

    // One label per continuous linear stretch
    const stretches = computeStretches(elements, state.legendField, materialFromDensity);
    for (const stretch of stretches) {
      if (!stretch.text) continue;
      const lbl = createSegmentLabel(stretch.text, stretch.midPos);
      this._labelGroup.add(lbl);
    }
  }

  /** Update the legend panel: gradient bar for heat map, discrete swatches for legend */
  _updateLegendPanel(elements, legendField, range) {
    const panel = document.getElementById('legend-panel');
    if (!panel) return;

    const isHeatMap = legendField.startsWith('HeatMap:');
    const heatField = isHeatMap ? legendField.split(':')[1] : null;

    if (isHeatMap) {
      const unit = heatField === 'P1' ? ' bar' : '°C';
      const minV = Number(range.min).toFixed(heatField === 'P1' ? 2 : 0);
      const maxV = Number(range.max).toFixed(heatField === 'P1' ? 2 : 0);
      panel.innerHTML = `
        <div class="legend-title">${heatField} Heat Map</div>
        <div style="display:flex;align-items:center;gap:6px;margin:6px 0;">
          <div style="width:12px;height:80px;background:linear-gradient(to top,#0000ff,#00ffff,#00ff00,#ffff00,#ff0000);border-radius:3px;flex-shrink:0;"></div>
          <div style="display:flex;flex-direction:column;justify-content:space-between;height:80px;font-size:10px;color:#444;">
            <span>${maxV}${unit}</span>
            <span>${minV}${unit}</span>
          </div>
        </div>
        <div class="legend-row"><span class="legend-swatch swatch-anchor"></span><span>Anchor ▣</span></div>
        <div class="legend-row"><span class="legend-swatch swatch-guide"></span><span>Guide ○</span></div>
      `;
    } else {
      // Discrete swatches
      let swatches = '';
      if (legendField === 'material') {
        const MCOLORS = { CS:'#3a7bd5', SS:'#27ae60', AS:'#e67e22', CU:'#8e44ad', AL:'#16a085' };
        const mats = [...new Set(elements.map(e => e.material || 'CS'))];
        swatches = mats.map(m => {
          const col = MCOLORS[m.toUpperCase().slice(0, 2)] || '#888';
          return `<div class="legend-row"><span class="legend-swatch" style="background:${col}"></span><span>${m}</span></div>`;
        }).join('');
      } else {
        // OD-based swatches (pipelineRef / T1 / T2 / P1 all use OD colouring by default)
        const uniqueODs = [...new Set(elements.map(e => e.od))].filter(v => v > 0);
        swatches = OD_COLORS
          .filter(c => uniqueODs.some(od => Math.abs(od - c.od) < 1))
          .map(c => `<div class="legend-row"><span class="legend-swatch" style="background:#${c.color.toString(16).padStart(6,'0')}"></span><span>${c.label}</span></div>`)
          .join('');
        if (!swatches) {
          swatches = `<div class="legend-row"><span class="legend-swatch" style="background:#444"></span><span>Pipe</span></div>`;
        }
      }

      const titles = { pipelineRef:'Pipeline Ref', material:'Material', T1:'T1 (\u00b0C)', T2:'T2 (\u00b0C)', P1:'P1 (bar)' };
      panel.innerHTML = `
        <div class="legend-title">${titles[legendField] || 'Legend'}</div>
        ${swatches}
        <div class="legend-row"><span class="legend-swatch swatch-anchor"></span><span>Anchor ▣</span></div>
        <div class="legend-row"><span class="legend-swatch swatch-guide"></span><span>Guide ○</span></div>
        <div class="legend-row"><span class="legend-swatch swatch-load"></span><span>Applied Load ↓</span></div>
      `;
    }
  }

  _applyToggles() {
    this._symbolGroup.visible = state.geoToggles.supports;
    this._rebuildLabels();
  }

  _fitToScene() {
    const box = new THREE.Box3().setFromObject(this._pipeGroup);
    if (box.isEmpty()) return;

    const center = new THREE.Vector3();
    const size   = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);

    const maxDim = Math.max(size.x, size.y, size.z);
    const frustum = maxDim * 0.65;
    const aspect  = this._container.clientWidth / this._container.clientHeight;

    this._camera.left   = -frustum * aspect;
    this._camera.right  =  frustum * aspect;
    this._camera.top    =  frustum;
    this._camera.bottom = -frustum;
    this._camera.updateProjectionMatrix();

    this._controls.target.copy(center);
    const D = maxDim * 1.5;
    this._camera.position.copy(center).add(new THREE.Vector3(D, D, D).normalize().multiplyScalar(D));
    this._controls.update();
  }

  resetView() { this._fitToScene(); }

  toDataURL() {
    this._renderer.render(this._scene, this._camera);
    return this._renderer.domElement.toDataURL('image/png');
  }

  _clearGroup(group) {
    while (group.children.length) {
      const child = group.children[0];
      group.remove(child);
      child.geometry?.dispose();
      child.material?.dispose();
    }
  }

  destroy() {
    cancelAnimationFrame(this._animId);
    this._renderer.dispose();
  }
}
