// =====================================================================
// Plan 3D de l'Enquête : la maison vue comme un plan d'architecte en 3D.
// Les pièces se touchent et partagent leurs murs, coupés à mi-hauteur (on
// voit l'intérieur), avec des portes entre les pièces et des fenêtres sur la
// façade. On la fait tourner et zoomer au doigt.
//
// Tout vient du pack de l'univers (pack.plan) : zones des pièces, couloirs,
// portes. Le mobilier est choisi par identifiant de pièce, avec un repli
// générique pour les univers à venir.
//
// Les personnages des joueurs s'y promènent AU HASARD, tirés sur chaque
// téléphone, en passant par les portes : leurs déplacements n'ont AUCUN lien
// avec la solution (sinon le décor deviendrait un indice, ou une fuite).
//
// Sobriété sur téléphone : 30 images/s au plus, résolution plafonnée, pas
// d'ombres portées, et la boucle s'arrête dès que le plan n'est pas affiché.
// =====================================================================
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { preparerAmbiance, lisser, materiauNoyer, LAITON, textureBois, creerPersonnage } from '../da/bar-moderne.js';

const ECHELLE = 0.02;          // 1 unité du plan = 2 cm de maquette
const PAS = 10;                // les murs sont découpés en tronçons de 10 unités
const HAUT_MUR = 0.62;         // murs coupés à mi-hauteur
const EP_INT = 0.07;           // épaisseur des cloisons
const EP_EXT = 0.12;           // épaisseur des murs de façade
const LARG_PORTE = 3;          // en tronçons (30 unités)
const TAILLE_PERSO = 0.34;
const VITESSE = 0.55;          // unités par seconde
const IMAGE_MIN = 1000 / 30;   // 30 images/s au plus

// --- petites aides de construction -----------------------------------
const boite = (l, h, p, m) => new THREE.Mesh(new THREE.BoxGeometry(l, h, p), m);
const cylindre = (r1, r2, h, m, seg = 20) => new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), m);
const mat = (couleur, opts = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: couleur, roughness: 0.6 }, opts));
const lueur = (couleur, intensite = 1.6) => new THREE.MeshStandardMaterial({ color: 0x000000, emissive: couleur, emissiveIntensity: intensite });

