// =====================================================================
// Thème « Veillée » (Loup-Garou) : la place d'un hameau en pleine nuit.
// Grande table ronde en vieux chêne au milieu de l'herbe, une lanterne qui
// vacille au centre, une bougie devant chaque joueur (éteinte quand il
// meurt), des chaumières aux fenêtres allumées, une forêt de sapins tout
// autour, la pleine lune, et des yeux rouges qui clignent entre les arbres.
// Le panneau « Avis du village » tient lieu d'écran (ecrireEcran).
// regler(k) passe de la nuit (k = 1) au petit matin (k = 0) en douceur.
//
// Version légère : pas de reflets calculés, moins d'arbres et d'étoiles.
// =====================================================================
import * as THREE from 'three';
import { aleatoire, texture, mat, lueur, veinage, grain, planches, ambiance, ombreAuSol, dessinerEtiquetteTheme, quandPolices } from './outils.js';

export const FOND_NUIT = 0x060a18;
export const FOND_JOUR = 0x5a7aa8;
export const POLICE_TITRE = "Cinzel, 'Times New Roman', serif";
export const POLICE_TEXTE = "Outfit, 'Segoe UI', system-ui, sans-serif";
export const AMBRE = 0xffb347;
export const SANG = 0xe0413a;
export const LUNE = 0xcfe0ff;
export const quandPolicesVeillee = (fn) => quandPolices(['700 48px Cinzel', '700 48px Outfit'], fn);

let hemi = null;
export function preparerAmbianceVeillee(renderer, scene, { leger = false } = {}) {
  ambiance(renderer, scene, { fond: FOND_NUIT, ciel: 0x4a5a9a, sol: 0x0a0c10, intensite: 0.5, leger });
  scene.traverse(o => { if (o.isHemisphereLight) hemi = o; });
}

// --- Table ronde en vieux chêne, lanterne au centre ---
export function creerTableVeillee(rayon, { rayonFeutre = rayon - 0.22, leger = false } = {}) {
  const groupe = new THREE.Group();
  const chene = mat(0xffffff, { map: texture(veinage('#5a3a22', 11), 512, 512, [2, 2]), roughness: 0.75 });
  const plateau = new THREE.Mesh(new THREE.CylinderGeometry(rayon, rayon * 0.97, 0.12, 64), chene);
  plateau.position.y = -0.06;
  plateau.receiveShadow = true;
  plateau.castShadow = !leger;
  // Dessus : planches usées et une rosace gravée.
  const dessus = new THREE.Mesh(new THREE.CylinderGeometry(rayonFeutre, rayonFeutre, 0.01, 64), mat(0xffffff, {
    roughness: 0.8,
    map: texture((ctx, L) => {
      planches('#6b4428', { nb: 9, graine: 21, usure: 0.4 })(ctx, L, L);
      const c = L / 2;
      ctx.strokeStyle = 'rgba(30,16,6,0.55)'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(c, c, c * 0.3, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(c, c, c * 0.92, 0, Math.PI * 2); ctx.stroke();
      // Lune gravée au centre.
      ctx.fillStyle = 'rgba(30,16,6,0.4)';
      ctx.beginPath(); ctx.arc(c, c, c * 0.12, 0, Math.PI * 2); ctx.fill();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath(); ctx.arc(c + c * 0.05, c - c * 0.03, c * 0.1, 0, Math.PI * 2); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }, 512),
  }));
  dessus.position.y = 0.006;
  dessus.receiveShadow = true;
  const fer = mat(0x2a2622, { metalness: 0.7, roughness: 0.45 });
  const cerclage = new THREE.Mesh(new THREE.TorusGeometry(rayon + 0.005, 0.025, 8, 96), fer);
  cerclage.rotation.x = Math.PI / 2;
  cerclage.position.y = -0.03;
  const pied = new THREE.Mesh(new THREE.CylinderGeometry(rayon * 0.22, rayon * 0.32, 1.1, 16), chene);
  pied.position.y = -0.62;
  groupe.add(plateau, dessus, cerclage, pied, ombreAuSol(rayon * 1.4, -1.2));

  // Lanterne : cage de fer, verre ambré, flamme, lumière qui vacille.
  const lanterne = new THREE.Group();
  const socle = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.04, 6), fer);
  socle.position.y = 0.02;
  const verre = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.26, 6, 1, true), new THREE.MeshStandardMaterial({
    color: 0xffd08a, emissive: 0xff9a3a, emissiveIntensity: 0.9, transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
  verre.position.y = 0.17;
  const toit = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.12, 6), fer);
  toit.position.y = 0.36;
  const anneau = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.008, 6, 16), fer);
  anneau.position.y = 0.44;
  const flamme = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), lueur(0xffc060, 2.2));
  flamme.scale.y = 1.7;
  flamme.position.y = 0.15;
  lanterne.add(socle, verre, toit, anneau, flamme);
  for (let k = 0; k < 6; k++) {
    const a = k / 6 * Math.PI * 2;
    const barre = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.28, 0.012), fer);
    barre.position.set(Math.cos(a) * 0.1, 0.17, Math.sin(a) * 0.1);
    lanterne.add(barre);
  }
  const lumiere = new THREE.PointLight(0xffa04a, 2.4, 6, 1.5);
  lumiere.position.y = 0.2;
  lumiere.castShadow = !leger;
  if (!leger) lumiere.shadow.mapSize.set(512, 512);
  lanterne.add(lumiere);
  groupe.add(lanterne);
  return { groupe, feutre: dessus, lanterne: { groupe: lanterne, flamme, lumiere, verre } };
}

