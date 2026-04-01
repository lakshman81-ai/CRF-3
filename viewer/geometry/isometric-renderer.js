/**
 * isometric-renderer.js — Three.js paper-isometric scene for CAESAR II geometry.
 *
 * Uses OrthographicCamera at (1,1,1).normalize() × D for true isometric projection.
 * White background, bold line pipes, engineering symbols — looks like a paper iso drawing.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { createPipeLine, createBendArc, colorForMode, OD_COLORS, toThree, generateDiscreteColor } from './pipe-geometry.js';
import { createAnchorSymbol, createGuideSymbol, createForceArrow } from './symbols.js';
import { createNodeLabel, createSegmentLabel, computeStretches } from './labels.js';
import { materialFromDensity } from '../utils/formatter.js';
import { state } from '../core/state.js';
import { on } from '../core/event-bus.js';
import { buildUniversalCSV, normalizeToPCF, adaptForRenderer } from '../utils/accdb-to-pcf.js';

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

    // Use larger frustum for PCF Fixer style orthographic camera
    const aspect = w / h;
    const frustum = 5000;

    this._orthoCamera = new THREE.OrthographicCamera(
      -frustum * aspect, frustum * aspect,
      frustum, -frustum,
      -50000, 50000
    );
    this._perspCamera = new THREE.PerspectiveCamera(45, aspect, 1, 100000);

    this._isOrtho = true;
    this._camera = this._orthoCamera;

    this._camera.position.set(5000, 5000, 5000);
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
    this._controls.dampingFactor = 0.1;
    this._controls.addEventListener('change', () => {
      if (this._pipeGroup && this._isOrtho) {
        const box = new THREE.Box3().setFromObject(this._pipeGroup);
        if (!box.isEmpty()) {
            const sz = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(sz.x, sz.y, sz.z, 1);
            this._camera.near = -maxDim * 20;
            this._camera.far = maxDim * 20;
            this._camera.updateProjectionMatrix();
        }
      }
    });

    this._scene.add(this._pipeGroup, this._symbolGroup, this._labelGroup);

    const ro = new ResizeObserver(() => this._onResize());
    ro.observe(this._container);

    this._buildViewCube();
    this._buildAxisGizmo();

    this._animate();
  }

  _buildViewCube() {
    let cube = document.getElementById('pcf-view-cube');
    if (cube) {
        this._viewCubeEl = cube;
        return;
    }
    const size = 90;
    cube = document.createElement('div');
    cube.id = 'pcf-view-cube';
    cube.style.cssText = `
        position:absolute;top:12px;right:12px;width:${size}px;height:${size}px;
        perspective:200px;cursor:pointer;user-select:none;z-index:10;
    `;
    const inner = document.createElement('div');
    inner.style.cssText = `
        width:100%;height:100%;position:relative;transform-style:preserve-3d;
        transition:transform 0.05s linear;
    `;
    const half = size / 2;
    const FACES = [
        { label: 'Top', rot: 'rotateX(-90deg)', bg: '#3b6ea5', cam: [0, 1, 0], up: [0, 0, -1] },
        { label: 'Bot', rot: 'rotateX(90deg)', bg: '#2b5285', cam: [0, -1, 0], up: [0, 0, 1] },
        { label: 'Front', rot: 'translateZ(' + half + 'px)', bg: '#4a7c95', cam: [0, 0, 1], up: [0, 1, 0] },
        { label: 'Back', rot: 'rotateY(180deg) translateZ(' + half + 'px)', bg: '#4a7c95', cam: [0, 0, -1], up: [0, 1, 0] },
        { label: 'Right', rot: 'rotateY(90deg) translateZ(' + half + 'px)', bg: '#3a6e85', cam: [1, 0, 0], up: [0, 1, 0] },
        { label: 'Left', rot: 'rotateY(-90deg) translateZ(' + half + 'px)', bg: '#3a6e85', cam: [-1, 0, 0], up: [0, 1, 0] },
    ];
    for (const f of FACES) {
        const face = document.createElement('div');
        face.textContent = f.label;
        face.style.cssText = `
            position:absolute;width:${size}px;height:${size}px;
            display:flex;align-items:center;justify-content:center;
            font-size:11px;font-weight:700;color:#fff;background:${f.bg}cc;
            border:1px solid #ffffff33;box-sizing:border-box;
            transform:${f.rot};
            backface-visibility:visible;
        `;
        face.addEventListener('click', () => this._snapCamera(f.cam, f.up));
        inner.appendChild(face);
    }
    const cornerPositions = [
        { style: 'top:-8px;right:-8px', cam: [1, 1, -1], up: [0, 1, 0] },
        { style: 'top:-8px;left:-8px', cam: [-1, 1, -1], up: [0, 1, 0] },
        { style: 'bottom:-8px;right:-8px', cam: [1, -1, 1], up: [0, 1, 0] },
        { style: 'bottom:-8px;left:-8px', cam: [-1, -1, 1], up: [0, 1, 0] },
    ];
    for (const cp of cornerPositions) {
        const corner = document.createElement('div');
        corner.title = 'ISO view';
        corner.style.cssText = `
            position:absolute;${cp.style};width:16px;height:16px;
            background:#ffffff22;border:1px solid #ffffff55;border-radius:50%;
            cursor:pointer;z-index:12;display:flex;align-items:center;justify-content:center;
            font-size:8px;color:#fff;
        `;
        corner.textContent = '◆';
        corner.addEventListener('click', (e) => { e.stopPropagation(); this._snapCamera(cp.cam, cp.up); });
        cube.appendChild(corner);
    }
    this._viewCubeInner = inner;
    if (getComputedStyle(this._container).position === 'static') {
        this._container.style.position = 'relative';
    }
    cube.appendChild(inner);
    this._viewCubeEl = cube;
    this._container.appendChild(cube);
  }

  _buildAxisGizmo() {
    let container = document.getElementById('pcf-axis-gizmo');
    if (container) {
        this._gizmoEl = container;
        const canvas = container.querySelector('canvas');
        if (canvas) this._axisGizmoCtx = canvas.getContext('2d');
        return;
    }
    container = document.createElement('div');
    container.id = 'pcf-axis-gizmo';
    container.style.cssText = `
        position:absolute;bottom:12px;right:12px;width:80px;height:80px;
        z-index:10;pointer-events:none;
    `;
    const canvas = document.createElement('canvas');
    canvas.width = 80; canvas.height = 80;
    container.appendChild(canvas);
    this._gizmoEl = container;
    this._container.appendChild(container);
    this._axisGizmoCtx = canvas.getContext('2d');
  }

  _snapCamera([cx, cy, cz], [ux, uy, uz]) {
    if (!this._controls) return;
    const box = new THREE.Box3();
    if (this._pipeGroup) box.setFromObject(this._pipeGroup);
    const centre = box.isEmpty() ? new THREE.Vector3() : box.getCenter(new THREE.Vector3());
    const size = box.isEmpty() ? 5000 : Math.max(...box.getSize(new THREE.Vector3()).toArray()) * 1.5;
    this._camera.position.set(
        centre.x + cx * size,
        centre.y + cy * size,
        centre.z + cz * size
    );
    this._camera.up.set(ux, uy, uz);
    this._camera.lookAt(centre);
    this._camera.updateProjectionMatrix();
    this._controls.target.copy(centre);
    this._controls.update();
  }

  _syncViewCube() {
    if (!this._viewCubeInner || !this._camera) return;
    const q = this._camera.quaternion;
    this._viewCubeInner.style.transform =
        `matrix3d(${new THREE.Matrix4().makeRotationFromQuaternion(q.clone().invert()).elements.join(',')})`;
  }

  _syncAxisGizmo() {
    const ctx = this._axisGizmoCtx;
    if (!ctx || !this._camera) return;
    const W = 80, H = 80, cx = W / 2, cy = H / 2, len = 28;
    ctx.clearRect(0, 0, W, H);
    const axes = [
        { dir: new THREE.Vector3(1, 0, 0), color: '#ff4444', label: 'X' },
        { dir: new THREE.Vector3(0, 1, 0), color: '#44cc44', label: 'Y' },
        { dir: new THREE.Vector3(0, 0, 1), color: '#4488ff', label: 'Z' },
    ];
    for (const { dir, color, label } of axes) {
        const proj = dir.clone().applyQuaternion(this._camera.quaternion);
        const ex = cx + proj.x * len;
        const ey = cy - proj.y * len;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText(label, ex + (ex > cx ? 2 : -10), ey + (ey > cy ? 10 : -2));
    }
  }

  _animate() {
    this._animId = requestAnimationFrame(() => this._animate());
    this._controls.update();
    this._renderer.render(this._scene, this._camera);
    this._css2d.render(this._scene, this._camera);
    this._syncViewCube();
    this._syncAxisGizmo();
  }

  _onResize() {
    const w = this._container.clientWidth;
    const h = this._container.clientHeight;
    if (!w || !h) return;
    const aspect = w / h;

    if (this._isOrtho) {
        let frustum = 5000;
        if (this._pipeGroup) {
          const box = new THREE.Box3().setFromObject(this._pipeGroup);
          if (!box.isEmpty()) {
             const size = box.getSize(new THREE.Vector3());
             frustum = Math.max(size.x, size.y, size.z) * 0.8;
          }
        }
        this._orthoCamera.left   = -frustum * aspect;
        this._orthoCamera.right  =  frustum * aspect;
        this._orthoCamera.top    =  frustum;
        this._orthoCamera.bottom = -frustum;
        this._orthoCamera.updateProjectionMatrix();
    } else {
        this._perspCamera.aspect = aspect;
        this._perspCamera.updateProjectionMatrix();
    }

    this._renderer.setSize(w, h);
    this._css2d.setSize(w, h);
  }

  toggleProjection() {
      const w = this._container.clientWidth;
      const h = this._container.clientHeight;
      const aspect = w / h;

      if (this._isOrtho) {
          // Switch to Perspective
          this._perspCamera.position.copy(this._orthoCamera.position);
          this._perspCamera.quaternion.copy(this._orthoCamera.quaternion);
          this._perspCamera.aspect = aspect;
          this._perspCamera.updateProjectionMatrix();
          this._camera = this._perspCamera;
          this._isOrtho = false;
      } else {
          // Switch to Ortho
          this._orthoCamera.position.copy(this._perspCamera.position);
          this._orthoCamera.quaternion.copy(this._perspCamera.quaternion);
          this._orthoCamera.updateProjectionMatrix();
          this._camera = this._orthoCamera;
          this._isOrtho = true;
      }
      this._controls.object = this._camera;
      this._controls.update();
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

    const elements = this._getPcfElements();
    const { nodes, restraints = [], forces = [] } = data;

    // We must ensure elements have fromPos / toPos mapped for drawing
    for (const el of elements) {
        if (!el.fromPos && el.from !== undefined) {
           el.fromPos = nodes[el.from];
        }
        if (!el.toPos && el.to !== undefined) {
           el.toPos = nodes[el.to];
        }
    }

    const legendField = state.legendField;
    const isHeatMap = legendField.startsWith('HeatMap:');
    const heatField = isHeatMap ? legendField.split(':')[1] : null;
    const range = heatField ? this._computeRange(elements, heatField) : { min: 0, max: 100 };

    // Build pipe lines with mode-aware coloring
    for (const el of elements) {
      // Skip if position mapping failed for some reason
      if (!el.fromPos || !el.toPos) continue;

      const a = toThree(el.fromPos);
      const b = toThree(el.toPos);
      const col = colorForMode(el, legendField, range);

      if (el.isBend || el.bend) {
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

  /** Get elements processed through the 3-stage PCF pipeline */
  _getPcfElements() {
    const data = state.parsed;
    if (!data?.elements?.length) return [];
    try {
      const csvRows = buildUniversalCSV(data);
      const pcfSegments = normalizeToPCF(csvRows, { method: 'ContEngineMethod' });
      const adapted = adaptForRenderer(pcfSegments, data);
      return adapted.elements;
    } catch (err) {
      console.warn("PCF pipeline failed, falling back to raw elements:", err);
      return data.elements;
    }
  }

  /** Rebuild only labels + legend (called on legend-changed) */
  _rebuildAll() {
    const data = state.parsed;
    if (!data?.elements?.length) return;
    const elements = this._getPcfElements();
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

    const elements = this._getPcfElements();
    const { nodes } = data;
    const showLabels = state.geoToggles.nodeLabels;

    // Node number labels
    if (showLabels) {
      for (const [nodeId, pos] of Object.entries(nodes)) {
        const lbl = createNodeLabel(Number(nodeId), pos);
        this._labelGroup.add(lbl);
      }
    }

    // One label per continuous linear stretch
    let stretches = computeStretches(elements, state.legendField, materialFromDensity);

    // Group stretches by their text value to enforce the "max labels per item" rule
    const maxLabels = state.geoToggles.maxLegendLabels ?? 3;
    const stretchesByText = {};
    for (const s of stretches) {
        if (!s.text) continue;
        if (!stretchesByText[s.text]) stretchesByText[s.text] = [];
        stretchesByText[s.text].push(s);
    }

    // Randomly select up to maxLabels items for each text value
    for (const text in stretchesByText) {
        let group = stretchesByText[text];
        if (group.length > maxLabels) {
            // Shuffle array and pick first maxLabels
            for (let i = group.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [group[i], group[j]] = [group[j], group[i]];
            }
            group = group.slice(0, maxLabels);
        }

        for (const stretch of group) {
            const lbl = createSegmentLabel(stretch.text, stretch.midPos);
            this._labelGroup.add(lbl);
        }
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
      const uniqueValues = [...new Set(elements.map(e => e[heatField]).filter(v => v !== undefined && v !== null))].sort((a,b)=>b-a);
      const swatches = uniqueValues.map(v => {
          const col = generateDiscreteColor(v);
          const fv = Number(v).toFixed(heatField === 'P1' ? 2 : 0);
          return `<div class="legend-row"><span class="legend-swatch" style="background:#${col.toString(16).padStart(6,'0')}"></span><span>${fv}${unit}</span></div>`;
      }).join('');

      panel.innerHTML = `
        <div class="legend-title">${heatField} Heat Map</div>
        ${swatches}
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
        // Group by value
        const uniqueValues = [...new Set(elements.map(e => e.od))].filter(v => v > 0);
        swatches = OD_COLORS
          .filter(c => uniqueValues.some(od => Math.abs(od - c.od) < 1))
          .map(c => `<div class="legend-row"><span class="legend-swatch" style="background:#${c.color.toString(16).padStart(6,'0')}"></span><span>${c.label}</span></div>`)
          .join('');
        if (!swatches) {
          swatches = `<div class="legend-row"><span class="legend-swatch" style="background:#555"></span><span>Pipe</span></div>`;
        }
      }

      const titles = { pipelineRef:'OD LEGEND', material:'MATERIAL LEGEND', T1:'T1 (\u00b0C)', T2:'T2 (\u00b0C)', P1:'P1 (bar)' };
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
