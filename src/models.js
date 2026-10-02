// Animatronic models, built from primitives (no assets). Each model exposes
// the rig the rest of the game relies on through userData:
//   eyes  — emissive pupils (vision checks + glow states)
//   arms  — shoulder pivots (jumpscare raises them)
//   jaw   — hinge pivot (jumpscare snaps it)
//   head  — neck pivot (idle twitches)
//   headY — height of the head centre above the feet (aiming, jumpscare framing)
import * as THREE from 'three';

function mat(c, extra = {}) {
  return new THREE.MeshStandardMaterial({ color: c, roughness: 0.82, metalness: 0.08, ...extra });
}
const METAL = () => mat(0x2f3338, { metalness: 0.85, roughness: 0.38 });

function capsule(r, len, m) { return new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 4, 10), m); }
function sphere(r, m, sx = 1, sy = 1, sz = 1) {
  const s = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 14), m);
  s.scale.set(sx, sy, sz);
  return s;
}
function boxm(w, h, d, m) { return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); }
function at(o, x, y, z) { o.position.set(x, y, z); return o; }

// a printed bib for Chica, drawn on a canvas — still zero asset files
function bibTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 192;
  const g = c.getContext('2d');
  g.fillStyle = '#efe9d6'; g.fillRect(0, 0, 256, 192);
  g.fillStyle = 'rgba(120,90,40,0.25)';
  for (let i = 0; i < 40; i++) g.fillRect(Math.random() * 256, Math.random() * 192, 3 + Math.random() * 14, 2 + Math.random() * 8);
  g.save();
  g.translate(128, 100); g.rotate(-0.08);
  g.fillStyle = '#b0222e';
  g.font = 'bold 54px Impact, Arial Black, sans-serif';
  g.textAlign = 'center';
  g.fillText("LET'S", 0, -18);
  g.fillText('EAT!!', 0, 44);
  g.restore();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ---------------------------------------------------------------- suits
