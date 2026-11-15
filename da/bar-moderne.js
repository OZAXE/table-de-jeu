// =====================================================================
// Direction artistique commune des jeux 3D : « bar moderne ».
//
// Toujours un bar, mais lisse et contemporain, dans l'esprit de la page
// d'accueil : fond vert très sombre, noyer et laiton, lumière chaude au-dessus
// de la table, et une couleur d'accent par jeu (bandeaux LED, néon, contre-
// jour sur les personnages, interface). Kinito : orange, BeerBattle :
// turquoise, Buckshot : rouge.
//
// Chaque jeu garde sa propre scène et ses règles ; il ne prend ici que le
// décor, l'ambiance lumineuse, le dessin des étiquettes et le « lissage ».
// =====================================================================
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const POLICE = "Outfit, system-ui, -apple-system, 'Segoe UI', sans-serif";
export const FOND = 0x07110d;

const hex = c => '#' + new THREE.Color(c).getHexString();

// ---------------------------------------------------------------------
// Ambiance : fond, brouillard, reflets doux, contre-jour coloré
// ---------------------------------------------------------------------
export function preparerAmbiance(renderer, scene, { accent }) {
  scene.background = new THREE.Color(FOND);
  if (scene.fog) scene.fog.color = new THREE.Color(FOND);

  // Une pièce virtuelle très douce pour les reflets : c'est elle qui donne
  // l'aspect lisse et satiné aux matériaux (sans elle, tout paraît mat).
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  // Remplissage doux du ciel (froid) et du sol (chaud).
  scene.add(new THREE.HemisphereLight(0x2c4a3e, 0x1a120b, 0.55));

  // Contre-jour dans la couleur du jeu : il détoure les personnages.
  const contre = new THREE.DirectionalLight(accent, 1.6);
  contre.position.set(0, 2.6, -4.5);
  scene.add(contre);
  return { contre };
}

// À appeler une fois la scène construite (et après chaque ajout important) :
// plus aucune facette, et des reflets dosés pour rester dans la pénombre.
export function lisser(objet, intensiteReflets = 0.35) {
  objet.traverse(o => {
    if (!o.isMesh || !o.material) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    mats.forEach(m => {
      if (m.flatShading) { m.flatShading = false; m.needsUpdate = true; }
      if ('envMapIntensity' in m && !m.userData.refletsRegles) {
        m.envMapIntensity = intensiteReflets;
        m.userData.refletsRegles = true;
      }
    });
  });
}

// ---------------------------------------------------------------------
// Étiquettes de prénom : pastille arrondie, police de l'accueil
// ---------------------------------------------------------------------
function pastille(ctx, x, y, l, h) {
  const r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + l, y, x + l, y + h, r);
  ctx.arcTo(x + l, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + l, y, r);
  ctx.closePath();
}

export function dessinerEtiquette(ctx, texte, { actif = false, absent = false, accent = 0xf59e2e } = {}) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  ctx.clearRect(0, 0, W, H);
  const taille = Math.round(H * 0.4);
  ctx.font = `600 ${taille}px ${POLICE}`;
  const largeur = Math.min(W - 8, ctx.measureText(texte).width + H * 0.75);
  const x = (W - largeur) / 2, h = H * 0.66, y = (H - h) / 2;
  pastille(ctx, x, y, largeur, h);
  if (actif) {
    const g = ctx.createLinearGradient(x, 0, x + largeur, 0);
    g.addColorStop(0, hex(accent));
    g.addColorStop(1, hex(new THREE.Color(accent).multiplyScalar(0.7)));
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = 'rgba(8, 16, 12, 0.78)';
  }
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = actif ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.14)';
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = absent ? 'rgba(244,241,234,0.4)' : '#f4f1ea';
  ctx.fillText(texte, W / 2, H / 2 + 2);
}

// Les polices du web arrivent après le premier dessin : on redessine
// les étiquettes une fois Outfit chargée.
export function quandPoliceChargee(fn) {
  if (!document.fonts || !document.fonts.load) return;
  document.fonts.load(`600 40px Outfit`).then(fn).catch(() => {});
}

