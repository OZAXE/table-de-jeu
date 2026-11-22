// =====================================================================
// Thème « Pub » (Le Juste Pinte) : un soir de quiz dans un pub à
// l'anglaise. Murs vert bouteille au-dessus d'une boiserie, parquet sombre,
// grand tableau noir où la question s'écrit à la craie, comptoir et
// étagère de bouteilles, cible de fléchettes, guirlande d'ampoules, lampe
// en laiton au-dessus d'une table ronde en chêne. Le centre de la table
// reste libre : la réglette des réponses s'y pose.
//
// Version légère : pas de reflets calculés, moins de bouteilles et
// d'ampoules, pas de scintillement.
// =====================================================================
import * as THREE from 'three';
import {
  aleatoire, texture, mat, lueur, grain, planches, veinage, ambiance, ombreAuSol, dessinerEtiquetteTheme, quandPolices,
} from './outils.js';

export const FOND = 0x0d1410;
export const POLICE_TITRE = "'Bree Serif', Georgia, serif";
export const POLICE_TEXTE = "Outfit, 'Segoe UI', system-ui, sans-serif";
export const POLICE_CRAIE = "'Caveat Brush', 'Comic Sans MS', cursive";
export const quandPolicesPub = (fn) => quandPolices(['48px "Bree Serif"', '48px "Caveat Brush"', '700 48px Outfit'], fn);

export function preparerAmbiancePub(renderer, scene, { leger = false } = {}) {
  ambiance(renderer, scene, { fond: FOND, ciel: 0x3a4a3a, sol: 0x140c06, intensite: 0.5, leger });
}

// --- Table ronde de pub : chêne verni, cerclage laiton, pied en fonte ---
export function creerTablePub(rayon, { rayonFeutre = rayon - 0.22, leger = false } = {}) {
  const groupe = new THREE.Group();
  const chene = texture(veinage('#5a3a1e', 12), 512);
  const plateau = new THREE.Mesh(new THREE.CylinderGeometry(rayon, rayon * 0.98, 0.08, 96),
    mat(0xffffff, { map: chene, roughness: 0.32, metalness: 0.05 }));
  plateau.position.y = -0.04;
  plateau.receiveShadow = true;
  // Plateau intérieur un peu plus clair et usé (des années de pintes posées).
  const interieur = new THREE.Mesh(new THREE.CylinderGeometry(rayonFeutre, rayonFeutre, 0.01, 96), mat(0xffffff, {
    roughness: 0.4,
    map: texture((ctx, L) => {
      veinage('#6b4626', 13)(ctx, L, L);
      const r = aleatoire(21);
      for (let k = 0; k < 14; k++) {
        ctx.strokeStyle = `rgba(40,22,10,${0.08 + r() * 0.1})`; ctx.lineWidth = 3 + r() * 3;
        ctx.beginPath(); ctx.arc(r() * L, r() * L, 16 + r() * 10, 0, Math.PI * (1.2 + r() * 0.8)); ctx.stroke();
      }
    }, 512),
  }));
  interieur.position.y = 0.005;
  interieur.receiveShadow = true;
  const cerclage = new THREE.Mesh(new THREE.TorusGeometry(rayon - 0.01, 0.035, 10, 128),
    mat(0xc9a25a, { metalness: 0.9, roughness: 0.28 }));
  cerclage.rotation.x = Math.PI / 2;
  const fonte = mat(0x1b1a18, { metalness: 0.6, roughness: 0.5 });
  const pied = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 1.12, 16), fonte);
  pied.position.y = -0.6;
  groupe.add(plateau, interieur, cerclage, pied, ombreAuSol(rayon * 1.35, -1.2));
  for (let k = 0; k < (leger ? 3 : 4); k++) {
    const a = k / 4 * Math.PI * 2 + Math.PI / 4;
    const patte = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.05, 0.1), fonte);
    patte.position.set(Math.cos(a) * 0.32, -1.17, Math.sin(a) * 0.32);
    patte.rotation.y = -a;
    groupe.add(patte);
  }
  return { groupe, feutre: interieur };
}