function texteSprite(texte, { taille = 44, hauteur = 0.34, fond = 'rgba(10,4,6,0.78)', couleur = '#f3e6cf', police = 'Cormorant Garamond, Georgia, serif', poids = 700 } = {}) {
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

function textureCarreaux(a, b, n = 8, joint = '#00000033') {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  const t = 256 / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    ctx.fillStyle = (i + j) % 2 ? a : b; ctx.fillRect(i * t, j * t, t, t);
    ctx.strokeStyle = joint; ctx.strokeRect(i * t + 0.5, j * t + 0.5, t - 1, t - 1);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}
const textureDamier = (a, b, n) => textureCarreaux(a, b, n, '#00000000');

// --- mobilier par pièce (l, p : dimensions de la pièce) ----------------
const MOBILIER = {
  bibliotheque(g, l, p) {
    const noyer = materiauNoyer(0x3b2618);
    const couleurs = [0x7a2630, 0x2f4a6e, 0x5c6b2f, 0x8a6a2a, 0x4a2f5c];
    for (let k = 0; k < 3; k++) {
      const e = boite(l * 0.26, 0.5, 0.12, noyer);
      e.position.set(-l / 2 + 0.25 + k * (l * 0.3), 0.25, -p / 2 + 0.1);
      g.add(e);
      for (let r = 0; r < 3; r++) for (let b = 0; b < 6; b++) {
        const livre = boite(l * 0.035, 0.11, 0.09, mat(couleurs[(k + r + b) % couleurs.length]));
        livre.position.set(e.position.x - l * 0.11 + b * l * 0.043, 0.08 + r * 0.16, -p / 2 + 0.17);
        g.add(livre);
      }
    }
    const fauteuil = boite(0.28, 0.16, 0.26, mat(0x6e1f2a));
    fauteuil.position.set(l * 0.18, 0.08, p * 0.15);
    g.add(fauteuil);
  },
  serre(g, l, p) {
    const vert = [0x2f6b3a, 0x3f7a2f, 0x285e4a];
    for (let k = 0; k < 6; k++) {
      const pot = cylindre(0.07, 0.05, 0.1, mat(0x8a4a2a));
      const x = -l / 2 + 0.3 + (k % 3) * (l * 0.33), z = -p / 4 + Math.floor(k / 3) * (p * 0.45);
      pot.position.set(x, 0.05, z);
      const plante = new THREE.Mesh(new THREE.IcosahedronGeometry(0.14 + (k % 2) * 0.05, 1), mat(vert[k % 3], { roughness: 0.8 }));
      plante.position.set(x, 0.22, z);
      g.add(pot, plante);
    }
    const verriere = boite(l * 0.9, 0.01, p * 0.9, new THREE.MeshPhysicalMaterial({ color: 0xbfe3d0, transparent: true, opacity: 0.12, roughness: 0.1 }));
    verriere.position.y = 0.55;
    g.add(verriere);
  },
  salle_de_bal(g, l, p) {
    const lustre = new THREE.Group();
    const anneau = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.02, 10, 32), LAITON());
    anneau.rotation.x = Math.PI / 2;
    lustre.add(anneau);
    for (let k = 0; k < 8; k++) {
      const a = k / 8 * Math.PI * 2;
      const flamme = new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 8), lueur(0xffc46b, 2.4));
      flamme.position.set(Math.cos(a) * 0.24, 0.04, Math.sin(a) * 0.24);
      lustre.add(flamme);
    }
    lustre.position.y = 0.75;
    const fil = cylindre(0.006, 0.006, 0.4, LAITON(), 6);
    fil.position.y = 0.95;
    g.add(lustre, fil);
    const piano = boite(0.4, 0.2, 0.26, mat(0x0d0a0a, { roughness: 0.25 }));
    piano.position.set(l * 0.3, 0.1, -p * 0.3);
    g.add(piano);
  },
  fumoir(g, l, p) {
    const cuir = mat(0x5a2a16, { roughness: 0.45 });
    [-1, 1].forEach((s) => { const f = boite(0.26, 0.16, 0.24, cuir); f.position.set(s * l * 0.22, 0.08, 0); g.add(f); });
    const gueridon = cylindre(0.09, 0.09, 0.14, materiauNoyer(0x2a1a10));
    gueridon.position.y = 0.07;
    const braise = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), lueur(0xff5a2a, 3));
    braise.position.set(0.03, 0.16, 0);
    g.add(gueridon, braise);
  },
  cave(g, l, p) {
    const bois = materiauNoyer(0x5a3a1e, 0.8);
    for (let k = 0; k < 4; k++) {
      const t = cylindre(0.11, 0.11, 0.26, bois);
      t.rotation.z = Math.PI / 2;
      t.position.set(-l / 2 + 0.3 + k * 0.3, 0.11, -p / 2 + 0.2);
      g.add(t);
    }
    const casier = boite(0.5, 0.36, 0.1, materiauNoyer(0x2a1a10));
    casier.position.set(l * 0.25, 0.18, p * 0.3);
    g.add(casier);
    for (let k = 0; k < 8; k++) {
      const b = cylindre(0.018, 0.018, 0.12, mat(0x3a1a2a, { roughness: 0.2 }), 8);
      b.rotation.x = Math.PI / 2;
      b.position.set(l * 0.25 - 0.18 + (k % 4) * 0.12, 0.1 + Math.floor(k / 4) * 0.14, p * 0.3 + 0.04);
      g.add(b);
    }
  },
  cuisine(g, l, p) {
    const plan = boite(l * 0.8, 0.22, 0.2, mat(0xd8cfbf, { roughness: 0.4 }));
    plan.position.set(0, 0.11, -p / 2 + 0.14);
    const fourneau = boite(0.3, 0.24, 0.24, mat(0x1a1a1a, { roughness: 0.3, metalness: 0.6 }));
    fourneau.position.set(-l * 0.25, 0.12, p * 0.15);
    const feu = new THREE.Mesh(new THREE.CircleGeometry(0.05, 16), lueur(0xff4a1a, 2));
    feu.rotation.x = -Math.PI / 2;
    feu.position.set(-l * 0.25, 0.245, p * 0.15);
    const marmite = cylindre(0.06, 0.06, 0.08, LAITON());
    marmite.position.set(l * 0.15, 0.26, -p / 2 + 0.14);
    g.add(plan, fourneau, feu, marmite);
  },
  veranda(g, l, p) {
    const osier = mat(0xb08a52, { roughness: 0.9 });
    [-0.3, 0, 0.3].forEach((f) => { const c = cylindre(0.09, 0.07, 0.14, osier); c.position.set(f * l, 0.07, 0); g.add(c); });
    const plante = new THREE.Mesh(new THREE.IcosahedronGeometry(0.15, 1), mat(0x3f7a2f, { roughness: 0.8 }));
    plante.position.set(l * 0.42, 0.18, -p * 0.2);
    g.add(plante);
  },
  bureau(g, l, p) {
    const table = boite(0.5, 0.04, 0.28, materiauNoyer(0x3b2618));
    table.position.set(0, 0.2, -p * 0.1);
    [-1, 1].forEach((s) => [-1, 1].forEach((t) => {
      const pied = boite(0.03, 0.2, 0.03, materiauNoyer(0x2a1a10));
      pied.position.set(s * 0.22, 0.1, -p * 0.1 + t * 0.11);
      g.add(pied);
    }));
    const lampe = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 8), lueur(0x9fe08a, 1.6));
    lampe.position.set(0.16, 0.27, -p * 0.1);
    const chaise = boite(0.16, 0.14, 0.16, mat(0x6e1f2a));
    chaise.position.set(0, 0.07, p * 0.15);
    g.add(table, lampe, chaise);
  },
};
function mobilierGenerique(g, l, p) {
  const tapis = boite(l * 0.5, 0.005, p * 0.5, mat(0x5a1a22, { roughness: 0.9 }));
  tapis.position.y = 0.003;
  const table = cylindre(0.12, 0.12, 0.16, materiauNoyer());
  table.position.y = 0.08;
  g.add(tapis, table);
}
// Sols : parquet par défaut, carrelage, damier de bal, tapis de couloir...
function solDe(id, l, p) {
  const repeter = (tex, n) => { tex.repeat.set(Math.max(1, l * n), Math.max(1, p * n)); return tex; };
  switch (id) {
    case 'serre': return new THREE.MeshStandardMaterial({ map: repeter(textureCarreaux('#3e5a48', '#35503f', 4), 0.8), roughness: 0.85 });
    case 'cuisine': return new THREE.MeshStandardMaterial({ map: repeter(textureCarreaux('#d3cbbb', '#c4bba9', 4), 0.9), roughness: 0.45 });
    case 'cave': return new THREE.MeshStandardMaterial({ map: repeter(textureCarreaux('#4a423c', '#3e3732', 3), 0.7), roughness: 1 });
    case 'salle_de_bal': return new THREE.MeshStandardMaterial({ map: textureDamier('#e8dcc2', '#1c1414', 8), roughness: 0.3 });
    case 'couloir': return mat(0x5a1a22, { roughness: 0.95 });
    default: {
      const tex = textureBois('#5a3a22', 1);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(Math.max(1, l * 0.8), Math.max(1, p * 0.8));
      return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55 });
    }
  }
}

