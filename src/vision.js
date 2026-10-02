// Line-of-sight checks against the ruined building.
//
// One rule drives every "can I act on it?" decision in the game: if the
// character is actually visible — inside the view and not hidden behind a wall
// or a slab — the action works. The monitor's FLASH / AUDIO / PROGRAM and the
// flashlight-in-the-eyes check all go through here, so what the player sees on
// screen and what the logic decides can never disagree.
import * as THREE from 'three';

const ray = new THREE.Raycaster();
const ndc = new THREE.Vector3();
let occluders = null;

export function initVision(worldGroup) { occluders = worldGroup; }

// World-space points worth seeing on a character: eyes first, then the head
// and the chest, so a character whose face is hidden but whose body is in
// plain view still counts as "on camera".
export function samplePoints(ch) {
  const m = ch.mesh;
  m.updateMatrixWorld(true);
  const pts = (m.userData.eyes || []).map((e) => e.getWorldPosition(new THREE.Vector3()));
  const base = m.getWorldPosition(new THREE.Vector3());
  const hy = m.userData.headY || 2.6;
  pts.push(base.clone().add(new THREE.Vector3(0, hy, 0)));
  pts.push(base.clone().add(new THREE.Vector3(0, hy * 0.62, 0)));
  return pts;
}

export function eyePoints(ch) {
  ch.mesh.updateMatrixWorld(true);
  return (ch.mesh.userData.eyes || []).map((e) => e.getWorldPosition(new THREE.Vector3()));
}

// true when nothing solid sits between origin and target
export function lineOfSight(origin, target) {
  if (!occluders) return true;
  const dir = target.clone().sub(origin);
  const dist = dir.length();
  if (dist < 0.2) return true;
  ray.set(origin, dir.normalize());
  ray.near = 0.05;
  ray.far = dist - 0.12;
  const hits = ray.intersectObject(occluders, true);
  return !hits.some((h) => h.object.isMesh && h.object.visible);
}

// inside the camera's view (with a small border) and not occluded
export function pointVisible(camera, p, margin = 0.94) {
  camera.updateMatrixWorld();
  ndc.copy(p).project(camera);
  if (ndc.z >= 1 || ndc.z <= -1 || Math.abs(ndc.x) > margin || Math.abs(ndc.y) > margin) return false;
  const origin = new THREE.Vector3().setFromMatrixPosition(camera.matrixWorld);
  return lineOfSight(origin, p);
}

export function canSee(camera, ch) {
  return samplePoints(ch).some((p) => pointVisible(camera, p));
}

// visible from a fixed position if the viewer turns toward it (no frustum)
export function inSightFrom(origin, ch) {
  return samplePoints(ch).some((p) => lineOfSight(origin, p));
}