// --- Chaise de pub : bois tourné, assise en cuir vert capitonné ---
let MAT_BOIS = null, MAT_CUIR = null;
export function creerChaisePub(dir, rayon = 2.42, solY = -1.2) {
  if (!MAT_BOIS) { MAT_BOIS = mat(0x3e2614, { roughness: 0.55 }); MAT_CUIR = mat(0x1f4a32, { roughness: 0.45 }); }
  const c = new THREE.Group();
  const h = 0.72;
  const assise = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.24, 0.07, 24), MAT_CUIR);
  assise.position.y = h;
  c.add(assise);
  for (const [x, z] of [[-0.17, -0.17], [0.17, -0.17], [-0.17, 0.17], [0.17, 0.17]]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.016, h, 8), MAT_BOIS);
    p.position.set(x, h / 2, z);
    c.add(p);
  }
  // Dossier en arceau
  const arceau = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.022, 8, 24, Math.PI), MAT_BOIS);
  arceau.position.set(0, h + 0.18, 0.2);
  c.add(arceau);
  for (const x of [-0.08, 0, 0.08]) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.36, 6), MAT_BOIS);
    b.position.set(x, h + 0.2, 0.2);
    c.add(b);
  }
  c.position.set(dir.x * rayon, solY, dir.z * rayon);
  c.rotation.y = Math.atan2(dir.x, dir.z);
  return c;
}

// --- Étiquettes : plaque de laiton, lettres gravées vert bouteille ---
export function dessinerEtiquettePub(ctx, texte, etat) {
  dessinerEtiquetteTheme(ctx, texte, etat, {
    police: POLICE_TEXTE, graisse: 700, rayon: 0.18,
    fond: ['#f1d58c', '#c9a25a'], fondActif: ['#3fae6a', '#1f6b3e'],
    bord: 'rgba(80,55,20,0.8)', bordActif: '#e8ffe8', texte: '#1b2a1e', texteActif: '#ffffff',
  });
}