// ---------------------------------------------------------------------
// Matériaux
// ---------------------------------------------------------------------
export function materiauNoyer(teinte = 0x3b2618, rugosite = 0.5) {
  return new THREE.MeshStandardMaterial({ color: teinte, roughness: rugosite, metalness: 0.05 });
}
export const LAITON = () => new THREE.MeshStandardMaterial({ color: 0xc9a25a, roughness: 0.28, metalness: 0.9 });

function neon(accent, intensite = 2.2) {
  return new THREE.MeshStandardMaterial({
    color: 0x000000, emissive: accent, emissiveIntensity: intensite, roughness: 0.4,
  });
}

// Texture de bois veiné, plus fine et plus régulière qu'avant.
export function textureBois(base = '#4a2f1d', repetition = 2) {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const ctx = c.getContext('2d');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 70; i++) {
    const y = Math.random() * 512;
    ctx.strokeStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,220,170'},${0.02 + Math.random() * 0.05})`;
    ctx.lineWidth = 0.6 + Math.random() * 2.2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(170, y + (Math.random() - 0.5) * 14, 340, y + (Math.random() - 0.5) * 14, 512, y + (Math.random() - 0.5) * 8);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repetition, repetition);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// ---------------------------------------------------------------------
// Le décor : un bar contemporain derrière les joueurs
// ---------------------------------------------------------------------
function bouteille(teinte, echelle) {
  // Profil tourné (lathe) : épaule arrondie et goulot, bien lisse.
  const pts = [
    [0.0, 0.0], [0.082, 0.0], [0.088, 0.02], [0.088, 0.3], [0.07, 0.36],
    [0.034, 0.41], [0.03, 0.52], [0.034, 0.53], [0.0, 0.53],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const mat = new THREE.MeshStandardMaterial({
    color: teinte, roughness: 0.12, metalness: 0.1,
    emissive: teinte, emissiveIntensity: 0.18,
  });
  const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 20), mat);
  m.scale.setScalar(echelle);
  return m;
}

