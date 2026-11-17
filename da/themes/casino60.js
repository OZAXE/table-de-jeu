// =====================================================================
// Thème « Grand casino des années 60 » (Casino) : moquette à motifs
// rouge et or, lambris d'acajou à filets dorés, colonnes, rideaux de
// velours, rangée de machines à sous qui clignotent, enseigne à ampoules
// au nom du jeu, lustres de cristal. Table au feutre vert bordée d'or et
// de cuir, fauteuils de velours rouge.
//
// Version légère : pas de reflets calculés, ampoules et machines fixes,
// moins de machines, un seul lustre.
// =====================================================================
import * as THREE from 'three';
import {
  aleatoire, texture, mat, lueur, veinage, grain, ambiance, ombreAuSol, dessinerEtiquetteTheme, quandPolices,
} from './outils.js';

export const FOND = 0x0d0806;
export const POLICE_TITRE = "Limelight, Georgia, serif";
export const POLICE_TEXTE = "'Josefin Sans', 'Segoe UI', system-ui, sans-serif";
export const quandPolicesCasino = (fn) => quandPolices(['48px Limelight', '600 48px "Josefin Sans"'], fn);
const OR = 0xd4af37;

export function preparerAmbianceCasino(renderer, scene, { leger = false } = {}) {
  ambiance(renderer, scene, { fond: FOND, ciel: 0x5a3a22, sol: 0x1a0806, intensite: 0.65, leger });
}

// --- Table : feutre vert, filet d'or, rebord de cuir, pied colonne ---
export function creerTableCasino(rayon, { rayonFeutre = rayon - 0.28, leger = false } = {}) {
  const groupe = new THREE.Group();
  const acajou = mat(0xffffff, { map: texture(veinage('#4a1e12', 41), 512, 512), roughness: 0.35 });
  const plateau = new THREE.Mesh(new THREE.CylinderGeometry(rayon, rayon, 0.1, 96), acajou);
  plateau.position.y = -0.05;
  plateau.receiveShadow = true;
  const feutre = new THREE.Mesh(new THREE.CylinderGeometry(rayonFeutre, rayonFeutre, 0.012, 96), mat(0xffffff, {
    roughness: 0.92,
    map: texture((ctx, L) => {
      grain('#0e4a2c', { intensite: 0.06, nb: 6000, graine: 3 })(ctx, L, L);
      const g = ctx.createRadialGradient(L / 2, L / 2, L * 0.1, L / 2, L / 2, L / 2);
      g.addColorStop(0, 'rgba(255,255,255,0.07)'); g.addColorStop(1, 'rgba(0,0,0,0.4)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, L, L);
      ctx.strokeStyle = 'rgba(212,175,55,0.45)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(L / 2, L / 2, L / 2 - 18, 0, Math.PI * 2); ctx.stroke();
    }, 512),
  }));
  feutre.position.y = 0.006;
  feutre.receiveShadow = true;
  const orMat = mat(OR, { metalness: 0.9, roughness: 0.25 });
  const filet = new THREE.Mesh(new THREE.TorusGeometry(rayonFeutre, 0.016, 8, 128), orMat);
  filet.rotation.x = Math.PI / 2; filet.position.y = 0.012;
  const rebord = new THREE.Mesh(new THREE.TorusGeometry(rayon - 0.06, 0.075, 14, 128), mat(0x2a120a, { roughness: 0.4 }));
  rebord.rotation.x = Math.PI / 2; rebord.position.y = 0.05;
  rebord.castShadow = !leger;
  const jonc = new THREE.Mesh(new THREE.TorusGeometry(rayon + 0.005, 0.02, 8, 128), orMat);
  jonc.rotation.x = Math.PI / 2; jonc.position.y = -0.06;
  const colonne = new THREE.Mesh(new THREE.LatheGeometry([
    new THREE.Vector2(0, 0), new THREE.Vector2(0.6, 0), new THREE.Vector2(0.55, 0.08), new THREE.Vector2(0.24, 0.2),
    new THREE.Vector2(0.18, 0.6), new THREE.Vector2(0.24, 0.95), new THREE.Vector2(0.5, 1.1), new THREE.Vector2(0, 1.1),
  ], 32), acajou);
  colonne.position.y = -1.2;
  groupe.add(plateau, feutre, filet, rebord, jonc, colonne, ombreAuSol(rayon * 1.35, -1.2));
  return { groupe, feutre };
}

// --- Fauteuil de velours rouge ---
let MAT_VELOURS = null, MAT_BOIS = null;
export function creerFauteuilCasino(dir, rayon = 2.45, solY = -1.2) {
  if (!MAT_VELOURS) {
    MAT_VELOURS = mat(0xffffff, { map: texture(grain('#7a1020', { intensite: 0.1, graine: 22, nb: 1500 }), 128), roughness: 0.75 });
    MAT_BOIS = mat(0x3a160c, { roughness: 0.4 });
  }
  const c = new THREE.Group();
  const h = 0.7;
  const assise = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.14, 0.55), MAT_VELOURS);
  assise.position.y = h;
  const dossier = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.62, 0.12), MAT_VELOURS);
  dossier.position.set(0, h + 0.36, 0.26);
  c.add(assise, dossier);
  for (const x of [-0.3, 0.3]) {
    const accoudoir = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.08, 0.5), MAT_BOIS);
    accoudoir.position.set(x, h + 0.22, 0.02);
    c.add(accoudoir);
    for (const z of [-0.22, 0.22]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.02, h, 8), MAT_BOIS);
      p.position.set(x * 0.9, h / 2, z);
      c.add(p);
    }
  }
  c.position.set(dir.x * rayon, solY, dir.z * rayon);
  c.rotation.y = Math.atan2(dir.x, dir.z);
  return c;
}