// --- Bougie devant chaque joueur : allumée tant qu'il vit ---
const GEO_CIRE = new THREE.CylinderGeometry(0.035, 0.038, 0.16, 14);
const GEO_FLAMME = new THREE.SphereGeometry(0.018, 8, 6);
const GEO_BOUGEOIR = new THREE.CylinderGeometry(0.07, 0.08, 0.02, 18);
let MAT_CIRE = null, MAT_BOUGEOIR = null;
export function creerBougie() {
  if (!MAT_CIRE) { MAT_CIRE = mat(0xf2e6cc, { roughness: 0.6 }); MAT_BOUGEOIR = mat(0x8a6a3a, { metalness: 0.8, roughness: 0.35 }); }
  const g = new THREE.Group();
  const bougeoir = new THREE.Mesh(GEO_BOUGEOIR, MAT_BOUGEOIR);
  bougeoir.position.y = 0.01;
  const cire = new THREE.Mesh(GEO_CIRE, MAT_CIRE);
  cire.position.y = 0.1;
  cire.castShadow = true;
  const flamme = new THREE.Mesh(GEO_FLAMME, lueur(0xffb040, 2.4));
  flamme.scale.y = 1.8;
  flamme.position.y = 0.205;
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX_HALO(), color: 0xffa040, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.scale.set(0.22, 0.22, 1);
  halo.position.y = 0.205;
  g.add(bougeoir, cire, flamme, halo);
  g.userData = { flamme, halo, allumee: true };
  return g;
}
export function allumerBougie(b, allumee) {
  b.userData.allumee = allumee;
  b.userData.flamme.visible = allumee;
  b.userData.halo.visible = allumee;
}

let texHalo = null;
function TEX_HALO() {
  if (!texHalo) {
    texHalo = texture((ctx, L) => {
      const g = ctx.createRadialGradient(L / 2, L / 2, 0, L / 2, L / 2, L / 2);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, L, L);
    }, 128);
  }
  return texHalo;
}

// --- Pierre tombale (un joueur mort) : dalle arrondie, gravée de son rôle ---
let MAT_PIERRE = null;
export function creerTombe(emoji) {
  if (!MAT_PIERRE) MAT_PIERRE = mat(0x8a8a90, { roughness: 0.95 });
  const g = new THREE.Group();
  const forme = new THREE.Shape();
  forme.moveTo(-0.11, 0); forme.lineTo(-0.11, 0.17); forme.absarc(0, 0.17, 0.11, Math.PI, 0, true); forme.lineTo(0.11, 0); forme.lineTo(-0.11, 0);
  const geo = new THREE.ExtrudeGeometry(forme, { depth: 0.04, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 2 });
  geo.translate(0, 0, -0.02);
  const dalle = new THREE.Mesh(geo, MAT_PIERRE);
  dalle.castShadow = true;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.15), new THREE.MeshBasicMaterial({
    transparent: true, depthWrite: false,
    map: texture((ctx, L) => {
      ctx.clearRect(0, 0, L, L);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `${L * 0.62}px serif`;
      ctx.fillText(emoji || '✝', L / 2, L / 2 + L * 0.04);
    }, 128),
  }));
  face.position.set(0, 0.17, 0.031);
  g.add(dalle, face);
  return g;
}

