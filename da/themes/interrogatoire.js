// =====================================================================
// Thème « Interrogatoire » (Undercover) : la salle d'interrogatoire d'un
// QG d'espions. Murs vert administratif, grand miroir sans tain, tableau
// de liège avec photos, coupures de presse et fil rouge, classeurs
// métalliques, horloge, caméra au voyant rouge, panneau de sortie. Une
// seule lampe industrielle au-dessus de la table métallique, cône de
// lumière dans la pénombre ; dossiers « CONFIDENTIEL » et magnétophone au
// centre (Undercover n'a pas de pile : le centre de la table est libre).
//
// Version légère : pas de reflets calculés, pas de cône de lumière, pas de
// clignotement, moins d'objets.
// =====================================================================
import * as THREE from 'three';
import {
  aleatoire, texture, mat, lueur, grain, ambiance, ombreAuSol, dessinerEtiquetteTheme, quandPolices,
} from './outils.js';

export const FOND = 0x0b0d0c;
export const POLICE_TITRE = "'Special Elite', 'Courier New', monospace";
export const POLICE_TEXTE = "'IBM Plex Sans', 'Segoe UI', system-ui, sans-serif";
export const quandPolicesInterrogatoire = (fn) => quandPolices(['48px "Special Elite"', '600 48px "IBM Plex Sans"'], fn);

export function preparerAmbianceInterrogatoire(renderer, scene, { leger = false } = {}) {
  ambiance(renderer, scene, { fond: FOND, ciel: 0x2a3430, sol: 0x0a0a08, intensite: 0.45, leger });
}

// --- Table métallique ronde : acier brossé, bord caoutchouc, pied central ---
export function creerTableInterrogatoire(rayon, { rayonFeutre = rayon - 0.28, leger = false } = {}) {
  const groupe = new THREE.Group();
  const brosse = texture((ctx, L) => {
    ctx.fillStyle = '#7d8584'; ctx.fillRect(0, 0, L, L);
    const r = aleatoire(4);
    for (let k = 0; k < 900; k++) { ctx.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '0,0,0'},${r() * 0.05})`; ctx.fillRect(0, r() * L, L, 1); }
    // Rayures et traces de tasses
    ctx.strokeStyle = 'rgba(30,30,30,0.18)'; ctx.lineWidth = 1;
    for (let k = 0; k < 30; k++) { ctx.beginPath(); const x = r() * L, y = r() * L; ctx.moveTo(x, y); ctx.lineTo(x + (r() - 0.5) * 80, y + (r() - 0.5) * 20); ctx.stroke(); }
    for (let k = 0; k < 4; k++) { ctx.strokeStyle = 'rgba(60,40,20,0.15)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(r() * L, r() * L, 18, 0, Math.PI * 1.7); ctx.stroke(); }
  }, 512);
  const plateau = new THREE.Mesh(new THREE.CylinderGeometry(rayon, rayon, 0.07, 96), mat(0xffffff, { map: brosse, metalness: 0.75, roughness: 0.38 }));
  plateau.position.y = -0.035;
  plateau.receiveShadow = true;
  // Zone de jeu légèrement plus sombre (un sous-main en linoléum).
  const sousMain = new THREE.Mesh(new THREE.CylinderGeometry(rayonFeutre, rayonFeutre, 0.01, 96),
    mat(0xffffff, { map: texture(grain('#2f3a36', { intensite: 0.06, graine: 6 }), 256), roughness: 0.85 }));
  sousMain.position.y = 0.005;
  sousMain.receiveShadow = true;
  const bord = new THREE.Mesh(new THREE.TorusGeometry(rayon - 0.03, 0.05, 10, 128), mat(0x15181a, { roughness: 0.7 }));
  bord.rotation.x = Math.PI / 2;
  bord.position.y = 0.0;
  const acier = mat(0x5a6262, { metalness: 0.8, roughness: 0.4 });
  const pied = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.15, 16), acier);
  pied.position.y = -0.62;
  const socle = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.75, 0.06, 32), acier);
  socle.position.y = -1.17;
  groupe.add(plateau, sousMain, bord, pied, socle, ombreAuSol(rayon * 1.35, -1.2));
  return { groupe, feutre: sousMain };
}

// --- Chaise d'interrogatoire : acier gris, assise en contreplaqué ---
let MAT_CH = null, MAT_BOIS = null;
export function creerChaiseInterrogatoire(dir, rayon = 2.42, solY = -1.2) {
  if (!MAT_CH) { MAT_CH = mat(0x6a7272, { metalness: 0.75, roughness: 0.4 }); MAT_BOIS = mat(0x6b5a44, { roughness: 0.7 }); }
  const c = new THREE.Group();
  const h = 0.72;
  const assise = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.46), MAT_BOIS);
  assise.position.y = h;
  const dossier = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.26, 0.03), MAT_BOIS);
  dossier.position.set(0, h + 0.46, 0.24);
  c.add(assise, dossier);
  for (const [x, z] of [[-0.22, -0.2], [0.22, -0.2], [-0.22, 0.22], [0.22, 0.22]]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, h, 8), MAT_CH);
    p.position.set(x, h / 2, z);
    c.add(p);
  }
  for (const x of [-0.22, 0.22]) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.6, 8), MAT_CH);
    m.position.set(x, h + 0.3, 0.23);
    c.add(m);
  }
  c.position.set(dir.x * rayon, solY, dir.z * rayon);
  c.rotation.y = Math.atan2(dir.x, dir.z);
  return c;
}

// --- Étiquettes : étiquette de dossier, lettres de machine à écrire ---
export function dessinerEtiquetteInterrogatoire(ctx, texte, etat) {
  dessinerEtiquetteTheme(ctx, texte, etat, {
    police: POLICE_TEXTE, graisse: 700, rayon: 0.1,
    fond: ['#ead8b0', '#d6bf8e'], fondActif: ['#f472b6', '#be185d'],
    bord: 'rgba(90,70,40,0.75)', bordActif: '#ffe4f1', texte: '#2a2014', texteActif: '#ffffff',
  });
}

// Tampon « CONFIDENTIEL » sur papier kraft.
function dossierTex(titre, graine) {
  return texture((ctx, L, H) => {
    grain('#c9a46a', { intensite: 0.06, graine, nb: 1500 })(ctx, L, H);
    ctx.fillStyle = '#b38e55'; ctx.fillRect(L * 0.62, 0, L * 0.3, H * 0.08);
    ctx.save(); ctx.translate(L / 2, H / 2); ctx.rotate(-0.25);
    ctx.strokeStyle = 'rgba(170,20,30,0.8)'; ctx.lineWidth = 6; ctx.strokeRect(-L * 0.38, -H * 0.1, L * 0.76, H * 0.2);
    ctx.fillStyle = 'rgba(170,20,30,0.85)'; ctx.font = `700 ${Math.round(H * 0.11)}px ${POLICE_TITRE}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(titre, 0, 4, L * 0.72);
    ctx.restore();
  }, 256, 340);
}

