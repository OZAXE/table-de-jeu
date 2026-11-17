// =====================================================================
// Thème « Salon de coloc » (Picopoly) : le plateau est posé sur la table
// basse d'un salon d'étudiants, un soir de soirée. Table basse en pin,
// tapis berbère, parquet, canapé au fond avec ses coussins, canettes et
// boîte de pizza, bol de chips, cendrier, guirlande lumineuse qui
// scintille, fenêtre sur les toits de Poitiers la nuit (le clocher de
// Notre-Dame-la-Grande au loin), affiches de concert, lampadaire.
//
// Version légère : pas de reflets calculés, guirlande fixe, moins
// d'objets sur la table, pas de lumière du lampadaire.
// =====================================================================
import * as THREE from 'three';
import { aleatoire, texture, mat, lueur, veinage, grain, planches, ambiance, ombreAuSol, quandPolices, lisserTheme } from './outils.js';

export const FOND = 0x0f0b1a;
export const POLICE_TITRE = "'Permanent Marker', 'Comic Sans MS', cursive";
export const POLICE_TEXTE = "Fredoka, system-ui, sans-serif";
export const quandPolicesSalon = (fn) => quandPolices(['48px "Permanent Marker"', '600 48px Fredoka'], fn);

export function preparerAmbianceSalon(renderer, scene, { leger = false } = {}) {
  ambiance(renderer, scene, { fond: FOND, ciel: 0x7a6ab8, sol: 0x1a0f1c, intensite: 0.5, leger });
}

