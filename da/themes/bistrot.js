// =====================================================================
// Thème « Bistrot » (Kinito) : le café-tabac du coin. Carrelage rétro noir
// et blanc, comptoir en zinc avec ses tireuses et la machine à café,
// ballons de rouge, ardoise des tarifs, écran des courses hippiques (les
// chevaux galopent), losange rouge TABAC, globes en opaline, lambris et
// murs jaunis, chaises bistrot en bois courbé. Table de café au plateau
// de marbre, cerclée de laiton, pied en fonte.
//
// Version légère : pas de reflets calculés, écran des courses fixe, moins
// d'objets sur le comptoir.
// =====================================================================
import * as THREE from 'three';
import {
  aleatoire, texture, mat, lueur, veinage, grain, ambiance, ombreAuSol, dessinerEtiquetteTheme, quandPolices,
} from './outils.js';

export const FOND = 0x140d08;
export const POLICE_TITRE = "'Caveat Brush', 'Comic Sans MS', cursive";
export const POLICE_TEXTE = "Nunito, 'Segoe UI', system-ui, sans-serif";
export const quandPolicesBistrot = (fn) => quandPolices(['48px "Caveat Brush"', '700 48px Nunito'], fn);

export function preparerAmbianceBistrot(renderer, scene, { leger = false } = {}) {
  ambiance(renderer, scene, { fond: FOND, ciel: 0x6a5030, sol: 0x1a1008, intensite: 0.7, leger });
}