// --- Tabouret de bois rustique ---
let MAT_TABOURET = null;
export function creerTabouretVeillee(dir, rayon = 2.42, solY = -1.2) {
  if (!MAT_TABOURET) MAT_TABOURET = mat(0xffffff, { map: texture(veinage('#4a2e1a', 7), 256), roughness: 0.85 });
  const c = new THREE.Group();
  const h = 0.62;
  const assise = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.07, 20), MAT_TABOURET);
  assise.position.y = h;
  assise.castShadow = true;
  c.add(assise);
  for (let k = 0; k < 3; k++) {
    const a = k / 3 * Math.PI * 2;
    const pied = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, h, 8), MAT_TABOURET);
    pied.position.set(Math.cos(a) * 0.15, h / 2, Math.sin(a) * 0.15);
    pied.rotation.z = Math.cos(a) * 0.12;
    pied.rotation.x = -Math.sin(a) * 0.12;
    c.add(pied);
  }
  c.position.set(dir.x * rayon, solY, dir.z * rayon);
  return c;
}

// --- Étiquettes : parchemin, encre brune ; actif = cire rouge ---
export function dessinerEtiquetteVeillee(ctx, texte, etat) {
  dessinerEtiquetteTheme(ctx, texte, etat, {
    police: POLICE_TEXTE, graisse: 800, rayon: 0.3,
    fond: ['#f2e2bc', '#d9c08c'], fondActif: ['#c8382f', '#7c1712'],
    bord: '#6b4a24', bordActif: '#ffd9a0', texte: '#2a1a0a', texteActif: '#fff4e0',
  });
}

function couper(ctx, texte, largeur) {
  const mots = String(texte || '').split(/\s+/);
  const lignes = [];
  let ligne = '';
  mots.forEach(m => {
    const essai = ligne ? ligne + ' ' + m : m;
    if (ctx.measureText(essai).width > largeur && ligne) { lignes.push(ligne); ligne = m; } else ligne = essai;
  });
  if (ligne) lignes.push(ligne);
  return lignes;
}

