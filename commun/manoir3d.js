// =====================================================================
// Plan 3D de l'Enquête : le manoir vu comme une maquette d'architecte, une
// nuit d'orage. Silhouette irrégulière posée sur un soubassement de pierre,
// murs coupés à mi-hauteur (on voit l'intérieur), façade en pierre et
// fenêtres éclairées, papier peint et lambris propres à chaque pièce,
// mobilier détaillé, grand hall central dallé, jardin autour (allée, haies,
// arbres, fontaine, lampadaires, mur d'enceinte), éclairs de temps en temps.
//
// Tout le plan vient du pack de l'univers (pack.plan) : zones des pièces,
// couloirs, portes, entrée, pièces vitrées, couleurs des murs. Le mobilier
// est choisi par identifiant de pièce, avec un repli générique.
//
// Les personnages des joueurs s'y promènent AU HASARD, tirés sur chaque
// téléphone, en passant par les portes : aucun lien avec la solution.
//
// Sobriété : 30 images/s au plus, résolution plafonnée, pas d'ombres
// portées, quelques lumières seulement, pause dès que le plan est caché.
// =====================================================================
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { preparerAmbiance, lisser, materiauNoyer, LAITON, textureBois, creerPersonnage } from '../da/bar-moderne.js';

const E = 0.02;                // 1 unité du plan = 2 cm de maquette
const PAS = 10;                // murs découpés en tronçons de 10 unités
const SOCLE = 0.12;            // soubassement de pierre : la maison est surélevée
const H_INT = 0.58;            // cloisons coupées à mi-hauteur
const H_EXT = 0.74;            // façade un peu plus haute
const EP_INT = 0.06;
const EP_EXT = 0.11;
const LARG_PORTE = 3;          // en tronçons (30 unités)
const TAILLE_PERSO = 0.32;
const VITESSE = 0.5;
const IMAGE_MIN = 1000 / 30;

// ---------------------------------------------------------------------
// Aides de construction
// ---------------------------------------------------------------------
const boite = (l, h, p, m) => new THREE.Mesh(new THREE.BoxGeometry(l, h, p), m);
const cyl = (r1, r2, h, m, seg = 18) => new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), m);
const sphere = (r, m, seg = 14) => new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.max(8, seg - 4)), m);
const mat = (couleur, opts = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: couleur, roughness: 0.65 }, opts));
const lueur = (couleur, intensite = 1.8) => new THREE.MeshStandardMaterial({ color: 0x000000, emissive: couleur, emissiveIntensity: intensite });
const place = (o, x, y, z, ry = 0) => { o.position.set(x, y, z); o.rotation.y = ry; return o; };
const couche = (o) => { o.rotation.z = Math.PI / 2; return o; };   // cylindre posé sur le flanc

function aleatoire(graine) {
  // Petit générateur pseudo-aléatoire : le décor est le même à chaque visite.
  let s = graine >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function texteSprite(texte, { taille = 44, hauteur = 0.3, fond = 'rgba(10,4,6,0.8)', couleur = '#f3e6cf', police = 'Cormorant Garamond, Georgia, serif', poids = 700 } = {}) {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  ctx.font = `${poids} ${taille}px ${police}`;
  const l = Math.ceil(ctx.measureText(texte).width) + taille;
  c.width = l; c.height = Math.ceil(taille * 1.6);
  ctx.font = `${poids} ${taille}px ${police}`;
  if (fond) {
    ctx.fillStyle = fond;
    const r = c.height / 2;
    ctx.beginPath();
    ctx.moveTo(r, 0); ctx.arcTo(l, 0, l, c.height, r); ctx.arcTo(l, c.height, 0, c.height, r);
    ctx.arcTo(0, c.height, 0, 0, r); ctx.arcTo(0, 0, l, 0, r); ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = couleur;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(texte, l / 2, c.height / 2 + 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  s.scale.set(l / c.height * hauteur, hauteur, 1);
  s.renderOrder = 10;
  return s;
}

function texture(dessin, taille = 256, repetition = null) {
  const c = document.createElement('canvas');
  c.width = c.height = taille;
  dessin(c.getContext('2d'), taille);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (repetition) t.repeat.set(repetition[0], repetition[1]);
  return t;
}
const carreaux = (a, b, n = 6) => texture((ctx, T) => {
  const t = T / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    ctx.fillStyle = (i + j) % 2 ? a : b; ctx.fillRect(i * t, j * t, t, t);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.strokeRect(i * t + 0.5, j * t + 0.5, t - 1, t - 1);
  }
});
const damierDiagonal = (a, b) => texture((ctx, T) => {
  ctx.fillStyle = a; ctx.fillRect(0, 0, T, T);
  ctx.fillStyle = b;
  const n = 4, t = T / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const cx = i * t + t / 2, cy = j * t + t / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy - t / 2); ctx.lineTo(cx + t / 2, cy); ctx.lineTo(cx, cy + t / 2); ctx.lineTo(cx - t / 2, cy); ctx.closePath(); ctx.fill();
  }
});
const pierre = (base = '#8a8072') => texture((ctx, T) => {
  ctx.fillStyle = base; ctx.fillRect(0, 0, T, T);
  const r = aleatoire(7);
  const h = T / 8;
  for (let j = 0; j < 8; j++) {
    const decal = (j % 2) * (T / 8);
    for (let i = -1; i < 5; i++) {
      const v = 0.85 + r() * 0.3;
      ctx.fillStyle = `rgba(${Math.round(120 * v)},${Math.round(110 * v)},${Math.round(96 * v)},0.55)`;
      ctx.fillRect(i * T / 4 + decal + 2, j * h + 2, T / 4 - 4, h - 4);
    }
  }
});
const herbe = () => texture((ctx, T) => {
  ctx.fillStyle = '#1b2a1c'; ctx.fillRect(0, 0, T, T);
  const r = aleatoire(3);
  for (let k = 0; k < 900; k++) {
    ctx.fillStyle = `rgba(${40 + r() * 30},${60 + r() * 40},${35 + r() * 20},0.5)`;
    ctx.fillRect(r() * T, r() * T, 2 + r() * 3, 2 + r() * 3);
  }
}, 256, [10, 10]);
const gravier = () => texture((ctx, T) => {
  ctx.fillStyle = '#6d6455'; ctx.fillRect(0, 0, T, T);
  const r = aleatoire(5);
  for (let k = 0; k < 1400; k++) { ctx.fillStyle = `rgba(${150 + r() * 60},${140 + r() * 50},${120 + r() * 40},0.5)`; ctx.fillRect(r() * T, r() * T, 2, 2); }
}, 128, [1, 6]);
const tapisMotif = (fond, bord, motif) => texture((ctx, T) => {
  ctx.fillStyle = bord; ctx.fillRect(0, 0, T, T);
  ctx.fillStyle = fond; ctx.fillRect(T * 0.08, T * 0.08, T * 0.84, T * 0.84);
  ctx.strokeStyle = motif; ctx.lineWidth = 6;
  ctx.strokeRect(T * 0.16, T * 0.16, T * 0.68, T * 0.68);
  ctx.beginPath(); ctx.arc(T / 2, T / 2, T * 0.18, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(T / 2, T * 0.2); ctx.lineTo(T * 0.8, T / 2); ctx.lineTo(T / 2, T * 0.8); ctx.lineTo(T * 0.2, T / 2); ctx.closePath(); ctx.stroke();
});
function tapis(g, l, p, fond, bord, motif, x = 0, z = 0) {
  g.add(place(boite(l, 0.006, p, new THREE.MeshStandardMaterial({ map: tapisMotif(fond, bord, motif), roughness: 0.95 })), x, 0.004, z));
}
const toile = (graine) => texture((ctx, T) => {
  const r = aleatoire(graine);
  const ciel = ctx.createLinearGradient(0, 0, 0, T);
  ciel.addColorStop(0, `hsl(${200 + r() * 40},30%,${30 + r() * 20}%)`);
  ciel.addColorStop(1, `hsl(${30 + r() * 30},40%,${35 + r() * 15}%)`);
  ctx.fillStyle = ciel; ctx.fillRect(0, 0, T, T);
  ctx.fillStyle = `hsl(${90 + r() * 40},30%,25%)`;
  ctx.beginPath(); ctx.moveTo(0, T * 0.7);
  for (let x = 0; x <= T; x += T / 6) ctx.lineTo(x, T * (0.55 + r() * 0.2));
  ctx.lineTo(T, T); ctx.lineTo(0, T); ctx.closePath(); ctx.fill();
}, 64);

// ---------------------------------------------------------------------
// Éléments réutilisables
// ---------------------------------------------------------------------
const NOYER = () => materiauNoyer(0x3b2618);
const NOYER_FONCE = () => materiauNoyer(0x24160d);
const CUIR = () => mat(0x5a2414, { roughness: 0.42 });
const VELOURS = (c) => mat(c, { roughness: 0.85 });

function fauteuil(couleur) {
  const g = new THREE.Group();
  const m = VELOURS(couleur);
  g.add(place(boite(0.2, 0.07, 0.19, m), 0, 0.07, 0));
  g.add(place(boite(0.2, 0.17, 0.05, m), 0, 0.14, -0.08));
  g.add(place(boite(0.04, 0.11, 0.19, m), -0.09, 0.1, 0));
  g.add(place(boite(0.04, 0.11, 0.19, m), 0.09, 0.1, 0));
  return g;
}
function chaise(m) {
  const g = new THREE.Group();
  g.add(place(boite(0.11, 0.015, 0.11, m), 0, 0.11, 0));
  g.add(place(boite(0.11, 0.14, 0.015, m), 0, 0.18, -0.05));
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => g.add(place(boite(0.012, 0.11, 0.012, m), a * 0.045, 0.055, b * 0.045)));
  return g;
}
function table(l, p, h, m) {
  const g = new THREE.Group();
  g.add(place(boite(l, 0.025, p, m), 0, h, 0));
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => g.add(place(boite(0.025, h, 0.025, m), a * (l / 2 - 0.03), h / 2, b * (p / 2 - 0.03))));
  return g;
}
function plante(r, couleur = 0x355f2f, pot = 0x7a3f22) {
  const g = new THREE.Group();
  g.add(place(cyl(r * 0.55, r * 0.42, r * 0.7, mat(pot)), 0, r * 0.35, 0));
  g.add(place(new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), mat(couleur, { roughness: 0.85 })), 0, r * 1.4, 0));
  return g;
}
function palmier() {
  const g = new THREE.Group();
  g.add(place(cyl(0.05, 0.06, 0.08, mat(0x7a3f22)), 0, 0.04, 0));
  g.add(place(cyl(0.015, 0.02, 0.4, mat(0x5a3a1e)), 0, 0.28, 0));
  for (let k = 0; k < 6; k++) {
    const f = boite(0.22, 0.008, 0.05, mat(0x3f7a2f, { roughness: 0.8 }));
    const a = k / 6 * Math.PI * 2;
    f.position.set(Math.cos(a) * 0.1, 0.47, Math.sin(a) * 0.1);
    f.rotation.set(0, -a, -0.45);
    g.add(f);
  }
  return g;
}
function lustre(rayon = 0.2) {
  const g = new THREE.Group();
  const anneau = new THREE.Mesh(new THREE.TorusGeometry(rayon, 0.014, 8, 28), LAITON());
  anneau.rotation.x = Math.PI / 2;
  g.add(anneau);
  const flamme = lueur(0xffc46b, 2.6);
  for (let k = 0; k < 8; k++) {
    const a = k / 8 * Math.PI * 2;
    g.add(place(sphere(0.018, flamme, 8), Math.cos(a) * rayon, 0.03, Math.sin(a) * rayon));
  }
  g.add(place(cyl(0.004, 0.004, 0.3, LAITON(), 6), 0, 0.17, 0));
  return g;
}
function rayonnage(l) {
  const g = new THREE.Group();
  g.add(place(boite(l, 0.46, 0.09, NOYER_FONCE()), 0, 0.23, 0));
  const couleurs = [0x7a2630, 0x2f4a6e, 0x5c6b2f, 0x8a6a2a, 0x4a2f5c, 0x2a5a52, 0x9a7a4a];
  const r = aleatoire(Math.round(l * 1000));
  for (let rang = 0; rang < 4; rang++) {
    let x = -l / 2 + 0.02;
    while (x < l / 2 - 0.03) {
      const e = 0.015 + r() * 0.015;
      const h = 0.07 + r() * 0.03;
      g.add(place(boite(e, h, 0.06, mat(couleurs[Math.floor(r() * couleurs.length)])), x + e / 2, 0.04 + rang * 0.11 + h / 2, 0.02));
      x += e + 0.002;
    }
  }
  return g;
}