// =====================================================================
export function creerManoir3D(conteneur, pack, { surAppui } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  conteneur.appendChild(renderer.domElement);

  const accent = new THREE.Color((pack.palette && pack.palette.accent) || '#c9a24a');
  const scene = new THREE.Scene();
  preparerAmbiance(renderer, scene, { accent });
  scene.background = new THREE.Color((pack.palette && pack.palette.fond) || '#1a0b0e');
  const soleil = new THREE.DirectionalLight(0xfff0dc, 1.25);
  soleil.position.set(3, 7, 4);
  scene.add(soleil);
  scene.add(new THREE.AmbientLight(0xfff4e6, 0.35));

  const plan = pack.plan;
  const [vx, vy, vw, vh] = plan.vue.split(' ').map(Number);
  const cx = vx + vw / 2, cz = vy + vh / 2;
  const X = (x) => (x - cx) * ECHELLE, Z = (y) => (y - cz) * ECHELLE;

  // Toutes les surfaces au sol : pièces (cliquables) et couloirs.
  const surfaces = {};
  Object.entries(plan.zones).forEach(([id, r]) => { surfaces[id] = { id, r, piece: true }; });
  Object.entries(plan.couloirs || {}).forEach(([id, r]) => { surfaces[id] = { id, r, piece: false }; });

  // Terrain autour de la maison, et dalle sous la maison
  const terrain = boite(vw * ECHELLE + 2.4, 0.04, vh * ECHELLE + 2.4, mat(0x14251b, { roughness: 1 }));
  terrain.position.y = -0.04;
  scene.add(terrain);
  const dalle = boite(vw * ECHELLE + 0.24, 0.06, vh * ECHELLE + 0.24, mat(0x2a2422, { roughness: 0.9 }));
  dalle.position.y = -0.02;
  scene.add(dalle);

  // --- sols et mobilier ---
  const pieces = {};
  const sols = [];
  Object.values(surfaces).forEach((sf) => {
    const [x, y, w, h] = sf.r;
    const l = w * ECHELLE, p = h * ECHELLE;
    const centre = new THREE.Vector3(X(x + w / 2), 0, Z(y + h / 2));
    const g = new THREE.Group();
    g.position.copy(centre);
    const sol = boite(l, 0.02, p, solDe(sf.id, l, p));
    sol.position.y = 0.01;
    sol.userData.lieu = sf.id;
    g.add(sol);
    scene.add(g);
    if (!sf.piece) { pieces[sf.id] = { centre, l, p, ouvert: true, couloir: true }; return; }
    sols.push(sol);
    const meubles = new THREE.Group();
    meubles.position.y = 0.02;
    (MOBILIER[sf.id] || mobilierGenerique)(meubles, l - EP_INT * 2, p - EP_INT * 2);
    g.add(meubles);
    const halo = boite(l - 0.04, 0.006, p - 0.04, new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, depthWrite: false }));
    halo.position.y = 0.026;
    g.add(halo);
    const lieu = pack.lieux.find((x2) => x2.id === sf.id) || { nom: sf.id };
    const etiquette = texteSprite((lieu.icone ? lieu.icone + ' ' : '') + lieu.nom);
    etiquette.position.set(0, HAUT_MUR + 0.32, 0);
    g.add(etiquette);
    pieces[sf.id] = { centre, l, p, halo, meubles, etiquette, ouvert: true };
  });

  // --- murs : tronçons de 10 unités, partagés entre pièces voisines ---
  // Un tronçon est identifié par sa position ; deux pièces qui se touchent
  // produisent le même tronçon, compté une seule fois.
  const troncons = new Map();   // "h:x:y" ou "v:x:y" -> { sens, x, y, ext }
  const ajouter = (sens, x, y) => {
    const ext = sens === 'h' ? (y === vy || y === vy + vh) : (x === vx || x === vx + vw);
    troncons.set(`${sens}:${x}:${y}`, { sens, x, y, ext });
  };
  Object.values(surfaces).forEach(({ r: [x, y, w, h] }) => {
    for (let i = x; i < x + w; i += PAS) { ajouter('h', i, y); ajouter('h', i, y + h); }
    for (let j = y; j < y + h; j += PAS) { ajouter('v', x, j); ajouter('v', x + w, j); }
  });
  // Portes : au milieu du mur commun à deux surfaces.
  const portes = [];
  (plan.portes || []).forEach(([a, b]) => {
    const [ax, ay, aw, ah] = surfaces[a].r, [bx, by, bw, bh] = surfaces[b].r;
    let sens, fixe, debut, fin;
    if (ay + ah === by || by + bh === ay) { sens = 'h'; fixe = ay + ah === by ? by : ay; debut = Math.max(ax, bx); fin = Math.min(ax + aw, bx + bw); }
    else { sens = 'v'; fixe = ax + aw === bx ? bx : ax; debut = Math.max(ay, by); fin = Math.min(ay + ah, by + bh); }
    if (fin - debut < LARG_PORTE * PAS) return;
    const milieu = Math.round((debut + fin) / 2 / PAS) * PAS;
    const premier = milieu - Math.floor(LARG_PORTE / 2) * PAS;
    for (let k = 0; k < LARG_PORTE; k++) troncons.delete(sens === 'h' ? `h:${premier + k * PAS}:${fixe}` : `v:${fixe}:${premier + k * PAS}`);
    const pos = sens === 'h' ? new THREE.Vector3(X(milieu), 0, Z(fixe)) : new THREE.Vector3(X(fixe), 0, Z(milieu));
    portes.push({ a, b, sens, pos, premier, fixe });
  });

  const matMur = mat(0xece4d4, { roughness: 0.85 });
  const matDessus = mat(0x2b2523, { roughness: 0.7 });
  const matVitre = new THREE.MeshPhysicalMaterial({ color: 0x9fc4d8, transparent: true, opacity: 0.35, roughness: 0.05 });
  const matCadre = mat(0x1e1a18, { roughness: 0.5 });
  const murs = new THREE.Group();
  // Regroupe les tronçons alignés et consécutifs en un seul pan de mur.
  const lignes = {};
  troncons.forEach((t) => {
    const cle = t.sens + ':' + (t.sens === 'h' ? t.y : t.x) + ':' + (t.ext ? 1 : 0);
    (lignes[cle] = lignes[cle] || []).push(t.sens === 'h' ? t.x : t.y);
  });
  Object.entries(lignes).forEach(([cle, positions]) => {
    const [sens, fixeS, extS] = cle.split(':');
    const fixe = Number(fixeS), ext = extS === '1';
    positions.sort((a, b) => a - b);
    let debut = positions[0], prec = positions[0];
    const pans = [];
    positions.slice(1).concat([null]).forEach((pos) => {
      if (pos !== null && pos === prec + PAS) { prec = pos; return; }
      pans.push([debut, prec + PAS]);
      if (pos !== null) { debut = pos; prec = pos; }
    });
    pans.forEach(([a, b]) => {
      const longueur = (b - a) * ECHELLE + (ext ? EP_EXT : EP_INT);
      const ep = ext ? EP_EXT : EP_INT;
      const milieu = (a + b) / 2;
      const pose = (obj, y) => {
        if (sens === 'h') obj.position.set(X(milieu), y, Z(fixe));
        else { obj.position.set(X(fixe), y, Z(milieu)); obj.rotation.y = Math.PI / 2; }
        murs.add(obj);
      };
      // Fenêtre au milieu des longs pans de façade
      if (ext && b - a >= 60) {
        const lf = 0.36, bas = 0.2, haut = 0.5;
        const cote = (longueur - lf) / 2;
        const decal = lf / 2 + cote / 2;
        [-1, 1].forEach((s) => {
          const m = boite(cote, HAUT_MUR, ep, matMur);
          const g = new THREE.Group(); g.add(m); m.position.x = s * decal;
          pose(g, HAUT_MUR / 2);
        });
        const allege = boite(lf, bas, ep, matMur); const g1 = new THREE.Group(); g1.add(allege); pose(g1, bas / 2);
        const linteau = boite(lf, HAUT_MUR - haut, ep, matMur); const g2 = new THREE.Group(); g2.add(linteau); pose(g2, (HAUT_MUR + haut) / 2);
        const vitre = boite(lf, haut - bas, 0.01, matVitre); const g3 = new THREE.Group(); g3.add(vitre); pose(g3, (bas + haut) / 2);
        const cadre = boite(lf + 0.02, 0.02, ep + 0.02, matCadre); const g4 = new THREE.Group(); g4.add(cadre); pose(g4, bas);
      } else {
        pose(boite(longueur, HAUT_MUR, ep, matMur), HAUT_MUR / 2);
      }
      const dessus = boite(longueur, 0.012, ep + 0.004, matDessus);
      pose(dessus, HAUT_MUR + 0.006);
    });
  });
  // Battants de porte entrouverts et seuils
  const matPorte = materiauNoyer(0x2a1a10, 0.45);
  portes.forEach((po) => {
    const larg = LARG_PORTE * PAS * ECHELLE;
    const battant = boite(larg * 0.92, HAUT_MUR * 0.85, 0.025, matPorte);
    const charniere = new THREE.Group();
    battant.position.set(larg * 0.46, HAUT_MUR * 0.425, 0);
    charniere.add(battant);
    const poignee = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), LAITON());
    poignee.position.set(larg * 0.82, HAUT_MUR * 0.42, 0.025);
    charniere.add(poignee);
    if (po.sens === 'h') { charniere.position.set(po.pos.x - larg / 2, 0, po.pos.z); charniere.rotation.y = -1.1; }
    else { charniere.position.set(po.pos.x, 0, po.pos.z - larg / 2); charniere.rotation.y = Math.PI / 2 - 1.1; }
    murs.add(charniere);
    const seuil = boite(po.sens === 'h' ? larg : EP_INT, 0.025, po.sens === 'h' ? EP_INT : larg, mat(0x8a6a3a, { roughness: 0.5 }));
    seuil.position.set(po.pos.x, 0.012, po.pos.z);
    murs.add(seuil);
  });
  scene.add(murs);
  lisser(scene);

  // Caméra orientable : on tourne autour de la maison et on zoome, sans
  // passer sous le plancher ni trop loin.
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 80);
  const controles = new OrbitControls(camera, renderer.domElement);
  controles.target.set(0, 0.1, 0);
  controles.enableDamping = true;
  controles.dampingFactor = 0.12;
  controles.enablePan = false;
  controles.minPolarAngle = 0.25;
  controles.maxPolarAngle = 1.05;
  const DIRECTION = new THREE.Vector3(0.42, 0.78, 0.47).normalize();
  const rayonMaquette = Math.hypot(vw, vh) * ECHELLE / 2 + 0.2;
  function cadrer() {
    const demiV = THREE.MathUtils.degToRad(camera.fov / 2);
    const demiH = Math.atan(Math.tan(demiV) * camera.aspect);
    const d = rayonMaquette / Math.sin(Math.min(demiV, demiH));
    camera.position.copy(DIRECTION).multiplyScalar(d * 0.86);
    controles.maxDistance = d * 1.4;
    controles.minDistance = d * 0.3;
  }

  // --- personnages : promenades au hasard, en passant par les portes ---
  const voisins = {};
  portes.forEach((po) => {
    (voisins[po.a] = voisins[po.a] || []).push({ vers: po.b, porte: po });
    (voisins[po.b] = voisins[po.b] || []).push({ vers: po.a, porte: po });
  });
  function chemin(depart, arrivee) {
    // Plus court chemin de pièce en pièce (parcours en largeur).
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
    return new THREE.Vector3(pc.centre.x + (Math.random() - 0.5) * (pc.l - 0.45), 0.02, pc.centre.z + (Math.random() - 0.5) * (pc.p - 0.45));
  }
  const piecesOuvertes = () => Object.keys(pieces).filter((id) => pieces[id].ouvert && !pieces[id].couloir);
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
      const badge = texteSprite((icone ? icone + ' ' : '') + nom, { taille: 40, hauteur: 0.22, police: 'Outfit, system-ui, sans-serif', poids: 600 });
      badge.position.y = 0.5;
      g.add(badge);
      const ouvertes = piecesOuvertes();
      const salle = ouvertes[Math.floor(Math.random() * ouvertes.length)];
      g.position.copy(pointDans(salle));
      lisser(g);
      scene.add(g);
      persos.set(nom, { groupe: g, salle, etapes: [], pause: Math.random() * 3, phase: Math.random() * 6 });
    });
    [...persos.keys()].forEach((nom) => { if (!vus.has(nom)) { scene.remove(persos.get(nom).groupe); persos.delete(nom); } });
    demanderImage();
  }
  function partir(p) {
    const ouvertes = piecesOuvertes().filter((id) => id !== p.salle);
    const but = ouvertes[Math.floor(Math.random() * ouvertes.length)];
    const route = but && chemin(p.salle, but);
    p.etapes = [];
    (route || []).forEach(({ porte, vers }) => {
      // On s'aligne face à la porte, on la franchit, puis on entre.
      const avant = porte.pos.clone(), apres = porte.pos.clone();
      const d = 0.18;
      const ctr = pieces[vers].centre;
      if (porte.sens === 'h') { avant.z -= Math.sign(ctr.z - porte.pos.z) * d; apres.z += Math.sign(ctr.z - porte.pos.z) * d; }
      else { avant.x -= Math.sign(ctr.x - porte.pos.x) * d; apres.x += Math.sign(ctr.x - porte.pos.x) * d; }
      p.etapes.push({ point: avant.setY(0.02) }, { point: apres.setY(0.02), salle: vers });
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
          if (!p.etapes.length) { p.pause = 2 + Math.random() * 5; corps.position.y = 0; }
          return;
        }
        d.normalize();
        p.groupe.position.addScaledVector(d, Math.min(dist, VITESSE * dt));
        corps.rotation.y = Math.atan2(d.x, d.z);
        corps.position.y = Math.abs(Math.sin(p.phase)) * 0.022;   // petits pas
      } else {
        p.pause -= dt;
        if (p.pause <= 0) partir(p);
      }
    });
  }

  // --- états du carnet : inconnu, éliminé, suspect ; pièce fermée ; crime ---
  let crime = null;
  function majEtats(etats, ouverts, lieuCrime) {
    crime = lieuCrime || null;
    Object.entries(pieces).forEach(([id, pc]) => {
      if (pc.couloir) return;
      pc.ouvert = ouverts.includes(id);
      const e = etats[id] || '';
      const halo = pc.halo.material;
      pc.meubles.visible = pc.ouvert;
      pc.etiquette.material.opacity = pc.ouvert ? 1 : 0.35;
      if (!pc.ouvert) { halo.color.set(0x000000); halo.opacity = 0.72; }
      else if (crime) { halo.color.set(crime === id ? 0xb3261e : 0x000000); halo.opacity = 0.55; }
      else if (e === 'elimine') { halo.color.set(0x000000); halo.opacity = 0.6; }
      else if (e === 'suspect') { halo.color.set(0xb3261e); halo.opacity = 0.45; }
      else halo.opacity = 0;
    });
    demanderImage();
  }

  // --- appui sur une pièce (un appui bref, pas un glissé de caméra) ---
  const rayon = new THREE.Raycaster();
  let depart = null;
  renderer.domElement.addEventListener('pointerdown', (e) => { depart = { x: e.clientX, y: e.clientY, t: Date.now() }; });
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!depart || !surAppui) return;
    const bouge = Math.hypot(e.clientX - depart.x, e.clientY - depart.y);
    if (bouge > 8 || Date.now() - depart.t > 500) return;
    const r = renderer.domElement.getBoundingClientRect();
    rayon.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
    const touche = rayon.intersectObjects(sols, false)[0];
    if (touche && pieces[touche.object.userData.lieu].ouvert) surAppui(touche.object.userData.lieu);
  });

  // --- boucle de rendu sobre ---
  let actif = false, demande = false, dernier = 0, raf = null, cadree = false;
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
      if (crime && pieces[crime]) pieces[crime].halo.material.opacity = 0.35 + 0.25 * Math.sin(t / 300);
      controles.update();
      renderer.render(scene, camera);
      demande = false;
    }
    // Les personnages bougent en continu : on garde la boucle tant que le
    // plan est visible (à 30 images/s au plus).
    if (persos.size || demande || crime) raf = requestAnimationFrame(boucle);
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
