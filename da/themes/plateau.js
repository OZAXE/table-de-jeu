// =====================================================================
// Thème « Plateau » (Qui de nous ?) : un plateau de jeu télé en direct.
// Sol noir laqué qui reflète les lumières, grand écran LED au fond où la
// carte s'affiche, arches de projecteurs, gradins de public dans l'ombre,
// pupitre rond aux liserés lumineux cyan et magenta. Le centre du pupitre
// reste libre : les jetons de vote y passent avant de filer vers le désigné.
//
// Version légère : pas de reflets calculés, moins de projecteurs et de
// public, pas de balayage des faisceaux.
// =====================================================================
import * as THREE from 'three';
import { aleatoire, texture, mat, lueur, grain, ambiance, ombreAuSol, dessinerEtiquetteTheme, quandPolices } from './outils.js';

export const FOND = 0x07061a;
export const POLICE_TITRE = "Bungee, Impact, 'Arial Black', sans-serif";
export const POLICE_TEXTE = "Outfit, 'Segoe UI', system-ui, sans-serif";
export const CYAN = 0x3ce8ff;
export const MAGENTA = 0xff3ca8;
export const quandPolicesPlateau = (fn) => quandPolices(['48px Bungee', '700 48px Outfit'], fn);

export function preparerAmbiancePlateau(renderer, scene, { leger = false } = {}) {
  ambiance(renderer, scene, { fond: FOND, ciel: 0x3a2a7a, sol: 0x080414, intensite: 0.55, leger });
}

// --- Pupitre rond : laque noire, dessus brillant, deux liserés lumineux ---
export function creerTablePlateau(rayon, { rayonFeutre = rayon - 0.22, leger = false } = {}) {
  const groupe = new THREE.Group();
  const laque = mat(0x111022, { roughness: 0.18, metalness: 0.3 });
  const plateau = new THREE.Mesh(new THREE.CylinderGeometry(rayon, rayon * 0.96, 0.08, 96), laque);
  plateau.position.y = -0.04;
  plateau.receiveShadow = true;
  // Dessus : verre fumé sur une rosace de rayons, comme un logo d'émission.
  const dessus = new THREE.Mesh(new THREE.CylinderGeometry(rayonFeutre, rayonFeutre, 0.01, 96), mat(0xffffff, {
    roughness: 0.22, metalness: 0.15,
    map: texture((ctx, L) => {
      const c = L / 2;
      const g = ctx.createRadialGradient(c, c, 0, c, c, c);
      g.addColorStop(0, '#2a1f5e'); g.addColorStop(1, '#0e0b26');
      ctx.fillStyle = g; ctx.fillRect(0, 0, L, L);
      for (let k = 0; k < 24; k++) {
        const a0 = k / 24 * Math.PI * 2, a1 = (k + 0.5) / 24 * Math.PI * 2;
        ctx.fillStyle = k % 2 ? 'rgba(60,232,255,0.05)' : 'rgba(255,60,168,0.05)';
        ctx.beginPath(); ctx.moveTo(c, c); ctx.arc(c, c, c, a0, a1); ctx.closePath(); ctx.fill();
      }
      ctx.strokeStyle = 'rgba(60,232,255,0.35)'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(c, c, c * 0.32, 0, Math.PI * 2); ctx.stroke();
    }, 512),
  }));
  dessus.position.y = 0.005;
  dessus.receiveShadow = true;
  const lisere = new THREE.Mesh(new THREE.TorusGeometry(rayon - 0.005, 0.022, 8, 128), lueur(CYAN, 1.5));
  lisere.rotation.x = Math.PI / 2;
  const lisereBas = new THREE.Mesh(new THREE.TorusGeometry(rayon * 0.62, 0.02, 8, 96), lueur(MAGENTA, 1.4));
  lisereBas.rotation.x = Math.PI / 2;
  lisereBas.position.y = -1.1;
  const socle = new THREE.Mesh(new THREE.CylinderGeometry(rayon * 0.55, rayon * 0.62, 1.1, 48), laque);
  socle.position.y = -0.6;
  groupe.add(plateau, dessus, lisere, socle, lisereBas, ombreAuSol(rayon * 1.35, -1.2));
  return { groupe, feutre: dessus, liseres: [lisere, lisereBas], leger };
}

