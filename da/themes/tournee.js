// =====================================================================
// Thème « Tournée » (La Tournée) : l'arrière-salle d'un bar de quartier un
// soir de tournée des bars. Mur de briques, enseignes néon des bars de la
// rue (une par couleur), guirlande d'ampoules, jukebox, sol en damier.
// La table ronde porte le plateau de jeu : une boucle de cases peintes.
//
// Version légère : pas de reflets calculés, moins d'ampoules, pas de
// clignotement des néons.
// =====================================================================
import * as THREE from 'three';
import { aleatoire, texture, mat, lueur, grain, veinage, ambiance, ombreAuSol, dessinerEtiquetteTheme, quandPolices } from './outils.js';

export const FOND = 0x120a10;
export const POLICE_TITRE = "'Luckiest Guy', 'Arial Black', Impact, sans-serif";
export const POLICE_TEXTE = "Outfit, 'Segoe UI', system-ui, sans-serif";
export const quandPolicesTournee = (fn) => quandPolices(['48px "Luckiest Guy"', '700 48px Outfit'], fn);

export function preparerAmbianceTournee(renderer, scene, { leger = false } = {}) {
  ambiance(renderer, scene, { fond: FOND, ciel: 0x5a3a4a, sol: 0x160a08, intensite: 0.55, leger });
}

// --- Table ronde : bois rouge verni, plateau de jeu en feutre bleu nuit ---
export function creerTableTournee(rayon, { rayonFeutre = rayon - 0.18, leger = false } = {}) {
  const groupe = new THREE.Group();
  const bois = texture(veinage('#6a2a1a', 31), 512);
  const plateau = new THREE.Mesh(new THREE.CylinderGeometry(rayon, rayon * 0.97, 0.09, 96),
    mat(0xffffff, { map: bois, roughness: 0.3, metalness: 0.05 }));
  plateau.position.y = -0.045;
  plateau.receiveShadow = true;
  const feutre = new THREE.Mesh(new THREE.CylinderGeometry(rayonFeutre, rayonFeutre, 0.012, 96), mat(0xffffff, {
    roughness: 0.92,
    map: texture((ctx, L) => {
      grain('#1c2350', { intensite: 0.06, graine: 4, nb: 5000 })(ctx, L, L);
      const c = L / 2;
      ctx.strokeStyle = 'rgba(255,214,120,0.25)'; ctx.lineWidth = 3;
      ctx.setLineDash([10, 12]);
      ctx.beginPath(); ctx.arc(c, c, c * 0.33, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }, 512),
  }));
  feutre.position.y = 0.006;
  feutre.receiveShadow = true;
  const bord = new THREE.Mesh(new THREE.TorusGeometry(rayon - 0.01, 0.03, 10, 128), mat(0xd9a640, { metalness: 0.85, roughness: 0.3 }));
  bord.rotation.x = Math.PI / 2;
  const pied = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.3, 1.12, 20), mat(0x1a1210, { metalness: 0.4, roughness: 0.5 }));
  pied.position.y = -0.6;
  groupe.add(plateau, feutre, bord, pied, ombreAuSol(rayon * 1.35, -1.2));
  return { groupe, feutre };
}

// --- Tabouret de bar en métal rouge, assise ronde ---
let MAT_ROUGE = null, MAT_NOIR = null;
export function creerTabouretTournee(dir, rayon = 2.42, solY = -1.2) {
  if (!MAT_ROUGE) { MAT_ROUGE = mat(0xb8242a, { roughness: 0.35, metalness: 0.3 }); MAT_NOIR = mat(0x18120f, { roughness: 0.5 }); }
  const c = new THREE.Group();
  const h = 0.74;
  const assise = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.21, 0.08, 24), MAT_ROUGE);
  assise.position.y = h;
  c.add(assise);
  for (const [x, z] of [[-0.15, -0.15], [0.15, -0.15], [-0.15, 0.15], [0.15, 0.15]]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, h, 8), MAT_NOIR);
    p.position.set(x * 0.9, h / 2, z * 0.9);
    p.rotation.set(z * 0.25, 0, -x * 0.25);
    c.add(p);
  }
  const anneau = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.012, 6, 24), MAT_NOIR);
  anneau.rotation.x = Math.PI / 2; anneau.position.y = h * 0.35;
  c.add(anneau);
  c.position.set(dir.x * rayon, solY, dir.z * rayon);
  c.rotation.y = Math.atan2(dir.x, dir.z);
  return c;
}

// --- Étiquettes : ticket de bar crème, bord rouge ---
export function dessinerEtiquetteTournee(ctx, texte, etat) {
  dessinerEtiquetteTheme(ctx, texte, etat, {
    police: POLICE_TEXTE, graisse: 800, rayon: 0.3,
    fond: ['#fff4dc', '#f1d9a8'], fondActif: ['#ffd24a', '#e09a12'],
    bord: '#b8242a', bordActif: '#fff', texte: '#2a1210', texteActif: '#2a1210',
  });
}