// --- Le décor ---
export function creerDecorVeillee(scene, { nom = '', solY = -1.2, leger = false } = {}) {
  const decor = new THREE.Group();
  const r = aleatoire(31);

  // Sol : herbe sombre, chemin de terre battue autour de la table.
  const sol = new THREE.Mesh(new THREE.CircleGeometry(30, 64), mat(0xffffff, {
    roughness: 1, map: texture(grain('#1c2a1a', { intensite: 0.12, graine: 9, nb: 9000 }), 512, 512, [12, 12]),
  }));
  sol.rotation.x = -Math.PI / 2;
  sol.position.y = solY;
  sol.receiveShadow = true;
  decor.add(sol);
  const terre = new THREE.Mesh(new THREE.CircleGeometry(3.4, 64), mat(0xffffff, {
    roughness: 1, transparent: true,
    map: texture((ctx, L) => {
      grain('#3a2c1c', { intensite: 0.14, graine: 4, nb: 6000 })(ctx, L, L);
      // Bord fondu dans l'herbe.
      const g = ctx.createRadialGradient(L / 2, L / 2, L * 0.36, L / 2, L / 2, L / 2);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,1)');
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = g; ctx.fillRect(0, 0, L, L);
      ctx.globalCompositeOperation = 'source-over';
    }, 512),
  }));
  terre.rotation.x = -Math.PI / 2;
  terre.position.y = solY + 0.004;
  decor.add(terre);

  // Forêt de sapins tout autour (géométries partagées).
  const matSapin = mat(0x10241a, { roughness: 0.95 });
  const matTronc = mat(0x2a1a10, { roughness: 1 });
  const geoCone = [new THREE.ConeGeometry(0.9, 1.6, 8), new THREE.ConeGeometry(0.7, 1.3, 8), new THREE.ConeGeometry(0.48, 1.0, 8)];
  const geoTronc = new THREE.CylinderGeometry(0.12, 0.16, 0.7, 6);
  const nbArbres = leger ? 22 : 46;
  const arbres = [];
  for (let k = 0; k < nbArbres; k++) {
    const a = k / nbArbres * Math.PI * 2 + r() * 0.12;
    // Pas d'arbre droit derrière l'avis du village ni devant la caméra.
    const d = 8 + r() * 5.5;
    const x = Math.sin(a) * d, z = Math.cos(a) * d;
    if (z > 3 && Math.abs(x) < 6) continue;
    const s = 0.8 + r() * 0.9;
    const arbre = new THREE.Group();
    const tronc = new THREE.Mesh(geoTronc, matTronc);
    tronc.position.y = 0.35;
    arbre.add(tronc);
    geoCone.forEach((g, n) => {
      const c = new THREE.Mesh(g, matSapin);
      c.position.y = 1.1 + n * 0.7;
      arbre.add(c);
    });
    arbre.scale.setScalar(s);
    arbre.position.set(x, solY, z);
    arbre.rotation.y = r() * 6;
    decor.add(arbre);
    arbres.push(arbre);
  }

  // Chaumières : murs de torchis, toit de chaume, fenêtres allumées.
  const matMur = mat(0xffffff, { map: texture(grain('#8a7a62', { intensite: 0.1, graine: 12, nb: 5000 }), 256), roughness: 0.95 });
  const matToit = mat(0xffffff, { map: texture(planches('#5a4426', { nb: 10, graine: 8, usure: 0.6 }), 256), roughness: 1 });
  const matPoutre = mat(0x2e1d10, { roughness: 0.9 });
  const fenetres = [];
  const maisons = [[-6.2, -6.4, 0.5], [6.4, -6.0, -0.6], [-8.6, -1.0, 1.2], [8.8, -1.6, -1.1], [0.2, -9.6, 0.05]];
  maisons.slice(0, leger ? 3 : 5).forEach(([x, z], k) => {
    const m = new THREE.Group();
    const L = 2.4 + r() * 0.8, P = 1.9, H = 1.5;
    const murs = new THREE.Mesh(new THREE.BoxGeometry(L, H, P), matMur);
    murs.position.y = H / 2;
    murs.castShadow = !leger;
    const toitG = new THREE.Shape();
    toitG.moveTo(-P / 2 - 0.2, 0); toitG.lineTo(0, 1.25); toitG.lineTo(P / 2 + 0.2, 0); toitG.lineTo(-P / 2 - 0.2, 0);
    const toit = new THREE.Mesh(new THREE.ExtrudeGeometry(toitG, { depth: L + 0.3, bevelEnabled: false }), matToit);
    toit.rotation.y = Math.PI / 2;
    toit.position.set(-(L + 0.3) / 2, H, 0);
    const porte = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.8), matPoutre);
    porte.position.set(-L * 0.22, 0.4, P / 2 + 0.005);
    m.add(murs, toit, porte);
    for (const fx of [L * 0.18, L * 0.36]) {
      const f = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.34), lueur(0xffb050, 1.6));
      f.position.set(fx - (k % 2 ? 0.2 : 0), 0.9, P / 2 + 0.006);
      const croix = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.03), matPoutre);
      croix.position.set(f.position.x, 0.9, P / 2 + 0.008);
      const croix2 = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.36), matPoutre);
      croix2.position.set(f.position.x, 0.9, P / 2 + 0.008);
      m.add(f, croix, croix2);
      fenetres.push({ mesh: f, phase: r() * 6 });
    }
    m.position.set(x, solY, z);
    m.lookAt(0, solY, 0);
    decor.add(m);
  });

  // Ciel : étoiles et pleine lune avec son halo.
  const nbEtoiles = leger ? 250 : 700;
  const pos = new Float32Array(nbEtoiles * 3);
  for (let k = 0; k < nbEtoiles; k++) {
    const a = r() * Math.PI * 2, h = 0.15 + r() * 0.85;
    const R = 26;
    pos[k * 3] = Math.cos(a) * R * Math.sqrt(1 - h * h);
    pos[k * 3 + 1] = solY + h * R * 0.7;
    pos[k * 3 + 2] = Math.sin(a) * R * Math.sqrt(1 - h * h);
  }
  const geoEtoiles = new THREE.BufferGeometry();
  geoEtoiles.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const matEtoiles = new THREE.PointsMaterial({ color: 0xeaf0ff, size: 0.09, sizeAttenuation: true, transparent: true, opacity: 0.9, fog: false, depthWrite: false });
  const etoiles = new THREE.Points(geoEtoiles, matEtoiles);
  decor.add(etoiles);
  const lune = new THREE.Mesh(new THREE.SphereGeometry(1.1, 32, 20), new THREE.MeshBasicMaterial({
    color: 0xffffff, fog: false, transparent: true,
    map: texture((ctx, L) => {
      ctx.fillStyle = '#e8eefa'; ctx.fillRect(0, 0, L, L);
      const rr = aleatoire(5);
      for (let k = 0; k < 26; k++) {
        ctx.fillStyle = `rgba(120,130,160,${0.12 + rr() * 0.18})`;
        ctx.beginPath(); ctx.arc(rr() * L, rr() * L, 4 + rr() * 22, 0, Math.PI * 2); ctx.fill();
      }
    }, 256),
  }));
  lune.position.set(-7, solY + 9.5, -16);
  const haloLune = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX_HALO(), color: 0x9ab8ff, transparent: true, opacity: 0.5, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
  haloLune.scale.set(9, 9, 1);
  haloLune.position.copy(lune.position);
  decor.add(lune, haloLune);
  const clairDeLune = new THREE.DirectionalLight(LUNE, 0.9);
  clairDeLune.position.set(-5, 8, -6);
  decor.add(clairDeLune);

  // Des yeux rouges qui clignent entre les arbres (la nuit seulement).
  const yeux = [];
  const matOeil = new THREE.MeshBasicMaterial({ color: new THREE.Color(SANG).multiplyScalar(2.2), transparent: true, fog: false });
  const geoOeil = new THREE.SphereGeometry(0.045, 8, 6);
  for (let k = 0; k < (leger ? 3 : 6); k++) {
    const a = (k / 6) * Math.PI * 1.6 - Math.PI * 0.8 + Math.PI + (r() - 0.5) * 0.3;
    const d = 7.4 + r() * 1.2;
    const paire = new THREE.Group();
    const o1 = new THREE.Mesh(geoOeil, matOeil);
    const o2 = new THREE.Mesh(geoOeil, matOeil);
    o1.position.x = -0.07; o2.position.x = 0.07;
    paire.add(o1, o2);
    paire.position.set(Math.sin(a) * d, solY + 0.55 + r() * 0.4, Math.cos(a) * d);
    paire.lookAt(0, solY + 0.6, 0);
    decor.add(paire);
    yeux.push({ paire, phase: r() * 20, periode: 5 + r() * 7 });
  }

  // L'avis du village : panneau de bois sur deux poteaux, une affiche dessus.
  const avisCanvas = document.createElement('canvas');
  avisCanvas.width = 1024; avisCanvas.height = 640;
  const avisTex = new THREE.CanvasTexture(avisCanvas);
  avisTex.colorSpace = THREE.SRGBColorSpace;
  let contenu = { titre: nom, lignes: ['La nuit va tomber', 'sur le hameau…'], bas: '' };
  const dessinerAvis = () => {
    const ctx = avisCanvas.getContext('2d'), L = 1024, H = 640;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#efdcae'); g.addColorStop(1, '#d4b97c');
    ctx.fillStyle = g; ctx.fillRect(0, 0, L, H);
    const rr = aleatoire(3);
    for (let k = 0; k < 1500; k++) {
      ctx.fillStyle = `rgba(90,60,20,${rr() * 0.07})`;
      ctx.fillRect(rr() * L, rr() * H, 2 + rr() * 4, 2 + rr() * 4);
    }
    ctx.strokeStyle = 'rgba(90,50,20,0.6)'; ctx.lineWidth = 6;
    ctx.strokeRect(22, 22, L - 44, H - 44);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#5a1a10';
    ctx.font = `700 70px ${POLICE_TITRE}`;
    ctx.fillText(contenu.titre || '', L / 2, 96, L - 100);
    ctx.fillStyle = '#2a1a0a';
    let taille = 58;
    const police = t => `700 ${t}px ${POLICE_TEXTE}`;
    ctx.font = police(taille);
    const decouper = () => { let ls = []; (contenu.lignes || []).forEach(t => { ls = ls.concat(couper(ctx, t, L - 140)); }); return ls; };
    let lignes = decouper();
    while (lignes.length > 6 && taille > 34) { taille -= 4; ctx.font = police(taille); lignes = decouper(); }
    const haut = 330 - (Math.min(lignes.length, 7) - 1) * taille * 0.56;
    lignes.slice(0, 7).forEach((l, k) => ctx.fillText(l, L / 2, haut + k * taille * 1.12, L - 100));
    if (contenu.bas) {
      ctx.fillStyle = '#7a2a18';
      ctx.font = `600 42px ${POLICE_TEXTE}`;
      ctx.fillText(contenu.bas, L / 2, H - 70, L - 100);
    }
    // Clous aux quatre coins.
    ctx.fillStyle = '#3a2a1a';
    [[50, 50], [L - 50, 50], [50, H - 50], [L - 50, H - 50]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fill(); });
    avisTex.needsUpdate = true;
  };
  dessinerAvis();
  quandPolicesVeillee(dessinerAvis);
  const bois = mat(0xffffff, { map: texture(veinage('#3e2614', 4), 256), roughness: 0.9 });
  const avis = new THREE.Group();
  const panneau = new THREE.Mesh(new THREE.BoxGeometry(4.0, 2.6, 0.1), [bois, bois, bois, bois, new THREE.MeshStandardMaterial({ map: avisTex, roughness: 0.9, emissive: 0xffffff, emissiveMap: avisTex, emissiveIntensity: 0.25 }), bois]);
  panneau.position.y = 2.6;
  const toitAvis = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.12, 0.5), bois);
  toitAvis.position.set(0, 4.0, 0.12);
  toitAvis.rotation.x = 0.25;
  avis.add(panneau, toitAvis);
  for (const x of [-1.9, 1.9]) {
    const poteau = new THREE.Mesh(new THREE.BoxGeometry(0.16, 4.0, 0.16), bois);
    poteau.position.set(x, 2.0, -0.08);
    avis.add(poteau);
  }
  // Une torche de chaque côté de l'avis.
  const torches = [];
  for (const x of [-2.25, 2.25]) {
    const manche = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.5, 6), matPoutre);
    manche.position.set(x, 3.0, 0.1);
    const feu = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.2, 8), lueur(0xff8a30, 2.2));
    feu.position.set(x, 3.34, 0.1);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX_HALO(), color: 0xff8a30, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.scale.set(0.9, 0.9, 1);
    halo.position.copy(feu.position);
    avis.add(manche, feu, halo);
    torches.push({ feu, halo });
  }
  const lumAvis = new THREE.PointLight(0xff9a40, 1.6, 6, 1.6);
  lumAvis.position.set(0, 3.2, 1.2);
  avis.add(lumAvis);
  avis.position.set(0, solY, -5.4);
  decor.add(avis);

  scene.add(decor);

  function ecrireEcran(nouveau) {
    contenu = Object.assign({ titre: nom, lignes: [], bas: '' }, nouveau);
    dessinerAvis();
  }

  // Nuit (1) ou matin (0), en douceur.
  let nuit = 1, cibleNuit = 1;
  const cNuit = new THREE.Color(FOND_NUIT), cJour = new THREE.Color(FOND_JOUR), tmp = new THREE.Color();
  function regler(k) { cibleNuit = k; }
  function appliquerNuit() {
    tmp.copy(cJour).lerp(cNuit, nuit);
    if (scene.background && scene.background.isColor) scene.background.copy(tmp);
    if (scene.fog) scene.fog.color.copy(tmp);
    matEtoiles.opacity = 0.9 * nuit;
    lune.material.opacity = 0.25 + 0.75 * nuit;
    haloLune.material.opacity = 0.5 * nuit;
    clairDeLune.intensity = 0.4 + 0.6 * nuit;
    clairDeLune.color.setHex(LUNE).lerp(new THREE.Color(0xffe0b0), 1 - nuit);
    if (hemi) hemi.intensity = (leger ? 0.7 : 0.5) + (1 - nuit) * 0.9;
    matOeil.opacity = nuit > 0.6 ? (nuit - 0.6) / 0.4 : 0;
  }
  appliquerNuit();

  function animer(t) {
    if (Math.abs(nuit - cibleNuit) > 0.002) { nuit += (cibleNuit - nuit) * 0.03; appliquerNuit(); }
    yeux.forEach(y => {
      const c = (t + y.phase) % y.periode;
      // Ouverts un moment, puis fermés ; un clignement rapide au milieu.
      const ouverts = c < y.periode * 0.45 && !(c > 1.2 && c < 1.32);
      y.paire.visible = ouverts && nuit > 0.6;
    });
    if (leger) return;
    fenetres.forEach(f => f.mesh.material.color.setHex(0xffb050).multiplyScalar(1.4 + Math.sin(t * 1.3 + f.phase) * 0.15));
    torches.forEach((tc, k) => {
      const v = 1 + Math.sin(t * 13 + k * 2) * 0.12 + Math.sin(t * 7.3 + k) * 0.08;
      tc.feu.scale.set(1, v, 1);
      tc.halo.material.opacity = 0.5 * v;
    });
    lumAvis.intensity = 1.5 + Math.sin(t * 11) * 0.15;
  }
  return { decor, animer, ecrireEcran, regler, lumiere: lumAvis };
}