// --- Le décor ---
export function creerDecorInterrogatoire(scene, { nom = '', solY = -1.2, leger = false } = {}) {
  const decor = new THREE.Group();
  const r = aleatoire(91);
  const Z_MUR = -6.2;

  // Sol : linoléum à damier usé.
  const sol = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), mat(0xffffff, {
    roughness: 0.6,
    map: texture((ctx, L) => {
      const n = 8, p = L / n;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { ctx.fillStyle = (i + j) % 2 ? '#2a2d2b' : '#3e423f'; ctx.fillRect(i * p, j * p, p, p); }
      const rr = aleatoire(3);
      for (let k = 0; k < 2500; k++) { ctx.fillStyle = `rgba(${rr() < 0.5 ? '255,255,255' : '0,0,0'},${rr() * 0.06})`; ctx.fillRect(rr() * L, rr() * L, 2, 2); }
    }, 256, 256, [10, 10]),
  }));
  sol.rotation.x = -Math.PI / 2;
  sol.position.y = solY;
  decor.add(sol);

  // Murs vert administratif, soubassement plus sombre.
  const murTex = texture((ctx, L, H) => {
    grain('#3c4a43', { intensite: 0.05, graine: 7, nb: 4000 })(ctx, L, H);
    ctx.fillStyle = '#26302b'; ctx.fillRect(0, H * 0.7, L, H * 0.3);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, H * 0.7, L, 4);
    const rr = aleatoire(8);
    for (let k = 0; k < 10; k++) { ctx.fillStyle = `rgba(0,0,0,${rr() * 0.12})`; ctx.fillRect(rr() * L, rr() * H * 0.7, 2, 30 + rr() * 80); }
  }, 512, 512, [4, 1]);
  const mur = new THREE.Mesh(new THREE.PlaneGeometry(26, 7.5), mat(0xffffff, { map: murTex, roughness: 0.9 }));
  mur.position.set(0, solY + 3.75, Z_MUR);
  decor.add(mur);
  for (const cote of [-1, 1]) {
    const lat = new THREE.Mesh(new THREE.PlaneGeometry(16, 7.5), mat(0xffffff, { map: murTex, roughness: 0.9 }));
    lat.rotation.y = -cote * Math.PI / 2;
    lat.position.set(cote * 9, solY + 3.75, -1);
    decor.add(lat);
  }

  // Grand miroir sans tain, cadre aluminium.
  const alu = mat(0x9aa2a6, { metalness: 0.85, roughness: 0.3 });
  const cadreMiroir = new THREE.Mesh(new THREE.BoxGeometry(5.2, 2.3, 0.1), alu);
  cadreMiroir.position.set(-0.6, solY + 2.6, Z_MUR + 0.05);
  const miroir = new THREE.Mesh(new THREE.PlaneGeometry(5.0, 2.1),
    leger ? mat(0x141a1c, { roughness: 0.25, metalness: 0.5 }) : mat(0x2a3236, { roughness: 0.08, metalness: 1.0 }));
  miroir.position.set(-0.6, solY + 2.6, Z_MUR + 0.11);
  // Une silhouette devine-t-on derrière le miroir ?
  const silhouette = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.4), new THREE.MeshBasicMaterial({
    transparent: true, depthWrite: false,
    map: texture((ctx, L, H) => {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.arc(L / 2, H * 0.28, L * 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(L * 0.2, H * 0.1, L * 0.6, H * 0.06);
      ctx.beginPath(); ctx.ellipse(L / 2, H, L * 0.45, H * 0.5, 0, Math.PI, 0); ctx.fill();
    }, 128, 200),
  }));
  silhouette.position.set(0.9, solY + 2.4, Z_MUR + 0.12);
  decor.add(cadreMiroir, miroir, silhouette);

  // Tableau de liège : photos, coupures, fil rouge (avec le nom du jeu).
  const liegeCanvas = document.createElement('canvas');
  liegeCanvas.width = 768; liegeCanvas.height = 512;
  const liegeTex = new THREE.CanvasTexture(liegeCanvas);
  liegeTex.colorSpace = THREE.SRGBColorSpace;
  const dessinerLiege = () => {
    const ctx = liegeCanvas.getContext('2d'), L = 768, H = 512, rr = aleatoire(17);
    grain('#9a7448', { intensite: 0.12, graine: 9, nb: 9000 })(ctx, L, H);
    const points = [];
    const photo = (x, y, w, h, rot, texteP) => {
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
      ctx.fillStyle = '#f2ede2'; ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.fillStyle = '#2e3236'; ctx.fillRect(-w / 2 + 8, -h / 2 + 8, w - 16, h - 34);
      ctx.fillStyle = 'rgba(200,200,200,0.5)'; ctx.beginPath(); ctx.arc(0, -h / 2 + 8 + (h - 34) * 0.38, w * 0.15, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, -h / 2 + h - 34, w * 0.3, h * 0.2, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#2a2014'; ctx.font = `20px ${POLICE_TITRE}`; ctx.textAlign = 'center'; ctx.fillText(texteP, 0, h / 2 - 9);
      ctx.restore();
      points.push([x, y - h / 2 + 6]);
    };
    photo(110, 140, 120, 150, -0.08, 'SUSPECT 1');
    photo(330, 120, 120, 150, 0.06, 'MR WHITE ?');
    photo(560, 150, 120, 150, -0.04, 'SUSPECT 3');
    photo(220, 360, 120, 150, 0.1, 'CIVIL ?');
    photo(470, 380, 120, 150, -0.07, '???');
    // Coupure de presse avec le nom du jeu
    ctx.save(); ctx.translate(660, 380); ctx.rotate(0.05);
    ctx.fillStyle = '#e9e3d2'; ctx.fillRect(-90, -70, 180, 140);
    ctx.fillStyle = '#1a1a1a'; ctx.font = `30px ${POLICE_TITRE}`; ctx.textAlign = 'center'; ctx.fillText(nom, 0, -34, 170);
    ctx.fillStyle = 'rgba(30,30,30,0.5)'; for (let k = 0; k < 6; k++) ctx.fillRect(-78, -14 + k * 14, 156 - rr() * 40, 6);
    ctx.restore();
    points.push([660, 316]);
    // Fil rouge entre les punaises
    ctx.strokeStyle = '#c4101c'; ctx.lineWidth = 3;
    ctx.beginPath();
    [[0, 1], [1, 2], [1, 3], [3, 4], [2, 5], [4, 5]].forEach(([a, b]) => { ctx.moveTo(...points[a]); ctx.lineTo(...points[b]); });
    ctx.stroke();
    points.forEach(([x, y]) => { ctx.fillStyle = '#e0202c'; ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill(); });
    liegeTex.needsUpdate = true;
  };
  dessinerLiege();
  quandPolicesInterrogatoire(dessinerLiege);
  const liege = new THREE.Mesh(new THREE.BoxGeometry(3.0, 2.0, 0.06), [alu, alu, alu, alu, mat(0xffffff, { map: liegeTex, roughness: 0.9 }), alu]);
  liege.position.set(4.6, solY + 2.6, Z_MUR + 0.06);
  decor.add(liege);

  // Classeurs métalliques.
  const classeurMat = mat(0x56605c, { metalness: 0.55, roughness: 0.5 });
  const poignee = mat(0xb0b6b8, { metalness: 0.9, roughness: 0.25 });
  for (const [x, z, rot] of [[-4.6, Z_MUR + 0.45, 0], [-3.8, Z_MUR + 0.45, 0]]) {
    const cl = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.9, 0.75), classeurMat);
    cl.position.set(x, solY + 0.95, z); cl.rotation.y = rot;
    decor.add(cl);
    for (let k = 0; k < 4; k++) {
      const pg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 0.04), poignee);
      pg.position.set(x, solY + 0.3 + k * 0.45, z + 0.39);
      decor.add(pg);
    }
  }
  // Un dossier qui dépasse d'un tiroir
  const dossierSol = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.03, 0.38), mat(0xffffff, { map: dossierTex('TOP SECRET', 3) }));
  dossierSol.position.set(-3.5, solY + 0.02, Z_MUR + 1.5); dossierSol.rotation.y = 0.6;
  decor.add(dossierSol);

  // Horloge murale et panneau de sortie.
  const horlogeCanvas = document.createElement('canvas');
  horlogeCanvas.width = horlogeCanvas.height = 128;
  const horlogeTex = new THREE.CanvasTexture(horlogeCanvas);
  horlogeTex.colorSpace = THREE.SRGBColorSpace;
  const horloge = new THREE.Mesh(new THREE.CircleGeometry(0.32, 32), new THREE.MeshStandardMaterial({ map: horlogeTex, roughness: 0.6 }));
  horloge.position.set(2.2, solY + 4.4, Z_MUR + 0.04);
  decor.add(horloge);
  const dessinerHorloge = (t) => {
    const ctx = horlogeCanvas.getContext('2d');
    ctx.fillStyle = '#e9e6dc'; ctx.beginPath(); ctx.arc(64, 64, 62, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#222'; ctx.lineWidth = 6; ctx.stroke();
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; ctx.fillStyle = '#222'; ctx.fillRect(64 + Math.cos(a) * 50 - 2, 64 + Math.sin(a) * 50 - 2, 4, 4); }
    const aiguille = (a, l, w) => { ctx.strokeStyle = '#111'; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(64, 64); ctx.lineTo(64 + Math.cos(a) * l, 64 + Math.sin(a) * l); ctx.stroke(); };
    aiguille(-Math.PI / 2 + 2.6, 28, 5); aiguille(-Math.PI / 2 + t * 0.1, 42, 3);
    ctx.strokeStyle = '#c4101c'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(64, 64); ctx.lineTo(64 + Math.cos(-Math.PI / 2 + t * 6.28 / 60) * 48, 64 + Math.sin(-Math.PI / 2 + t * 6.28 / 60) * 48); ctx.stroke();
    horlogeTex.needsUpdate = true;
  };
  dessinerHorloge(0);
  const sortie = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.28), new THREE.MeshBasicMaterial({
    map: texture((ctx, L, H) => {
      ctx.fillStyle = '#0f7a3a'; ctx.fillRect(0, 0, L, H);
      ctx.fillStyle = '#e9ffe9'; ctx.font = '700 44px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('SORTIE', L / 2, H / 2 + 2);
    }, 256, 90),
  }));
  sortie.position.set(-6.4, solY + 3.7, Z_MUR + 0.04);
  decor.add(sortie);

  // Caméra de surveillance dans le coin, voyant rouge.
  const camera = new THREE.Group();
  const boitier = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.22), mat(0xd8dcd8, { roughness: 0.5 }));
  const objectif = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.08, 16), mat(0x111111, { metalness: 0.6, roughness: 0.2 }));
  objectif.rotation.z = Math.PI / 2; objectif.position.x = 0.28;
  const voyant = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), lueur(0xff2030, 2.5));
  voyant.position.set(0.2, 0.08, 0.1);
  camera.add(boitier, objectif, voyant);
  camera.position.set(-7.0, solY + 5.0, Z_MUR + 0.6);
  camera.rotation.set(0, -0.7, -0.45);
  decor.add(camera);

  // La lampe industrielle au-dessus de la table, et son cône de lumière.
  const lampe = new THREE.Group();
  const abatJour = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.32, 32, 1, true), new THREE.MeshStandardMaterial({ color: 0x2f4a3c, metalness: 0.5, roughness: 0.5, side: THREE.DoubleSide }));
  const ampoule = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), lueur(0xfff2d8, 2.6));
  ampoule.position.y = -0.12;
  const fil = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 2, 6), mat(0x111111));
  fil.position.y = 1.15;
  lampe.add(abatJour, ampoule, fil);
  lampe.position.set(0, 3.0, -0.3);
  decor.add(lampe);
  if (!leger) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(2.3, 3.0, 40, 1, true), new THREE.MeshBasicMaterial({
      color: 0xfff2d8, transparent: true, opacity: 0.05, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    }));
    cone.position.set(0, 1.45, -0.3);
    decor.add(cone);
  }
  const lumiere = new THREE.PointLight(0xfff2d8, 2.0, 7.5, 1.7);
  lumiere.position.set(0, 2.75, -0.3);
  decor.add(lumiere);

  scene.add(decor);

  // Sur la table, au centre : une pile de dossiers, un magnétophone, un cendrier.
  const centre = new THREE.Group();
  [['CONFIDENTIEL', -0.05, 0.2], ['UNDERCOVER', 0.1, -0.35], ['DOSSIER 7', -0.2, 0.9]].forEach(([t, y, rot], k) => {
    if (leger && k === 2) return;
    const d = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 0.38), mat(0xffffff, { map: dossierTex(t, 20 + k), roughness: 0.85 }));
    d.position.set(-0.15 + k * 0.05, 0.02 + k * 0.022, 0.05 + y);
    d.rotation.y = rot;
    centre.add(d);
  });
  const magneto = new THREE.Group();
  const corps = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 0.22), mat(0x2b2d2e, { roughness: 0.5 }));
  corps.position.y = 0.04;
  const bobine = mat(0xc8c8c8, { metalness: 0.6, roughness: 0.3 });
  for (const x of [-0.08, 0.08]) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 16), bobine);
    b.position.set(x, 0.09, -0.02);
    magneto.add(b);
  }
  const voyantMagneto = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), lueur(0xff2030, 2.5));
  voyantMagneto.position.set(0.13, 0.085, 0.08);
  magneto.add(corps, voyantMagneto);
  magneto.position.set(0.38, 0.01, -0.25);
  magneto.rotation.y = -0.4;
  centre.add(magneto);
  const cendrier = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, 0.04, 20), mat(0x8a9a9a, { metalness: 0.7, roughness: 0.3 }));
  cendrier.position.set(0.25, 0.03, 0.4);
  centre.add(cendrier);
  scene.add(centre);

  let derniereSeconde = -1;
  function animer(t) {
    if (leger) return;
    const allume = Math.floor(t * 1.2) % 2 === 0;
    voyant.visible = allume;
    voyantMagneto.visible = Math.floor(t * 2) % 2 === 0;
    const s = Math.floor(t);
    if (s !== derniereSeconde) { derniereSeconde = s; dessinerHorloge(t); }
    lumiere.intensity = 2.0 * (1 + Math.sin(t * 31) * 0.01);
  }
  return { decor, animer, lumiere, centre };
}