function suit(kind, color) {
  const g = new THREE.Group();
  const fur = mat(color);
  const dark = mat(new THREE.Color(color).multiplyScalar(0.55));
  const light = mat(new THREE.Color(color).lerp(new THREE.Color(0xfff4dc), 0.45));
  const metal = METAL();

  // legs + feet
  [-0.27, 0.27].forEach((x, i) => {
    const legMat = (kind === 'foxy' && i === 1) ? metal : fur; // Foxy's torn right leg
    const leg = at(capsule(kind === 'foxy' && i === 1 ? 0.09 : 0.17, 0.66, legMat), x, 0.56, 0);
    const foot = at(sphere(0.2, dark, 1, 0.45, 1.5), x, 0.08, 0.1);
    g.add(leg, foot);
  });
  if (kind === 'foxy') g.add(at(boxm(0.62, 0.42, 0.42, mat(0x5a3a22)), 0, 1.02, 0)); // ragged pants

  // torso + belly
  const torso = at(sphere(0.6, fur, 0.98, 1.08, 0.66), 0, 1.72, 0);
  const belly = at(sphere(0.44, light, 0.95, 1.05, 0.35), 0, 1.6, 0.27);
  g.add(torso, belly);
  if (kind === 'foxy') {
    // gaping tear in the chest: endoskeleton ribs showing through
    const hole = at(sphere(0.3, mat(0x080808), 1, 1.1, 0.4), 0.1, 1.82, 0.3);
    g.add(hole);
    for (let i = 0; i < 3; i++) g.add(at(boxm(0.42, 0.04, 0.06, metal), 0.1, 1.68 + i * 0.12, 0.38));
  }

  // arms on shoulder pivots
  const arms = [-1, 1].map((side) => {
    const pivot = at(new THREE.Group(), side * 0.66, 2.12, 0);
    const upper = at(capsule(0.15, 0.6, fur), 0, -0.42, 0);
    pivot.add(upper);
    if (kind === 'foxy' && side === 1) {
      const hook = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.03, 6, 12, Math.PI * 1.3),
        mat(0xc9d1d8, { metalness: 0.95, roughness: 0.25 }));
      pivot.add(at(hook, 0, -0.98, 0.05));
      pivot.add(at(capsule(0.03, 0.18, metal), 0, -0.86, 0));
    } else {
      pivot.add(at(sphere(0.15, dark, 1, 0.9, 1), 0, -0.9, 0.02)); // hand
    }
    pivot.rotation.z = side * 0.1;
    g.add(pivot);
    return pivot;
  });

  // head on a neck pivot
  const head = at(new THREE.Group(), 0, 2.3, 0);
  g.add(head);
  const skull = at(sphere(0.44, fur, 1, 0.9, 0.92), 0, 0.38, 0);
  const muzzle = at(sphere(0.25, light, 1.15, 0.72, 0.85), 0, 0.2, 0.3);
  head.add(skull, muzzle);

  // eyes: pale sclera + emissive pupil (the pupils are the rig's "eyes")
  const sclera = mat(0xe8e2d0, { roughness: 0.4 });
  const eyes = [-0.18, 0.18].map((x) => {
    head.add(at(sphere(0.11, sclera, 1, 1, 0.6), x, 0.45, 0.36));
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 10), new THREE.MeshStandardMaterial({
      color: 0x111111, emissive: 0xffffff, emissiveIntensity: 0
    }));
    head.add(at(pupil, x, 0.45, 0.42));
    // heavy brow for menace
    const brow = at(boxm(0.18, 0.04, 0.06, dark), x, 0.58, 0.37);
    brow.rotation.z = x < 0 ? -0.25 : 0.25;
    head.add(brow);
    return pupil;
  });

  // upper teeth
  const toothMat = mat(0xe9e3cc, { roughness: 0.5 });
  for (let i = 0; i < 6; i++) head.add(at(boxm(0.05, 0.07, 0.04, toothMat), -0.14 + i * 0.056, 0.08, 0.5));

  // jaw hinge with lower teeth
  const jaw = at(new THREE.Group(), 0, 0.1, 0.06);
  const jawShell = at(sphere(0.26, light, 1.1, 0.45, 1.05), 0, -0.04, 0.22);
  jaw.add(jawShell);
  for (let i = 0; i < 5; i++) jaw.add(at(boxm(0.05, 0.06, 0.04, toothMat), -0.11 + i * 0.055, 0.02, 0.44));
  head.add(jaw);

  // per-character features
  if (kind === 'bonnie') {
    [-1, 1].forEach((side) => {
      const ear = at(capsule(0.1, 0.72, fur), side * 0.2, 1.05, -0.05);
      ear.scale.set(1, 1, 0.45);
      ear.rotation.z = -side * 0.14;
      head.add(ear);
    });
    head.add(at(sphere(0.07, mat(0xb23a5a), 1.2, 0.8, 1), 0, 0.3, 0.55)); // nose
    g.add(at(bow(mat(0xb01825)), 0, 2.2, 0.3));
  } else if (kind === 'chica') {
    const beakMat = mat(0xd9861a);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.36, 4), beakMat);
    beak.rotation.x = Math.PI / 2; beak.rotation.y = Math.PI / 4;
    head.add(at(beak, 0, 0.26, 0.56));
    muzzle.visible = false;
    jawShell.material = beakMat;
    [-0.08, 0.05, 0.16].forEach((x, i) => {
      const tuft = at(capsule(0.04, 0.2, fur), x, 0.86, 0);
      tuft.rotation.z = -0.4 + i * 0.35;
      head.add(tuft);
    });
    // the bib wraps the chest: an open cylinder arc squashed to the torso's
    // elliptical cross-section, sitting just outside it
    const bibMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 0.6, 0.7, 24, 1, true, -0.75, 1.5),
      new THREE.MeshStandardMaterial({ map: bibTexture(), roughness: 0.9 })
    );
    bibMesh.scale.set(1, 1, 0.69);
    g.add(at(bibMesh, 0, 1.74, 0));
    belly.visible = false;
    // the cupcake, held in her left hand
    const cup = at(new THREE.Group(), 0, -1.02, 0.12);
    cup.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.08, 0.12, 10), mat(0x8fc5e8)), 0, 0, 0));
    cup.add(at(sphere(0.12, mat(0xe56a9a), 1, 0.7, 1), 0, 0.09, 0));
    cup.add(at(sphere(0.035, mat(0x111111)), -0.04, 0.12, 0.09));
    cup.add(at(sphere(0.035, mat(0x111111)), 0.04, 0.12, 0.09));
    cup.add(at(capsule(0.012, 0.08, mat(0xfff2c0, { emissive: 0xffaa33, emissiveIntensity: 0.4 })), 0, 0.2, 0));
    arms[0].add(cup);
  } else if (kind === 'foxy') {
    [-1, 1].forEach((side) => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.42, 4), fur);
      head.add(at(ear, side * 0.24, 0.86, -0.02));
      ear.rotation.z = -side * 0.2;
    });
    muzzle.scale.set(0.9, 0.62, 1.5);
    muzzle.position.set(0, 0.2, 0.42);
    jawShell.scale.set(0.95, 0.4, 1.45);
    head.add(at(sphere(0.06, mat(0x1a1010)), 0, 0.28, 0.82)); // nose
    const patch = at(boxm(0.24, 0.17, 0.04, mat(0x101010)), -0.18, 0.47, 0.44);
    patch.rotation.x = -0.5; // flipped up, eye exposed
    head.add(patch);
    const strap = at(capsule(0.01, 0.6, mat(0x101010)), 0, 0.62, 0.3);
    strap.rotation.z = 1.2;
    head.add(strap);
  } else if (kind === 'freddy') {
    [-1, 1].forEach((side) => {
      head.add(at(sphere(0.14, fur, 1, 1, 0.5), side * 0.34, 0.76, 0));
      head.add(at(sphere(0.08, dark, 1, 1, 0.4), side * 0.34, 0.76, 0.05));
    });
    head.add(at(sphere(0.07, mat(0x1a0d05), 1.3, 0.8, 1), 0, 0.3, 0.54)); // nose
    const hatMat = mat(0x0d0d0d, { roughness: 0.6 });
    head.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.32, 14), hatMat), 0, 0.98, 0));
    head.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.04, 16), hatMat), 0, 0.82, 0));
    g.add(at(bow(mat(0x0d0d0d)), 0, 2.2, 0.3));
    // freckles
    [[-0.14, 0.2], [-0.2, 0.15], [0.14, 0.2], [0.2, 0.15]].forEach(([x, y]) =>
      head.add(at(sphere(0.018, mat(0x2a1505)), x, y, 0.53)));
    // microphone in his right hand
    const mic = at(new THREE.Group(), 0, -0.98, 0.1);
    mic.add(at(capsule(0.03, 0.2, mat(0x222222)), 0, 0, 0));
    mic.add(at(sphere(0.07, mat(0x999999, { metalness: 0.7, roughness: 0.4 })), 0, 0.16, 0));
    arms[1].add(mic);
  }

  // wear and tear: dark rips placed on the torso's surface
  const rip = mat(0x0a0a0a);
  const R = [0.588, 0.648, 0.396]; // torso ellipsoid radii
  for (let i = 0; i < 4; i++) {
    const x = (Math.random() - 0.5) * 0.7;
    const y = 1.72 + (Math.random() - 0.5) * 0.8;
    const k = 1 - (x / R[0]) ** 2 - ((y - 1.72) / R[1]) ** 2;
    if (k <= 0.05) continue;
    const r = at(sphere(0.08 + Math.random() * 0.07, rip, 1.4, 0.7, 0.3), x, y, R[2] * Math.sqrt(k));
    r.rotation.z = Math.random() * 3;
    g.add(r);
  }

  g.userData = { eyes, arms, jaw, head, headY: 2.7 };
  return g;
}