// ---------------------------------------------------------------------
// Mobilier par pièce : g a son origine au centre du sol de la pièce ;
// l et p sont les dimensions intérieures (x et z).
// ---------------------------------------------------------------------
const MOBILIER = {
  hall(g, l, p) {
    // Mezzanine : galerie en hauteur le long du mur du fond, sur piliers,
    // avec garde-corps ; le grand escalier y monte.
    const HM = 0.36, PM = 0.42;
    const zBord = -p / 2 + PM;
    g.add(place(boite(l, 0.03, PM, NOYER()), 0, HM, -p / 2 + PM / 2));
    g.add(place(boite(l, 0.004, PM - 0.06, VELOURS(0x5a1a22)), 0, HM + 0.017, -p / 2 + PM / 2));
    [-0.4, 0, 0.4].forEach((f) => g.add(place(cyl(0.022, 0.026, HM, mat(0xeee8dc, { roughness: 0.3 }), 10), f * l, HM / 2, zBord - 0.03)));
    g.add(place(boite(l * 0.62, 0.012, 0.012, LAITON()), -l * 0.19, HM + 0.15, zBord));
    for (let k = 0; k <= 12; k++) g.add(place(boite(0.006, 0.15, 0.006, LAITON()), -l / 2 + k * (l * 0.62) / 12, HM + 0.075, zBord));
    const fm = fauteuil(0x2a4a3a); fm.scale.setScalar(0.8); fm.position.set(-l * 0.25, HM + 0.015, -p / 2 + 0.18); g.add(fm);
    g.add(place(plante(0.06, 0x2f6b3a), l * 0.05, HM + 0.015, -p / 2 + 0.15));
    const marches = 10, prof = 0.08, xe = l / 2 - 0.22;
    for (let k = 0; k < marches; k++) {
      const z = zBord + (marches - 1 - k) * prof + prof / 2;
      g.add(place(boite(0.36, HM * (k + 1) / marches, prof, NOYER()), xe, HM * (k + 1) / marches / 2, z));
      g.add(place(boite(0.22, 0.004, prof, VELOURS(0x7a1f2a)), xe, HM * (k + 1) / marches + 0.002, z));
    }
    const rampe = boite(0.012, 0.012, Math.hypot(marches * prof, HM), LAITON());
    rampe.position.set(xe - 0.19, HM / 2 + 0.15, zBord + marches * prof / 2);
    rampe.rotation.x = Math.atan2(HM, marches * prof);
    g.add(rampe);
    // Guéridon central et bouquet
    g.add(place(cyl(0.13, 0.13, 0.02, mat(0xe8e2d6, { roughness: 0.2 })), -0.05, 0.16, 0));
    g.add(place(cyl(0.03, 0.05, 0.15, NOYER()), -0.05, 0.075, 0));
    g.add(place(cyl(0.025, 0.035, 0.08, mat(0x1f3a5a, { roughness: 0.2 })), -0.05, 0.21, 0));
    g.add(place(sphere(0.06, mat(0xa02a3a)), -0.05, 0.28, 0));
    // Statues sur colonnes
    [[-l / 2 + 0.12, -p / 2 + 0.14], [-l / 2 + 0.12, p / 2 - 0.14]].forEach(([x, z]) => {
      g.add(place(cyl(0.05, 0.05, 0.22, mat(0xd8d2c4, { roughness: 0.35 })), x, 0.11, z));
      g.add(place(sphere(0.045, mat(0xe8e4dc, { roughness: 0.3 })), x, 0.27, z));
    });
    const l1 = lustre(0.18); l1.position.set(-0.05, 0.62, 0); g.add(l1);
    tapis(g, l * 0.45, p * 0.55, '#5a1a22', '#2a0d10', '#c9a24a', -0.05, 0);
    // Horloge de parquet et porte-manteau
    const horloge = new THREE.Group();
    horloge.add(place(boite(0.1, 0.42, 0.07, NOYER_FONCE()), 0, 0.21, 0));
    horloge.add(place(cyl(0.035, 0.035, 0.01, mat(0xf2efe6), 16), 0, 0.34, 0.036));
    horloge.children[1].rotation.x = Math.PI / 2;
    horloge.add(place(boite(0.012, 0.12, 0.005, LAITON()), 0, 0.18, 0.037));
    horloge.position.set(-l / 2 + 0.08, 0, 0); horloge.rotation.y = Math.PI / 2;
    g.add(horloge);
    g.add(place(cyl(0.008, 0.012, 0.36, NOYER_FONCE(), 8), l * 0.2, 0.18, p / 2 - 0.1));
    [0, 2.1, 4.2].forEach((a) => g.add(place(sphere(0.03, VELOURS([0x2a2a3a, 0x5a2414, 0x1f3a2a][Math.round(a) % 3]), 8), l * 0.2 + Math.cos(a) * 0.03, 0.32, p / 2 - 0.1 + Math.sin(a) * 0.03)));
  },
  bibliotheque(g, l, p) {
    const b1 = rayonnage(l * 0.9); b1.position.set(0, 0, -p / 2 + 0.05); g.add(b1);
    const b2 = rayonnage(p * 0.7); b2.position.set(-l / 2 + 0.05, 0, 0); b2.rotation.y = Math.PI / 2; g.add(b2);
    tapis(g, l * 0.55, p * 0.5, '#2e3f2a', '#1a2418', '#b08a4a', l * 0.08, p * 0.1);
    const f1 = fauteuil(0x6e1f2a); f1.position.set(l * 0.18, 0, p * 0.18); f1.rotation.y = -2.4; g.add(f1);
    const f2 = fauteuil(0x6e1f2a); f2.position.set(-l * 0.05, 0, p * 0.22); f2.rotation.y = 2.6; g.add(f2);
    g.add(place(cyl(0.05, 0.05, 0.13, NOYER()), l * 0.08, 0.065, p * 0.32));
    g.add(place(sphere(0.022, lueur(0xffd08a, 2)), l * 0.08, 0.16, p * 0.32));
    g.add(place(cyl(0.012, 0.03, 0.14, NOYER()), l * 0.36, 0.07, -p * 0.1));
    g.add(place(sphere(0.06, mat(0x6a8a6a, { roughness: 0.4 })), l * 0.36, 0.2, -p * 0.1));
    const echelle = boite(0.08, 0.5, 0.01, NOYER()); echelle.position.set(-l * 0.25, 0.25, -p / 2 + 0.11); echelle.rotation.x = -0.18; g.add(echelle);
    // Pupitre avec piles de livres et chandelier
    g.add(place(boite(0.2, 0.02, 0.12, NOYER()), -l * 0.28, 0.17, p * 0.3));
    g.add(place(boite(0.02, 0.16, 0.1, NOYER()), -l * 0.28, 0.08, p * 0.3));
    [0x7a2630, 0x2f4a6e, 0x8a6a2a].forEach((c, k) => g.add(place(boite(0.07, 0.018, 0.05, mat(c)), -l * 0.32, 0.19 + k * 0.018, p * 0.3, k * 0.3)));
    g.add(place(cyl(0.006, 0.012, 0.06, LAITON(), 6), -l * 0.22, 0.21, p * 0.3));
    g.add(place(sphere(0.009, lueur(0xffb04a, 3), 6), -l * 0.22, 0.25, p * 0.3));
  },
  serre(g, l, p) {
    g.add(place(boite(l * 0.2, 0.006, p * 0.9, mat(0x8a8072, { roughness: 0.9 })), 0, 0.004, 0));
    const r = aleatoire(11);
    for (let k = 0; k < 10; k++) {
      const cote = k % 2 ? 1 : -1;
      const o = k % 3 === 0 ? palmier() : plante(0.06 + r() * 0.06, [0x2f6b3a, 0x3f7a2f, 0x285e4a, 0x4a7a2a][k % 4]);
      o.position.set(cote * (l * 0.22 + r() * l * 0.18), 0, -p / 2 + 0.1 + (k / 10) * (p - 0.2));
      g.add(o);
    }
    g.add(place(cyl(0.14, 0.15, 0.06, mat(0x9a9284, { roughness: 0.6 })), 0, 0.03, p * 0.18));
    g.add(place(cyl(0.12, 0.12, 0.005, mat(0x2a5a7a, { roughness: 0.05, metalness: 0.2 })), 0, 0.062, p * 0.18));
    g.add(place(boite(0.26, 0.02, 0.07, NOYER()), 0, 0.09, -p * 0.3));
    // Arrosoir
    g.add(place(cyl(0.03, 0.035, 0.06, mat(0x5a7a6a, { metalness: 0.6, roughness: 0.4 }), 10), l * 0.12, 0.03, p * 0.35));
    // Toit de verre : armature en laiton
    const verre = new THREE.MeshPhysicalMaterial({ color: 0xcfe8dc, transparent: true, opacity: 0.1, roughness: 0.05 });
    g.add(place(boite(l, 0.005, p, verre), 0, H_EXT, 0));
    for (let k = -2; k <= 2; k++) g.add(place(boite(0.01, 0.01, p, LAITON()), k * l / 5, H_EXT, 0));
  },
  salle_de_bal(g, l, p) {
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => {
      g.add(place(cyl(0.04, 0.045, H_INT, mat(0xeee8dc, { roughness: 0.3 })), a * (l / 2 - 0.1), H_INT / 2, b * (p / 2 - 0.1)));
      g.add(place(boite(0.1, 0.03, 0.1, LAITON()), a * (l / 2 - 0.1), H_INT - 0.015, b * (p / 2 - 0.1)));
    });
    const l1 = lustre(0.24); l1.position.set(0, 0.62, -p * 0.15); g.add(l1);
    const l2 = lustre(0.16); l2.position.set(0, 0.6, p * 0.25); g.add(l2);
    const piano = new THREE.Group();
    const laque = mat(0x0b0909, { roughness: 0.18, metalness: 0.2 });
    piano.add(place(boite(0.3, 0.08, 0.4, laque), 0, 0.16, 0));
    const couvercle = boite(0.3, 0.008, 0.4, laque); couvercle.position.set(0.07, 0.27, 0); couvercle.rotation.z = 0.5; piano.add(couvercle);
    piano.add(place(boite(0.3, 0.012, 0.06, mat(0xf2efe6)), 0, 0.205, 0.22));
    [[-0.12, -0.15], [0.12, -0.15], [0, 0.17]].forEach(([x, z]) => piano.add(place(cyl(0.012, 0.012, 0.12, laque, 6), x, 0.06, z)));
    piano.position.set(l * 0.25, 0, -p * 0.28); piano.rotation.y = -0.6;
    g.add(piano);
    for (let k = 0; k < 4; k++) { const c = chaise(VELOURS(0x7a1f2a)); c.position.set(-l / 2 + 0.16, 0, -p * 0.3 + k * 0.2); c.rotation.y = Math.PI / 2; g.add(c); }
    // Buffet : nappe blanche, chandeliers, coupes
    g.add(place(boite(0.5, 0.15, 0.14, mat(0xf4f0e8, { roughness: 0.9 })), -l * 0.05, 0.075, p / 2 - 0.12));
    [-0.18, 0.18].forEach((x) => { g.add(place(cyl(0.008, 0.02, 0.1, LAITON(), 8), -l * 0.05 + x, 0.2, p / 2 - 0.12)); g.add(place(sphere(0.01, lueur(0xffc46b, 3), 6), -l * 0.05 + x, 0.26, p / 2 - 0.12)); });
    const coupe = new THREE.MeshPhysicalMaterial({ color: 0xf2e6b8, transparent: true, opacity: 0.6, roughness: 0.1 });
    for (let k = 0; k < 6; k++) g.add(place(cyl(0.012, 0.004, 0.035, coupe, 8), -l * 0.05 - 0.1 + k * 0.04, 0.17, p / 2 - 0.1));
  },
  fumoir(g, l, p) {
    g.add(place(boite(0.4, 0.34, 0.1, mat(0x6e665c, { roughness: 0.8 })), 0, 0.17, -p / 2 + 0.05));
    g.add(place(boite(0.22, 0.16, 0.04, mat(0x0d0a08)), 0, 0.09, -p / 2 + 0.09));
    g.add(place(sphere(0.045, lueur(0xff6a1a, 3)), 0, 0.05, -p / 2 + 0.1));
    g.add(place(boite(0.46, 0.025, 0.13, NOYER_FONCE()), 0, 0.35, -p / 2 + 0.06));
    const canape = new THREE.Group();
    const c = CUIR();
    canape.add(place(boite(0.42, 0.08, 0.17, c), 0, 0.07, 0));
    canape.add(place(boite(0.42, 0.13, 0.05, c), 0, 0.13, -0.07));
    canape.add(place(boite(0.05, 0.1, 0.17, c), -0.21, 0.11, 0));
    canape.add(place(boite(0.05, 0.1, 0.17, c), 0.21, 0.11, 0));
    canape.position.set(-l * 0.12, 0, -p * 0.02); canape.rotation.y = Math.PI;
    g.add(canape);
    tapis(g, l * 0.45, p * 0.3, '#4a1a14', '#22100c', '#b08a4a', -l * 0.1, -p * 0.2);
    const billard = new THREE.Group();
    billard.add(place(boite(0.5, 0.05, 0.28, NOYER_FONCE()), 0, 0.17, 0));
    billard.add(place(boite(0.44, 0.012, 0.22, mat(0x1d5a33, { roughness: 0.9 })), 0, 0.2, 0));
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => billard.add(place(cyl(0.02, 0.025, 0.15, NOYER_FONCE(), 8), a * 0.2, 0.075, b * 0.1)));
    [0xf2efe6, 0xc0392b, 0xf1c40f].forEach((col, k) => billard.add(place(sphere(0.012, mat(col, { roughness: 0.2 }), 8), -0.08 + k * 0.06, 0.218, (k - 1) * 0.04)));
    billard.position.set(l * 0.1, 0, p * 0.25);
    g.add(billard);
    // Bar à liqueurs
    g.add(place(boite(0.12, 0.3, 0.26, NOYER_FONCE()), l / 2 - 0.07, 0.15, -p * 0.15));
    [0x6a2a10, 0x2a4a1a, 0xc8a050, 0x3a1020].forEach((c, k) => g.add(place(cyl(0.012, 0.014, 0.06, mat(c, { roughness: 0.15 }), 8), l / 2 - 0.07, 0.33, -p * 0.15 - 0.09 + k * 0.06)));
  },
  cave(g, l, p) {
    const bois = materiauNoyer(0x5a3a1e, 0.8);
    for (let k = 0; k < 4; k++) g.add(place(couche(cyl(0.09, 0.09, 0.22, bois)), -l / 2 + 0.2 + k * 0.19, 0.09, -p / 2 + 0.16));
    for (let k = 0; k < 3; k++) g.add(place(couche(cyl(0.09, 0.09, 0.22, bois)), -l / 2 + 0.3 + k * 0.19, 0.25, -p / 2 + 0.16));
    const casier = new THREE.Group();
    casier.add(place(boite(0.1, 0.4, p * 0.7, NOYER_FONCE()), 0, 0.2, 0));
    const verre = mat(0x2a1420, { roughness: 0.15 });
    for (let r = 0; r < 4; r++) for (let k = 0; k < 6; k++) casier.add(place(couche(cyl(0.014, 0.014, 0.09, verre, 6)), 0.03, 0.06 + r * 0.09, -p * 0.3 + k * p * 0.12));
    casier.position.set(l / 2 - 0.08, 0, 0);
    g.add(casier);
    g.add(place(cyl(0.08, 0.08, 0.2, bois), -l * 0.1, 0.1, p * 0.22));
    // Caisses de vin empilées
    const caisse = materiauNoyer(0x7a5a32, 0.9);
    [[0, 0.05, 0], [0.13, 0.05, 0.02], [0.06, 0.15, 0.01]].forEach(([x, y, z]) => g.add(place(boite(0.12, 0.1, 0.1, caisse), l * 0.15 + x, y, p * 0.3 + z, x * 2)));
    [-0.03, 0.03].forEach((x) => {
      g.add(place(cyl(0.008, 0.008, 0.05, mat(0xf2efe6), 6), -l * 0.1 + x, 0.225, p * 0.22));
      g.add(place(sphere(0.008, lueur(0xffb04a, 3), 6), -l * 0.1 + x, 0.26, p * 0.22));
    });
  },
  cuisine(g, l, p) {
    g.add(place(boite(l * 0.9, 0.2, 0.15, mat(0xd8cfbf, { roughness: 0.4 })), 0, 0.1, -p / 2 + 0.09));
    g.add(place(boite(l * 0.9, 0.02, 0.16, mat(0x3a3430, { roughness: 0.3 })), 0, 0.21, -p / 2 + 0.09));
    g.add(place(boite(0.14, 0.025, 0.1, mat(0xb8c0c4, { metalness: 0.7, roughness: 0.25 })), -l * 0.25, 0.215, -p / 2 + 0.09));
    g.add(place(boite(0.26, 0.24, 0.18, mat(0x1a1a1a, { metalness: 0.5, roughness: 0.3 })), l * 0.28, 0.12, -p / 2 + 0.1));
    g.add(place(sphere(0.03, lueur(0xff4a1a, 2.4)), l * 0.28, 0.25, -p / 2 + 0.1));
    for (let k = 0; k < 5; k++) g.add(place(cyl(0.03, 0.03, 0.03, mat(0xb06a3a, { metalness: 0.8, roughness: 0.3 }), 12), -l * 0.2 + k * 0.09, 0.45, -p / 2 + 0.1));
    g.add(place(boite(l * 0.6, 0.008, 0.008, LAITON()), 0, 0.48, -p / 2 + 0.1));
    const t = table(0.6, 0.22, 0.17, NOYER()); t.position.set(0, 0, p * 0.15); g.add(t);
    for (let k = 0; k < 3; k++) [-1, 1].forEach((s) => { const c = chaise(NOYER()); c.position.set(-0.2 + k * 0.2, 0, p * 0.15 + s * 0.17); c.rotation.y = s > 0 ? Math.PI : 0; g.add(c); });
    // Sacs de farine et pain
    [0, 0.09].forEach((x) => g.add(place(cyl(0.04, 0.045, 0.1, mat(0xe8dcc2, { roughness: 1 }), 10), -l * 0.4 + x, 0.05, p * 0.35)));
    g.add(place(new THREE.Mesh(new THREE.CapsuleGeometry(0.015, 0.06, 4, 8), mat(0xc08a4a)), 0.12, 0.215, p * 0.15));
    g.add(place(cyl(0.05, 0.03, 0.025, mat(0xe8e2d6)), 0, 0.2, p * 0.15));
    [0xc0392b, 0xe67e22, 0x7aa83a].forEach((col, k) => g.add(place(sphere(0.018, mat(col), 8), -0.02 + k * 0.02, 0.225, p * 0.15)));
  },
  veranda(g, l, p) {
    const osier = mat(0xb08a52, { roughness: 0.95 });
    const t = new THREE.Group();
    t.add(place(cyl(0.1, 0.1, 0.015, osier), 0, 0.15, 0));
    t.add(place(cyl(0.02, 0.04, 0.15, osier), 0, 0.075, 0));
    t.add(place(sphere(0.025, mat(0xf2efe6, { roughness: 0.3 })), 0.02, 0.18, 0));
    t.position.set(-l * 0.18, 0, -p * 0.05);
    g.add(t);
    [0.5, 2.3, 4.2].forEach((a) => { const f = fauteuil(0x9a7a4a); f.scale.setScalar(0.85); f.position.set(-l * 0.18 + Math.cos(a) * 0.2, 0, -p * 0.05 + Math.sin(a) * 0.16); f.rotation.y = -a - Math.PI / 2; g.add(f); });
    g.add(place(plante(0.09, 0x3f7a2f), l * 0.38, 0, -p * 0.25));
    g.add(place(plante(0.07, 0x2f6b3a), -l * 0.4, 0, p * 0.25));
    g.add(place(palmier(), l * 0.38, 0, p * 0.2));
    g.add(place(boite(0.24, 0.006, 0.14, VELOURS(0x7a1f2a)), 0, 0.004, p / 2 - 0.1));
    // Cage à oiseau et gramophone
    g.add(place(cyl(0.006, 0.006, 0.3, LAITON(), 6), l * 0.2, 0.15, -p * 0.3));
    g.add(place(new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8, 0, Math.PI * 2, 0, Math.PI / 1.6), new THREE.MeshStandardMaterial({ color: 0xc9a25a, metalness: 0.9, roughness: 0.3, wireframe: true })), l * 0.2, 0.33, -p * 0.3));
    g.add(place(boite(0.1, 0.06, 0.1, NOYER()), -l * 0.4, 0.03, -p * 0.3));
    const pavillon = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.1, 14, 1, true), LAITON());
    pavillon.position.set(-l * 0.4 + 0.02, 0.12, -p * 0.3); pavillon.rotation.z = -1.1;
    g.add(pavillon);
  },
  bureau(g, l, p) {
    tapis(g, l * 0.6, p * 0.55, '#1f2a44', '#0f1524', '#b08a4a', 0, p * 0.05);
    const t = table(0.42, 0.22, 0.18, NOYER_FONCE()); t.position.set(0, 0, -p * 0.08); g.add(t);
    g.add(place(boite(0.4, 0.012, 0.2, VELOURS(0x2a5a3a)), 0, 0.195, -p * 0.08));
    g.add(place(cyl(0.012, 0.02, 0.07, LAITON(), 8), 0.13, 0.23, -p * 0.12));
    g.add(place(boite(0.07, 0.025, 0.04, lueur(0x5fd08a, 1.6)), 0.13, 0.275, -p * 0.12));
    g.add(place(boite(0.06, 0.006, 0.08, mat(0xf2efe6)), -0.05, 0.2, -p * 0.06));
    const f = fauteuil(0x5a2414); f.position.set(0, 0, p * 0.12); f.rotation.y = Math.PI; g.add(f);
    const b = rayonnage(l * 0.55); b.position.set(-l * 0.15, 0, -p / 2 + 0.05); g.add(b);
    g.add(place(boite(0.14, 0.18, 0.13, mat(0x2a2a2e, { metalness: 0.6, roughness: 0.4 })), l * 0.36, 0.09, -p * 0.3));
    g.add(place(cyl(0.025, 0.025, 0.01, LAITON(), 12), l * 0.36, 0.11, -p * 0.3 + 0.07));
    // Machine à écrire et classeur
    g.add(place(boite(0.08, 0.03, 0.06, mat(0x141414, { roughness: 0.3, metalness: 0.4 })), -0.12, 0.215, -p * 0.12));
    g.add(place(boite(0.06, 0.004, 0.02, mat(0xf2efe6)), -0.12, 0.245, -p * 0.14));
    g.add(place(boite(0.12, 0.26, 0.12, mat(0x4a5048, { metalness: 0.5, roughness: 0.4 })), -l * 0.4, 0.13, p * 0.3));
  },
};
function mobilierGenerique(g, l, p) {
  tapis(g, l * 0.5, p * 0.5, '#5a1a22', '#2a0d10', '#c9a24a');
  g.add(table(0.24, 0.24, 0.16, NOYER()));
}

