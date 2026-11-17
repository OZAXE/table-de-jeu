// =====================================================================
// Thème « Brasserie bavaroise » (BeerBattle) : une grande salle de
// brasserie. Murs blanchis à la chaux et colombages, poutres au plafond,
// grande cuve de brassage en cuivre, tonneaux en perce, guirlandes de
// fanions à losanges bleus et blancs, longues tables et bancs au fond,
// bretzels, lanternes. Table ronde en chêne massif (plateau d'un seul
// tenant, ceinture moulurée, quatre pieds tournés), chaises bavaroises à
// dossier découpé d'un cœur.
//
// Version légère : pas de reflets calculés, guirlandes fixes, moins de
// tonneaux et de tables au fond.
// =====================================================================
import * as THREE from 'three';
import {
  aleatoire, texture, mat, lueur, veinage, grain, planches, ambiance, ombreAuSol, dessinerEtiquetteTheme, quandPolices,
} from './outils.js';

export const FOND = 0x120c07;
export const POLICE_TITRE = "'Pirata One', Georgia, serif";
export const POLICE_TEXTE = "'Alegreya Sans', 'Segoe UI', system-ui, sans-serif";
export const quandPolicesBrasserie = (fn) => quandPolices(['48px "Pirata One"', '700 48px "Alegreya Sans"'], fn);

export function preparerAmbianceBrasserie(renderer, scene, { leger = false } = {}) {
  ambiance(renderer, scene, { fond: FOND, ciel: 0x7a6040, sol: 0x1a1008, intensite: 0.75, leger });
}

// --- Table ronde en chêne massif ---
export function creerTableBrasserie(rayon, { leger = false } = {}) {
  const groupe = new THREE.Group();
  const chene = mat(0xffffff, { map: texture(veinage('#8a5a30', 51), 512, 512), roughness: 0.5 });
  const cheneFonce = mat(0xffffff, { map: texture(veinage('#5a3820', 52), 512, 128, [6, 1]), roughness: 0.55 });
  const plateau = new THREE.Mesh(new THREE.CylinderGeometry(rayon, rayon, 0.12, 96), [cheneFonce, chene, chene]);
  plateau.position.y = -0.06;
  plateau.receiveShadow = true;
  const ceinture = new THREE.Mesh(new THREE.CylinderGeometry(rayon - 0.15, rayon - 0.18, 0.22, 64, 1, true), cheneFonce);
  ceinture.position.y = -0.23;
  const moulure = new THREE.Mesh(new THREE.TorusGeometry(rayon, 0.035, 8, 128), cheneFonce);
  moulure.rotation.x = Math.PI / 2; moulure.position.y = -0.12;
  groupe.add(plateau, ceinture, moulure);
  // Quatre pieds tournés, bien visibles.
  const profil = [
    new THREE.Vector2(0.11, 0), new THREE.Vector2(0.13, 0.06), new THREE.Vector2(0.08, 0.2), new THREE.Vector2(0.12, 0.4),
    new THREE.Vector2(0.07, 0.6), new THREE.Vector2(0.1, 0.8), new THREE.Vector2(0.12, 0.88), new THREE.Vector2(0, 0.88),
  ];
  const geoPied = new THREE.LatheGeometry(profil, 16);
  for (let k = 0; k < 4; k++) {
    const a = k * Math.PI / 2 + Math.PI / 4;
    const p = new THREE.Mesh(geoPied, cheneFonce);
    p.position.set(Math.cos(a) * (rayon - 0.45), -1.2, Math.sin(a) * (rayon - 0.45));
    groupe.add(p);
  }
  groupe.add(ombreAuSol(rayon * 1.3, -1.2));
  return { groupe };
}