// Coupe une phrase en lignes qui tiennent dans une largeur.
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
export function creerDecorPub(scene, { nom = '', solY = -1.2, leger = false } = {}) {
  const decor = new THREE.Group();
  const r = aleatoire(57);
  const Z_MUR = -6.2;

  // Parquet sombre.
  const sol = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), mat(0xffffff, {
    roughness: 0.55, map: texture(planches('#3a2414', { nb: 8, graine: 4, usure: 0.3 }), 512, 512, [8, 8]),
  }));
  sol.rotation.x = -Math.PI / 2;
  sol.position.y = solY;
  decor.add(sol);

  // Murs vert bouteille, boiserie en bas, frise laiton.
  const murTex = texture((ctx, L, H) => {
    grain('#1d3a2a', { intensite: 0.05, graine: 7, nb: 4000 })(ctx, L, H);
    // Papier peint à rayures discrètes
    for (let x = 0; x < L; x += 32) { ctx.fillStyle = 'rgba(255,255,255,0.025)'; ctx.fillRect(x, 0, 12, H * 0.62); }
    ctx.save(); ctx.translate(0, H * 0.62);
    planches('#4a2c16', { nb: 10, vertical: true, graine: 9, usure: 0.2 })(ctx, L, H * 0.38);
    ctx.restore();
    ctx.fillStyle = '#c9a25a'; ctx.fillRect(0, H * 0.615, L, 6);
  }, 512, 512, [4, 1]);
  const mur = new THREE.Mesh(new THREE.PlaneGeometry(26, 7.5), mat(0xffffff, { map: murTex, roughness: 0.85 }));
  mur.position.set(0, solY + 3.75, Z_MUR);
  decor.add(mur);
  for (const cote of [-1, 1]) {
    const lat = new THREE.Mesh(new THREE.PlaneGeometry(16, 7.5), mat(0xffffff, { map: murTex, roughness: 0.85 }));
    lat.rotation.y = -cote * Math.PI / 2;
    lat.position.set(cote * 9, solY + 3.75, -1);
    decor.add(lat);
  }

  // Le grand tableau noir : la question s'y écrit à la craie.
  const ardCanvas = document.createElement('canvas');
  ardCanvas.width = 1024; ardCanvas.height = 576;
  const ardTex = new THREE.CanvasTexture(ardCanvas);
  ardTex.colorSpace = THREE.SRGBColorSpace;
  let contenu = { titre: nom, lignes: ['Ce soir : quiz !', 'Le plus loin boit.'], bas: '' };
  const dessinerArdoise = () => {
    const ctx = ardCanvas.getContext('2d'), L = 1024, H = 576;
    grain('#1c2420', { intensite: 0.07, graine: 12, nb: 6000 })(ctx, L, H);
    // Traces d'effaçage
    const rr = aleatoire(31);
    for (let k = 0; k < 18; k++) {
      ctx.fillStyle = `rgba(230,230,220,${0.02 + rr() * 0.03})`;
      ctx.beginPath(); ctx.ellipse(rr() * L, rr() * H, 60 + rr() * 120, 18 + rr() * 30, rr() * 0.6 - 0.3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f5d76e';
    ctx.font = `86px ${POLICE_CRAIE}`;
    ctx.fillText(contenu.titre || '', L / 2, 78, L - 80);
    ctx.fillStyle = '#f2f0e6';
    let taille = 60;
    ctx.font = `${taille}px ${POLICE_CRAIE}`;
    let lignes = [];
    (contenu.lignes || []).forEach(t => { lignes = lignes.concat(couper(ctx, t, L - 120)); });
    while (lignes.length > 5 && taille > 38) {
      taille -= 4; ctx.font = `${taille}px ${POLICE_CRAIE}`;
      lignes = [];
      (contenu.lignes || []).forEach(t => { lignes = lignes.concat(couper(ctx, t, L - 120)); });
    }
    lignes.slice(0, 6).forEach((l, k) => ctx.fillText(l, L / 2, 170 + k * taille * 1.12, L - 80));
    if (contenu.bas) {
      ctx.fillStyle = '#9fe0b4';
      ctx.font = `54px ${POLICE_CRAIE}`;
      ctx.fillText(contenu.bas, L / 2, H - 52, L - 80);
    }
    ardTex.needsUpdate = true;
  };
  dessinerArdoise();
  quandPolicesPub(dessinerArdoise);
  const cadreBois = mat(0x4a2c16, { roughness: 0.6 });
  const ardoise = new THREE.Mesh(new THREE.BoxGeometry(5.6, 3.15, 0.08),
    [cadreBois, cadreBois, cadreBois, cadreBois, mat(0xffffff, { map: ardTex, roughness: 0.95 }), cadreBois]);
  ardoise.position.set(0, solY + 3.35, Z_MUR + 0.06);
  const rebord = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.08, 0.2), cadreBois);
  rebord.position.set(0, solY + 1.74, Z_MUR + 0.14);
  decor.add(ardoise, rebord);

  // Comptoir à gauche, étagère de bouteilles au-dessus.
  const comptoir = new THREE.Group();
  const bois = mat(0xffffff, { map: texture(planches('#5a341a', { nb: 6, vertical: true, graine: 5 }), 256), roughness: 0.5 });
  const caisse = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.15, 0.8), bois);
  caisse.position.y = 0.575;
  const dessus = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.08, 0.95), mat(0x2a170a, { roughness: 0.25, metalness: 0.1 }));
  dessus.position.y = 1.19;
  const barre = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 3.6, 8), mat(0xc9a25a, { metalness: 0.9, roughness: 0.25 }));
  barre.rotation.z = Math.PI / 2; barre.position.set(0, 0.2, 0.48);
  comptoir.add(caisse, dessus, barre);
  // Tireuses
  for (let k = 0; k < (leger ? 2 : 4); k++) {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 10), mat(0xd9b46a, { metalness: 0.9, roughness: 0.2 }));
    t.position.set(-0.6 + k * 0.4, 1.43, 0.1);
    const pommeau = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.16, 10), mat([0x1f6b3e, 0x8a1a1a, 0x1a1a1a, 0xc98a1a][k], { roughness: 0.4 }));
    pommeau.position.set(-0.6 + k * 0.4, 1.7, 0.1);
    comptoir.add(t, pommeau);
  }
  comptoir.position.set(-5.4, solY, Z_MUR + 1.6);
  decor.add(comptoir);
  const etagere = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.06, 0.3), cadreBois);
  etagere.position.set(-5.4, solY + 2.6, Z_MUR + 0.18);
  const etagere2 = etagere.clone(); etagere2.position.y = solY + 3.3;
  decor.add(etagere, etagere2);
  const couleursBouteilles = [0x1f5a2a, 0x6b3a12, 0x8a6a1a, 0x2a3a5a, 0x5a1a1a, 0xc9c3a8];
  [solY + 2.63, solY + 3.33].forEach((y, rang) => {
    const nb = leger ? 6 : 11;
    for (let k = 0; k < nb; k++) {
      const h = 0.32 + r() * 0.16;
      const coul = couleursBouteilles[Math.floor(r() * couleursBouteilles.length)];
      const verre = new THREE.MeshStandardMaterial({ color: coul, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.85 });
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, h, 12), verre);
      b.position.set(-6.9 + k * (3.0 / nb) + 0.1, y + h / 2, Z_MUR + 0.2);
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.03, 0.12, 8), verre);
      col.position.set(b.position.x, y + h + 0.06, Z_MUR + 0.2);
      decor.add(b, col);
    }
  });

  // Cible de fléchettes à droite, et trois fléchettes plantées.
  const cible = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.05, 40), mat(0xffffff, {
    roughness: 0.8,
    map: texture((ctx, L) => {
      const c = L / 2;
      ctx.fillStyle = '#111'; ctx.fillRect(0, 0, L, L);
      for (let k = 0; k < 20; k++) {
        const a0 = (k - 0.5) / 20 * Math.PI * 2, a1 = (k + 0.5) / 20 * Math.PI * 2;
        [[0.95, 0.75, k % 2 ? '#1a8a3a' : '#c41a1a'], [0.75, 0.47, k % 2 ? '#f2e6c8' : '#151515'],
         [0.47, 0.42, k % 2 ? '#1a8a3a' : '#c41a1a'], [0.42, 0.1, k % 2 ? '#f2e6c8' : '#151515']].forEach(([ro, ri, coul]) => {
          ctx.fillStyle = coul; ctx.beginPath(); ctx.arc(c, c, ro * c, a0, a1); ctx.arc(c, c, ri * c, a1, a0, true); ctx.closePath(); ctx.fill();
        });
      }
      ctx.fillStyle = '#1a8a3a'; ctx.beginPath(); ctx.arc(c, c, 0.1 * c, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#c41a1a'; ctx.beginPath(); ctx.arc(c, c, 0.045 * c, 0, Math.PI * 2); ctx.fill();
    }, 256),
  }));
  cible.rotation.x = Math.PI / 2;
  cible.position.set(5.2, solY + 2.9, Z_MUR + 0.08);
  decor.add(cible);
  for (const [dx, dy] of [[0.08, 0.1], [-0.15, -0.05], [0.02, -0.22]]) {
    const f = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, 0.22, 6), mat(0xc9a25a, { metalness: 0.8, roughness: 0.3 }));
    f.rotation.x = Math.PI / 2;
    f.position.set(5.2 + dx, solY + 2.9 + dy, Z_MUR + 0.2);
    decor.add(f);
  }

  // Enseigne néon au-dessus de la cible, avec le nom du jeu.
  const neon = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), new THREE.MeshBasicMaterial({
    transparent: true,
    map: texture((ctx, L, H) => {
      ctx.clearRect(0, 0, L, H);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `92px ${POLICE_CRAIE}`;
      ctx.shadowColor = '#ffb347'; ctx.shadowBlur = 26;
      ctx.fillStyle = '#ffd27a';
      ctx.fillText(nom, L / 2, H / 2 + 4, L - 20);
    }, 512, 128),
  }));
  neon.position.set(5.2, solY + 4.2, Z_MUR + 0.05);
  decor.add(neon);

  // Guirlande d'ampoules le long du mur.
  const ampoules = [];
  const nbAmp = leger ? 9 : 17;
  for (let k = 0; k < nbAmp; k++) {
    const x = -7.5 + k * (15 / (nbAmp - 1));
    const y = solY + 5.2 - Math.sin(k / (nbAmp - 1) * Math.PI * 3) ** 2 * 0.35;
    const a = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), lueur(0xffc870, 2.2));
    a.position.set(x, y, Z_MUR + 0.3);
    decor.add(a);
    ampoules.push(a);
  }

  // Lampe de pub en laiton au-dessus de la table.
  const lampe = new THREE.Group();
  const abat = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.3, 32, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x1f4a32, metalness: 0.4, roughness: 0.45, side: THREE.DoubleSide }));
  const anneau = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.02, 8, 32), mat(0xc9a25a, { metalness: 0.9, roughness: 0.25 }));
  anneau.rotation.x = Math.PI / 2; anneau.position.y = -0.15;
  const ampoule = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), lueur(0xfff0cc, 2.4));
  ampoule.position.y = -0.1;
  const chaine = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 2, 6), mat(0xc9a25a, { metalness: 0.9, roughness: 0.3 }));
  chaine.position.y = 1.15;
  lampe.add(abat, anneau, ampoule, chaine);
  lampe.position.set(0, 3.0, -0.3);
  decor.add(lampe);
  const lumiere = new THREE.PointLight(0xffe2b0, 2.2, 8, 1.6);
  lumiere.position.set(0, 2.75, -0.3);
  decor.add(lumiere);

  scene.add(decor);

  function ecrireArdoise(nouveau) {
    contenu = Object.assign({ titre: nom, lignes: [], bas: '' }, nouveau);
    dessinerArdoise();
  }

  function animer(t) {
    if (leger) return;
    ampoules.forEach((a, k) => { a.material.color.setScalar(1.8 + Math.sin(t * 1.3 + k * 1.7) * 0.25); a.material.color.multiply(new THREE.Color(0xffc870)); });
    lumiere.intensity = 2.2 * (1 + Math.sin(t * 23) * 0.008);
  }
  return { decor, animer, lumiere, ecrireArdoise };
}