// Sols : parquet par défaut, carrelage, damier de bal, marbre du hall...
function solDe(id, l, p) {
  const rep = (t, n) => { t.repeat.set(Math.max(1, l * n), Math.max(1, p * n)); return t; };
  switch (id) {
    case 'serre': return new THREE.MeshStandardMaterial({ map: rep(carreaux('#4a5e4a', '#3e5240', 4), 0.9), roughness: 0.85 });
    case 'cuisine': return new THREE.MeshStandardMaterial({ map: rep(carreaux('#d8d0c0', '#b8ae9a', 6), 0.6), roughness: 0.45 });
    case 'cave': return new THREE.MeshStandardMaterial({ map: rep(pierre('#5a5048'), 0.7), roughness: 1 });
    case 'salle_de_bal': return new THREE.MeshStandardMaterial({ map: rep(carreaux('#efe5cc', '#1c1414', 8), 0.35), roughness: 0.22, metalness: 0.05 });
    case 'hall': return new THREE.MeshStandardMaterial({ map: rep(damierDiagonal('#e9e4da', '#1d1a18'), 0.9), roughness: 0.2 });
    case 'veranda': return new THREE.MeshStandardMaterial({ map: rep(carreaux('#b8743a', '#a8652e', 5), 0.8), roughness: 0.7 });
    default: {
      const t = textureBois('#5a3a22', 1);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(Math.max(1, l * 0.9), Math.max(1, p * 0.9));
      return new THREE.MeshStandardMaterial({ map: t, roughness: 0.5 });
    }
  }
}