function bow(m) {
  const b = new THREE.Group();
  b.add(at(sphere(0.12, m, 1.3, 0.8, 0.5), -0.13, 0, 0));
  b.add(at(sphere(0.12, m, 1.3, 0.8, 0.5), 0.13, 0, 0));
  b.add(at(sphere(0.06, m), 0, 0, 0.03));
  return b;
}

// ---------------------------------------------------------------- endoskeleton
function endo() {
  const g = new THREE.Group();
  const metal = METAL();
  const darkMetal = mat(0x1d2024, { metalness: 0.9, roughness: 0.3 });
  const piston = mat(0x8a8f96, { metalness: 0.95, roughness: 0.2 });

  [-0.22, 0.22].forEach((x) => {
    g.add(at(capsule(0.06, 0.42, metal), x, 0.8, 0));
    g.add(at(capsule(0.05, 0.4, piston), x, 0.32, 0.02));
    g.add(at(sphere(0.08, darkMetal), x, 0.57, 0)); // knee
    g.add(at(boxm(0.18, 0.06, 0.34, darkMetal), x, 0.04, 0.08));
  });
  g.add(at(boxm(0.56, 0.12, 0.24, darkMetal), 0, 1.08, 0)); // hips
  g.add(at(capsule(0.07, 0.62, piston), 0, 1.5, -0.05)); // spine
  for (let i = 0; i < 4; i++) {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(0.28 - i * 0.02, 0.025, 6, 14, Math.PI), metal);
    rib.rotation.x = Math.PI / 2; rib.rotation.z = Math.PI;
    g.add(at(rib, 0, 1.5 + i * 0.13, 0));
  }
  g.add(at(boxm(0.78, 0.08, 0.2, darkMetal), 0, 2.08, 0)); // shoulders

  const arms = [-1, 1].map((side) => {
    const pivot = at(new THREE.Group(), side * 0.42, 2.06, 0);
    pivot.add(at(capsule(0.045, 0.5, metal), 0, -0.3, 0));
    pivot.add(at(sphere(0.06, darkMetal), 0, -0.58, 0));
    pivot.add(at(capsule(0.035, 0.42, piston), 0, -0.84, 0.02));
    // splayed fingers
    for (let f = -1; f <= 1; f++) {
      const fin = at(capsule(0.012, 0.12, darkMetal), f * 0.035, -1.12, 0.02);
      fin.rotation.z = f * 0.25;
      pivot.add(fin);
    }
    pivot.rotation.z = side * 0.12;
    g.add(pivot);
    return pivot;
  });

  const head = at(new THREE.Group(), 0, 2.2, 0);
  g.add(head);
  head.add(at(capsule(0.04, 0.16, piston), 0, 0.06, 0)); // neck
  head.add(at(sphere(0.25, metal, 1, 0.92, 1), 0, 0.33, 0)); // cranium
  head.add(at(boxm(0.36, 0.12, 0.3, darkMetal), 0, 0.22, 0.08)); // cheek plates
  // deep sockets with the night-vision lenses
  const eyes = [-0.11, 0.11].map((x) => {
    head.add(at(sphere(0.075, mat(0x050505), 1, 1, 0.6), x, 0.36, 0.2));
    const lens = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), new THREE.MeshStandardMaterial({
      color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 3.2
    }));
    head.add(at(lens, x, 0.36, 0.23));
    return lens;
  });
  const toothMat = mat(0xd8d4c4, { roughness: 0.4, metalness: 0.2 });
  for (let i = 0; i < 6; i++) head.add(at(boxm(0.035, 0.06, 0.03, toothMat), -0.09 + i * 0.036, 0.15, 0.24));
  const jaw = at(new THREE.Group(), 0, 0.13, 0.02);
  jaw.add(at(boxm(0.28, 0.06, 0.24, darkMetal), 0, -0.04, 0.1));
  for (let i = 0; i < 6; i++) jaw.add(at(boxm(0.035, 0.05, 0.03, toothMat), -0.09 + i * 0.036, 0.0, 0.21));
  head.add(jaw);

  g.userData = { eyes, arms, jaw, head, headY: 2.5 };
  return g;
}

export function buildBody(kind, color) {
  return kind === 'endo' ? endo() : suit(kind, color);
}