// --- Le décor ---
export function creerDecorTournee(scene, { nom = '', solY = -1.2, leger = false } = {}) {
  const decor = new THREE.Group();
  const r = aleatoire(91);
  const Z_MUR = -6.2;

  // Sol en damier noir et crème, un peu usé.
  const sol = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), mat(0xffffff, {
    roughness: 0.45, metalness: 0.05,
    map: texture((ctx, L) => {
      const n = 8, p = L / n;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        ctx.fillStyle = (i + j) % 2 ? '#1a1412' : '#d8cdb4';
        ctx.fillRect(i * p, j * p, p, p);
      }
      grain('rgba(0,0,0,0)', { intensite: 0.08, graine: 2, nb: 3000 })(ctx, L, L);
    }, 512, 512, [12, 12]),
  }));
  sol.rotation.x = -Math.PI / 2;
  sol.position.y = solY;
  decor.add(sol);

  // Mur de briques.
  const briques = texture((ctx, L, H) => {
    ctx.fillStyle = '#2a1410'; ctx.fillRect(0, 0, L, H);
    const bh = 32, bl = 72;
    for (let y = 0, rang = 0; y < H; y += bh, rang++) {
      for (let x = (rang % 2) * -bl / 2; x < L; x += bl) {
        const c = new THREE.Color(0x7a3426).multiplyScalar(0.6 + r() * 0.5);
        ctx.fillStyle = '#' + c.getHexString();
        ctx.fillRect(x + 3, y + 3, bl - 6, bh - 6);
      }
    }
  }, 512, 512, [5, 2]);
  const mur = new THREE.Mesh(new THREE.PlaneGeometry(26, 8), mat(0xffffff, { map: briques, roughness: 0.9 }));
  mur.position.set(0, solY + 4, Z_MUR);
  decor.add(mur);
  for (const cote of [-1, 1]) {
    const lat = new THREE.Mesh(new THREE.PlaneGeometry(16, 8), mat(0xffffff, { map: briques, roughness: 0.9 }));
    lat.rotation.y = -cote * Math.PI / 2;
    lat.position.set(cote * 9, solY + 4, -1);
    decor.add(lat);
  }

  // Enseignes néon des bars de la tournée.
  const neons = [];
  const enseigne = (texte, couleur, x, y, l = 2.2, h = 0.6) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(l, h), new THREE.MeshBasicMaterial({
      transparent: true,
      map: texture((ctx, L, H) => {
        ctx.clearRect(0, 0, L, H);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = `86px ${POLICE_TITRE}`;
        ctx.shadowColor = couleur; ctx.shadowBlur = 28;
        ctx.strokeStyle = couleur; ctx.lineWidth = 6;
        ctx.strokeText(texte, L / 2, H / 2 + 6, L - 30);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(texte, L / 2, H / 2 + 6, L - 30);
      }, 512, 128),
    }));
    m.position.set(x, y, Z_MUR + 0.06);
    decor.add(m);
    neons.push({ m, phase: r() * 10 });
    return m;
  };
  enseigne(nom || 'LA TOURNÉE', '#ffb030', 0, solY + 4.6, 4.4, 1.1);
  enseigne('BAR', '#ff3c6a', -4.6, solY + 3.4);
  enseigne('PUB', '#3cff8a', 4.6, solY + 3.4);
  enseigne('CAVE', '#3cb8ff', -4.6, solY + 2.3);
  enseigne('CAFÉ', '#d77cff', 4.6, solY + 2.3);

  // Jukebox à gauche.
  const juke = new THREE.Group();
  const corps = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.8, 0.7), mat(0x6a1a14, { roughness: 0.35, metalness: 0.2 }));
  corps.position.y = 0.9;
  const dome = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.7, 24, 1, false, 0, Math.PI), mat(0x6a1a14, { roughness: 0.35 }));
  dome.rotation.set(Math.PI / 2, 0, Math.PI / 2); dome.position.y = 1.8;
  const vitre = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.6), lueur(0xffb84a, 1.1));
  vitre.position.set(0, 1.3, 0.36);
  const arc = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.04, 8, 24, Math.PI), lueur(0x3cb8ff, 1.5));
  arc.position.set(0, 1.8, 0.36);
  juke.add(corps, dome, vitre, arc);
  juke.position.set(-6.2, solY, Z_MUR + 1.2);
  juke.rotation.y = 0.35;
  decor.add(juke);

  // Guirlande d'ampoules.
  const ampoules = [];
  const nbAmp = leger ? 9 : 19;
  for (let k = 0; k < nbAmp; k++) {
    const x = -8 + k * (16 / (nbAmp - 1));
    const y = solY + 5.6 - Math.sin(k / (nbAmp - 1) * Math.PI * 4) ** 2 * 0.4;
    const couleur = [0xffc870, 0xff6a6a, 0x6aff9a, 0x6ac8ff][k % 4];
    const a = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), lueur(couleur, 2));
    a.position.set(x, y, Z_MUR + 0.35);
    decor.add(a);
    ampoules.push({ a, couleur });
  }

  // Suspension au-dessus de la table.
  const lampe = new THREE.Group();
  const abat = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.32, 32, 1, true),
    new THREE.MeshStandardMaterial({ color: 0xb8242a, metalness: 0.3, roughness: 0.45, side: THREE.DoubleSide }));
  const ampoule = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), lueur(0xfff0cc, 2.4));
  ampoule.position.y = -0.1;
  const fil = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 2, 6), mat(0x111111));
  fil.position.y = 1.15;
  lampe.add(abat, ampoule, fil);
  lampe.position.set(0, 3.0, -0.3);
  decor.add(lampe);
  const lumiere = new THREE.PointLight(0xffe2b0, 2.3, 8, 1.6);
  lumiere.position.set(0, 2.75, -0.3);
  decor.add(lumiere);

  scene.add(decor);

  function animer(t) {
    if (leger) return;
    neons.forEach((n, k) => {
      // Un néon fatigué grésille de temps en temps.
      const g = Math.sin(t * 13 + n.phase) > 0.985 ? 0.35 : 1;
      n.m.material.opacity = g * (0.9 + Math.sin(t * 2 + k) * 0.1);
    });
    ampoules.forEach(({ a, couleur }, k) => {
      a.material.color.set(couleur).multiplyScalar(1.6 + Math.sin(t * 2.2 + k * 1.3) * 0.5);
    });
  }
  return { decor, animer, lumiere };
}