// =====================================================================
export function creerManoir3D(conteneur, pack, { surAppui } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  conteneur.appendChild(renderer.domElement);

  const accent = new THREE.Color((pack.palette && pack.palette.accent) || '#c9a24a');
  const scene = new THREE.Scene();
  preparerAmbiance(renderer, scene, { accent });
  const NUIT = new THREE.Color(0x101827);
  const FLASH = new THREE.Color(0x2a3550);
  scene.background = NUIT.clone();
  scene.fog = new THREE.Fog(NUIT, 18, 36);
  const lune = new THREE.DirectionalLight(0xbcd0ff, 1.1);
  lune.position.set(-4, 7, 3);
  scene.add(lune);
  scene.add(new THREE.AmbientLight(0xffe8cc, 0.85));
  scene.add(new THREE.HemisphereLight(0x8aa0d0, 0x2a1a10, 0.5));

  const plan = pack.plan;
  const [vx, vy, vw, vh] = plan.vue.split(' ').map(Number);
  const cx = vx + vw / 2, cz = vy + vh / 2;
  const X = (x) => (x - cx) * E, Z = (y) => (y - cz) * E;
  const vitrees = new Set(plan.vitrees || []);
  const niv = (id) => (plan.niveaux || {})[id] || 0;   // niveau du sol de chaque pièce
  const couleursMurs = plan.murs || {};

  const surfaces = {};
  Object.entries(plan.zones).forEach(([id, r]) => { surfaces[id] = { id, r, piece: true }; });
  Object.entries(plan.couloirs || {}).forEach(([id, r]) => { surfaces[id] = { id, r, piece: false }; });

  // ---------------- tronçons de murs et portes ----------------
  // Un tronçon partagé par deux surfaces est une cloison ; touché par une
  // seule, c'est un mur de façade.
  const troncons = new Map();
  const cleT = (sens, fixe, i) => (sens === 'h' ? `h:${i}:${fixe}` : `v:${fixe}:${i}`);
  const ajouter = (sens, fixe, i, id) => {
    const cle = cleT(sens, fixe, i);
    const t = troncons.get(cle) || { sens, fixe, i, surfaces: [] };
    t.surfaces.push(id);
    troncons.set(cle, t);
  };
  Object.values(surfaces).forEach(({ id, r: [x, y, w, h] }) => {
    for (let i = x; i < x + w; i += PAS) { ajouter('h', y, i, id); ajouter('h', y + h, i, id); }
    for (let j = y; j < y + h; j += PAS) { ajouter('v', x, j, id); ajouter('v', x + w, j, id); }
  });
  const percer = (sens, premier, fixe) => { for (let k = 0; k < LARG_PORTE; k++) troncons.delete(cleT(sens, fixe, premier + k * PAS)); };
  const portes = [];
  (plan.portes || []).forEach(([a, b]) => {
    const [ax, ay, aw, ah] = surfaces[a].r, [bx, by, bw, bh] = surfaces[b].r;
    let sens, fixe, debut, fin;
    if (ay + ah === by || by + bh === ay) { sens = 'h'; fixe = ay + ah === by ? by : ay; debut = Math.max(ax, bx); fin = Math.min(ax + aw, bx + bw); }
    else { sens = 'v'; fixe = ax + aw === bx ? bx : ax; debut = Math.max(ay, by); fin = Math.min(ay + ah, by + bh); }
    if (fin - debut < LARG_PORTE * PAS) return;
    const premier = Math.round((debut + fin) / 2 / PAS) * PAS - Math.floor(LARG_PORTE / 2) * PAS;
    percer(sens, premier, fixe);
    const milieu = premier + LARG_PORTE * PAS / 2;
    const y0 = SOCLE + Math.min(niv(a), niv(b));
    portes.push({ a, b, sens, pos: sens === 'h' ? new THREE.Vector3(X(milieu), y0, Z(fixe)) : new THREE.Vector3(X(fixe), y0, Z(milieu)) });
  });
  // Porte d'entrée : sur le côté extérieur le plus long de la pièce d'entrée
  let entree = null;
  if (plan.entree && surfaces[plan.entree]) {
    const [x, y, w, h] = surfaces[plan.entree].r;
    let meilleur = null;
    [['h', y + h, x, w, 1], ['h', y, x, w, -1], ['v', x + w, y, h, 1], ['v', x, y, h, -1]].forEach(([sens, fixe, debut, long, dehors]) => {
      let n = 0;
      for (let i = debut; i < debut + long; i += PAS) { const t = troncons.get(cleT(sens, fixe, i)); if (t && t.surfaces.length === 1) n++; }
      if (!meilleur || n > meilleur.n) meilleur = { sens, fixe, debut, long, dehors, n };
    });
    if (meilleur && meilleur.n >= LARG_PORTE) {
      const { sens, fixe, debut, long, dehors } = meilleur;
      const premier = Math.round((debut + long / 2) / PAS) * PAS - Math.floor(LARG_PORTE / 2) * PAS;
      percer(sens, premier, fixe);
      const milieu = premier + LARG_PORTE * PAS / 2;
      entree = { sens, dehors, pos: sens === 'h' ? new THREE.Vector3(X(milieu), 0, Z(fixe)) : new THREE.Vector3(X(fixe), 0, Z(milieu)) };
    }
  }

  // ---------------- soubassement, sols, mobilier ----------------
  const matSocle = new THREE.MeshStandardMaterial({ map: pierre('#5c544a'), roughness: 0.95 });
  matSocle.map.repeat.set(3, 1);
  const pieces = {};
  const sols = [];
  Object.values(surfaces).forEach((sf) => {
    const [x, y, w, h] = sf.r;
    const l = w * E, p = h * E;
    const centre = new THREE.Vector3(X(x + w / 2), SOCLE + niv(sf.id), Z(y + h / 2));
    const hs = Math.max(0.02, SOCLE + niv(sf.id));
    scene.add(place(boite(l + 0.1, hs, p + 0.1, matSocle), centre.x, hs / 2, centre.z));
    const g = new THREE.Group();
    g.position.copy(centre);
    const sol = boite(l, 0.012, p, solDe(sf.id, l, p));
    sol.position.y = 0.006;
    sol.userData.lieu = sf.id;
    g.add(sol);
    const meubles = new THREE.Group();
    meubles.position.y = 0.012;
    (MOBILIER[sf.id] || mobilierGenerique)(meubles, l - EP_INT * 2, p - EP_INT * 2);
    g.add(meubles);
    scene.add(g);
    if (!sf.piece) { pieces[sf.id] = { centre, l, p, ouvert: true, couloir: true }; return; }
    sols.push(sol);
    const halo = boite(l - 0.03, 0.006, p - 0.03, new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, depthWrite: false }));
    halo.position.y = 0.018;
    g.add(halo);
    const lieu = pack.lieux.find((x2) => x2.id === sf.id) || { nom: sf.id };
    const etiquette = texteSprite((lieu.icone ? lieu.icone + ' ' : '') + lieu.nom);
    etiquette.position.set(0, H_EXT + 0.3, 0);
    g.add(etiquette);
    pieces[sf.id] = { centre, l, p, halo, meubles, etiquette, ouvert: true };
  });

  // ---------------- murs : façade, cloisons, verrières ----------------
  const matFacade = new THREE.MeshStandardMaterial({ map: pierre('#9a8f7e'), roughness: 0.9 });
  const matCloison = mat(0xd9cfbd, { roughness: 0.85 });
  const matDessus = mat(0x2b2523, { roughness: 0.7 });
  const matVitreFacade = new THREE.MeshStandardMaterial({ color: 0x1a1208, emissive: 0xffb45a, emissiveIntensity: 0.55, roughness: 0.2 });
  const matVerre = new THREE.MeshPhysicalMaterial({ color: 0xcfe8dc, transparent: true, opacity: 0.18, roughness: 0.05 });
  const matChambranle = mat(0x2a201a, { roughness: 0.5 });
  const murs = new THREE.Group();
  const pansDe = (positions) => {
    positions.sort((a, b) => a - b);
    const pans = [];
    let debut = positions[0], prec = positions[0];
    positions.slice(1).concat([null]).forEach((pos) => {
      if (pos !== null && pos === prec + PAS) { prec = pos; return; }
      pans.push([debut, prec + PAS]);
      if (pos !== null) { debut = pos; prec = pos; }
    });
    return pans;
  };
  // Groupe posé le long d'un pan : x local = le long du mur, z local = à travers.
  const surPan = (sens, fixe, milieu, y = SOCLE) => {
    const g = new THREE.Group();
    if (sens === 'h') g.position.set(X(milieu), y, Z(fixe));
    else { g.position.set(X(fixe), y, Z(milieu)); g.rotation.y = -Math.PI / 2; }
    murs.add(g);
    return g;
  };
  const lignes = {};
  troncons.forEach((t) => {
    const genre = t.surfaces.length === 1 ? (vitrees.has(t.surfaces[0]) ? 'verre' : 'ext') : 'int';
    // Un mur entre deux niveaux part du plus bas et monte jusqu'au plus haut.
    const nivs = t.surfaces.map(niv);
    const bas = Math.min(...nivs), ecart = Math.max(...nivs) - bas;
    const interieur = genre === 'int' ? 0 : (t.sens === 'h' ? (surfaces[t.surfaces[0]].r[1] === t.fixe ? 1 : -1)
      : (surfaces[t.surfaces[0]].r[0] === t.fixe ? -1 : 1));
    const cle = `${t.sens}|${t.fixe}|${genre}|${bas}|${ecart}|${interieur}`;
    (lignes[cle] = lignes[cle] || []).push(t.i);
  });
  const matRideau = VELOURS(0x6a1622);
  Object.entries(lignes).forEach(([cle, positions]) => {
    const [sens, fixeS, genre, basS, ecartS, intS] = cle.split('|');
    const fixe = Number(fixeS), base = SOCLE + Number(basS), ecart = Number(ecartS), interieur = Number(intS);
    pansDe(positions).forEach(([a, b]) => {
      const ep = genre === 'int' ? EP_INT : EP_EXT;
      const L = (b - a) * E + ep;
      const g = surPan(sens, fixe, (a + b) / 2, base);
      if (genre === 'int') {
        const H = H_INT + ecart;
        g.add(place(boite(L, H, ep, matCloison), 0, H / 2, 0));
        g.add(place(boite(L, 0.012, ep + 0.004, matDessus), 0, H + 0.006, 0));
      } else if (genre === 'verre') {
        g.add(place(boite(L, 0.14, ep, matFacade), 0, 0.07, 0));
        g.add(place(boite(L, H_EXT - 0.14, 0.01, matVerre), 0, (H_EXT + 0.14) / 2, 0));
        g.add(place(boite(L, 0.015, 0.03, LAITON()), 0, H_EXT, 0));
        const n = Math.max(1, Math.round(L / 0.3));
        for (let k = 0; k <= n; k++) g.add(place(boite(0.015, H_EXT - 0.14, 0.03, LAITON()), -L / 2 + k * L / n, (H_EXT + 0.14) / 2, 0));
      } else {
        // Façade en pierre, fenêtres éclairées de l'intérieur
        const nf = Math.floor((b - a) / 60);
        const lf = 0.26, bas = 0.22, haut = 0.56;
        if (!nf) g.add(place(boite(L, H_EXT, ep, matFacade), 0, H_EXT / 2, 0));
        else {
          let x0 = -L / 2;
          for (let k = 0; k < nf; k++) {
            const c = -L / 2 + (k + 0.5) * L / nf;
            const plein = c - lf / 2 - x0;
            if (plein > 0.001) g.add(place(boite(plein, H_EXT, ep, matFacade), x0 + plein / 2, H_EXT / 2, 0));
            g.add(place(boite(lf, bas, ep, matFacade), c, bas / 2, 0));
            g.add(place(boite(lf, H_EXT - haut, ep, matFacade), c, (H_EXT + haut) / 2, 0));
            g.add(place(boite(lf, haut - bas, 0.012, matVitreFacade), c, (bas + haut) / 2, 0));
            g.add(place(boite(lf + 0.04, 0.02, ep + 0.04, matChambranle), c, bas, 0));
            g.add(place(boite(0.012, haut - bas, 0.02, matChambranle), c, (bas + haut) / 2, 0));
            [-1, 1].forEach((sr) => g.add(place(boite(0.06, haut - bas + 0.1, 0.012, matRideau), c + sr * (lf / 2 + 0.01), (bas + haut) / 2 + 0.02, interieur * (ep / 2 + 0.02))));
            g.add(place(boite(lf + 0.16, 0.01, 0.01, LAITON()), c, haut + 0.07, interieur * (ep / 2 + 0.02)));
            x0 = c + lf / 2;
          }
          const reste = L / 2 - x0;
          if (reste > 0.001) g.add(place(boite(reste, H_EXT, ep, matFacade), x0 + reste / 2, H_EXT / 2, 0));
        }
        g.add(place(boite(L + 0.01, 0.02, ep + 0.02, matDessus), 0, H_EXT + 0.01, 0));
      }
    });
  });

  // ---------------- papier peint, lambris, tableaux, appliques ----------------
  // Pour chaque pièce, sur la face intérieure de ses murs (hors portes).
  // Avec surPan, +z local pointe vers +z du monde pour un mur 'h', et vers
  // -x du monde pour un mur 'v' (rotation de -90°).
  const graine = aleatoire(42);
  const matApplique = lueur(0xffc46b, 2.2);
  Object.values(surfaces).forEach((sf) => {
    if (vitrees.has(sf.id)) return;
    const couleur = new THREE.Color(couleursMurs[sf.id] || '#d9cfbd');
    const matPapier = mat(couleur, { roughness: 0.9 });
    const matLambris = materiauNoyer(couleur.clone().multiplyScalar(0.45).getHex(), 0.6);
    const [x, y, w, h] = sf.r;
    const cote = (sens, fixe, debut, long, interieur) => {
      const pos = [];
      for (let i = debut; i < debut + long; i += PAS) if (troncons.has(cleT(sens, fixe, i))) pos.push(i);
      if (!pos.length) return;
      pansDe(pos).forEach(([a, b]) => {
        const t = troncons.get(cleT(sens, fixe, a));
        const ext = t.surfaces.length === 1;
        const ep = ext ? EP_EXT : EP_INT;
        const H = ext ? H_EXT : H_INT + Math.max(...t.surfaces.map(niv)) - niv(sf.id);
        const L = (b - a) * E - 0.01;
        const g = surPan(sens, fixe, (a + b) / 2, SOCLE + niv(sf.id));
        const off = interieur * (ep / 2 + 0.004);
        g.add(place(boite(L, H - 0.02, 0.006, matPapier), 0, (H - 0.02) / 2, off));
        g.add(place(boite(L, 0.17, 0.01, matLambris), 0, 0.085, off + interieur * 0.003));
        if (L > 0.7 && graine() < 0.75) {
          const dx = (graine() - 0.5) * (L - 0.4);
          g.add(place(boite(0.22, 0.16, 0.012, LAITON()), dx, 0.36, off + interieur * 0.008));
          g.add(place(boite(0.19, 0.13, 0.004, new THREE.MeshStandardMaterial({ map: toile(Math.floor(graine() * 1000)), roughness: 0.8 })), dx, 0.36, off + interieur * 0.015));
        }
        if (L > 0.5) g.add(place(sphere(0.014, matApplique, 8), -L * 0.3, 0.45, off + interieur * 0.02));
        if (L > 1) g.add(place(sphere(0.014, matApplique, 8), L * 0.3, 0.45, off + interieur * 0.02));
      });
    };
    cote('h', y, x, w, 1);          // mur du haut : l'intérieur est vers +z
    cote('h', y + h, x, w, -1);     // mur du bas : vers -z
    cote('v', x, y, h, -1);         // mur de gauche : intérieur vers +x, soit -z local
    cote('v', x + w, y, h, 1);      // mur de droite : intérieur vers -x, soit +z local
  });

  // ---------------- portes intérieures et porte d'entrée ----------------
  const matPorte = materiauNoyer(0x2a1a10, 0.4);
  const larg = LARG_PORTE * PAS * E;
  function battant(H, angle) {
    const charniere = new THREE.Group();
    charniere.add(place(boite(larg * 0.92, H * 0.86, 0.022, matPorte), larg * 0.46, H * 0.43, 0));
    charniere.add(place(boite(larg * 0.7, H * 0.3, 0.026, materiauNoyer(0x3b2618, 0.4)), larg * 0.46, H * 0.62, 0));
    charniere.add(place(sphere(0.016, LAITON(), 8), larg * 0.82, H * 0.42, 0.022));
    charniere.rotation.y = angle;
    return charniere;
  }
  portes.forEach((po) => {
    const g = new THREE.Group();
    g.position.copy(po.pos);
    if (po.sens === 'v') g.rotation.y = -Math.PI / 2;
    const ecart = Math.abs(niv(po.a) - niv(po.b));
    const b = battant(H_INT, -1.15); b.position.x = -larg / 2; g.add(b);
    g.add(place(boite(larg, 0.012, EP_INT, mat(0x8a6a3a, { roughness: 0.5 })), 0, 0.006, 0));
    g.add(place(boite(larg + 0.04, 0.03, EP_INT + 0.01, matChambranle), 0, H_INT * 0.9 + ecart, 0));
    if (ecart > 0.01) {
      // Marches dans le passage, du côté de la pièce la plus basse
      const basse = niv(po.a) < niv(po.b) ? po.a : po.b, haute = basse === po.a ? po.b : po.a;
      const cb = pieces[basse].centre;
      let sensZ = po.sens === 'h' ? Math.sign(cb.z - po.pos.z) : -Math.sign(cb.x - po.pos.x);
      const n = Math.max(1, Math.round(ecart / 0.04));
      g.add(place(boite(larg, ecart, EP_INT + 0.004, matSocle), 0, ecart / 2, 0));
      for (let k = 0; k < n; k++) g.add(place(boite(larg, ecart * (n - k) / n, 0.05, NOYER()), 0, ecart * (n - k) / n / 2, sensZ * (EP_INT / 2 + 0.025 + k * 0.05)));
      po.marches = { basse, haute };
    }
    scene.add(g);
  });
  if (entree) {
    const g = new THREE.Group();
    g.position.copy(entree.pos);
    if (entree.sens === 'v') g.rotation.y = -Math.PI / 2;
    // dehors en z local : pour un mur 'v' tourné de -90°, +x monde = -z local
    const d = entree.sens === 'h' ? entree.dehors : -entree.dehors;
    const H0 = SOCLE + niv(plan.entree);
    const b = battant(H_EXT, d > 0 ? 1.2 : -1.2); b.position.set(-larg / 2, H0, 0); g.add(b);
    for (let k = 0; k < 3; k++) g.add(place(boite(larg + 0.14 - k * 0.04, H0 / 3 * (3 - k), 0.07, matSocle), 0, H0 / 6 * (3 - k), d * (0.09 + (2 - k) * 0.07)));
    [-1, 1].forEach((s) => {
      g.add(place(boite(0.04, 0.06, 0.04, LAITON()), s * (larg / 2 + 0.08), H0 + 0.5, d * 0.07));
      g.add(place(sphere(0.016, lueur(0xffc46b, 3), 8), s * (larg / 2 + 0.08), H0 + 0.5, d * 0.07));
    });
    scene.add(g);
  }
  scene.add(murs);

  // ---------------- jardin, nuit d'orage ----------------
  const largeur = vw * E, profondeur = vh * E;
  const terrain = boite(largeur + 6, 0.04, profondeur + 6, new THREE.MeshStandardMaterial({ map: herbe(), roughness: 1 }));
  terrain.position.y = -0.02;
  scene.add(terrain);
  const dansMaison = (x, z, marge) => Object.values(surfaces).some(({ r: [rx, ry, rw, rh] }) =>
    x > X(rx) - marge && x < X(rx + rw) + marge && z > Z(ry) - marge && z < Z(ry + rh) + marge);
  let allee = null;
  const lx = largeur + 4.8, lz = profondeur + 4.8;
  if (entree) {
    const dir = entree.sens === 'h' ? new THREE.Vector3(0, 0, entree.dehors) : new THREE.Vector3(entree.dehors, 0, 0);
    const lat = entree.sens === 'h' ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1);
    const depart = entree.pos.clone().addScaledVector(dir, 0.3);
    const fin = entree.sens === 'h' ? new THREE.Vector3(depart.x, 0, entree.dehors * lz / 2) : new THREE.Vector3(entree.dehors * lx / 2, 0, depart.z);
    const long = depart.distanceTo(fin);
    const milieu = depart.clone().add(fin).multiplyScalar(0.5);
    scene.add(place(boite(entree.sens === 'h' ? 0.5 : long, 0.012, entree.sens === 'h' ? long : 0.5, new THREE.MeshStandardMaterial({ map: gravier(), roughness: 1 })), milieu.x, 0.006, milieu.z));
    allee = { depart, dir, lat };
    const haie = mat(0x1f3b22, { roughness: 1 });
    for (let t = 0.3; t < long - 0.3; t += 0.32) {
      const p0 = depart.clone().addScaledVector(dir, t);
      [-1, 1].forEach((s) => scene.add(place(boite(0.24, 0.14, 0.24, haie), p0.x + lat.x * s * 0.42, 0.07, p0.z + lat.z * s * 0.42)));
    }
    // Fontaine sur le côté de l'allée
    const pf = depart.clone().addScaledVector(dir, long * 0.5).addScaledVector(lat, 1.15);
    scene.add(place(cyl(0.34, 0.36, 0.1, matSocle, 24), pf.x, 0.05, pf.z));
    scene.add(place(cyl(0.3, 0.3, 0.01, mat(0x1d3a52, { roughness: 0.05, metalness: 0.3 }), 24), pf.x, 0.1, pf.z));
    scene.add(place(cyl(0.04, 0.06, 0.3, matSocle), pf.x, 0.25, pf.z));
    scene.add(place(cyl(0.12, 0.08, 0.04, matSocle), pf.x, 0.41, pf.z));
    // Lampadaires
    [0.25, 0.7].forEach((f) => [-1, 1].forEach((s) => {
      const pl = depart.clone().addScaledVector(dir, long * f).addScaledVector(lat, s * 0.62);
      scene.add(place(cyl(0.012, 0.016, 0.5, matChambranle, 8), pl.x, 0.25, pl.z));
      scene.add(place(sphere(0.035, lueur(0xffc46b, 2.6), 10), pl.x, 0.52, pl.z));
    }));
    const lampe = new THREE.PointLight(0xffb45a, 1.6, 3.2, 1.2);
    lampe.position.copy(depart.clone().addScaledVector(dir, long * 0.35)).setY(0.6);
    scene.add(lampe);
  }
  // Arbres autour, hors de la maison et de l'allée
  const r = aleatoire(9);
  const feuillages = [0x1c3a20, 0x24452a, 0x173018];
  let poses = 0;
  for (let k = 0; k < 120 && poses < 18; k++) {
    const x = (r() - 0.5) * (lx - 0.4), z = (r() - 0.5) * (lz - 0.4);
    if (dansMaison(x, z, 0.5)) continue;
    if (allee && Math.abs(allee.lat.x ? x - allee.depart.x : z - allee.depart.z) < 0.9 && ((x - allee.depart.x) * allee.dir.x + (z - allee.depart.z) * allee.dir.z) > -0.3) continue;
    const arbre = new THREE.Group();
    const h = 0.4 + r() * 0.35;
    arbre.add(place(cyl(0.03, 0.045, h, mat(0x3a2414), 8), 0, h / 2, 0));
    if (r() < 0.5) arbre.add(place(new THREE.Mesh(new THREE.ConeGeometry(0.22 + r() * 0.1, 0.7, 9), mat(feuillages[k % 3], { roughness: 1 })), 0, h + 0.25, 0));
    else arbre.add(place(new THREE.Mesh(new THREE.IcosahedronGeometry(0.24 + r() * 0.1, 1), mat(feuillages[k % 3], { roughness: 1 })), 0, h + 0.15, 0));
    arbre.position.set(x, 0, z);
    scene.add(arbre);
    poses++;
  }
  // Mur d'enceinte bas, avec un portail face à l'allée
  const enceinte = mat(0x4a443c, { roughness: 1 });
  const segmentMur = (x1, z1, x2, z2) => {
    const l = Math.hypot(x2 - x1, z2 - z1);
    if (l < 0.01) return;
    const m = boite(l, 0.16, 0.08, enceinte);
    m.position.set((x1 + x2) / 2, 0.08, (z1 + z2) / 2);
    m.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
    scene.add(m);
  };
  const coins = [[-lx / 2, -lz / 2], [lx / 2, -lz / 2], [lx / 2, lz / 2], [-lx / 2, lz / 2]];
  for (let k = 0; k < 4; k++) {
    const [x1, z1] = coins[k], [x2, z2] = coins[(k + 1) % 4];
    const portail = allee && ((allee.lat.x && Math.abs(z1 - z2) < 0.01 && Math.sign(z1) === Math.sign(allee.dir.z)) ||
      (allee.lat.z && Math.abs(x1 - x2) < 0.01 && Math.sign(x1) === Math.sign(allee.dir.x)));
    if (!portail) { segmentMur(x1, z1, x2, z2); continue; }
    const o = 0.45;
    if (allee.lat.x) { const gx = allee.depart.x; segmentMur(Math.min(x1, x2), z1, gx - o, z1); segmentMur(gx + o, z1, Math.max(x1, x2), z1); [gx - o, gx + o].forEach((px) => scene.add(place(boite(0.12, 0.3, 0.12, matSocle), px, 0.15, z1))); }
    else { const gz = allee.depart.z; segmentMur(x1, Math.min(z1, z2), x1, gz - o); segmentMur(x1, gz + o, x1, Math.max(z1, z2)); [gz - o, gz + o].forEach((pz) => scene.add(place(boite(0.12, 0.3, 0.12, matSocle), x1, 0.15, pz))); }
  }

  // Parterres de fleurs et bancs le long de l'allée
  if (allee) {
    const fleurs = [0xb3263a, 0xe0b84a, 0x8a5ab8, 0xf2efe6];
    const rf = aleatoire(4);
    [-1, 1].forEach((s) => {
      const c = allee.depart.clone().addScaledVector(allee.dir, 0.9).addScaledVector(allee.lat, s * 0.95);
      const lb = allee.lat.x ? 0.7 : 0.3, pb = allee.lat.x ? 0.3 : 0.7;
      scene.add(place(boite(lb, 0.05, pb, mat(0x3a2a1c, { roughness: 1 })), c.x, 0.025, c.z));
      for (let k = 0; k < 22; k++) scene.add(place(sphere(0.022, mat(fleurs[k % 4], { roughness: 0.8 }), 6), c.x + (rf() - 0.5) * (lb - 0.06), 0.065, c.z + (rf() - 0.5) * (pb - 0.06)));
      const pbc = allee.depart.clone().addScaledVector(allee.dir, 1.7).addScaledVector(allee.lat, s * 0.78);
      const banc = new THREE.Group();
      banc.add(place(boite(0.3, 0.02, 0.09, NOYER()), 0, 0.09, 0));
      banc.add(place(boite(0.3, 0.07, 0.015, NOYER()), 0, 0.14, -0.045));
      [-0.13, 0.13].forEach((x) => banc.add(place(boite(0.02, 0.09, 0.08, matChambranle), x, 0.045, 0)));
      banc.position.copy(pbc);
      banc.rotation.y = Math.atan2(-allee.lat.x * s, -allee.lat.z * s);
      scene.add(banc);
    });
  }

  // Cheminées de pierre qui dépassent du toit, collées au mur extérieur
  const matCheminee = mat(0x6a5e52, { roughness: 1 });
  (plan.cheminees || []).forEach(([px, py]) => {
    let ox = 0, oz = 0;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!dansMaison(X(px) + dx * 0.12, Z(py) + dz * 0.12, 0)) { ox = dx; oz = dz; break; }
    const cx0 = X(px) + ox * 0.05, cz0 = Z(py) + oz * 0.05, hc = SOCLE + H_EXT + 0.28;
    scene.add(place(boite(0.16, hc, 0.16, matCheminee), cx0, hc / 2, cz0));
    scene.add(place(boite(0.2, 0.04, 0.2, matCheminee), cx0, hc, cz0));
    [-0.035, 0.035].forEach((d) => scene.add(place(cyl(0.022, 0.022, 0.07, mat(0x8a4a32), 8), cx0 + d * Math.abs(oz), hc + 0.05, cz0 + d * Math.abs(ox))));
  });

  // Tour ronde à toit conique, fenêtres éclairées
  (plan.tours || []).forEach(([tx, ty, tr]) => {
    const R = tr * E, ht = SOCLE + H_EXT + 0.32, x0 = X(tx), z0 = Z(ty);
    const tour = new THREE.Group();
    tour.add(place(cyl(R + 0.03, R + 0.04, SOCLE, matSocle, 28), 0, SOCLE / 2, 0));
    tour.add(place(cyl(R, R, ht - SOCLE, mat(0xb8a98e, { roughness: 0.95 }), 28), 0, SOCLE + (ht - SOCLE) / 2, 0));
    tour.add(place(cyl(R + 0.025, R + 0.025, 0.03, matChambranle, 28), 0, ht, 0));
    const toitC = new THREE.Mesh(new THREE.ConeGeometry(R + 0.06, 0.5, 28), mat(0x2e3440, { roughness: 0.6, metalness: 0.2 }));
    toitC.position.y = ht + 0.25; tour.add(toitC);
    tour.add(place(sphere(0.02, LAITON(), 8), 0, ht + 0.52, 0));
    for (let k = 0; k < 6; k++) {
      const a = k * Math.PI / 3 + 0.3, hf = k % 2 ? 0.55 : 0.3;
      const f = place(boite(0.05, 0.1, 0.01, lueur(0xffc46b, 1.8)), Math.cos(a) * (R + 0.003), SOCLE + hf, Math.sin(a) * (R + 0.003));
      f.rotation.y = -a + Math.PI / 2; tour.add(f);
    }
    tour.position.set(x0, 0, z0);
    scene.add(tour);
  });

  // Quelques lumières chaudes à l'intérieur (lustres, cheminée)
  [['hall', 0.7, 0xffc87a, 1.4], ['salle_de_bal', 0.7, 0xffc87a, 1.4], ['fumoir', 0.25, 0xff7a2a, 1.6], ['bibliotheque', 0.45, 0xffd08a, 1.1], ['cuisine', 0.45, 0xffd08a, 1.0]]
    .forEach(([id, hl, c, i]) => { if (!pieces[id]) return; const pl = new THREE.PointLight(c, i, 2.6, 1.3); pl.position.copy(pieces[id].centre).setY(SOCLE + hl); scene.add(pl); });

  lisser(scene);

  // ---------------- caméra orientable ----------------
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 80);
  const controles = new OrbitControls(camera, renderer.domElement);
  controles.target.set(0, 0.2, 0);
  controles.enableDamping = true;
  controles.dampingFactor = 0.12;
  controles.enablePan = false;
  controles.minPolarAngle = 0.2;
  controles.maxPolarAngle = 1.15;
  const DIRECTION = new THREE.Vector3(0.38, 0.8, 0.46).normalize();
  const rayonMaquette = Math.hypot(largeur, profondeur) / 2 + 0.25;
  function cadrer() {
    const demiV = THREE.MathUtils.degToRad(camera.fov / 2);
    const demiH = Math.atan(Math.tan(demiV) * camera.aspect);
    const d = rayonMaquette / Math.sin(Math.min(demiV, demiH));
    camera.position.copy(DIRECTION).multiplyScalar(d * 0.84).add(controles.target);
    controles.maxDistance = d * 1.6;
    controles.minDistance = d * 0.28;
  }

  // ---------------- personnages ----------------
  const voisins = {};
  portes.forEach((po) => {
    (voisins[po.a] = voisins[po.a] || []).push({ vers: po.b, porte: po });
    (voisins[po.b] = voisins[po.b] || []).push({ vers: po.a, porte: po });
  });
  function chemin(depart, arrivee) {
    const prec = { [depart]: null };
    const file = [depart];
    while (file.length) {
      const s = file.shift();
      if (s === arrivee) break;
      (voisins[s] || []).forEach(({ vers, porte }) => { if (!(vers in prec)) { prec[vers] = { s, porte }; file.push(vers); } });
    }
    if (!(arrivee in prec)) return null;
    const etapes = [];
    for (let n = arrivee; prec[n]; n = prec[n].s) etapes.unshift({ porte: prec[n].porte, vers: n });
    return etapes;
  }
  function pointDans(id) {
    const pc = pieces[id];
    return new THREE.Vector3(pc.centre.x + (Math.random() - 0.5) * (pc.l * 0.55), pc.centre.y + 0.012, pc.centre.z + (Math.random() - 0.5) * (pc.p * 0.55));
  }
  // Destinations : les pièces ouvertes et le hall (on s'y croise souvent).
  const destinations = () => Object.keys(pieces).filter((id) => pieces[id].ouvert);
  const persos = new Map();
  function majPersonnages(liste) {
    const vus = new Set();
    liste.forEach(({ nom, couleur, icone }) => {
      vus.add(nom);
      if (persos.has(nom)) return;
      const g = new THREE.Group();
      const corps = creerPersonnage(new THREE.Color(couleur || '#888888'));
      corps.scale.setScalar(TAILLE_PERSO);
      g.add(corps);
      const badge = texteSprite((icone ? icone + ' ' : '') + nom, { taille: 40, hauteur: 0.2, police: 'Outfit, system-ui, sans-serif', poids: 600 });
      badge.position.y = 0.46;
      g.add(badge);
      const d = destinations();
      const salle = d[Math.floor(Math.random() * d.length)];
      g.position.copy(pointDans(salle));
      lisser(g);
      scene.add(g);
      persos.set(nom, { groupe: g, salle, etapes: [], pause: Math.random() * 3, phase: Math.random() * 6 });
    });
    [...persos.keys()].forEach((nom) => { if (!vus.has(nom)) { scene.remove(persos.get(nom).groupe); persos.delete(nom); } });
    demanderImage();
  }
  function partir(p) {
    const d = destinations().filter((id) => id !== p.salle);
    const but = d[Math.floor(Math.random() * d.length)];
    const route = but && chemin(p.salle, but);
    p.etapes = [];
    (route || []).forEach(({ porte, vers }) => {
      const avant = porte.pos.clone(), apres = porte.pos.clone();
      const ctr = pieces[vers].centre;
      if (porte.sens === 'h') { const s = Math.sign(ctr.z - porte.pos.z); avant.z -= s * 0.16; apres.z += s * 0.16; }
      else { const s = Math.sign(ctr.x - porte.pos.x); avant.x -= s * 0.16; apres.x += s * 0.16; }
      const depuis = porte.a === vers ? porte.b : porte.a;
      const ecart = Math.abs(niv(porte.a) - niv(porte.b)) > 0.01 ? 0.12 : 0;   // le temps de passer les marches
      if (porte.sens === 'h') { const s = Math.sign(pieces[vers].centre.z - porte.pos.z); avant.z -= s * ecart; apres.z += s * ecart; }
      else { const s = Math.sign(pieces[vers].centre.x - porte.pos.x); avant.x -= s * ecart; apres.x += s * ecart; }
      p.etapes.push({ point: avant.setY(pieces[depuis].centre.y + 0.012) }, { point: apres.setY(pieces[vers].centre.y + 0.012), salle: vers });
    });
    if (but && route) p.etapes.push({ point: pointDans(but), salle: but });
  }
  function animerPersonnages(dt) {
    persos.forEach((p) => {
      p.phase += dt * 7;
      const corps = p.groupe.children[0];
      if (p.etapes.length) {
        const etape = p.etapes[0];
        const d = etape.point.clone().sub(p.groupe.position);
        const dist = d.length();
        if (dist < 0.02) {
          if (etape.salle) p.salle = etape.salle;
          p.etapes.shift();
          if (!p.etapes.length) { p.pause = 2 + Math.random() * 6; corps.position.y = 0; }
          return;
        }
        d.normalize();
        p.groupe.position.addScaledVector(d, Math.min(dist, VITESSE * dt));
        corps.rotation.y = Math.atan2(d.x, d.z);
        corps.position.y = Math.abs(Math.sin(p.phase)) * 0.02;
      } else {
        p.pause -= dt;
        if (p.pause <= 0) partir(p);
      }
    });
  }

  // ---------------- états du carnet ----------------
  let crime = null;
  function majEtats(etats, ouverts, lieuCrime) {
    crime = lieuCrime || null;
    Object.entries(pieces).forEach(([id, pc]) => {
      if (pc.couloir) return;
      pc.ouvert = ouverts.includes(id);
      const e = etats[id] || '';
      const halo = pc.halo.material;
      pc.etiquette.material.opacity = pc.ouvert ? 1 : 0.35;
      if (!pc.ouvert) { halo.color.set(0x000000); halo.opacity = 0.7; }
      else if (crime) { halo.color.set(crime === id ? 0xb3261e : 0x000000); halo.opacity = 0.55; }
      else if (e === 'elimine') { halo.color.set(0x000000); halo.opacity = 0.55; }
      else if (e === 'suspect') { halo.color.set(0xb3261e); halo.opacity = 0.42; }
      else halo.opacity = 0;
    });
    demanderImage();
  }

  // ---------------- appui sur une pièce ----------------
  const rayon = new THREE.Raycaster();
  let appui = null;
  renderer.domElement.addEventListener('pointerdown', (e) => { appui = { x: e.clientX, y: e.clientY, t: Date.now() }; });
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!appui || !surAppui) return;
    if (Math.hypot(e.clientX - appui.x, e.clientY - appui.y) > 8 || Date.now() - appui.t > 500) return;
    const rc = renderer.domElement.getBoundingClientRect();
    rayon.setFromCamera(new THREE.Vector2(((e.clientX - rc.left) / rc.width) * 2 - 1, -((e.clientY - rc.top) / rc.height) * 2 + 1), camera);
    const touche = rayon.intersectObjects(sols, false)[0];
    if (touche && pieces[touche.object.userData.lieu].ouvert) surAppui(touche.object.userData.lieu);
  });

  // ---------------- boucle de rendu sobre, éclairs ----------------
  let actif = false, demande = false, dernier = 0, raf = null, cadree = false;
  let prochainEclair = 6000 + Math.random() * 8000, eclair = 0;
  function taille() {
    const l = conteneur.clientWidth, h = conteneur.clientHeight;
    if (!l || !h) return;
    renderer.setSize(l, h, false);
    camera.aspect = l / h;
    camera.updateProjectionMatrix();
    if (!cadree) { cadree = true; cadrer(); controles.update(); }
    demanderImage();
  }
  const observateur = new ResizeObserver(taille);
  observateur.observe(conteneur);
  controles.addEventListener('change', demanderImage);
  function demanderImage() { demande = true; if (actif && !raf) raf = requestAnimationFrame(boucle); }
  function boucle(t) {
    raf = null;
    if (!actif) return;
    if (t - dernier >= IMAGE_MIN) {
      const dt = Math.min(0.1, (t - dernier) / 1000 || 0);
      dernier = t;
      animerPersonnages(dt);
      // Éclair : deux flashs rapprochés, puis le noir
      prochainEclair -= dt * 1000;
      if (prochainEclair <= 0) { eclair = 0.5; prochainEclair = 9000 + Math.random() * 14000; }
      if (eclair > 0) {
        eclair -= dt;
        const k = eclair > 0.42 || (eclair < 0.3 && eclair > 0.24) ? 1 : 0;
        lune.intensity = 1.1 + k * 3.5;
        scene.background.copy(k ? FLASH : NUIT);
      } else if (lune.intensity !== 1.1) { lune.intensity = 1.1; scene.background.copy(NUIT); }
      if (crime && pieces[crime]) pieces[crime].halo.material.opacity = 0.35 + 0.25 * Math.sin(t / 300);
      controles.update();
      renderer.render(scene, camera);
      demande = false;
    }
    if (persos.size || demande || crime || eclair > 0) raf = requestAnimationFrame(boucle);
  }
  function reprendre() { if (actif) return; actif = true; dernier = 0; taille(); demanderImage(); }
  function arreter() { actif = false; if (raf) cancelAnimationFrame(raf); raf = null; }
  document.addEventListener('visibilitychange', () => { if (document.hidden) arreter(); });

  return {
    element: renderer.domElement,
    majEtats, majPersonnages, reprendre, arreter,
    detruire() { arreter(); observateur.disconnect(); controles.dispose(); renderer.dispose(); renderer.domElement.remove(); },
  };
}

// Vérifie que WebGL est disponible (sinon on garde le plan 2D).
export function webglDisponible() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) { return false; }
}