// demi : demi-côté du socle du plateau ; dessous : y du dessous du socle.
export function creerSalon(scene, { demi = 5.95, dessous = -0.55, leger = false } = {}) {
  const decor = new THREE.Group();
  const r = aleatoire(77);
  const SOL = dessous - 2.4;
  const T = demi + 1.3;                // demi-côté de la table basse

  // --- Parquet et tapis ---
  const parquet = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), mat(0xffffff, {
    map: texture(planches('#8a5a34', { nb: 8, vertical: true, graine: 21, usure: 0.15 }), 512, 512, [12, 12]), roughness: 0.6,
  }));
  parquet.rotation.x = -Math.PI / 2; parquet.position.y = SOL; parquet.receiveShadow = true;
  const tapis = new THREE.Mesh(new THREE.PlaneGeometry(2 * T + 7, 2 * T + 5), mat(0xffffff, {
    roughness: 1,
    map: texture((ctx, L, H) => {
      grain('#b8a6c8', { intensite: 0.08, graine: 9, nb: 9000 })(ctx, L, H);
      // Losanges berbères et franges.
      ctx.strokeStyle = 'rgba(60,40,50,0.55)'; ctx.lineWidth = 6;
      for (let y = 60; y < H - 40; y += 90) {
        ctx.beginPath();
        for (let x = 30; x <= L - 30; x += 60) ctx.lineTo(x, y + ((x / 60) % 2 ? 30 : -30));
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(168,85,247,0.55)'; ctx.lineWidth = 4;
      ctx.strokeRect(20, 20, L - 40, H - 40);
    }, 512, 512),
  }));
  tapis.rotation.x = -Math.PI / 2; tapis.position.y = SOL + 0.01; tapis.receiveShadow = true;
  decor.add(parquet, tapis);

  // --- Table basse en pin, plateau débordant, quatre pieds carrés ---
  const pin = mat(0xffffff, { map: texture(veinage('#b9875a', 31), 512, 512), roughness: 0.55 });
  const plateau = new THREE.Mesh(new THREE.BoxGeometry(2 * T, 0.32, 2 * T), pin);
  plateau.position.y = dessous - 0.16; plateau.receiveShadow = true; plateau.castShadow = !leger;
  decor.add(plateau);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
    const pied = new THREE.Mesh(new THREE.BoxGeometry(0.5, dessous - 0.32 - SOL, 0.5), pin);
    pied.position.set(sx * (T - 0.5), (dessous - 0.32 + SOL) / 2, sz * (T - 0.5));
    decor.add(pied);
  });
  decor.add(ombreAuSol(T * 1.45, SOL + 0.01));

  // --- Objets sur la table (dans la marge autour du plateau) ---
  const yTable = dessous;
  const marge = (demi + T) / 2;          // milieu de la marge
  function canette(x, z, couleur, couchee = false) {
    const g = new THREE.Group();
    const corps = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.92, 20), mat(0xffffff, {
      metalness: 0.6, roughness: 0.35,
      map: texture((ctx, L, H) => {
        ctx.fillStyle = couleur; ctx.fillRect(0, 0, L, H);
        ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(0, H * 0.38, L, H * 0.24);
        ctx.fillStyle = couleur; ctx.font = `900 ${H * 0.18}px Fredoka, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        for (let k = 0; k < 2; k++) ctx.fillText('BIÈRE', L * (0.25 + k * 0.5), H * 0.5);
      }, 256, 128),
    }));
    const dessus = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.27, 0.06, 20), mat(0xcfd3d8, { metalness: 0.9, roughness: 0.3 }));
    dessus.position.y = 0.49;
    g.add(corps, dessus);
    corps.castShadow = !leger;
    if (couchee) { g.rotation.z = Math.PI / 2; g.rotation.y = r() * Math.PI; g.position.set(x, yTable + 0.27, z); }
    else g.position.set(x, yTable + 0.46, z);
    decor.add(g);
  }
  canette(marge, -marge, '#a855f7');
  canette(marge - 0.65, -marge + 0.2, '#e8543f');
  canette(-marge, marge * 0.35, '#23a35a', true);
  canette(-marge + 0.1, -marge, '#2f7fd8');
  if (!leger) canette(marge, marge * 0.2, '#f2c200');

  // Bol de chips.
  const bol = new THREE.Mesh(new THREE.SphereGeometry(0.6, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat(0xe8543f, { roughness: 0.4, side: THREE.DoubleSide }));
  bol.position.set(-marge, yTable + 0.6, marge); bol.castShadow = !leger;
  decor.add(bol);
  const matChips = mat(0xf0c050, { roughness: 0.7 });
  for (let k = 0; k < (leger ? 6 : 14); k++) {
    const c = new THREE.Mesh(new THREE.CircleGeometry(0.16, 8), matChips);
    const a = r() * Math.PI * 2, d = r() * 0.4;
    c.position.set(-marge + Math.cos(a) * d, yTable + 0.48 + r() * 0.12, marge + Math.sin(a) * d);
    c.rotation.set(-Math.PI / 2 + (r() - 0.5) * 1.2, 0, r() * 3);
    decor.add(c);
  }
  // Cendrier en verre.
  const cendrier = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.38, 0.16, 24), mat(0x9fb8c8, { transparent: true, opacity: 0.55, roughness: 0.1 }));
  cendrier.position.set(marge, yTable + 0.08, marge * 0.7);
  decor.add(cendrier);

  // Boîte de pizza ouverte, posée sur le tapis devant la table.
  const carton = mat(0xc9a06a, { roughness: 0.9 });
  const boite = new THREE.Group();
  const fond = new THREE.Mesh(new THREE.BoxGeometry(3, 0.12, 3), carton);
  const couvercle = new THREE.Mesh(new THREE.BoxGeometry(3, 0.05, 3), mat(0xffffff, {
    roughness: 0.9,
    map: texture((ctx, L) => {
      ctx.fillStyle = '#c9a06a'; ctx.fillRect(0, 0, L, L);
      ctx.fillStyle = '#b8312f'; ctx.font = `900 ${L * 0.16}px Fredoka, sans-serif`; ctx.textAlign = 'center';
      ctx.fillText('PIZZA', L / 2, L * 0.52); ctx.font = `600 ${L * 0.07}px Fredoka, sans-serif`; ctx.fillText('livrée chaude', L / 2, L * 0.64);
    }, 256),
  }));
  couvercle.position.set(0, 1.5, -1.5); couvercle.rotation.x = Math.PI / 2 - 0.25;
  const pizza = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 0.08, 6, 1, false, 0, Math.PI * 2 * 4 / 6), mat(0xffffff, {
    roughness: 0.8,
    map: texture((ctx, L) => {
      ctx.fillStyle = '#e8a04a'; ctx.fillRect(0, 0, L, L);
      ctx.fillStyle = '#d8572a'; ctx.beginPath(); ctx.arc(L / 2, L / 2, L * 0.42, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f6d878';
      const rr = aleatoire(5);
      for (let k = 0; k < 60; k++) { ctx.beginPath(); ctx.arc(L * (0.15 + rr() * 0.7), L * (0.15 + rr() * 0.7), 6 + rr() * 8, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#8a1e1e';
      for (let k = 0; k < 14; k++) { ctx.beginPath(); ctx.arc(L * (0.2 + rr() * 0.6), L * (0.2 + rr() * 0.6), 12, 0, 7); ctx.fill(); }
    }, 256),
  }));
  pizza.position.y = 0.1;
  boite.add(fond, couvercle, pizza);
  boite.position.set(T + 2.6, SOL + 0.07, T - 1); boite.rotation.y = -0.4;
  decor.add(boite);

  // --- Le fond de la pièce : mur, fenêtre, canapé, affiches, guirlande ---
  const ZM = -T - 7;                     // mur du fond
  const mur = new THREE.Mesh(new THREE.PlaneGeometry(90, 26), mat(0xffffff, {
    roughness: 0.95, map: texture(grain('#3a2f5a', { intensite: 0.07, graine: 3, nb: 6000 }), 512, 256, [6, 2]),
  }));
  mur.position.set(0, SOL + 13, ZM);
  const murG = mur.clone(); murG.rotation.y = Math.PI / 2; murG.position.set(-T - 12, SOL + 13, 0);
  const murD = mur.clone(); murD.rotation.y = -Math.PI / 2; murD.position.set(T + 12, SOL + 13, 0);
  decor.add(mur, murG, murD);

  // Fenêtre sur les toits de Poitiers la nuit.
  const vue = new THREE.Mesh(new THREE.PlaneGeometry(9, 6), new THREE.MeshBasicMaterial({
    map: texture((ctx, L, H) => {
      const ciel = ctx.createLinearGradient(0, 0, 0, H);
      ciel.addColorStop(0, '#0b1030'); ciel.addColorStop(1, '#3a2a6a');
      ctx.fillStyle = ciel; ctx.fillRect(0, 0, L, H);
      const rr = aleatoire(8);
      for (let k = 0; k < 90; k++) { ctx.fillStyle = `rgba(255,255,255,${0.3 + rr() * 0.7})`; ctx.fillRect(rr() * L, rr() * H * 0.55, 1.5, 1.5); }
      ctx.fillStyle = '#fff6d0'; ctx.beginPath(); ctx.arc(L * 0.8, H * 0.2, 26, 0, 7); ctx.fill();
      ctx.fillStyle = '#3a2a6a'; ctx.beginPath(); ctx.arc(L * 0.8 + 12, H * 0.2 - 6, 24, 0, 7); ctx.fill();
      // Toits en tuiles et cheminées, quelques fenêtres allumées.
      ctx.fillStyle = '#120c22';
      let x = 0;
      while (x < L) {
        const l = 50 + rr() * 70, h = H * (0.25 + rr() * 0.2);
        ctx.beginPath(); ctx.moveTo(x, H); ctx.lineTo(x, H - h); ctx.lineTo(x + l / 2, H - h - 26 - rr() * 18); ctx.lineTo(x + l, H - h); ctx.lineTo(x + l, H); ctx.fill();
        if (rr() < 0.5) ctx.fillRect(x + l * 0.7, H - h - 30, 8, 26);
        for (let f = 0; f < 3; f++) if (rr() < 0.45) { ctx.fillStyle = '#ffcf6a'; ctx.fillRect(x + 10 + rr() * (l - 24), H - h + 14 + rr() * (h - 40), 10, 13); ctx.fillStyle = '#120c22'; }
        x += l - 4;
      }
      // Le clocher de Notre-Dame-la-Grande, au loin.
      ctx.fillStyle = '#1a1230';
      ctx.fillRect(L * 0.3, H * 0.4, 34, H * 0.3);
      ctx.beginPath(); ctx.moveTo(L * 0.3 - 4, H * 0.4); ctx.lineTo(L * 0.3 + 17, H * 0.26); ctx.lineTo(L * 0.3 + 38, H * 0.4); ctx.fill();
    }, 512, 340),
  }));
  vue.position.set(-6, SOL + 9, ZM + 0.02);
  const matCadre = mat(0xf2ede4, { roughness: 0.6 });
  const cadre = new THREE.Group();
  [[0, 3.1, 9.5, 0.3], [0, -3.1, 9.5, 0.3], [-4.6, 0, 0.3, 6.4], [4.6, 0, 0.3, 6.4], [0, 0, 0.18, 6], [0, 0, 9, 0.18]].forEach(([x, y, l, h]) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(l, h, 0.2), matCadre);
    b.position.set(x, y, 0); cadre.add(b);
  });
  cadre.position.copy(vue.position).add(new THREE.Vector3(0, 0, 0.1));
  decor.add(vue, cadre);

  // Affiches de concert, un peu de travers.
  [['NUIT\nBLANCHE', '#a855f7', '#fde047', 5.5, 0.06], ['ROCK\nPOITIERS', '#e8543f', '#fff', 10.5, -0.08], ['TOURNÉE\nDES BARS', '#2f7fd8', '#fde047', -16, 0.05]].forEach(([texte, fondA, encre, x, rot]) => {
    const a = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 4.4), new THREE.MeshStandardMaterial({
      roughness: 0.8,
      map: texture((ctx, L, H) => {
        ctx.fillStyle = fondA; ctx.fillRect(0, 0, L, H);
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.arc(L / 2, H * 0.68, L * 0.32, 0, 7); ctx.fill();
        ctx.fillStyle = encre; ctx.font = `900 ${L * 0.17}px Fredoka, sans-serif`; ctx.textAlign = 'center';
        texte.split('\n').forEach((l, k) => ctx.fillText(l, L / 2, H * 0.2 + k * L * 0.19));
      }, 256, 352),
    }));
    a.position.set(x, SOL + 9.5, ZM + 0.05); a.rotation.z = rot;
    decor.add(a);
  });

  // Canapé violet au fond, avec ses coussins.
  const tissu = mat(0xffffff, { roughness: 0.95, map: texture(grain('#5b2a86', { intensite: 0.1, graine: 4, nb: 5000 }), 256, 256) });
  const canape = new THREE.Group();
  const assise = new THREE.Mesh(new THREE.BoxGeometry(13, 1.6, 3.6), tissu); assise.position.y = 0.8;
  const dossier = new THREE.Mesh(new THREE.BoxGeometry(13, 2.6, 1.1), tissu); dossier.position.set(0, 2.1, -1.3);
  const accG = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.3, 3.6), tissu); accG.position.set(-6.5, 1.15, 0);
  const accD = accG.clone(); accD.position.x = 6.5;
  canape.add(assise, dossier, accG, accD);
  [['#fde047', -3.5], ['#2fd8c8', 0], ['#ff7eb6', 3.5]].forEach(([c, x]) => {
    const cou = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.6, 0.5), mat(c, { roughness: 0.9 }));
    cou.position.set(x, 2.3, -0.6); cou.rotation.set(-0.25, 0, (r() - 0.5) * 0.3);
    canape.add(cou);
  });
  canape.position.set(3, SOL, ZM + 2.6);
  decor.add(canape);

  // Lampadaire (abat-jour orangé) dans le coin.
  const lampe = new THREE.Group();
  const tige = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 9, 8), mat(0x222222, { metalness: 0.7, roughness: 0.4 }));
  tige.position.y = 4.5;
  const abat = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.4, 1.4, 24, 1, true), new THREE.MeshStandardMaterial({ color: 0xffb060, emissive: 0xff9a40, emissiveIntensity: 0.9, side: THREE.DoubleSide }));
  abat.position.y = 9.2;
  lampe.add(tige, abat);
  lampe.position.set(-T - 7, SOL, ZM + 3);
  decor.add(lampe);
  if (!leger) {
    const chaude = new THREE.PointLight(0xffa850, 26, 30, 1.6);
    chaude.position.set(-T - 7, SOL + 8.6, ZM + 3);
    decor.add(chaude);
  }

  // Guirlande lumineuse : festons le long du mur du fond.
  const ampoules = [];
  const COULEURS = [0xffd27a, 0xff7eb6, 0x9be8ff, 0xc89bff, 0xfff1a8];
  const nb = leger ? 28 : 54;
  const fil = [];
  for (let k = 0; k < nb; k++) {
    const u = k / (nb - 1);
    const x = -22 + u * 44;
    const y = SOL + 14 - Math.abs(Math.sin(u * Math.PI * 5)) * 1.4;
    fil.push(new THREE.Vector3(x, y + 0.12, ZM + 0.3));
    const m = lueur(COULEURS[k % COULEURS.length], 1.4);
    const a = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), m);
    a.position.set(x, y, ZM + 0.3);
    decor.add(a);
    ampoules.push({ m, base: new THREE.Color(COULEURS[k % COULEURS.length]), phase: r() * Math.PI * 2 });
  }
  decor.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(fil), new THREE.LineBasicMaterial({ color: 0x1a1a1a })));

  // Reflets d'ambiance très discrets : la pièce reste dans la pénombre.
  lisserTheme(decor, 0.12);
  scene.add(decor);

  function animer(t) {
    if (leger) return;
    ampoules.forEach((a, k) => {
      const i = 1.0 + 0.55 * Math.sin(t * 2.2 + a.phase) + (Math.sin(t * 0.7 + k) > 0.96 ? 0.6 : 0);
      a.m.color.copy(a.base).multiplyScalar(i);
    });
  }
  return { decor, animer, sol: SOL };
}