// --- Table de café : marbre veiné, cercle de laiton, pied en fonte ---
export function creerTableBistrot(rayon, { rayonFeutre = rayon - 0.28, leger = false } = {}) {
  const groupe = new THREE.Group();
  const marbre = texture((ctx, L) => {
    ctx.fillStyle = '#e9e5dc'; ctx.fillRect(0, 0, L, L);
    const r = aleatoire(12);
    for (let k = 0; k < 26; k++) {
      ctx.strokeStyle = `rgba(${90 + r() * 40},${90 + r() * 40},${100 + r() * 40},${0.12 + r() * 0.25})`;
      ctx.lineWidth = 0.6 + r() * 2.4;
      ctx.beginPath();
      let x = r() * L, y = r() * L;
      ctx.moveTo(x, y);
      for (let s = 0; s < 14; s++) { x += (r() - 0.4) * 60; y += (r() - 0.5) * 50; ctx.lineTo(x, y); }
      ctx.stroke();
    }
    // Ronds de verres et de tasses
    for (let k = 0; k < 6; k++) { ctx.strokeStyle = 'rgba(120,70,40,0.12)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(r() * L, r() * L, 14 + r() * 10, 0, Math.PI * 1.8); ctx.stroke(); }
  }, 512);
  const plateau = new THREE.Mesh(new THREE.CylinderGeometry(rayon, rayon, 0.08, 96), mat(0xffffff, { map: marbre, roughness: 0.25 }));
  plateau.position.y = -0.04;
  plateau.receiveShadow = true;
  // Zone de jeu : un grand tapis de jeu de cartes en feutre orange brûlé (tapis à dés).
  const tapis = new THREE.Mesh(new THREE.CylinderGeometry(rayonFeutre, rayonFeutre, 0.012, 96), mat(0xffffff, {
    roughness: 0.92,
    map: texture((ctx, L) => {
      grain('#7a3412', { intensite: 0.06, graine: 4, nb: 5000 })(ctx, L, L);
      const g = ctx.createRadialGradient(L / 2, L / 2, L * 0.1, L / 2, L / 2, L / 2);
      g.addColorStop(0, 'rgba(255,220,180,0.08)'); g.addColorStop(1, 'rgba(0,0,0,0.4)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, L, L);
      ctx.strokeStyle = 'rgba(255,214,150,0.45)'; ctx.lineWidth = 3; ctx.setLineDash([12, 8]);
      ctx.beginPath(); ctx.arc(L / 2, L / 2, L / 2 - 16, 0, Math.PI * 2); ctx.stroke();
    }, 512),
  }));
  tapis.position.y = 0.006;
  tapis.receiveShadow = true;
  const laiton = mat(0xc9a25a, { metalness: 0.9, roughness: 0.3 });
  const cercle = new THREE.Mesh(new THREE.TorusGeometry(rayon, 0.035, 10, 128), laiton);
  cercle.rotation.x = Math.PI / 2; cercle.position.y = -0.02;
  const fonte = mat(0x1a1a1a, { metalness: 0.6, roughness: 0.5 });
  const pied = new THREE.Mesh(new THREE.LatheGeometry([
    new THREE.Vector2(0, 0), new THREE.Vector2(0.7, 0), new THREE.Vector2(0.6, 0.06), new THREE.Vector2(0.14, 0.16),
    new THREE.Vector2(0.09, 0.5), new THREE.Vector2(0.12, 0.6), new THREE.Vector2(0.07, 0.95), new THREE.Vector2(0.3, 1.12), new THREE.Vector2(0, 1.12),
  ], 28), fonte);
  pied.position.y = -1.2;
  groupe.add(plateau, tapis, cercle, pied, ombreAuSol(rayon * 1.35, -1.2));
  return { groupe, feutre: tapis };
}

// --- Chaise bistrot en bois courbé, assise cannée ---
let MAT_BOIS = null, MAT_CANNAGE = null;
export function creerChaiseBistrot(dir, rayon = 2.42, solY = -1.2) {
  if (!MAT_BOIS) {
    MAT_BOIS = mat(0x2a1a10, { roughness: 0.4 });
    MAT_CANNAGE = mat(0xffffff, {
      roughness: 0.8,
      map: texture((ctx, L) => {
        ctx.fillStyle = '#c9a46a'; ctx.fillRect(0, 0, L, L);
        ctx.strokeStyle = 'rgba(90,60,20,0.6)'; ctx.lineWidth = 2;
        for (let k = -L; k < L * 2; k += 10) { ctx.beginPath(); ctx.moveTo(k, 0); ctx.lineTo(k + L, L); ctx.stroke(); ctx.beginPath(); ctx.moveTo(k, L); ctx.lineTo(k + L, 0); ctx.stroke(); }
      }, 64),
    });
  }
  const c = new THREE.Group();
  const h = 0.72;
  const assise = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.04, 24), MAT_CANNAGE);
  assise.position.y = h;
  const cerceau = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.02, 8, 24), MAT_BOIS);
  cerceau.rotation.x = Math.PI / 2; cerceau.position.y = h;
  c.add(assise, cerceau);
  for (let k = 0; k < 4; k++) {
    const a = k / 4 * Math.PI * 2 + Math.PI / 4;
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.016, h, 8), MAT_BOIS);
    p.position.set(Math.cos(a) * 0.19, h / 2, Math.sin(a) * 0.19);
    p.rotation.z = Math.cos(a) * 0.08; p.rotation.x = -Math.sin(a) * 0.08;
    c.add(p);
  }
  // Dossier courbé : un arceau.
  const dossier = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.018, 8, 24, Math.PI), MAT_BOIS);
  dossier.position.set(0, h + 0.42, 0.2);
  const montantG = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.44, 8), MAT_BOIS);
  montantG.position.set(-0.2, h + 0.22, 0.2);
  const montantD = montantG.clone(); montantD.position.x = 0.2;
  const anneau = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.014, 6, 20), MAT_BOIS);
  anneau.position.set(0, h + 0.24, 0.2);
  c.add(dossier, montantG, montantD, anneau);
  c.position.set(dir.x * rayon, solY, dir.z * rayon);
  c.rotation.y = Math.atan2(dir.x, dir.z);
  return c;
}