function texteNeon(texte, accent) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 256;
  const ctx = c.getContext('2d');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 150px ${POLICE}`;
  ctx.shadowColor = hex(accent);
  for (const flou of [60, 30, 12]) {
    ctx.shadowBlur = flou;
    ctx.fillStyle = hex(accent);
    ctx.fillText(texte, 512, 128);
  }
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fff6e8';
  ctx.globalAlpha = 0.85;
  ctx.fillText(texte, 512, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const plan = new THREE.Mesh(
    new THREE.PlaneGeometry(4.2, 1.05),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false })
  );
  plan.userData.redessiner = () => {
    ctx.clearRect(0, 0, 1024, 256);
    ctx.globalAlpha = 1;
    ctx.font = `700 150px ${POLICE}`;
    ctx.shadowColor = hex(accent);
    for (const flou of [60, 30, 12]) { ctx.shadowBlur = flou; ctx.fillStyle = hex(accent); ctx.fillText(texte, 512, 128); }
    ctx.shadowBlur = 0; ctx.fillStyle = '#fff6e8'; ctx.globalAlpha = 0.85;
    ctx.fillText(texte, 512, 128);
    tex.needsUpdate = true;
  };
  return plan;
}

export function creerDecorBar(scene, { accent, nom = '', solY = -1.2 } = {}) {
  const decor = new THREE.Group();
  const noyer = materiauNoyer(0x32200f, 0.55);
  const noyerClair = materiauNoyer(0x4a2f1b, 0.45);

  // Sol : béton ciré sombre, légèrement brillant.
  const sol = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshStandardMaterial({ color: 0x060b09, roughness: 0.55, metalness: 0.05 })
  );
  sol.rotation.x = -Math.PI / 2;
  sol.position.y = solY;
  decor.add(sol);

  // Mur du fond : vert très sombre, habillé de lattes verticales en noyer.
  const mur = new THREE.Mesh(
    new THREE.PlaneGeometry(26, 7),
    new THREE.MeshStandardMaterial({ color: 0x0b1712, roughness: 0.9 })
  );
  mur.position.set(0, solY + 3.5, -8.4);
  decor.add(mur);
  const latte = new RoundedBoxGeometry(0.16, 6.6, 0.08, 2, 0.03);
  for (let x = -12.6; x <= 12.6; x += 0.34) {
    if (Math.abs(x) < 5.1) continue;          // derrière les étagères : panneau rétroéclairé
    const l = new THREE.Mesh(latte, noyer);
    l.position.set(x, solY + 3.3, -8.32);
    decor.add(l);
  }

  // Panneau rétroéclairé derrière les bouteilles : lueur chaude diffuse.
  const panneau = new THREE.Mesh(
    new RoundedBoxGeometry(10, 2.6, 0.06, 3, 0.04),
    new THREE.MeshStandardMaterial({ color: 0x1a120a, emissive: 0xffa457, emissiveIntensity: 0.22, roughness: 0.8 })
  );
  panneau.position.set(0, solY + 2.1, -8.3);
  decor.add(panneau);

  // Étagères en verre et bouteilles.
  const TEINTES = [0x2f7a4c, 0x8a4a1a, 0xa8322e, 0x2d5e8f, 0xb08a2a, 0x6a3a8a, 0xd8cfc0];
  const matEtagere = new THREE.MeshStandardMaterial({ color: 0xcfe3dc, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.35 });
  [1.15, 1.95, 2.75].forEach((hauteur, rangee) => {
    const y = solY + hauteur;
    const e = new THREE.Mesh(new RoundedBoxGeometry(9.6, 0.05, 0.42, 2, 0.02), matEtagere);
    e.position.set(0, y, -7.95);
    decor.add(e);
    // Fine LED sous chaque étagère, dans la couleur du jeu.
    const led = new THREE.Mesh(new THREE.BoxGeometry(9.5, 0.018, 0.02), neon(accent, 1.6));
    led.position.set(0, y - 0.035, -7.76);
    decor.add(led);
    for (let i = 0; i < 14; i++) {
      const b = bouteille(TEINTES[(i * 3 + rangee) % TEINTES.length], 0.85 + Math.random() * 0.35);
      b.position.set(-4.4 + i * 0.68 + (rangee % 2) * 0.2, y + 0.025, -7.95 + (Math.random() - 0.5) * 0.1);
      decor.add(b);
    }
  });

  // Enseigne néon au nom du jeu.
  if (nom) {
    const enseigne = texteNeon(nom, accent);
    enseigne.position.set(0, solY + 4.15, -8.2);
    decor.add(enseigne);
    quandPoliceChargee(() => enseigne.userData.redessiner());
  }

  // Comptoir : corps en noyer aux angles arrondis, plateau clair façon pierre,
  // bandeau LED sous le plateau, repose-pieds en laiton.
  const comptoir = new THREE.Mesh(new RoundedBoxGeometry(9.6, 1.62, 0.9, 4, 0.08), noyerClair);
  comptoir.position.set(0, solY + 0.81, -6.3);
  decor.add(comptoir);
  const plateau = new THREE.Mesh(
    new RoundedBoxGeometry(10, 0.1, 1.15, 4, 0.04),
    new THREE.MeshStandardMaterial({ color: 0xe8e1d4, roughness: 0.22, metalness: 0.05 })
  );
  plateau.position.set(0, solY + 1.68, -6.3);
  decor.add(plateau);
  const ledComptoir = new THREE.Mesh(new THREE.BoxGeometry(9.5, 0.025, 0.03), neon(accent, 2.4));
  ledComptoir.position.set(0, solY + 1.6, -5.82);
  decor.add(ledComptoir);
  const barre = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 9.4, 24), LAITON());
  barre.rotation.z = Math.PI / 2;
  barre.position.set(0, solY + 0.28, -5.75);
  decor.add(barre);

  // Tabourets design : pied chromé, assise ronde en cuir sombre.
  const chrome = new THREE.MeshStandardMaterial({ color: 0xd8dde0, roughness: 0.18, metalness: 1 });
  const cuir = new THREE.MeshStandardMaterial({ color: 0x1d1612, roughness: 0.55 });
  [-3.2, -1.6, 1.6, 3.2].forEach(x => {
    const pied = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.0, 20), chrome);
    pied.position.set(x, solY + 0.55, -5.15);
    const socle = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.03, 32), chrome);
    socle.position.set(x, solY + 0.015, -5.15);
    const assise = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.22, 0.1, 32), cuir);
    assise.position.set(x, solY + 1.09, -5.15);
    const anneau = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.012, 10, 40), chrome);
    anneau.rotation.x = Math.PI / 2;
    anneau.position.set(x, solY + 0.42, -5.15);
    decor.add(pied, socle, assise, anneau);
  });

  // Petites suspensions au-dessus du comptoir : ampoules chaudes (bokeh).
  [-3.4, -1.1, 1.1, 3.4].forEach(x => {
    const fil = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 1.6, 6),
      new THREE.MeshStandardMaterial({ color: 0x111111 }));
    fil.position.set(x, solY + 4.6, -6.3);
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.11, 24, 16),
      new THREE.MeshStandardMaterial({ color: 0xfff1d6, emissive: 0xffc27a, emissiveIntensity: 2.2 }));
    globe.position.set(x, solY + 3.75, -6.3);
    decor.add(fil, globe);
  });

  // Grandes plantes stylisées dans les coins (silhouettes douces).
  const feuillage = new THREE.MeshStandardMaterial({ color: 0x1f4a33, roughness: 0.7 });
  const pot = new THREE.MeshStandardMaterial({ color: 0x2a2420, roughness: 0.5 });
  [[-6.4, -4.6], [6.6, -4.2]].forEach(([x, z]) => {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.34, 0.8, 32), pot);
    p.position.set(x, solY + 0.4, z);
    decor.add(p);
    for (let k = 0; k < 6; k++) {
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.45 + Math.random() * 0.2, 24, 16), feuillage);
      f.scale.set(1, 1.5, 1);
      f.position.set(x + (Math.random() - 0.5) * 0.7, solY + 1.4 + Math.random() * 1.1, z + (Math.random() - 0.5) * 0.5);
      decor.add(f);
    }
  });

  // Suspension au-dessus de la table : dôme noir mat, intérieur lumineux.
  const fil = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1.4, 8),
    new THREE.MeshStandardMaterial({ color: 0x111111 }));
  fil.position.set(0, 3.25, 0);
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x15201b, roughness: 0.35, metalness: 0.3, side: THREE.DoubleSide })
  );
  dome.position.set(0, 2.32, 0);
  const interieur = new THREE.Mesh(
    new THREE.CircleGeometry(0.48, 48),
    new THREE.MeshStandardMaterial({ color: 0xfff2dc, emissive: 0xffc27a, emissiveIntensity: 1.6, side: THREE.DoubleSide })
  );
  interieur.rotation.x = Math.PI / 2;
  interieur.position.set(0, 2.33, 0);
  const cerclage = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.012, 12, 64), LAITON());
  cerclage.rotation.x = Math.PI / 2;
  cerclage.position.set(0, 2.32, 0);
  decor.add(fil, dome, interieur, cerclage);

  decor.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  scene.add(decor);
  return decor;
}

// ---------------------------------------------------------------------
// Personnage lisse (Kinito, Buckshot) : buste aux épaules arrondies, tête
// ronde avec deux yeux. Même encombrement que l'ancien (le buste descend
// sous le plateau). Le groupe regarde vers +z : tourner-le vers la table
// avec orienterVersTable().
// ---------------------------------------------------------------------
const PROFIL_BUSTE = [
  [0.0, -1.05], [0.3, -1.05], [0.33, -0.2], [0.36, 0.18], [0.355, 0.32],
  [0.31, 0.42], [0.22, 0.49], [0.12, 0.53], [0.08, 0.56], [0.076, 0.62], [0.0, 0.62],
].map(([x, y]) => new THREE.Vector2(x, y));
const GEO_BUSTE = new THREE.LatheGeometry(PROFIL_BUSTE, 48);
const GEO_TETE = new THREE.SphereGeometry(0.225, 40, 28);
const GEO_OEIL = new THREE.SphereGeometry(0.03, 16, 12);
const MAT_OEIL = new THREE.MeshStandardMaterial({ color: 0x1a1410, roughness: 0.3 });

export function creerPersonnage(couleur) {
  const g = new THREE.Group();
  const matCorps = new THREE.MeshPhysicalMaterial({
    color: couleur, roughness: 0.48, metalness: 0, clearcoat: 0.3, clearcoatRoughness: 0.45,
    envMapIntensity: 0.5,
  });
  const corps = new THREE.Mesh(GEO_BUSTE, matCorps);
  corps.castShadow = true;
  const matTete = new THREE.MeshPhysicalMaterial({ color: 0xf1caa5, roughness: 0.5, clearcoat: 0.15, envMapIntensity: 0.5 });
  const tete = new THREE.Mesh(GEO_TETE, matTete);
  tete.position.y = 0.82;
  tete.castShadow = true;
  const oeilG = new THREE.Mesh(GEO_OEIL, MAT_OEIL);
  const oeilD = new THREE.Mesh(GEO_OEIL, MAT_OEIL);
  oeilG.position.set(-0.078, 0.855, 0.2);
  oeilD.position.set(0.078, 0.855, 0.2);
  oeilG.scale.z = oeilD.scale.z = 0.6;
  g.add(corps, tete, oeilG, oeilD);
  g.userData.materiaux = [matCorps];
  g.userData.matTete = matTete;
  return g;
}

// Tourne un personnage (enfant d'un groupe à l'origine) vers le centre.
export function orienterVersTable(avatar) {
  avatar.lookAt(0, avatar.position.y, 0);
}

// Plateau de table moderne : noyer foncé, feutre vert profond au centre,
// cerclage laiton. Renvoie { table, feutre } ; le dessus est à y = 0.
export function creerTableRonde(rayon, { rayonFeutre = rayon - 0.2, feutreCouleur = 0x12392a } = {}) {
  const groupe = new THREE.Group();
  const table = new THREE.Mesh(
    new THREE.CylinderGeometry(rayon, rayon * 0.97, 0.26, 128),
    new THREE.MeshStandardMaterial({ map: textureBois('#3a2416', 3), roughness: 0.4, metalness: 0.05 })
  );
  table.position.y = -0.13;
  table.receiveShadow = true;
  const feutre = new THREE.Mesh(
    new THREE.CylinderGeometry(rayonFeutre, rayonFeutre, 0.01, 128),
    new THREE.MeshStandardMaterial({ color: feutreCouleur, roughness: 0.92, envMapIntensity: 0.1 })
  );
  feutre.position.y = 0.002;
  feutre.receiveShadow = true;
  const cerclage = new THREE.Mesh(new THREE.TorusGeometry(rayon, 0.035, 20, 160), LAITON());
  cerclage.rotation.x = Math.PI / 2;
  cerclage.position.y = 0.005;
  const filet = new THREE.Mesh(new THREE.TorusGeometry(rayonFeutre, 0.008, 10, 160), LAITON());
  filet.rotation.x = Math.PI / 2;
  filet.position.y = 0.008;
  groupe.add(table, feutre, cerclage, filet);
  return { groupe, table, feutre };
}

// ---------------------------------------------------------------------
// Sous-verre à la couleur du joueur, posé sous sa chope. Il remplace les
// personnages : il s'allume quand c'est son tour, s'estompe s'il est parti
// (userData.materiaux, comme l'ancien buste), et porte une zone de clic
// invisible un peu plus large que le verre (pour viser un joueur).
// ---------------------------------------------------------------------
const GEO_SOUS_VERRE = new THREE.CylinderGeometry(0.19, 0.19, 0.014, 64);
const GEO_LISERE_SV = new THREE.TorusGeometry(0.19, 0.009, 10, 64);
const GEO_CLIC = new THREE.CylinderGeometry(0.28, 0.28, 0.6, 16);
const MAT_CLIC = new THREE.MeshBasicMaterial({ visible: false });

export function creerSousVerre(couleur) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: couleur, roughness: 0.45, metalness: 0.1, envMapIntensity: 0.4 });
  const disque = new THREE.Mesh(GEO_SOUS_VERRE, mat);
  disque.position.y = 0.007;
  disque.receiveShadow = true;
  const lisere = new THREE.Mesh(GEO_LISERE_SV, LAITON());
  lisere.rotation.x = Math.PI / 2;
  lisere.position.y = 0.012;
  const clic = new THREE.Mesh(GEO_CLIC, MAT_CLIC);
  clic.position.y = 0.3;
  g.add(disque, lisere, clic);
  g.userData.materiaux = [mat];
  return g;
}