// --- Chaise bavaroise : planche de dossier découpée d'un cœur ---
let MAT_CHAISE = null;
export function creerChaiseBrasserie(dir, rayon = 2.8, solY = -1.2) {
  if (!MAT_CHAISE) MAT_CHAISE = mat(0xffffff, { map: texture(veinage('#9a6a3a', 61), 256, 256), roughness: 0.55 });
  const c = new THREE.Group();
  const h = 0.72;
  const assise = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.06, 0.44), MAT_CHAISE);
  assise.position.y = h;
  c.add(assise);
  for (const [x, z, rx] of [[-0.18, -0.16, 0.12], [0.18, -0.16, 0.12], [-0.18, 0.16, -0.12], [0.18, 0.16, -0.12]]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, h + 0.04, 8), MAT_CHAISE);
    p.position.set(x * 1.15, h / 2, z * 1.15);
    p.rotation.x = rx; p.rotation.z = -Math.sign(x) * 0.1;
    c.add(p);
  }
  // Dossier : une planche découpée (forme dessinée), percée d'un cœur.
  const forme = new THREE.Shape();
  forme.moveTo(-0.2, 0); forme.lineTo(0.2, 0); forme.lineTo(0.24, 0.42);
  forme.quadraticCurveTo(0, 0.56, -0.24, 0.42); forme.lineTo(-0.2, 0);
  const coeur = new THREE.Path();
  coeur.moveTo(0, 0.18);
  coeur.bezierCurveTo(-0.01, 0.2, -0.07, 0.24, -0.06, 0.29);
  coeur.bezierCurveTo(-0.05, 0.33, 0, 0.32, 0, 0.29);
  coeur.bezierCurveTo(0, 0.32, 0.05, 0.33, 0.06, 0.29);
  coeur.bezierCurveTo(0.07, 0.24, 0.01, 0.2, 0, 0.18);
  forme.holes.push(coeur);
  const dossier = new THREE.Mesh(new THREE.ExtrudeGeometry(forme, { depth: 0.04, bevelEnabled: false }), MAT_CHAISE);
  dossier.position.set(0, h + 0.03, 0.18);
  dossier.rotation.x = -0.12;
  c.add(dossier);
  c.position.set(dir.x * rayon, solY, dir.z * rayon);
  c.rotation.y = Math.atan2(dir.x, dir.z);
  return c;
}

// --- Étiquettes : planchette de chêne, lettres claires ---
export function dessinerEtiquetteBrasserie(ctx, texte, etat) {
  dessinerEtiquetteTheme(ctx, texte, etat, {
    police: POLICE_TEXTE, graisse: 800, rayon: 0.25,
    fond: ['#5a3820', '#3a2414'], fondActif: ['#2f7a50', '#1f5135'],
    bord: '#c9a46a', bordActif: '#e8f5d0', texte: '#f5ead2', texteActif: '#ffffff',
  });
}