// --- Étiquettes : petite ardoise, lettres à la craie ---
export function dessinerEtiquetteBistrot(ctx, texte, etat) {
  dessinerEtiquetteTheme(ctx, texte, etat, {
    police: POLICE_TEXTE, graisse: 800, rayon: 0.18,
    fond: ['#33372f', '#22251f'], fondActif: ['#f59e2e', '#c2410c'],
    bord: '#8a6a3a', bordActif: '#ffe0b0', texte: '#f2efe6', texteActif: '#ffffff',
  });
}

// --- Le décor ---
export function creerDecorBistrot(scene, { nom = '', solY = -1.2, leger = false } = {}) {
  const decor = new THREE.Group();
  const Z_MUR = -6.4;
  const zinc = mat(0xb8bcc0, { metalness: 0.85, roughness: 0.3 });
  const laiton = mat(0xc9a25a, { metalness: 0.9, roughness: 0.3 });

  // Carrelage rétro : cabochons noirs dans un damier d'octogones blancs.
  const sol = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), mat(0xffffff, {
    roughness: 0.45,
    map: texture((ctx, L) => {
      ctx.fillStyle = '#d9d3c4'; ctx.fillRect(0, 0, L, L);
      const p = L / 4, c = p * 0.3;
      for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) {
        ctx.fillStyle = '#1e1e1c';
        ctx.beginPath(); ctx.moveTo(i * p, j * p - c); ctx.lineTo(i * p + c, j * p); ctx.lineTo(i * p, j * p + c); ctx.lineTo(i * p - c, j * p); ctx.closePath(); ctx.fill();
      }
      ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 2;
      for (let k = 0; k <= 4; k++) { ctx.beginPath(); ctx.moveTo(k * p, 0); ctx.lineTo(k * p, L); ctx.moveTo(0, k * p); ctx.lineTo(L, k * p); ctx.stroke(); }
      const rr = aleatoire(6);
      for (let k = 0; k < 2500; k++) { ctx.fillStyle = `rgba(60,40,20,${rr() * 0.07})`; ctx.fillRect(rr() * L, rr() * L, 2, 2); }
    }, 256, 256, [16, 16]),
  }));
  sol.rotation.x = -Math.PI / 2;
  sol.position.y = solY;
  decor.add(sol);

  // Murs : lambris de bois en bas, peinture jaunie par les années au-dessus.
  const murTex = texture((ctx, L, H) => {
    grain('#b8a070', { intensite: 0.06, graine: 3, nb: 5000 })(ctx, L, H);
    const g = ctx.createLinearGradient(0, 0, 0, H * 0.6);
    g.addColorStop(0, 'rgba(90,60,20,0.35)'); g.addColorStop(1, 'rgba(90,60,20,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, L, H * 0.6);
    veinage('#4a2e1a', 9)(ctx, L, H * 0.0001);
    ctx.save(); ctx.translate(0, H * 0.6);
    veinage('#4a2e1a', 9)(ctx, L, H * 0.4);
    ctx.restore();
    ctx.fillStyle = '#2a1a10'; ctx.fillRect(0, H * 0.6 - 6, L, 10);
    ctx.strokeStyle = 'rgba(20,10,4,0.5)'; ctx.lineWidth = 3;
    for (let x = 20; x < L; x += 128) ctx.strokeRect(x, H * 0.66, 100, H * 0.28);
  }, 512, 512, [4, 1]);
  const mur = new THREE.Mesh(new THREE.PlaneGeometry(26, 7.5), mat(0xffffff, { map: murTex, roughness: 0.75 }));
  mur.position.set(0, solY + 3.75, Z_MUR);
  decor.add(mur);
  for (const cote of [-1, 1]) {
    const lat = new THREE.Mesh(new THREE.PlaneGeometry(16, 7.5), mat(0xffffff, { map: murTex, roughness: 0.75 }));
    lat.rotation.y = -cote * Math.PI / 2;
    lat.position.set(cote * 9, solY + 3.75, -1);
    decor.add(lat);
  }

  // Comptoir en zinc, façade en bois, repose-pieds en laiton.
  const facade = new THREE.Mesh(new THREE.BoxGeometry(7.6, 1.45, 0.8), mat(0xffffff, { map: texture(veinage('#5a3820', 15), 512, 128, [3, 1]), roughness: 0.55 }));
  facade.position.set(0, solY + 0.72, Z_MUR + 1.8);
  const dessusZinc = new THREE.Mesh(new THREE.BoxGeometry(7.9, 0.08, 1.0), zinc);
  dessusZinc.position.set(0, solY + 1.48, Z_MUR + 1.8);
  const bourrelet = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 7.9, 12), zinc);
  bourrelet.rotation.z = Math.PI / 2; bourrelet.position.set(0, solY + 1.48, Z_MUR + 2.3);
  const barre = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 7.6, 12), laiton);
  barre.rotation.z = Math.PI / 2; barre.position.set(0, solY + 0.22, Z_MUR + 2.28);
  decor.add(facade, dessusZinc, bourrelet, barre);

  // Sur le zinc : tireuses, machine à café, ballons de rouge, cendrier, sous-bocks.
  for (const x of [-1.2, -0.9, -0.6]) {
    const colonne = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.42, 12), zinc);
    colonne.position.set(x, solY + 1.73, Z_MUR + 1.6);
    const manette = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.012, 0.2, 8), mat(0x2a1a10, { roughness: 0.4 }));
    manette.position.set(x, solY + 2.02, Z_MUR + 1.6);
    decor.add(colonne, manette);
  }
  const machine = new THREE.Group();
  const corpsM = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 0.5), mat(0x8a1c1c, { metalness: 0.4, roughness: 0.35 }));
  corpsM.position.y = 0.27;
  const chapeau = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.06, 0.52), zinc);
  chapeau.position.y = 0.58;
  machine.add(corpsM, chapeau);
  for (const x of [-0.22, 0.22]) {
    const groupeTete = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.1, 12), zinc);
    groupeTete.position.set(x, 0.12, 0.27);
    machine.add(groupeTete);
  }
  machine.position.set(1.6, solY + 1.52, Z_MUR + 1.55);
  decor.add(machine);
  const vin = new THREE.MeshStandardMaterial({ color: 0x6a0a18, roughness: 0.15, transparent: true, opacity: 0.9 });
  const verreMat = new THREE.MeshStandardMaterial({ color: 0xe8f0f4, roughness: 0.05, transparent: true, opacity: 0.35 });
  const nbVerres = leger ? 2 : 5;
  for (let k = 0; k < nbVerres; k++) {
    const x = -2.8 + k * 0.35;
    const coupe = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), verreMat);
    coupe.rotation.x = Math.PI; coupe.position.set(x, solY + 1.72, Z_MUR + 2.0);
    const liquide = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.03, 0.05, 12), vin);
    liquide.position.set(x, solY + 1.68, Z_MUR + 2.0);
    const pied = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.12, 6), verreMat);
    pied.position.set(x, solY + 1.58, Z_MUR + 2.0);
    decor.add(coupe, liquide, pied);
  }

  // Étagère de bouteilles d'apéritif derrière le zinc, miroir piqué.
  const miroir = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 1.8), leger ? mat(0x4a4438, { roughness: 0.3, metalness: 0.4 }) : mat(0x9a9080, { roughness: 0.15, metalness: 0.95 }));
  miroir.position.set(0, solY + 2.75, Z_MUR + 0.03);
  const cadre = new THREE.Mesh(new THREE.BoxGeometry(6.7, 2.05, 0.08), mat(0x3a2414, { roughness: 0.5 }));
  cadre.position.set(0, solY + 2.75, Z_MUR + 0.0);
  decor.add(cadre, miroir);
  const bouteilles = [0x2a5a2a, 0xc98a1a, 0x8a1a1a, 0xe0d0a0, 0x1a3a6a, 0x5a2a0a];
  const etagere = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.05, 0.3), mat(0x3a2414));
  etagere.position.set(0, solY + 1.95, Z_MUR + 0.2);
  decor.add(etagere);
  for (let k = 0; k < (leger ? 8 : 16); k++) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.38, 10),
      new THREE.MeshStandardMaterial({ color: bouteilles[k % bouteilles.length], roughness: 0.15, transparent: true, opacity: 0.85 }));
    b.position.set(-3 + k * (6 / (leger ? 7 : 15)), solY + 2.17, Z_MUR + 0.2);
    decor.add(b);
  }

  // Ardoise des tarifs.
  const ardoiseCanvas = document.createElement('canvas');
  ardoiseCanvas.width = 400; ardoiseCanvas.height = 512;
  const ardoiseTex = new THREE.CanvasTexture(ardoiseCanvas);
  ardoiseTex.colorSpace = THREE.SRGBColorSpace;
  const dessinerArdoise = () => {
    const ctx = ardoiseCanvas.getContext('2d');
    grain('#2b302b', { intensite: 0.07, graine: 2, nb: 4000 })(ctx, 400, 512);
    ctx.fillStyle = 'rgba(240,240,230,0.92)'; ctx.textAlign = 'center';
    ctx.font = `64px ${POLICE_TITRE}`; ctx.fillText(nom, 200, 80, 360);
    ctx.font = `40px ${POLICE_TITRE}`; ctx.textAlign = 'left';
    [['Café', '1,50'], ['Demi', '3,00'], ['Ballon de rouge', '2,50'], ['Pastis', '3,00'], ['Croque', '4,50'], ['Tournée', 'offerte ?']].forEach(([a, p], k) => {
      ctx.fillText(a, 28, 160 + k * 56); ctx.textAlign = 'right'; ctx.fillText(p, 372, 160 + k * 56); ctx.textAlign = 'left';
    });
    ardoiseTex.needsUpdate = true;
  };
  dessinerArdoise();
  quandPolicesBistrot(dessinerArdoise);
  const ardoise = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.8, 0.05), [mat(0x3a2414), mat(0x3a2414), mat(0x3a2414), mat(0x3a2414), mat(0xffffff, { map: ardoiseTex, roughness: 0.9 }), mat(0x3a2414)]);
  ardoise.position.set(-4.7, solY + 2.6, Z_MUR + 0.08);
  decor.add(ardoise);

  // Écran des courses hippiques : les chevaux galopent.
  const ecranCanvas = document.createElement('canvas');
  ecranCanvas.width = 320; ecranCanvas.height = 180;
  const ecranTex = new THREE.CanvasTexture(ecranCanvas);
  ecranTex.colorSpace = THREE.SRGBColorSpace;
  const couleursJockeys = ['#e63946', '#ffd166', '#06d6a0', '#118ab2', '#f4a261'];
  const dessinerCourse = (t) => {
    const ctx = ecranCanvas.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, 180);
    g.addColorStop(0, '#6ab0e0'); g.addColorStop(0.45, '#bfe0f0'); g.addColorStop(0.46, '#3a8a3a'); g.addColorStop(1, '#2a6a2a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 320, 180);
    ctx.fillStyle = '#f2f2f2'; ctx.fillRect(0, 86, 320, 4);
    couleursJockeys.forEach((c, k) => {
      const x = ((t * (34 + k * 3) + k * 60) % 380) - 40, y = 100 + k * 15;
      const saut = Math.abs(Math.sin(t * 9 + k)) * 3;
      ctx.fillStyle = '#4a2a14'; ctx.fillRect(x, y - saut, 30, 9);
      ctx.fillRect(x + 26, y - 6 - saut, 8, 8);
      ctx.fillStyle = c; ctx.fillRect(x + 10, y - 9 - saut, 9, 8);
    });
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, 320, 26);
    ctx.fillStyle = '#ffd166'; ctx.font = 'bold 16px sans-serif'; ctx.fillText('COURSE 4 · TROT ATTELÉ · 2700 m', 8, 18);
    ecranTex.needsUpdate = true;
  };
  dessinerCourse(0);
  const ecran = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.95, 0.08), [mat(0x111111), mat(0x111111), mat(0x111111), mat(0x111111), new THREE.MeshBasicMaterial({ map: ecranTex }), mat(0x111111)]);
  ecran.position.set(4.6, solY + 3.6, Z_MUR + 0.3);
  ecran.rotation.y = -0.15;
  decor.add(ecran);

  // Losange rouge TABAC, en enseigne lumineuse.
  const tabac = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.4), new THREE.MeshBasicMaterial({
    transparent: true,
    map: texture((ctx, L, H) => {
      ctx.clearRect(0, 0, L, H);
      ctx.fillStyle = '#c4101c';
      ctx.beginPath(); ctx.moveTo(L / 2, 6); ctx.lineTo(L - 6, H / 2); ctx.lineTo(L / 2, H - 6); ctx.lineTo(6, H / 2); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#ffd9d9'; ctx.lineWidth = 5; ctx.stroke();
      ctx.fillStyle = '#ffffff'; ctx.font = '800 34px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('TABAC', L / 2, H / 2);
    }, 200, 280),
  }));
  tabac.position.set(-6.6, solY + 4.2, Z_MUR + 0.1);
  decor.add(tabac);

  // Nom du café peint en lettres dorées au-dessus du miroir.
  const enseigneCanvas = document.createElement('canvas');
  enseigneCanvas.width = 1024; enseigneCanvas.height = 200;
  const enseigneTex = new THREE.CanvasTexture(enseigneCanvas);
  enseigneTex.colorSpace = THREE.SRGBColorSpace;
  const dessinerEnseigne = () => {
    const ctx = enseigneCanvas.getContext('2d');
    ctx.clearRect(0, 0, 1024, 200);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `120px ${POLICE_TITRE}`;
    ctx.fillStyle = 'rgba(30,15,5,0.5)'; ctx.fillText('Café · ' + nom + ' · Tabac', 516, 104, 980);
    ctx.fillStyle = '#e8c46a'; ctx.fillText('Café · ' + nom + ' · Tabac', 512, 100, 980);
    enseigneTex.needsUpdate = true;
  };
  dessinerEnseigne();
  quandPolicesBistrot(dessinerEnseigne);
  const enseigne = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 1.1), new THREE.MeshStandardMaterial({ map: enseigneTex, transparent: true, roughness: 0.6 }));
  enseigne.position.set(0, solY + 4.35, Z_MUR + 0.05);
  decor.add(enseigne);

  // Globes en opaline suspendus, et la lumière chaude du café.
  const opaline = lueur(0xfff0d6, 1.5);
  // Pas de globe juste au-dessus de la table : sur téléphone, il tombait au milieu de l'écran.
  for (const [x, y, z] of [[-3.4, 3.6, -3.4], [3.4, 3.6, -3.4]]) {
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 14), opaline);
    globe.position.set(x, y, z);
    const tige = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1.4, 6), laiton);
    tige.position.set(x, y + 0.9, z);
    decor.add(globe, tige);
  }
  const lumiere = new THREE.PointLight(0xffd7a0, 1.9, 8, 1.6);
  lumiere.position.set(0, 3.0, -0.5);
  decor.add(lumiere);

  // Portemanteau avec un béret et un journal sur une chaise près du zinc.
  const portemanteau = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 2.0, 8), mat(0x2a1a10));
  portemanteau.position.set(6.2, solY + 1.0, Z_MUR + 1.2);
  const beret = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x1a1a2a, { roughness: 0.9 }));
  beret.scale.y = 0.4; beret.position.set(6.2, solY + 2.0, Z_MUR + 1.2);
  decor.add(portemanteau, beret);

  scene.add(decor);

  let derniere = -1;
  function animer(t) {
    if (leger) return;
    const k = Math.floor(t * 12);
    if (k !== derniere) { derniere = k; dessinerCourse(t); }
  }
  return { decor, animer, lumiere };
}
