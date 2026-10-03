import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { FrameResult } from "../geometry/frame";

export class Viewer {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(32, 2, 1, 2000);
  private controls: OrbitControls;
  private material: THREE.MeshStandardMaterial;
  private mesh: THREE.Mesh | null = null;
  private framed = false;

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.camera.up.set(0, 0, 1); // z up, like the printer
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const sun = new THREE.DirectionalLight(0xffffff, 1.4);
    sun.position.set(40, -60, 120);
    this.scene.add(sun);
    const color = getComputedStyle(document.documentElement).getPropertyValue("--mesh").trim() || "#2f4fc4";
    this.material = new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.05 });
    new ResizeObserver(() => this.resize()).observe(canvas);
    this.resize();
    this.renderer.setAnimationLoop(() => {
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    });
  }

  private resize() {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  show(r: FrameResult) {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(r.positions, 3));
    g.setIndex(new THREE.BufferAttribute(r.indices, 1));
    g.computeVertexNormals();
    g.computeBoundingBox();
    if (this.mesh) {
      this.mesh.geometry.dispose();
      this.scene.remove(this.mesh);
    }
    this.mesh = new THREE.Mesh(g, this.material);
    this.scene.add(this.mesh);
    if (!this.framed) {
      const box = g.boundingBox!;
      const c = box.getCenter(new THREE.Vector3());
      const s = box.getSize(new THREE.Vector3()).length();
      this.controls.target.copy(c);
      this.camera.position.set(c.x, c.y - 0.75 * s, c.z + 0.95 * s);
      this.framed = true;
    }
  }
}