// --- Étiquettes : plaque noire, filet et lettres d'or ---
export function dessinerEtiquetteCasino(ctx, texte, etat) {
  dessinerEtiquetteTheme(ctx, texte, etat, {
    police: POLICE_TEXTE, graisse: 700, rayon: 0.5,
    fond: ['#1c120c', '#0a0605'], fondActif: ['#e6c45a', '#a8841f'],
    bord: 'rgba(212,175,55,0.8)', bordActif: '#fff3c4', texte: '#f3e3b0', texteActif: '#1a1206',
  });
}

// --- Le décor ---
export function creerDecorCasino(scene, { nom = '', solY = -1.2, leger = false } = {}) {
  const decor = new THREE.Group();
  const r = aleatoire(61);
  const Z_MUR = -6.4;
  const orMat = mat(OR, { metalness: 0.9, roughness: 0.28 });

  // Moquette à motifs (losanges rouge et or).
  const moquette = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), mat(0xffffff, {
    roughness: 0.95,
    map: texture((ctx, L) => {
      ctx.fillStyle = '#5a0c14'; ctx.fillRect(0, 0, L, L);
      const p = L / 4;
      for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) {
        const x = i * p, y = j * p;
        ctx.strokeStyle = 'rgba(212,175,55,0.55)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(x, y - p / 2); ctx.lineTo(x + p / 2, y); ctx.lineTo(x, y + p / 2); ctx.lineTo(x - p / 2, y); ctx.closePath(); ctx.stroke();
        ctx.fillStyle = 'rgba(20,40,30,0.7)'; ctx.beginPath(); ctx.arc(x, y, p * 0.12, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(212,175,55,0.4)'; ctx.beginPath(); ctx.arc(x + p / 2, y + p / 2, p * 0.05, 0, Math.PI * 2); ctx.fill();
      }
      const rr = aleatoire(5);
      for (let k = 0; k < 3000; k++) { ctx.fillStyle = `rgba(0,0,0,${rr() * 0.12})`; ctx.fillRect(rr() * L, rr() * L, 2, 2); }
    }, 256, 256, [14, 14]),
  }));
  moquette.rotation.x = -Math.PI / 2;
  moquette.position.y = solY;
  decor.add(moquette);

  // Lambris d'acajou à filets dorés, tenture bordeaux au-dessus.
  const murTex = texture((ctx, L, H) => {
    ctx.fillStyle = '#3a0c12'; ctx.fillRect(0, 0, L, H);
    // Tenture damassée (motif en fleurs de lys simplifiées)
    ctx.fillStyle = 'rgba(212,175,55,0.08)';
    for (let x = 0; x < L; x += 64) for (let y = 0; y < H * 0.55; y += 64) {
      ctx.beginPath(); ctx.ellipse(x + 32 + (y / 64 % 2) * 32, y + 32, 10, 20, 0, 0, Math.PI * 2); ctx.fill();
    }
    // Lambris
    veinage('#3a160c', 12)(ctx, L, H);
    ctx.globalCompositeOperation = 'destination-over';
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#3a0c12'; ctx.fillRect(0, 0, L, H * 0.55);
    ctx.fillStyle = 'rgba(212,175,55,0.08)';
    for (let x = 0; x < L; x += 64) for (let y = 0; y < H * 0.55; y += 64) { ctx.beginPath(); ctx.ellipse(x + 32 + (y / 64 % 2) * 32, y + 32, 10, 20, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#d4af37'; ctx.fillRect(0, H * 0.55, L, 6);
    ctx.strokeStyle = 'rgba(212,175,55,0.6)'; ctx.lineWidth = 3;
    for (let x = 16; x < L; x += 128) ctx.strokeRect(x, H * 0.62, 96, H * 0.3);
  }, 512, 512, [4, 1]);
  const mur = new THREE.Mesh(new THREE.PlaneGeometry(26, 8), mat(0xffffff, { map: murTex, roughness: 0.6 }));
  mur.position.set(0, solY + 4, Z_MUR);
  decor.add(mur);
  for (const cote of [-1, 1]) {
    const lat = new THREE.Mesh(new THREE.PlaneGeometry(16, 8), mat(0xffffff, { map: murTex, roughness: 0.6 }));
    lat.rotation.y = -cote * Math.PI / 2;
    lat.position.set(cote * 9, solY + 4, -1);
    decor.add(lat);
  }

  // Colonnes dorées.
  for (const x of [-6.2, -2.4, 2.4, 6.2]) {
    const fut = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 5.4, 20), mat(0x2a0e08, { roughness: 0.35 }));
    fut.position.set(x, solY + 2.7, Z_MUR + 0.35);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.36, 0.25, 20), orMat);
    base.position.set(x, solY + 0.12, Z_MUR + 0.35);
    const chapiteau = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.26, 0.3, 20), orMat);
    chapiteau.position.set(x, solY + 5.4, Z_MUR + 0.35);
    decor.add(fut, base, chapiteau);
    for (const y of [1.6, 3.4]) {
      const bague = new THREE.Mesh(new THREE.TorusGeometry(0.235, 0.025, 6, 24), orMat);
      bague.rotation.x = Math.PI / 2; bague.position.set(x, solY + y, Z_MUR + 0.35);
      decor.add(bague);
    }
  }

  // Rideaux de velours aux deux bouts, retenus par une embrasse dorée.
  const veloursTex = texture((ctx, L, H) => {
    for (let x = 0; x < L; x++) {
      const v = 0.55 + Math.sin(x / L * Math.PI * 14) * 0.3;
      ctx.fillStyle = `rgb(${Math.round(130 * v)},${Math.round(14 * v)},${Math.round(26 * v)})`; ctx.fillRect(x, 0, 1, H);
    }
  }, 256, 64);
  for (const x of [-7.6, 7.6]) {
    const rideau = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 6), mat(0xffffff, { map: veloursTex, roughness: 0.85, side: THREE.DoubleSide }));
    rideau.position.set(x, solY + 3, Z_MUR + 0.6);
    const embrasse = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.04, 6, 20), orMat);
    embrasse.position.set(x, solY + 1.8, Z_MUR + 0.7);
    decor.add(rideau, embrasse);
  }

  // Machines à sous en rangée contre le mur, écrans et ampoules qui clignotent.
  const machines = [];
  const caisseMat = mat(0x6a1018, { metalness: 0.4, roughness: 0.35 });
  const chromeMat = mat(0xd8dde0, { metalness: 0.95, roughness: 0.2 });
  const symboles = ['7', '🍒', '🔔', 'BAR', '🍋', '💎'];
  const xs = leger ? [-4.2, 4.2] : [-4.6, -3.7, 3.7, 4.6];
  xs.forEach((x, k) => {
    const m = new THREE.Group();
    const corps = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.6, 0.6), caisseMat);
    corps.position.y = 0.8;
    const fronton = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.35, 0.62), chromeMat);
    fronton.position.y = 1.78;
    const ecranCanvas = document.createElement('canvas');
    ecranCanvas.width = 256; ecranCanvas.height = 96;
    const ecranTex = new THREE.CanvasTexture(ecranCanvas);
    ecranTex.colorSpace = THREE.SRGBColorSpace;
    const ecran = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.24), new THREE.MeshBasicMaterial({ map: ecranTex }));
    ecran.position.set(0, 1.18, 0.31);
    const levier = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.45, 8), chromeMat);
    levier.position.set(0.42, 1.2, 0.05);
    const boule = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), mat(0xc4101c, { roughness: 0.3 }));
    boule.position.set(0.42, 1.44, 0.05);
    const lampes = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.06, 0.02), lueur(0xffd27a, 1.8));
    lampes.position.set(0, 1.68, 0.32);
    m.add(corps, fronton, ecran, levier, boule, lampes);
    m.position.set(x, solY, Z_MUR + 0.9);
    decor.add(m);
    const dessiner = () => {
      const ctx = ecranCanvas.getContext('2d');
      ctx.fillStyle = '#f5ecd6'; ctx.fillRect(0, 0, 256, 96);
      ctx.fillStyle = '#1a1206'; ctx.font = '52px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (let c = 0; c < 3; c++) {
        const s = symboles[Math.floor(Math.random() * symboles.length)];
        ctx.font = s.length > 1 && s !== 'BAR' ? '52px serif' : `800 48px ${POLICE_TEXTE}`;
        ctx.fillStyle = s === '7' ? '#c4101c' : '#1a1206';
        ctx.fillText(s, 43 + c * 85, 52);
        if (c) { ctx.fillStyle = '#b0a080'; ctx.fillRect(c * 85, 6, 2, 84); }
      }
      ecranTex.needsUpdate = true;
    };
    dessiner();
    machines.push({ dessiner, lampes, phase: k * 0.7 });
  });

  // Enseigne à ampoules au nom du jeu.
  const enseigneCanvas = document.createElement('canvas');
  enseigneCanvas.width = 1024; enseigneCanvas.height = 256;
  const enseigneTex = new THREE.CanvasTexture(enseigneCanvas);
  enseigneTex.colorSpace = THREE.SRGBColorSpace;
  const dessinerEnseigne = (allume) => {
    const ctx = enseigneCanvas.getContext('2d');
    ctx.fillStyle = '#140a06'; ctx.fillRect(0, 0, 1024, 256);
    ctx.strokeStyle = '#d4af37'; ctx.lineWidth = 8; ctx.strokeRect(10, 10, 1004, 236);
    for (let k = 0; k < 40; k++) {
      const x = 30 + k * 24.6;
      for (const y of [28, 228]) {
        ctx.fillStyle = (k + (allume ? 1 : 0)) % 2 ? '#ffe9a8' : '#7a5a20';
        ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `150px ${POLICE_TITRE}`;
    ctx.shadowColor = '#ffcf5a'; ctx.shadowBlur = 24;
    ctx.fillStyle = '#ffe9a8';
    ctx.fillText(nom, 512, 132, 900);
    ctx.shadowBlur = 0;
    enseigneTex.needsUpdate = true;
  };
  dessinerEnseigne(true);
  quandPolicesCasino(() => dessinerEnseigne(true));
  const enseigne = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.05), new THREE.MeshBasicMaterial({ map: enseigneTex }));
  enseigne.position.set(0, solY + 4.6, Z_MUR + 0.5);
  decor.add(enseigne);

  // Lustres de cristal : couronnes de pampilles lumineuses.
  const lustres = [];
  const cristal = lueur(0xfff1d0, 1.6);
  for (const [x, z] of (leger ? [[0, -0.8]] : [[0, -0.8], [-4.5, -3.2], [4.5, -3.2]])) {
    const l = new THREE.Group();
    for (const [rayonC, y, nb] of [[0.55, 0, 14], [0.35, -0.2, 10], [0.15, -0.38, 6]]) {
      const anneau = new THREE.Mesh(new THREE.TorusGeometry(rayonC, 0.015, 6, 32), orMat);
      anneau.rotation.x = Math.PI / 2; anneau.position.y = y;
      l.add(anneau);
      for (let k = 0; k < nb; k++) {
        const a = k / nb * Math.PI * 2;
        const p = new THREE.Mesh(new THREE.OctahedronGeometry(0.04, 0), cristal);
        p.position.set(Math.cos(a) * rayonC, y - 0.06, Math.sin(a) * rayonC);
        p.scale.y = 1.6;
        l.add(p);
      }
    }
    const tige = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.4, 6), orMat);
    tige.position.y = 0.7;
    l.add(tige);
    l.position.set(x, x === 0 ? 3.4 : 3.6, z);
    decor.add(l);
    lustres.push(l);
  }
  const lumiere = new THREE.PointLight(0xffe2b0, 1.9, 8, 1.6);
  lumiere.position.set(0, 2.9, -0.6);
  decor.add(lumiere);

  scene.add(decor);

  let dernier = -1;
  function animer(t) {
    if (leger) return;
    const pas = Math.floor(t * 2);
    if (pas !== dernier) {
      dernier = pas;
      dessinerEnseigne(pas % 2 === 0);
      machines.forEach((m, k) => { if ((pas + k) % 3 === 0) m.dessiner(); });
    }
    machines.forEach(m => { m.lampes.material.color.setScalar(1.2 + Math.sin(t * 6 + m.phase) * 0.6); });
    lustres.forEach((l, k) => { l.rotation.y = Math.sin(t * 0.2 + k) * 0.05; });
  }
  return { decor, animer, lumiere };
}
