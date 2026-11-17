// =====================================================================
// Thème « Docks » (Cal 12) : l'arrière-salle d'un entrepôt sur le port,
// une nuit de brume. Tôle ondulée, grande porte coulissante entrouverte sur
// le port (grues, cargo, reflets dans l'eau), caisses estampillées au
// pochoir, fûts rouillés, palettes, poutres d'acier, chaînes et crochet.
// Au-dessus de la table : une ampoule nue qui se balance doucement.
// Table de jeu pliante au feutre bleu acier, chaises pliantes en métal.
//
// Version légère : pas de reflets calculés, pas de brume animée, ampoule
// fixe, moins de caisses.
// =====================================================================
import * as THREE from 'three';
import {
  aleatoire, texture, mat, lueur, veinage, planches, grain, ambiance, ombreAuSol,
  dessinerEtiquetteTheme, quandPolices,
} from './outils.js';

export const FOND = 0x0a0f15;
export const POLICE_TITRE = "'Stardos Stencil', Impact, sans-serif";
export const POLICE_TEXTE = "Barlow, 'Segoe UI', system-ui, sans-serif";
export const quandPolicesDocks = (fn) => quandPolices(['700 48px "Stardos Stencil"', '600 48px Barlow'], fn);

export function preparerAmbianceDocks(renderer, scene, { leger = false } = {}) {
  ambiance(renderer, scene, { fond: FOND, ciel: 0x2a3a4e, sol: 0x0a0806, intensite: 0.55, leger });
  // Clair de lune froid par la porte du port.
  const lune = new THREE.DirectionalLight(0x7fa8d8, 1.1);
  lune.position.set(-3, 2.6, -5);
  scene.add(lune);
}

// --- Table de jeu pliante : plateau bois, feutre bleu acier, bord rembourré ---
export function creerTableDocks(rayon, { rayonFeutre = rayon - 0.28, leger = false } = {}) {
  const groupe = new THREE.Group();
  const bois = mat(0xffffff, { map: texture(veinage('#4a3424', 31), 512, 512), roughness: 0.55 });
  const plateau = new THREE.Mesh(new THREE.CylinderGeometry(rayon, rayon, 0.09, 96), bois);
  plateau.position.y = -0.045;
  plateau.receiveShadow = true;
  const feutreTex = texture((ctx, L) => {
    grain('#1d3550', { intensite: 0.07, nb: 5000, graine: 8 })(ctx, L, L);
    const g = ctx.createRadialGradient(L / 2, L / 2, L * 0.1, L / 2, L / 2, L / 2);
    g.addColorStop(0, 'rgba(255,255,255,0.06)'); g.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, L, L);
    // Taches et brûlures de cigarette : la table a vécu.
    const r = aleatoire(3);
    for (let k = 0; k < 7; k++) { ctx.fillStyle = `rgba(10,8,6,${0.15 + r() * 0.2})`; ctx.beginPath(); ctx.arc(r() * L, r() * L, 4 + r() * 14, 0, Math.PI * 2); ctx.fill(); }
  }, 512);
  const feutre = new THREE.Mesh(new THREE.CylinderGeometry(rayonFeutre, rayonFeutre, 0.012, 96), mat(0xffffff, { map: feutreTex, roughness: 0.9 }));
  feutre.position.y = 0.006;
  feutre.receiveShadow = true;
  const rebord = new THREE.Mesh(new THREE.TorusGeometry(rayon - 0.06, 0.07, 12, 128),
    mat(0xffffff, { map: texture(grain('#1a1410', { intensite: 0.08, graine: 4 }), 256, 32, [10, 1]), roughness: 0.45 }));
  rebord.rotation.x = Math.PI / 2;
  rebord.position.y = 0.05;
  rebord.castShadow = !leger;
  const filet = new THREE.Mesh(new THREE.TorusGeometry(rayonFeutre, 0.012, 8, 128), mat(0x8a9aab, { metalness: 0.85, roughness: 0.3 }));
  filet.rotation.x = Math.PI / 2;
  filet.position.y = 0.01;
  // Pieds pliants en acier, en croix.
  const acier = mat(0x3a4048, { metalness: 0.8, roughness: 0.4 });
  for (let k = 0; k < 4; k++) {
    const a = k * Math.PI / 2 + Math.PI / 4;
    const pied = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.3, 10), acier);
    pied.position.set(Math.cos(a) * 0.75, -0.62, Math.sin(a) * 0.75);
    pied.rotation.z = Math.cos(a) * 0.3; pied.rotation.x = -Math.sin(a) * 0.3;
    groupe.add(pied);
  }
  groupe.add(plateau, feutre, rebord, filet, ombreAuSol(rayon * 1.35, -1.2));
  return { groupe, feutre };
}