// --- Le décor ---
export function creerDecorBrasserie(scene, { nom = '', solY = -1.2, leger = false } = {}) {
  const decor = new THREE.Group();
  const r = aleatoire(33);
  const Z_MUR = -7.0;
  const bois = mat(0xffffff, { map: texture(veinage('#4a2e1a', 71), 256, 256), roughness: 0.6 });
  const cuivre = mat(0xc87a3a, { metalness: 0.9, roughness: 0.28 });
  const fer = mat(0x2a2624, { metalness: 0.7, roughness: 0.45 });

  // Sol : grandes dalles de pierre.
  const sol = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), mat(0xffffff, {
    roughness: 0.85,
    map: texture((ctx, L) => {
      const rr = aleatoire(4);
      ctx.fillStyle = '#2a2420'; ctx.fillRect(0, 0, L, L);
      const p = L / 4;
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        const v = 0.75 + rr() * 0.3;
        ctx.fillStyle = `rgb(${Math.round(110 * v)},${Math.round(100 * v)},${Math.round(88 * v)})`;
        ctx.fillRect(i * p + 3 + (j % 2) * p / 2 % p, j * p + 3, p - 6, p - 6);
      }
      for (let k = 0; k < 3000; k++) { ctx.fillStyle = `rgba(0,0,0,${rr() * 0.1})`; ctx.fillRect(rr() * L, rr() * L, 2, 2); }
    }, 256, 256, [12, 12]),
  }));
  sol.rotation.x = -Math.PI / 2;
  sol.position.y = solY;
  decor.add(sol);

  // Murs blanchis à la chaux, colombages de bois sombre.
  const murTex = texture((ctx, L, H) => {
    grain('#e2d6bc', { intensite: 0.06, graine: 6, nb: 5000 })(ctx, L, H);
    ctx.fillStyle = '#3a2414';
    const e = 22;
    ctx.fillRect(0, 0, L, e); ctx.fillRect(0, H - e, L, e); ctx.fillRect(0, H * 0.55, L, e);
    for (let x = 0; x <= L; x += L / 2) ctx.fillRect(x - e / 2, 0, e, H);
    ctx.save(); ctx.lineWidth = e; ctx.strokeStyle = '#3a2414';
    ctx.beginPath(); ctx.moveTo(0, H * 0.55); ctx.lineTo(L / 2, 0); ctx.moveTo(L / 2, H * 0.55); ctx.lineTo(L, 0);
    ctx.moveTo(0, H * 0.55 + e); ctx.lineTo(L / 2, H); ctx.moveTo(L, H * 0.55 + e); ctx.lineTo(L / 2, H); ctx.stroke();
    ctx.restore();
  }, 512, 512, [5, 1]);
  const mur = new THREE.Mesh(new THREE.PlaneGeometry(28, 7.5), mat(0xffffff, { map: murTex, roughness: 0.9 }));
  mur.position.set(0, solY + 3.75, Z_MUR);
  decor.add(mur);
  for (const cote of [-1, 1]) {
    const lat = new THREE.Mesh(new THREE.PlaneGeometry(18, 7.5), mat(0xffffff, { map: murTex, roughness: 0.9 }));
    lat.rotation.y = -cote * Math.PI / 2;
    lat.position.set(cote * 10, solY + 3.75, -1.5);
    decor.add(lat);
  }

  // Poutres au plafond.
  for (const z of [-5.5, -3, -0.5, 2]) {
    const poutre = new THREE.Mesh(new THREE.BoxGeometry(22, 0.35, 0.35), bois);
    poutre.position.set(0, solY + 6.2, z);
    decor.add(poutre);
  }

  // Grande cuve de brassage en cuivre, avec son chapeau et son col de cygne.
  const cuve = new THREE.Group();
  const corps = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 2.0, 40), cuivre);
  corps.position.y = 1.4;
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1.1, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2), cuivre);
  dome.position.y = 2.4;
  const col = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.12, 12, 24, Math.PI), cuivre);
  col.position.set(0.6, 3.5, 0); col.rotation.z = 0;
  const cheminee = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.8, 16), cuivre);
  cheminee.position.set(0, 3.2, 0);
  const socle = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.3, 0.4, 40), mat(0x6a6058, { roughness: 0.8 }));
  socle.position.y = 0.2;
  cuve.add(corps, dome, col, cheminee, socle);
  for (const y of [0.7, 2.1]) {
    const cercle = new THREE.Mesh(new THREE.TorusGeometry(1.11, 0.03, 8, 40), mat(0x8a4a1a, { metalness: 0.9, roughness: 0.3 }));
    cercle.rotation.x = Math.PI / 2; cercle.position.y = y;
    cuve.add(cercle);
  }
  cuve.position.set(-5.6, solY, Z_MUR + 1.6);
  decor.add(cuve);

  // Tonneaux en perce sur leur chevalet, avec le nom du jeu peint sur le premier.
  const tonneauCanvas = document.createElement('canvas');
  tonneauCanvas.width = 512; tonneauCanvas.height = 512;
  const tonneauTex = new THREE.CanvasTexture(tonneauCanvas);
  tonneauTex.colorSpace = THREE.SRGBColorSpace;
  const dessinerFond = () => {
    const ctx = tonneauCanvas.getContext('2d');
    planches('#9a6a3a', { nb: 7, vertical: true, graine: 81 })(ctx, 512, 512);
    ctx.fillStyle = 'rgba(30,15,5,0.85)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `92px ${POLICE_TITRE}`; ctx.fillText(nom, 256, 240, 440);
    ctx.font = `700 40px ${POLICE_TEXTE}`; ctx.fillText('· Bräu ·', 256, 330);
    tonneauTex.needsUpdate = true;
  };
  dessinerFond();
  quandPolicesBrasserie(dessinerFond);
  const tonneauMat = mat(0xffffff, { map: texture(planches('#7a4e28', { nb: 10, vertical: true, graine: 82 }), 256, 256, [3, 1]), roughness: 0.7 });
  const fondMat = mat(0xffffff, { map: tonneauTex, roughness: 0.7 });
  const tonneau = (x, y, z, s, avecNom) => {
    const t = new THREE.Group();
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.62 * s, 0.62 * s, 1.2 * s, 24, 1, false), [tonneauMat, avecNom ? fondMat : tonneauMat, tonneauMat]);
    c.rotation.x = Math.PI / 2;
    t.add(c);
    for (const zz of [-0.45, 0.45]) {
      const ce = new THREE.Mesh(new THREE.TorusGeometry(0.63 * s, 0.025, 6, 24), fer);
      ce.position.z = zz * s;
      t.add(ce);
    }
    const robinet = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.2, 8), mat(0xc9a25a, { metalness: 0.9, roughness: 0.3 }));
    robinet.rotation.x = Math.PI / 2; robinet.position.set(0, -0.3 * s, 0.68 * s);
    t.add(robinet);
    t.position.set(x, y, z);
    decor.add(t);
  };
  const chevalet = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.6, 1.2), bois);
  chevalet.position.set(2.4, solY + 0.3, Z_MUR + 1.2);
  decor.add(chevalet);
  tonneau(1.6, solY + 1.22, Z_MUR + 1.2, 1, true);
  tonneau(3.2, solY + 1.22, Z_MUR + 1.2, 1, false);
  if (!leger) tonneau(2.4, solY + 2.3, Z_MUR + 1.2, 0.85, false);

  // Longues tables et bancs au fond de la salle.
  const tables = leger ? [[5.6, -3.6]] : [[5.6, -3.6], [-6.0, -2.2], [6.2, 0.6]];
  tables.forEach(([x, z]) => {
    const plateau = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 3.4), bois);
    plateau.position.set(x, solY + 0.78, z);
    decor.add(plateau);
    for (const dz of [-1.3, 1.3]) {
      const pied = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.74, 0.08), bois);
      pied.position.set(x, solY + 0.37, z + dz);
      decor.add(pied);
    }
    for (const dx of [-0.75, 0.75]) {
      const banc = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.06, 3.4), bois);
      banc.position.set(x + dx, solY + 0.46, z);
      decor.add(banc);
    }
    // Chopes en grès oubliées sur la table
    for (let k = 0; k < 3; k++) {
      const chope = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.22, 12), mat(0xb8b0a0, { roughness: 0.6 }));
      chope.position.set(x + (r() - 0.5) * 0.4, solY + 0.93, z - 1 + k * 1.0);
      decor.add(chope);
    }
  });

  // Guirlandes de fanions à losanges bleus et blancs.
  const fanions = [];
  const fanionMats = [mat(0x2f6fb5, { roughness: 0.7, side: THREE.DoubleSide }), mat(0xf2f2f2, { roughness: 0.7, side: THREE.DoubleSide })];
  const geoFanion = new THREE.BufferGeometry();
  geoFanion.setAttribute('position', new THREE.Float32BufferAttribute([-0.11, 0, 0, 0.11, 0, 0, 0, -0.26, 0], 3));
  geoFanion.computeVertexNormals();
  const guirlande = (x1, x2, y, z, n) => {
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      const f = new THREE.Mesh(geoFanion, fanionMats[k % 2]);
      f.position.set(x1 + (x2 - x1) * t, y - Math.sin(t * Math.PI) * 0.5, z);
      decor.add(f);
      fanions.push(f);
    }
  };
  guirlande(-6, 6, solY + 5.6, Z_MUR + 0.6, 28);
  if (!leger) { guirlande(-6, 0, solY + 5.4, -2.5, 14); guirlande(0, 6, solY + 5.4, -2.5, 14); }

  // Enseigne au nom de la brasserie.
  const enseigneCanvas = document.createElement('canvas');
  enseigneCanvas.width = 1024; enseigneCanvas.height = 220;
  const enseigneTex = new THREE.CanvasTexture(enseigneCanvas);
  enseigneTex.colorSpace = THREE.SRGBColorSpace;
  const dessinerEnseigne = () => {
    const ctx = enseigneCanvas.getContext('2d');
    planches('#5a3820', { nb: 2, graine: 91 })(ctx, 1024, 220);
    ctx.strokeStyle = '#c9a46a'; ctx.lineWidth = 8; ctx.strokeRect(10, 10, 1004, 200);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `130px ${POLICE_TITRE}`;
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillText(nom + ' Halle', 516, 116, 960);
    ctx.fillStyle = '#f2d9a0'; ctx.fillText(nom + ' Halle', 512, 112, 960);
    enseigneTex.needsUpdate = true;
  };
  dessinerEnseigne();
  quandPolicesBrasserie(dessinerEnseigne);
  const enseigne = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 1.03), mat(0xffffff, { map: enseigneTex, roughness: 0.7 }));
  enseigne.position.set(0.4, solY + 4.4, Z_MUR + 0.05);
  decor.add(enseigne);

  // Bretzels accrochés à un piquet, et un bois de cerf.
  const pate = mat(0x9a5a20, { roughness: 0.6 });
  for (let k = 0; k < 3; k++) {
    const b = new THREE.Group();
    const boucle = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.04, 8, 20), pate);
    const croise = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.035, 8, 16, Math.PI), pate);
    croise.position.y = -0.04; croise.rotation.z = Math.PI;
    b.add(boucle, croise);
    b.position.set(-2.2 + k * 0.38, solY + 3.0 - (k % 2) * 0.1, Z_MUR + 0.08);
    decor.add(b);
  }
  const bois2 = mat(0xd8c8a8, { roughness: 0.6 });
  const bois3 = new THREE.Group();
  for (const s of [-1, 1]) {
    const tige = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, 0.7, 8), bois2);
    tige.rotation.z = s * 0.6; tige.position.set(s * 0.2, 0.25, 0);
    const pointe = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.025, 0.3, 6), bois2);
    pointe.rotation.z = -s * 0.3; pointe.position.set(s * 0.3, 0.45, 0.02);
    bois3.add(tige, pointe);
  }
  const ecusson = new THREE.Mesh(new THREE.CircleGeometry(0.22, 20), bois);
  bois3.add(ecusson);
  bois3.position.set(4.6, solY + 3.6, Z_MUR + 0.06);
  decor.add(bois3);

  // Lanternes en fer forgé et lumière chaude de la salle.
  const flamme = lueur(0xffc070, 2.0);
  for (const [x, z] of [[-2.6, -2.5], [2.6, -2.5], [0, Z_MUR + 0.8]]) {
    const lant = new THREE.Group();
    const cage = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.34, 6, 1, true), new THREE.MeshStandardMaterial({ color: 0xffe0a0, transparent: true, opacity: 0.35, side: THREE.DoubleSide }));
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), flamme);
    f.scale.y = 1.6;
    const toit = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.14, 6), fer);
    toit.position.y = 0.24;
    const chaine = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1.2, 4), fer);
    chaine.position.y = 0.9;
    lant.add(cage, f, toit, chaine);
    lant.position.set(x, solY + 4.6, z);
    decor.add(lant);
  }
  const lumiere = new THREE.PointLight(0xffd090, 1.8, 9, 1.5);
  lumiere.position.set(0, 3.2, -0.3);
  decor.add(lumiere);

  scene.add(decor);

  function animer(t) {
    if (leger) return;
    fanions.forEach((f, k) => { f.rotation.x = Math.sin(t * 1.6 + k * 0.7) * 0.18; });
    lumiere.intensity = 1.8 * (1 + Math.sin(t * 5.3) * 0.02);
  }
  return { decor, animer, lumiere };
}