// --- Tabouret de candidat : assise ronde, pied chromé, anneau lumineux ---
let MAT_CHROME = null, MAT_ASSISE = null;
export function creerTabouretPlateau(dir, rayon = 2.42, solY = -1.2, couleur = CYAN) {
  if (!MAT_CHROME) { MAT_CHROME = mat(0xd8dce8, { metalness: 0.95, roughness: 0.18 }); MAT_ASSISE = mat(0x1a1530, { roughness: 0.4 }); }
  const c = new THREE.Group();
  const h = 0.78;
  const assise = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.22, 0.08, 28), MAT_ASSISE);
  assise.position.y = h;
  const anneau = new THREE.Mesh(new THREE.TorusGeometry(0.235, 0.012, 6, 32), lueur(couleur, 1.3));
  anneau.rotation.x = Math.PI / 2; anneau.position.y = h - 0.04;
  const pied = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, h, 10), MAT_CHROME);
  pied.position.y = h / 2;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.03, 24), MAT_CHROME);
  base.position.y = 0.015;
  const repose = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.01, 6, 24), MAT_CHROME);
  repose.rotation.x = Math.PI / 2; repose.position.y = h * 0.4;
  c.add(assise, anneau, pied, base, repose);
  c.position.set(dir.x * rayon, solY, dir.z * rayon);
  c.rotation.y = Math.atan2(dir.x, dir.z);
  return c;
}