// --- Chaise pliante en métal ---
let MAT_CHAISE = null, MAT_ASSISE = null;
export function creerChaiseDocks(dir, rayon = 2.42, solY = -1.2) {
  if (!MAT_CHAISE) {
    MAT_CHAISE = mat(0x4a5560, { metalness: 0.75, roughness: 0.45 });
    MAT_ASSISE = mat(0xffffff, { map: texture(grain('#2b4a63', { intensite: 0.1, graine: 12, nb: 800 }), 128), roughness: 0.6, metalness: 0.3 });
  }
  const c = new THREE.Group();
  const h = 0.72;
  const assise = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.46), MAT_ASSISE);
  assise.position.y = h;
  const dossier = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.03), MAT_ASSISE);
  dossier.position.set(0, h + 0.5, 0.24);
  c.add(assise, dossier);
  for (const x of [-0.23, 0.23]) {
    const montant = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.25, 8), MAT_CHAISE);
    montant.position.set(x, 0.62, 0.22);
    montant.rotation.x = -0.12;
    const avant = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.78, 8), MAT_CHAISE);
    avant.position.set(x, 0.36, -0.18);
    avant.rotation.x = 0.25;
    c.add(montant, avant);
  }
  c.position.set(dir.x * rayon, solY, dir.z * rayon);
  c.rotation.y = Math.atan2(dir.x, dir.z);
  return c;
}

// --- Étiquettes : plaque d'acier, lettres pochoir ---
export function dessinerEtiquetteDocks(ctx, texte, etat) {
  dessinerEtiquetteTheme(ctx, texte, etat, {
    police: POLICE_TEXTE, graisse: 700, rayon: 0.12,
    fond: ['#2a3542', '#151c24'], fondActif: ['#5b9bd5', '#2d5f8f'],
    bord: 'rgba(150,170,190,0.6)', bordActif: '#d7ecff', texte: '#e6edf3', texteActif: '#ffffff',
  });
}

// --- Le décor ---
export function creerDecorDocks(scene, { nom = '', solY = -1.2, leger = false } = {}) {
  const decor = new THREE.Group();
  const r = aleatoire(77);
  const Z_MUR = -6.4;

  // Sol : béton taché, flaques qui brillent (les flaques sont des disques plus lisses).
  const betonTex = texture((ctx, L) => {
    grain('#2a2c2e', { intensite: 0.09, nb: 9000, graine: 2 })(ctx, L, L);
    const rr = aleatoire(9);
    for (let k = 0; k < 14; k++) { ctx.fillStyle = `rgba(10,10,12,${0.12 + rr() * 0.2})`; ctx.beginPath(); ctx.ellipse(rr() * L, rr() * L, 10 + rr() * 50, 6 + rr() * 30, rr() * 3, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, L * 0.5); ctx.lineTo(L, L * 0.5); ctx.moveTo(L * 0.5, 0); ctx.lineTo(L * 0.5, L); ctx.stroke();
  }, 512, 512, [8, 8]);
  const sol = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), mat(0xffffff, { map: betonTex, roughness: 0.85 }));
  sol.rotation.x = -Math.PI / 2;
  sol.position.y = solY;
  decor.add(sol);
  const flaqueMat = mat(0x1a2430, { roughness: 0.05, metalness: 0.6, transparent: true, opacity: 0.75 });
  for (const [x, z, s] of [[-3.2, -2.6, 1.0], [3.4, -1.2, 0.7], [-1.8, 2.8, 0.6]]) {
    const f = new THREE.Mesh(new THREE.CircleGeometry(s, 24), flaqueMat);
    f.rotation.x = -Math.PI / 2; f.scale.set(1.6, 1, 1);
    f.position.set(x, solY + 0.004, z);
    decor.add(f);
  }

  // Mur du fond : tôle ondulée bleu-gris, coulures de rouille.
  const toleTex = texture((ctx, L, H) => {
    for (let x = 0; x < L; x++) {
      const v = 0.55 + Math.sin(x / L * Math.PI * 24) * 0.25;
      ctx.fillStyle = `rgb(${Math.round(52 * v + 20)},${Math.round(66 * v + 22)},${Math.round(80 * v + 26)})`;
      ctx.fillRect(x, 0, 1, H);
    }
    const rr = aleatoire(14);
    for (let k = 0; k < 26; k++) {
      const x = rr() * L, y = rr() * H * 0.6, hh = 40 + rr() * 160;
      const g = ctx.createLinearGradient(0, y, 0, y + hh);
      g.addColorStop(0, `rgba(150,70,30,${0.3 + rr() * 0.3})`); g.addColorStop(1, 'rgba(150,70,30,0)');
      ctx.fillStyle = g; ctx.fillRect(x, y, 3 + rr() * 8, hh);
    }
  }, 512, 512, [4, 1]);
  const mur = new THREE.Mesh(new THREE.PlaneGeometry(26, 8), mat(0xffffff, { map: toleTex, roughness: 0.55, metalness: 0.35 }));
  mur.position.set(0, solY + 4, Z_MUR);
  decor.add(mur);
  for (const cote of [-1, 1]) {
    const lat = new THREE.Mesh(new THREE.PlaneGeometry(16, 8), mat(0xffffff, { map: toleTex, roughness: 0.55, metalness: 0.35 }));
    lat.rotation.y = -cote * Math.PI / 2;
    lat.position.set(cote * 9, solY + 4, -1);
    decor.add(lat);
  }

  // Nom du jeu peint au pochoir sur la tôle.
  const pochoirCanvas = document.createElement('canvas');
  pochoirCanvas.width = 1024; pochoirCanvas.height = 256;
  const pochoirTex = new THREE.CanvasTexture(pochoirCanvas);
  pochoirTex.colorSpace = THREE.SRGBColorSpace;
  const dessinerPochoir = () => {
    const ctx = pochoirCanvas.getContext('2d');
    ctx.clearRect(0, 0, 1024, 256);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `700 180px ${POLICE_TITRE}`;
    ctx.fillStyle = 'rgba(232,220,190,0.82)';
    ctx.fillText(nom, 512, 120, 980);
    // Coulures de peinture
    const rr = aleatoire(21);
    ctx.fillStyle = 'rgba(232,220,190,0.55)';
    for (let k = 0; k < 14; k++) ctx.fillRect(180 + rr() * 660, 175, 3, 12 + rr() * 50);
    ctx.font = `600 34px ${POLICE_TEXTE}`;
    ctx.fillStyle = 'rgba(232,220,190,0.6)';
    ctx.fillText('DOCK 7 · ENTREPÔT B', 512, 236);
    pochoirTex.needsUpdate = true;
  };
  dessinerPochoir();
  quandPolicesDocks(dessinerPochoir);
  const pochoir = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.15), new THREE.MeshStandardMaterial({ map: pochoirTex, transparent: true, roughness: 0.9 }));
  pochoir.position.set(0.6, solY + 4.6, Z_MUR + 0.03);
  decor.add(pochoir);

  // Grande porte coulissante entrouverte sur le port de nuit.
  const port = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4), new THREE.MeshBasicMaterial({
    map: texture((ctx, L, H) => {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#0b1626'); g.addColorStop(0.55, '#1c3550'); g.addColorStop(0.62, '#0a1420'); g.addColorStop(1, '#05090f');
      ctx.fillStyle = g; ctx.fillRect(0, 0, L, H);
      ctx.fillStyle = '#e8eef5'; ctx.beginPath(); ctx.arc(L * 0.78, H * 0.18, 16, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(232,238,245,0.15)'; ctx.beginPath(); ctx.arc(L * 0.78, H * 0.18, 34, 0, Math.PI * 2); ctx.fill();
      // Grues
      ctx.strokeStyle = '#05080c'; ctx.lineWidth = 6;
      for (const [x, hh] of [[0.2, 0.25], [0.55, 0.18]]) {
        ctx.beginPath(); ctx.moveTo(L * x, H * 0.6); ctx.lineTo(L * x, H * hh); ctx.lineTo(L * (x + 0.3), H * hh); ctx.moveTo(L * x, H * (hh + 0.06)); ctx.lineTo(L * (x - 0.08), H * hh); ctx.stroke();
        ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(L * (x + 0.24), H * hh); ctx.lineTo(L * (x + 0.24), H * (hh + 0.15)); ctx.stroke(); ctx.lineWidth = 6;
      }
      // Cargo et ses feux
      ctx.fillStyle = '#04070b'; ctx.fillRect(L * 0.05, H * 0.52, L * 0.7, H * 0.08); ctx.fillRect(L * 0.5, H * 0.44, L * 0.14, H * 0.08);
      const rr = aleatoire(31);
      for (let k = 0; k < 9; k++) { ctx.fillStyle = rr() < 0.3 ? '#ff5a3c' : '#ffd27a'; ctx.fillRect(L * (0.08 + rr() * 0.62), H * (0.53 + rr() * 0.05), 3, 3); }
      // Reflets dans l'eau
      for (let k = 0; k < 40; k++) { ctx.fillStyle = `rgba(255,210,122,${rr() * 0.35})`; ctx.fillRect(L * (0.08 + rr() * 0.62), H * (0.64 + rr() * 0.3), 6 + rr() * 14, 2); }
    }, 256, 256),
  }));
  port.position.set(-5.3, solY + 1.7, Z_MUR + 0.02);
  const rail = new THREE.Mesh(new THREE.BoxGeometry(8, 0.12, 0.12), mat(0x2b3138, { metalness: 0.8, roughness: 0.4 }));
  rail.position.set(-5.0, solY + 3.55, Z_MUR + 0.12);
  const porte = new THREE.Mesh(new THREE.BoxGeometry(3.6, 3.5, 0.08), mat(0xffffff, { map: toleTex, roughness: 0.5, metalness: 0.4, color: 0x9aa8b6 }));
  porte.position.set(-2.4, solY + 1.75, Z_MUR + 0.18);
  decor.add(port, rail, porte);

  // Poutres d'acier au plafond, chaîne et crochet.
  const acier = mat(0x2b3138, { metalness: 0.8, roughness: 0.45 });
  for (const z of [-4.5, -1.5, 1.5]) {
    const poutre = new THREE.Mesh(new THREE.BoxGeometry(20, 0.3, 0.2), acier);
    poutre.position.set(0, solY + 5.6, z);
    decor.add(poutre);
  }
  const chaine = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.6, 6), acier);
  chaine.position.set(3.6, solY + 4.3, -3.8);
  const crochet = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.03, 8, 16, Math.PI * 1.4), acier);
  crochet.position.set(3.6, solY + 2.95, -3.8);
  decor.add(chaine, crochet);

  // Caisses estampillées et palettes.
  const caisse = (texteCaisse, graine) => mat(0xffffff, {
    roughness: 0.85,
    map: texture((ctx, L) => {
      planches('#8a6a44', { nb: 4, graine })(ctx, L, L);
      ctx.strokeStyle = '#3a2814'; ctx.lineWidth = 14; ctx.strokeRect(7, 7, L - 14, L - 14);
      ctx.beginPath(); ctx.moveTo(10, 10); ctx.lineTo(L - 10, L - 10); ctx.stroke();
      ctx.fillStyle = 'rgba(25,15,8,0.85)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `700 40px ${POLICE_TITRE}`; ctx.fillText(texteCaisse, L / 2, L / 2, L - 40);
    }, 256),
  });
  const caisses = [
    [-3.9, 0.45, -4.6, 0.9, 'FRAGILE', 0.2], [-3.9, 1.35, -4.6, 0.9, 'DOCK 7', -0.1], [-2.9, 0.4, -5.1, 0.8, 'HAVANA', 0.5],
    [3.9, 0.5, -4.4, 1.0, 'CAL 12', -0.3], [4.8, 0.4, -3.4, 0.8, 'FRAGILE', 0.4], [3.9, 1.45, -4.4, 0.9, 'EXPORT', 0.15],
  ];
  caisses.forEach(([x, y, z, t, txt, rot], k) => {
    if (leger && y > 1) return;
    const c = new THREE.Mesh(new THREE.BoxGeometry(t, t, t), caisse(txt, 40 + k));
    c.position.set(x, solY + y, z); c.rotation.y = rot;
    decor.add(c);
  });
  const palette = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.14, 1.0), mat(0xffffff, { map: texture(planches('#7a5a38', { nb: 5, graine: 50 }), 128), roughness: 0.9 }));
  palette.position.set(1.8, solY + 0.07, -5.2);
  decor.add(palette);

  // Fûts métalliques rouillés.
  const futTex = (couleur, graine) => texture((ctx, L, H) => {
    grain(couleur, { intensite: 0.08, graine })(ctx, L, H);
    const rr = aleatoire(graine);
    for (let k = 0; k < 30; k++) { ctx.fillStyle = `rgba(140,60,25,${rr() * 0.5})`; ctx.beginPath(); ctx.arc(rr() * L, rr() * H, 3 + rr() * 16, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, H * 0.3, L, 6); ctx.fillRect(0, H * 0.68, L, 6);
  }, 256, 256);
  const futs = [[-4.6, -3.2, '#7a2a1a'], [-5.3, -2.6, '#24486a'], [5.2, -2.2, '#7a2a1a']];
  futs.forEach(([x, z, c], k) => {
    const f = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 1.0, 20), mat(0xffffff, { map: futTex(c, 60 + k), roughness: 0.5, metalness: 0.5 }));
    f.position.set(x, solY + 0.5, z);
    decor.add(f);
  });

  // L'ampoule nue au-dessus de la table, au bout de son fil : la seule vraie lumière.
  const suspension = new THREE.Group();
  const fil = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 2.4, 6), mat(0x111111));
  fil.position.y = 1.2;
  const douille = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.1, 12), mat(0x222222, { metalness: 0.6 }));
  douille.position.y = 0.05;
  const ampoule = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), lueur(0xffd9a0, 2.4));
  ampoule.scale.set(1, 1.25, 1);
  ampoule.position.y = -0.06;
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texture((ctx, L) => {
      const g = ctx.createRadialGradient(L / 2, L / 2, 0, L / 2, L / 2, L / 2);
      g.addColorStop(0, 'rgba(255,220,160,0.8)'); g.addColorStop(1, 'rgba(255,220,160,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, L, L);
    }, 64), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  halo.scale.set(0.9, 0.9, 1);
  halo.position.y = -0.06;
  suspension.add(fil, douille, ampoule, halo);
  suspension.position.set(0, 3.1, -0.4);
  decor.add(suspension);
  const lumiere = new THREE.PointLight(0xffc98a, 1.7, 8, 1.6);
  lumiere.position.set(0, 2.95, -0.4);
  decor.add(lumiere);

  // Brume au ras du sol (quelques voiles transparents qui dérivent).
  const voiles = [];
  if (!leger) {
    const brumeTex = texture((ctx, L) => {
      const g = ctx.createRadialGradient(L / 2, L / 2, 0, L / 2, L / 2, L / 2);
      g.addColorStop(0, 'rgba(150,175,200,0.22)'); g.addColorStop(1, 'rgba(150,175,200,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, L, L);
    }, 128);
    for (let k = 0; k < 7; k++) {
      const v = new THREE.Mesh(new THREE.PlaneGeometry(5, 2.2), new THREE.MeshBasicMaterial({ map: brumeTex, transparent: true, depthWrite: false }));
      v.position.set((r() - 0.5) * 12, solY + 0.5 + r() * 0.6, -5 + r() * 4);
      v.userData.vitesse = 0.05 + r() * 0.08;
      decor.add(v);
      voiles.push(v);
    }
  }

  scene.add(decor);

  function animer(t) {
    if (leger) return;
    // L'ampoule se balance, la lumière suit.
    suspension.rotation.z = Math.sin(t * 0.8) * 0.05;
    suspension.rotation.x = Math.sin(t * 0.6 + 1) * 0.03;
    lumiere.position.x = Math.sin(t * 0.8) * -0.12;
    lumiere.intensity = 1.7 * (1 + Math.sin(t * 23) * 0.015);
    voiles.forEach((v, k) => {
      v.position.x += v.userData.vitesse * 0.016;
      if (v.position.x > 7) v.position.x = -7;
      v.lookAt(v.position.x, v.position.y, 20);
      v.material.opacity = 0.75 + Math.sin(t * 0.4 + k) * 0.25;
    });
  }
  return { decor, animer, lumiere };
}