// --- Étiquettes : bandeau noir brillant, liseré cyan, texte blanc ---
export function dessinerEtiquettePlateau(ctx, texte, etat) {
  dessinerEtiquetteTheme(ctx, texte, etat, {
    police: POLICE_TEXTE, graisse: 800, rayon: 0.5,
    fond: ['#221a4a', '#0e0a24'], fondActif: ['#ff5cb8', '#b8126a'],
    bord: '#3ce8ff', bordActif: '#ffe0f2', texte: '#ffffff', texteActif: '#ffffff',
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
export function creerDecorPlateau(scene, { nom = '', solY = -1.2, leger = false } = {}) {
  const decor = new THREE.Group();
  const r = aleatoire(77);
  const Z_MUR = -6.2;

  // Sol noir laqué avec un grand cercle lumineux autour du pupitre.
  const sol = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), mat(0xffffff, {
    roughness: 0.2, metalness: 0.4,
    map: texture((ctx, L) => {
      ctx.fillStyle = '#08061a'; ctx.fillRect(0, 0, L, L);
      ctx.strokeStyle = 'rgba(120,90,255,0.10)'; ctx.lineWidth = 2;
      for (let k = 0; k <= 16; k++) {
        ctx.beginPath(); ctx.moveTo(k * L / 16, 0); ctx.lineTo(k * L / 16, L); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, k * L / 16); ctx.lineTo(L, k * L / 16); ctx.stroke();
      }
    }, 512, 512, [10, 10]),
  }));
  sol.rotation.x = -Math.PI / 2;
  sol.position.y = solY;
  decor.add(sol);
  const cercle = new THREE.Mesh(new THREE.RingGeometry(2.85, 2.95, 96), lueur(CYAN, 1.1));
  cercle.rotation.x = -Math.PI / 2;
  cercle.position.y = solY + 0.005;
  const cercle2 = new THREE.Mesh(new THREE.RingGeometry(3.15, 3.2, 96), lueur(MAGENTA, 1.0));
  cercle2.rotation.x = -Math.PI / 2;
  cercle2.position.y = solY + 0.005;
  decor.add(cercle, cercle2);

  // Fond de scène : panneaux sombres à lattes lumineuses verticales.
  const fondTex = texture((ctx, L, H) => {
    grain('#0c0a24', { intensite: 0.04, graine: 3, nb: 3000 })(ctx, L, H);
    for (let x = 0; x < L; x += 64) {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, 'rgba(60,232,255,0)'); g.addColorStop(0.5, 'rgba(60,232,255,0.12)'); g.addColorStop(1, 'rgba(60,232,255,0)');
      ctx.fillStyle = g; ctx.fillRect(x + 28, 0, 4, H);
    }
  }, 512, 512, [4, 1]);
  const mur = new THREE.Mesh(new THREE.PlaneGeometry(26, 8), mat(0xffffff, { map: fondTex, roughness: 0.7 }));
  mur.position.set(0, solY + 4, Z_MUR);
  decor.add(mur);

  // Grand écran LED : la carte s'y affiche.
  const ecrCanvas = document.createElement('canvas');
  ecrCanvas.width = 1024; ecrCanvas.height = 576;
  const ecrTex = new THREE.CanvasTexture(ecrCanvas);
  ecrTex.colorSpace = THREE.SRGBColorSpace;
  let contenu = { titre: nom, lignes: ['Ce soir en direct', 'qui sera désigné ?'], bas: '' };
  const dessinerEcran = () => {
    const ctx = ecrCanvas.getContext('2d'), L = 1024, H = 576;
    const g = ctx.createLinearGradient(0, 0, L, H);
    g.addColorStop(0, '#2a0f5a'); g.addColorStop(0.55, '#140a3a'); g.addColorStop(1, '#3a0a3a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, L, H);
    // Trame de pixels LED
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    for (let y = 0; y < H; y += 6) ctx.fillRect(0, y, L, 2);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = '#ff3ca8'; ctx.shadowBlur = 18;
    ctx.fillStyle = '#ffffff';
    ctx.font = `64px ${POLICE_TITRE}`;
    ctx.fillText(contenu.titre || '', L / 2, 74, L - 80);
    ctx.shadowColor = '#3ce8ff'; ctx.shadowBlur = 10;
    ctx.fillStyle = '#e8fbff';
    let taille = 60;
    const police = t => `700 ${t}px ${POLICE_TEXTE}`;
    ctx.font = police(taille);
    const decouper = () => { let ls = []; (contenu.lignes || []).forEach(t => { ls = ls.concat(couper(ctx, t, L - 120)); }); return ls; };
    let lignes = decouper();
    while (lignes.length > 5 && taille > 36) { taille -= 4; ctx.font = police(taille); lignes = decouper(); }
    const haut = 300 - (Math.min(lignes.length, 6) - 1) * taille * 0.56;
    lignes.slice(0, 6).forEach((l, k) => ctx.fillText(l, L / 2, haut + k * taille * 1.12, L - 80));
    if (contenu.bas) {
      ctx.shadowColor = '#ff3ca8';
      ctx.fillStyle = '#ffb8e0';
      ctx.font = `600 44px ${POLICE_TEXTE}`;
      ctx.fillText(contenu.bas, L / 2, H - 50, L - 80);
    }
    ctx.shadowBlur = 0;
    ecrTex.needsUpdate = true;
  };
  dessinerEcran();
  quandPolicesPlateau(dessinerEcran);
  const cadre = mat(0x0a0a12, { roughness: 0.35, metalness: 0.6 });
  const ecran = new THREE.Mesh(new THREE.BoxGeometry(6.0, 3.375, 0.1),
    [cadre, cadre, cadre, cadre, new THREE.MeshBasicMaterial({ map: ecrTex }), cadre]);
  ecran.position.set(0, solY + 3.5, Z_MUR + 0.08);
  decor.add(ecran);
  const bordEcran = new THREE.Mesh(new THREE.BoxGeometry(6.16, 3.53, 0.04), lueur(MAGENTA, 0.9));
  bordEcran.position.set(0, solY + 3.5, Z_MUR + 0.02);
  decor.add(bordEcran);

  // Arches de projecteurs (structure alu) au-dessus du plateau.
  const alu = mat(0x8a8ea0, { metalness: 0.85, roughness: 0.35 });
  const faisceaux = [];
  const spots = [];
  for (const z of leger ? [-1.2] : [-2.6, 0.2]) {
    const poutre = new THREE.Mesh(new THREE.BoxGeometry(12, 0.12, 0.12), alu);
    poutre.position.set(0, 4.6, z);
    decor.add(poutre);
    for (const x of [-6, 6]) {
      const montant = new THREE.Mesh(new THREE.BoxGeometry(0.12, 4.6 - solY, 0.12), alu);
      montant.position.set(x, (4.6 + solY) / 2, z);
      decor.add(montant);
    }
    const nb = leger ? 3 : 5;
    for (let k = 0; k < nb; k++) {
      const x = -4 + k * (8 / (nb - 1));
      const corps = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.26, 12), mat(0x15151c, { metalness: 0.5, roughness: 0.4 }));
      corps.position.set(x, 4.38, z);
      const verre = new THREE.Mesh(new THREE.CircleGeometry(0.11, 16), lueur(k % 2 ? CYAN : MAGENTA, 1.8));
      verre.rotation.x = Math.PI / 2;
      verre.position.set(x, 4.245, z);
      decor.add(corps, verre);
      spots.push(verre);
      if (!leger) {
        // Faisceau : cône additif très léger, qui balaie doucement.
        const cone = new THREE.Mesh(new THREE.ConeGeometry(0.9, 5.4, 24, 1, true), new THREE.MeshBasicMaterial({
          color: k % 2 ? CYAN : MAGENTA, transparent: true, opacity: 0.045, blending: THREE.AdditiveBlending,
          depthWrite: false, side: THREE.DoubleSide,
        }));
        cone.geometry.translate(0, -2.7, 0);
        const pivot = new THREE.Group();
        pivot.position.set(x, 4.24, z);
        pivot.add(cone);
        decor.add(pivot);
        faisceaux.push({ pivot, phase: r() * 6, ampl: 0.25 + r() * 0.2 });
      }
    }
  }

  // Gradins du public, dans l'ombre sur les côtés : silhouettes et petites lumières.
  const silhouette = mat(0x0c0a1e, { roughness: 0.9 });
  const tetes = new THREE.SphereGeometry(0.14, 8, 6);
  const corpsG = new THREE.CylinderGeometry(0.16, 0.2, 0.5, 8);
  const lumieresPublic = [];
  for (const cote of [-1, 1]) {
    for (let rang = 0; rang < (leger ? 1 : 3); rang++) {
      const marche = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.4 + rang * 0.45, 7), mat(0x120f2a, { roughness: 0.8 }));
      const x = cote * (6.6 + rang * 0.9);
      marche.position.set(x, solY + (0.4 + rang * 0.45) / 2, -1.5);
      decor.add(marche);
      const nb = leger ? 5 : 9;
      for (let k = 0; k < nb; k++) {
        const z = -4.6 + k * (6.2 / (nb - 1)) + (r() - 0.5) * 0.2;
        const y = solY + 0.4 + rang * 0.45;
        const c = new THREE.Mesh(corpsG, silhouette);
        c.position.set(x, y + 0.25, z);
        const t = new THREE.Mesh(tetes, silhouette);
        t.position.set(x, y + 0.62, z);
        decor.add(c, t);
        if (r() < 0.25) {
          // Un téléphone allumé dans le public.
          const tel = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.11), lueur(0xcfe8ff, 1.2));
          tel.position.set(x - cote * 0.2, y + 0.55, z);
          tel.rotation.y = -cote * Math.PI / 2;
          decor.add(tel);
          lumieresPublic.push(tel);
        }
      }
    }
  }

  // Panneau « EN DIRECT » au-dessus de l'écran.
  const direct = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.42), new THREE.MeshBasicMaterial({
    transparent: true,
    map: texture((ctx, L, H) => {
      ctx.clearRect(0, 0, L, H);
      ctx.fillStyle = '#d4143c';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(8, 8, L - 16, H - 16, 22); else ctx.rect(8, 8, L - 16, H - 16);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(70, H / 2, 20, 0, Math.PI * 2); ctx.fill();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `60px ${POLICE_TITRE}`;
      ctx.fillText('EN DIRECT', L / 2 + 30, H / 2 + 4, L - 140);
    }, 512, 128),
  }));
  direct.position.set(0, solY + 5.55, Z_MUR + 0.1);
  decor.add(direct);

  // Lumière principale du plateau (douche blanche-violette au-dessus du pupitre).
  const lumiere = new THREE.PointLight(0xe8dcff, 2.4, 9, 1.6);
  lumiere.position.set(0, 3.2, -0.2);
  decor.add(lumiere);

  scene.add(decor);

  function ecrireEcran(nouveau) {
    contenu = Object.assign({ titre: nom, lignes: [], bas: '' }, nouveau);
    dessinerEcran();
  }

  function animer(t) {
    if (leger) return;
    faisceaux.forEach(f => {
      f.pivot.rotation.z = Math.sin(t * 0.5 + f.phase) * f.ampl;
      f.pivot.rotation.x = Math.cos(t * 0.37 + f.phase) * f.ampl * 0.6;
    });
    spots.forEach((s, k) => s.material.color.setHex(k % 2 ? CYAN : MAGENTA).multiplyScalar(1.5 + Math.sin(t * 2 + k) * 0.35));
    direct.material.opacity = 0.75 + Math.sin(t * 3) * 0.25;
  }
  return { decor, animer, lumiere, ecrireEcran };
}
