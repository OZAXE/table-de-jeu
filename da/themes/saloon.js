// =====================================================================
// Thème « Saloon » (Buckshot) : un saloon de l'Ouest, une nuit chaude.
//
// Planches poussiéreuses, comptoir et grand miroir, bouteilles de whisky,
// enseigne peinte au nom du jeu, avis de recherche, crâne de longhorn,
// portes battantes ouvertes sur la rue, fenêtre sur le désert au crépuscule,
// tonneaux et caisses. Au-dessus de la table : un lustre en roue de chariot
// avec ses bougies, une lumière qui vacille et de la poussière dans le
// faisceau.
//
// Tout est dessiné en code (aucun fichier à télécharger). En version légère
// (da/qualite.js) : pas de reflets calculés, pas de poussière, lumière fixe,
// moins de bouteilles et de clous.
//
// Le décor reste en retrait (sombre, au fond) : la table et ses objets
// doivent toujours se lire en premier.
// =====================================================================
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export const FOND = 0x140b07;
export const POLICE_TEXTE = "Bitter, Georgia, 'Times New Roman', serif";
export const POLICE_TITRE = "Rye, Georgia, serif";

export const PALETTE = {
  sable: '#f3e3c3',
  sableFonce: '#d9b382',
  rouille: '#b4441c',
  sang: '#9b1c1c',
  cuir: '#2a170d',
  bois: '#5a3a22',
};

// Les polices du thème arrivent de Google Fonts : on redessine ce qui en dépend.
export function quandPolicesSaloon(fn) {
  if (!document.fonts || !document.fonts.load) return;
  Promise.all([document.fonts.load('48px Rye'), document.fonts.load('600 48px Bitter')]).then(fn).catch(() => {});
}

// ---------------------------------------------------------------------
// Outils : aléatoire reproductible, textures dessinées
// ---------------------------------------------------------------------
function aleatoire(graine) {
  let s = graine >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function texture(dessiner, l, h, repetition) {
  const c = document.createElement('canvas');
  c.width = l; c.height = h || l;
  dessiner(c.getContext('2d'), c.width, c.height);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repetition) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repetition[0], repetition[1]); }
  t.anisotropy = 4;
  return t;
}

// Planches de bois : veinage, nœuds, joints sombres.
function planches(base, { nb = 6, vertical = false, graine = 3, usure = 0.25 } = {}) {
  return (ctx, L, H) => {
    const r = aleatoire(graine);
    ctx.fillStyle = '#1a0e07'; ctx.fillRect(0, 0, L, H);
    const pas = (vertical ? L : H) / nb;
    for (let k = 0; k < nb; k++) {
      const c = new THREE.Color(base).multiplyScalar(0.72 + r() * 0.45);
      ctx.fillStyle = '#' + c.getHexString();
      if (vertical) ctx.fillRect(k * pas + 2, 0, pas - 4, H); else ctx.fillRect(0, k * pas + 2, L, pas - 4);
      // Veinage
      ctx.strokeStyle = 'rgba(20,10,4,0.28)';
      ctx.lineWidth = 1.2;
      for (let v = 0; v < 7; v++) {
        ctx.beginPath();
        const o = k * pas + 4 + r() * (pas - 8);
        for (let t = 0; t <= 1.001; t += 0.05) {
          const ondule = Math.sin(t * 9 + v + k) * 2.2;
          if (vertical) ctx.lineTo(o + ondule, t * H); else ctx.lineTo(t * L, o + ondule);
        }
        ctx.stroke();
      }
      // Nœuds
      for (let n = 0; n < 2; n++) {
        if (r() > 0.6) continue;
        const x = vertical ? k * pas + pas / 2 : r() * L, y = vertical ? r() * H : k * pas + pas / 2;
        ctx.fillStyle = 'rgba(30,14,6,0.55)';
        ctx.beginPath(); ctx.ellipse(x, y, vertical ? 4 : 9, vertical ? 9 : 4, 0, 0, Math.PI * 2); ctx.fill();
      }
      // Clous aux extrémités
      ctx.fillStyle = 'rgba(15,10,8,0.8)';
      for (const t of [0.04, 0.96]) {
        const x = vertical ? k * pas + pas / 2 : t * L, y = vertical ? t * H : k * pas + pas / 2;
        ctx.beginPath(); ctx.arc(x - 6, y, 2.2, 0, Math.PI * 2); ctx.arc(x + 6, y, 2.2, 0, Math.PI * 2); ctx.fill();
      }
    }
    // Poussière et usure
    for (let p = 0; p < L * H * usure / 900; p++) {
      ctx.fillStyle = `rgba(${r() < 0.5 ? '230,200,150' : '10,5,2'},${0.04 + r() * 0.06})`;
      ctx.fillRect(r() * L, r() * H, 1 + r() * 3, 1 + r() * 3);
    }
  };
}

const mat = (couleur, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: couleur, roughness: 0.8, metalness: 0 }, o));
const lueur = (couleur, i = 1.6) => new THREE.MeshBasicMaterial({ color: new THREE.Color(couleur).multiplyScalar(i) });

// ---------------------------------------------------------------------
// Ambiance : fond chaud, reflets doux (pas en léger), contre-jour orangé
// ---------------------------------------------------------------------
export function preparerAmbianceSaloon(renderer, scene, { leger = false } = {}) {
  scene.background = new THREE.Color(FOND);
  if (scene.fog) scene.fog.color = new THREE.Color(FOND);
  if (!leger) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
  }
  scene.add(new THREE.HemisphereLight(0x5a3a22, 0x1a0e07, leger ? 0.9 : 0.6));
  // Coucher de soleil par les portes : un contre-jour orangé qui détoure les verres.
  const contre = new THREE.DirectionalLight(0xff8a3d, 1.3);
  contre.position.set(-2, 2.4, -4.5);
  scene.add(contre);
  return { contre };
}

export function lisserSaloon(objet, reflets = 0.3) {
  objet.traverse(o => {
    if (!o.isMesh || !o.material) return;
    (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => {
      if ('envMapIntensity' in m && !m.userData.refletsRegles) { m.envMapIntensity = reflets; m.userData.refletsRegles = true; }
    });
  });
}

// ---------------------------------------------------------------------
// Table de poker du saloon : ce qui la fait lire comme une table, c'est son
// rebord rembourré en cuir, son plateau d'un seul tenant (veinage continu,
// pas de planches : sinon on croit voir un fond de tonneau), sa ceinture
// moulurée, son ombre au sol et les chaises autour (creerChaiseSaloon).
// ---------------------------------------------------------------------
function veinage(base, graine) {
  return (ctx, L, H) => {
    const r = aleatoire(graine);
    ctx.fillStyle = base; ctx.fillRect(0, 0, L, H);
    for (let k = 0; k < 140; k++) {
      const y0 = r() * H, ampl = 3 + r() * 10, f = 2 + r() * 4;
      ctx.strokeStyle = `rgba(${r() < 0.6 ? '30,14,6' : '255,220,170'},${0.05 + r() * 0.1})`;
      ctx.lineWidth = 0.6 + r() * 1.8;
      ctx.beginPath();
      for (let x = 0; x <= L; x += 8) ctx.lineTo(x, y0 + Math.sin(x / L * Math.PI * f + k) * ampl);
      ctx.stroke();
    }
  };
}

export function creerTableSaloon(rayon, { rayonFeutre = rayon - 0.28, leger = false } = {}) {
  const groupe = new THREE.Group();
  const boisClair = mat(0xffffff, { map: texture(veinage('#7a4e2c', 11), 512, 512), roughness: 0.45 });
  const boisFonce = mat(0xffffff, { map: texture(veinage('#4a2c16', 12), 512, 128, [6, 1]), roughness: 0.55 });

  // Plateau d'un seul tenant, un peu épais.
  const plateau = new THREE.Mesh(new THREE.CylinderGeometry(rayon, rayon, 0.09, 96), [boisFonce, boisClair, boisClair]);
  plateau.position.y = -0.045;
  plateau.receiveShadow = true;
  // Ceinture sous le plateau, en retrait, avec une moulure de laiton.
  const ceinture = new THREE.Mesh(new THREE.CylinderGeometry(rayon - 0.12, rayon - 0.2, 0.22, 96, 1, true), boisFonce);
  ceinture.position.y = -0.2;
  const moulure = new THREE.Mesh(new THREE.TorusGeometry(rayon - 0.12, 0.018, 8, 128), mat(0xb08a4a, { metalness: 0.8, roughness: 0.35 }));
  moulure.rotation.x = Math.PI / 2;
  moulure.position.y = -0.1;
  // Pied central tourné et quatre griffes au sol.
  const pied = new THREE.Mesh(new THREE.LatheGeometry([
    new THREE.Vector2(0.0, 0), new THREE.Vector2(0.42, 0), new THREE.Vector2(0.36, 0.08), new THREE.Vector2(0.2, 0.2),
    new THREE.Vector2(0.24, 0.45), new THREE.Vector2(0.16, 0.7), new THREE.Vector2(0.2, 0.85), new THREE.Vector2(0.3, 0.9), new THREE.Vector2(0, 0.9),
  ], 24), mat(0x3a2414, { roughness: 0.6 }));
  pied.position.y = -1.2;
  for (let k = 0; k < 4; k++) {
    const griffe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.9), mat(0x3a2414, { roughness: 0.6 }));
    griffe.rotation.y = k * Math.PI / 2 + Math.PI / 4;
    griffe.position.set(Math.sin(griffe.rotation.y) * 0.55, -1.14, Math.cos(griffe.rotation.y) * 0.55);
    groupe.add(griffe);
  }

  // Cuir rouge sang au centre, cousu.
  const cuirTex = texture((ctx, L) => {
    const g = ctx.createRadialGradient(L / 2, L / 2, L * 0.05, L / 2, L / 2, L / 2);
    g.addColorStop(0, '#7a2216'); g.addColorStop(0.7, '#5a1810'); g.addColorStop(1, '#3a0e08');
    ctx.fillStyle = g; ctx.fillRect(0, 0, L, L);
    const r = aleatoire(5);
    for (let k = 0; k < 2600; k++) {
      ctx.fillStyle = `rgba(${r() < 0.5 ? '255,200,160' : '0,0,0'},${0.03 + r() * 0.05})`;
      ctx.fillRect(r() * L, r() * L, 2, 2);
    }
    ctx.strokeStyle = 'rgba(217,179,130,0.55)'; ctx.setLineDash([10, 9]); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(L / 2, L / 2, L / 2 - 14, 0, Math.PI * 2); ctx.stroke();
  }, 512);
  const feutre = new THREE.Mesh(new THREE.CylinderGeometry(rayonFeutre, rayonFeutre, 0.012, 96),
    mat(0xffffff, { map: cuirTex, roughness: 0.85 }));
  feutre.position.y = 0.006;
  feutre.receiveShadow = true;
  // Filet de laiton autour du cuir.
  const filet = new THREE.Mesh(new THREE.TorusGeometry(rayonFeutre, 0.012, 8, 128), mat(0xb08a4a, { metalness: 0.8, roughness: 0.35 }));
  filet.rotation.x = Math.PI / 2;
  filet.position.y = 0.01;

  // Le rebord rembourré, en cuir brun capitonné : la signature d'une table de poker.
  const rebordTex = texture((ctx, L, H) => {
    ctx.fillStyle = '#3a1d0c'; ctx.fillRect(0, 0, L, H);
    const r = aleatoire(9);
    for (let k = 0; k < 900; k++) { ctx.fillStyle = `rgba(${r() < 0.5 ? '255,210,170' : '0,0,0'},${0.04 + r() * 0.05})`; ctx.fillRect(r() * L, r() * H, 2, 2); }
    // Clous de capiton
    ctx.fillStyle = 'rgba(200,160,90,0.9)';
    for (let x = 8; x < L; x += 32) { ctx.beginPath(); ctx.arc(x, H * 0.5, 3, 0, Math.PI * 2); ctx.fill(); }
  }, 512, 32, [12, 1]);
  const rebord = new THREE.Mesh(new THREE.TorusGeometry(rayon - 0.06, 0.075, 14, 128),
    mat(0xffffff, { map: rebordTex, roughness: 0.5 }));
  rebord.rotation.x = Math.PI / 2;
  rebord.position.y = 0.05;
  rebord.castShadow = !leger;

  // Ombre douce au sol : la table se pose sur le plancher au lieu de flotter.
  const ombre = new THREE.Mesh(new THREE.CircleGeometry(rayon * 1.35, 48), new THREE.MeshBasicMaterial({
    transparent: true, depthWrite: false,
    map: texture((ctx, L) => {
      const g = ctx.createRadialGradient(L / 2, L / 2, 0, L / 2, L / 2, L / 2);
      g.addColorStop(0, 'rgba(0,0,0,0.7)'); g.addColorStop(0.6, 'rgba(0,0,0,0.45)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, L, L);
    }, 128),
  }));
  ombre.rotation.x = -Math.PI / 2;
  ombre.position.y = -1.195;

  groupe.add(plateau, ceinture, moulure, pied, feutre, filet, rebord, ombre);
  return { groupe, feutre };
}

// Chaise western à barreaux, tournée vers la table. `dir` : direction du
// joueur depuis le centre ; la chaise se place derrière sa place.
const GEO_CHAISE = {
  assise: new THREE.BoxGeometry(0.56, 0.06, 0.5),
  pied: new THREE.CylinderGeometry(0.025, 0.03, 0.72, 8),
  montant: new THREE.CylinderGeometry(0.025, 0.025, 0.72, 8),
  barreau: new THREE.CylinderGeometry(0.014, 0.014, 0.5, 6),
  traverse: new THREE.BoxGeometry(0.58, 0.07, 0.05),
};
let MAT_CHAISE = null;
export function creerChaiseSaloon(dir, rayon = 2.45, solY = -1.2) {
  if (!MAT_CHAISE) MAT_CHAISE = mat(0xffffff, { map: texture(veinage('#6b4528', 21), 256, 256), roughness: 0.6 });
  const c = new THREE.Group();
  const hAssise = 0.74;
  const assise = new THREE.Mesh(GEO_CHAISE.assise, MAT_CHAISE);
  assise.position.y = hAssise;
  c.add(assise);
  for (const [x, z] of [[-0.24, -0.21], [0.24, -0.21], [-0.24, 0.21], [0.24, 0.21]]) {
    const p = new THREE.Mesh(GEO_CHAISE.pied, MAT_CHAISE);
    p.position.set(x, hAssise / 2, z);
    c.add(p);
  }
  // Dossier côté extérieur (+z local) : deux montants, barreaux, traverse.
  for (const x of [-0.25, 0.25]) {
    const m = new THREE.Mesh(GEO_CHAISE.montant, MAT_CHAISE);
    m.position.set(x, hAssise + 0.36, 0.23);
    c.add(m);
  }
  for (const x of [-0.12, 0, 0.12]) {
    const b = new THREE.Mesh(GEO_CHAISE.barreau, MAT_CHAISE);
    b.position.set(x, hAssise + 0.3, 0.23);
    c.add(b);
  }
  const t = new THREE.Mesh(GEO_CHAISE.traverse, MAT_CHAISE);
  t.position.set(0, hAssise + 0.68, 0.23);
  c.add(t);
  c.position.set(dir.x * rayon, solY, dir.z * rayon);
  c.rotation.y = Math.atan2(dir.x, dir.z);
  return c;
}

// ---------------------------------------------------------------------
// Étiquette de prénom : planchette sombre, lettres couleur sable.
// Active (à son tour) : rouille, lettres claires. Absent : estompée.
// ---------------------------------------------------------------------
export function dessinerEtiquetteSaloon(ctx, texte, { actif = false, absent = false } = {}) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  ctx.clearRect(0, 0, W, H);
  const taille = Math.round(H * 0.4);
  ctx.font = `700 ${taille}px ${POLICE_TEXTE}`;
  const l = Math.min(W - 8, ctx.measureText(texte).width + H * 0.7);
  const x = (W - l) / 2, h = H * 0.68, y = (H - h) / 2, r = h * 0.22;
  ctx.globalAlpha = absent ? 0.5 : 1;
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + l, y, x + l, y + h, r); ctx.arcTo(x + l, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + l, y, r); ctx.closePath();
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  if (actif) { g.addColorStop(0, '#c2541f'); g.addColorStop(1, '#7c2d12'); }
  else { g.addColorStop(0, '#3b2213'); g.addColorStop(1, '#22130a'); }
  ctx.fillStyle = g; ctx.fill();
  ctx.lineWidth = Math.max(3, H * 0.035);
  ctx.strokeStyle = actif ? '#ffd9a0' : 'rgba(217,179,130,0.75)';
  ctx.stroke();
  ctx.fillStyle = actif ? '#fff6e6' : PALETTE.sable;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(texte, W / 2, H / 2 + H * 0.02, W - 24);
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------------
// Le décor : mur du fond, comptoir, miroir, enseigne, affiches, portes...
// Renvoie { animer(t), enseigne } : la boucle du jeu appelle animer().
// ---------------------------------------------------------------------
export function creerDecorSaloon(scene, { nom = '', solY = -1.2, leger = false } = {}) {
  const decor = new THREE.Group();
  const r = aleatoire(42);
  const Z_MUR = -6.4;   // assez près pour que le comptoir se voie au-dessus de la table

  // Sol : larges planches, poussiéreuses.
  const sol = new THREE.Mesh(new THREE.PlaneGeometry(40, 40),
    mat(0xffffff, { map: texture(planches('#4a2e1a', { nb: 8, graine: 7, usure: 0.6 }), 512, 512, [10, 10]), roughness: 0.9 }));
  sol.rotation.x = -Math.PI / 2;
  sol.position.y = solY;
  decor.add(sol);

  // Mur du fond : planches verticales, soubassement plus sombre.
  const mur = new THREE.Mesh(new THREE.PlaneGeometry(26, 7.5),
    mat(0xffffff, { map: texture(planches('#5a3a22', { nb: 10, vertical: true, graine: 13, usure: 0.35 }), 512, 512, [5, 1]) }));
  mur.position.set(0, solY + 3.75, Z_MUR);
  const soubassement = new THREE.Mesh(new THREE.PlaneGeometry(26, 1.1),
    mat(0xffffff, { map: texture(planches('#3a2414', { nb: 3, graine: 17 }), 512, 128, [8, 1]) }));
  soubassement.position.set(0, solY + 0.55, Z_MUR + 0.02);
  const plinthe = new THREE.Mesh(new THREE.BoxGeometry(26, 0.08, 0.06), mat(0x24150b));
  plinthe.position.set(0, solY + 1.12, Z_MUR + 0.04);
  decor.add(mur, soubassement, plinthe);
  // Murs latéraux (visibles en paysage)
  for (const cote of [-1, 1]) {
    const lat = new THREE.Mesh(new THREE.PlaneGeometry(16, 7.5),
      mat(0xffffff, { map: texture(planches('#4f331e', { nb: 10, vertical: true, graine: cote > 0 ? 19 : 23 }), 512, 512, [3, 1]) }));
    lat.rotation.y = -cote * Math.PI / 2;
    lat.position.set(cote * 9, solY + 3.75, -1);
    decor.add(lat);
  }

  // Arrière-bar : grand miroir encadré, étagères de bouteilles.
  const cadreMat = mat(0x3a2414, { roughness: 0.55 });
  const cadre = new THREE.Mesh(new THREE.BoxGeometry(6.4, 2.6, 0.12), cadreMat);
  cadre.position.set(0, solY + 2.75, Z_MUR + 0.08);
  const miroir = new THREE.Mesh(new THREE.PlaneGeometry(6.0, 2.25),
    leger ? mat(0x5a5048, { roughness: 0.35, metalness: 0.4 }) : mat(0x9a8e80, { roughness: 0.12, metalness: 1.0 }));
  miroir.position.set(0, solY + 2.75, Z_MUR + 0.15);
  // Taches et usure du tain
  const tain = new THREE.Mesh(new THREE.PlaneGeometry(6.0, 2.25), new THREE.MeshBasicMaterial({
    transparent: true, depthWrite: false,
    map: texture((ctx, L, H) => {
      const g = ctx.createRadialGradient(L / 2, H / 2, H * 0.2, L / 2, H / 2, L * 0.6);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(25,15,8,0.75)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, L, H);
      for (let k = 0; k < 60; k++) { ctx.fillStyle = `rgba(40,25,12,${0.1 + r() * 0.2})`; ctx.beginPath(); ctx.arc(r() * L, r() * H, 2 + r() * 10, 0, Math.PI * 2); ctx.fill(); }
    }, 512, 192),
  }));
  tain.position.set(0, solY + 2.75, Z_MUR + 0.16);
  decor.add(cadre, miroir, tain);

  const etagereMat = mat(0x4a2e1a, { roughness: 0.6 });
  const verreBouteille = [
    new THREE.MeshStandardMaterial({ color: 0x7a3a0a, roughness: 0.15, transparent: true, opacity: 0.85, emissive: 0x3a1a04, emissiveIntensity: 0.4 }),
    new THREE.MeshStandardMaterial({ color: 0x2f4a1a, roughness: 0.15, transparent: true, opacity: 0.85 }),
    new THREE.MeshStandardMaterial({ color: 0xa8621a, roughness: 0.15, transparent: true, opacity: 0.85, emissive: 0x4a2404, emissiveIntensity: 0.4 }),
  ];
  const geoBouteille = new THREE.CylinderGeometry(0.075, 0.08, 0.36, 12);
  const geoGoulot = new THREE.CylinderGeometry(0.025, 0.04, 0.16, 8);
  for (const [y, nb] of [[solY + 1.55, leger ? 6 : 14], [solY + 4.3, leger ? 5 : 12]]) {
    const e = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.07, 0.4), etagereMat);
    e.position.set(0, y, Z_MUR + 0.25);
    decor.add(e);
    for (let i = 0; i < nb; i++) {
      const b = new THREE.Group();
      const m = verreBouteille[Math.floor(r() * verreBouteille.length)];
      const corps = new THREE.Mesh(geoBouteille, m);
      corps.position.y = 0.18;
      const goulot = new THREE.Mesh(geoGoulot, m);
      goulot.position.y = 0.44;
      b.add(corps, goulot);
      b.position.set(-3.1 + (i + 0.5) * 6.2 / nb + (r() - 0.5) * 0.12, y + 0.035, Z_MUR + 0.25 + (r() - 0.5) * 0.12);
      b.scale.setScalar(0.85 + r() * 0.35);
      decor.add(b);
    }
  }

  // Enseigne peinte au nom du jeu, suspendue par deux chaînes.
  const enseigneCanvas = document.createElement('canvas');
  enseigneCanvas.width = 1024; enseigneCanvas.height = 256;
  const enseigneTex = new THREE.CanvasTexture(enseigneCanvas);
  enseigneTex.colorSpace = THREE.SRGBColorSpace;
  const dessinerEnseigne = () => {
    const ctx = enseigneCanvas.getContext('2d');
    planches('#7a5030', { nb: 3, graine: 29, usure: 0.5 })(ctx, 1024, 256);
    ctx.strokeStyle = '#2a170d'; ctx.lineWidth = 14; ctx.strokeRect(7, 7, 1010, 242);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `150px ${POLICE_TITRE}`;
    ctx.fillStyle = 'rgba(20,8,2,0.6)';
    ctx.fillText(nom, 516, 140, 960);
    ctx.fillStyle = '#f3e3c3';
    ctx.fillText(nom, 510, 134, 960);
    ctx.font = `600 36px ${POLICE_TEXTE}`;
    ctx.fillStyle = '#2a170d';
    ctx.fillText('★  SALOON  ★', 512, 222);
    enseigneTex.needsUpdate = true;
  };
  dessinerEnseigne();
  quandPolicesSaloon(dessinerEnseigne);
  const enseigne = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.05, 0.08),
    [cadreMat, cadreMat, cadreMat, cadreMat, mat(0xffffff, { map: enseigneTex, roughness: 0.8 }), cadreMat]);
  enseigne.position.set(0, solY + 5.55, Z_MUR + 0.35);
  decor.add(enseigne);
  const chaineMat = mat(0x2b2724, { metalness: 0.8, roughness: 0.4 });
  for (const x of [-1.7, 1.7]) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.0, 6), chaineMat);
    c.position.set(x, solY + 6.6, Z_MUR + 0.35);
    decor.add(c);
  }

  // Crâne de longhorn au-dessus du miroir... à côté de l'enseigne.
  const os = mat(0xe8dcc4, { roughness: 0.7 });
  const crane = new THREE.Group();
  const tete = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), os);
  tete.scale.set(1, 1.25, 0.6);
  const museau = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 0.35, 12), os);
  museau.position.y = -0.3;
  crane.add(tete, museau);
  for (const s of [-1, 1]) {
    const corne = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.95, 10), mat(0xd8c49a, { roughness: 0.5 }));
    corne.rotation.z = s * (Math.PI / 2 - 0.25);
    corne.position.set(s * 0.6, 0.18, 0);
    crane.add(corne);
    const orbite = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), mat(0x1a0e07));
    orbite.position.set(s * 0.09, 0.02, 0.12);
    crane.add(orbite);
  }
  crane.position.set(-4.6, solY + 4.6, Z_MUR + 0.2);
  decor.add(crane);

  // Avis de recherche, punaisés de travers.
  const affiche = (titre, prime, graine) => texture((ctx, L, H) => {
    const rr = aleatoire(graine);
    const g = ctx.createRadialGradient(L / 2, H / 2, 20, L / 2, H / 2, H * 0.7);
    g.addColorStop(0, '#e9d3a5'); g.addColorStop(1, '#a8834e');
    ctx.fillStyle = g; ctx.fillRect(0, 0, L, H);
    for (let k = 0; k < 300; k++) { ctx.fillStyle = `rgba(80,45,15,${rr() * 0.12})`; ctx.fillRect(rr() * L, rr() * H, 2, 2); }
    ctx.fillStyle = '#2a170d'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `64px ${POLICE_TITRE}`; ctx.fillText('WANTED', L / 2, 52, L - 20);
    ctx.font = `700 20px ${POLICE_TEXTE}`; ctx.fillText('MORT OU VIF', L / 2, 96);
    // Silhouette au chapeau
    ctx.fillStyle = 'rgba(42,23,13,0.85)';
    ctx.beginPath(); ctx.arc(L / 2, 170, 34, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(L / 2 - 58, 128, 116, 10); ctx.fillRect(L / 2 - 26, 104, 52, 28);
    ctx.beginPath(); ctx.ellipse(L / 2, 260, 66, 50, 0, Math.PI, 0); ctx.fill();
    ctx.font = `700 26px ${POLICE_TEXTE}`; ctx.fillText(titre, L / 2, 290, L - 20);
    ctx.font = `46px ${POLICE_TITRE}`; ctx.fillStyle = '#7c2d12'; ctx.fillText(prime, L / 2, 340);
  }, 256, 380);
  const affiches = [['LE TRICHEUR', '500 $', -3.9, 2.4, -0.06], ['LE BAVARD', '200 $', 4.0, 2.55, 0.07], ['SOIF D’OR', '1000 $', 4.75, 1.85, -0.1]];
  for (const [t, p, x, y, rot] of (leger ? affiches.slice(0, 2) : affiches)) {
    const a = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.92), mat(0xffffff, { map: affiche(t, p, Math.round(x * 10 + 50)), roughness: 0.9 }));
    a.position.set(x, solY + y, Z_MUR + 0.05);
    a.rotation.z = rot;
    decor.add(a);
  }

  // Portes battantes ouvertes sur la rue au coucher du soleil (à gauche).
  const rue = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 2.6), new THREE.MeshBasicMaterial({
    map: texture((ctx, L, H) => {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#f6b25a'); g.addColorStop(0.55, '#e0692a'); g.addColorStop(0.56, '#7a3a18'); g.addColorStop(1, '#3a1a0a');
      ctx.fillStyle = g; ctx.fillRect(0, 0, L, H);
      ctx.fillStyle = 'rgba(60,25,10,0.85)';
      ctx.fillRect(L * 0.05, H * 0.3, L * 0.25, H * 0.26); ctx.fillRect(L * 0.7, H * 0.24, L * 0.3, H * 0.32);
    }, 128, 192),
  }));
  rue.position.set(-6.2, solY + 1.3, Z_MUR + 0.02);
  const encadrement = new THREE.Mesh(new THREE.BoxGeometry(1.9, 2.75, 0.1), cadreMat);
  encadrement.position.set(-6.2, solY + 1.37, Z_MUR - 0.03);
  decor.add(encadrement, rue);
  const vantailMat = mat(0x6b4528, { roughness: 0.7 });
  for (const s of [-1, 1]) {
    const v = new THREE.Group();
    const panneau = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.05, 0.05), vantailMat);
    panneau.position.x = s * 0.4;
    v.add(panneau);
    // Persiennes
    for (let k = 0; k < 5; k++) {
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.05, 0.06), mat(0x4a2e1a));
      l.position.set(s * 0.4, -0.35 + k * 0.17, 0.02);
      v.add(l);
    }
    v.position.set(-6.2 + s * 0.85, solY + 1.25, Z_MUR + 0.3);
    v.rotation.y = s * 0.55;
    decor.add(v);
  }

  // Fenêtre sur le désert au crépuscule (à droite).
  const desert = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.3), new THREE.MeshBasicMaterial({
    map: texture((ctx, L, H) => {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#2a1a3a'); g.addColorStop(0.5, '#c2541f'); g.addColorStop(0.62, '#f2a04a'); g.addColorStop(0.63, '#5a2a14'); g.addColorStop(1, '#2a1208');
      ctx.fillStyle = g; ctx.fillRect(0, 0, L, H);
      ctx.fillStyle = '#ffe2a0'; ctx.beginPath(); ctx.arc(L * 0.7, H * 0.58, 16, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#3a1608';
      ctx.beginPath(); ctx.moveTo(0, H * 0.64); ctx.lineTo(L * 0.12, H * 0.42); ctx.lineTo(L * 0.3, H * 0.42); ctx.lineTo(L * 0.36, H * 0.64); ctx.fill();
      ctx.beginPath(); ctx.moveTo(L * 0.55, H * 0.64); ctx.lineTo(L * 0.6, H * 0.5); ctx.lineTo(L * 0.66, H * 0.5); ctx.lineTo(L * 0.7, H * 0.64); ctx.fill();
      // Cactus
      ctx.fillRect(L * 0.86, H * 0.5, 6, H * 0.18); ctx.fillRect(L * 0.84, H * 0.56, 14, 4); ctx.fillRect(L * 0.84, H * 0.52, 4, 10);
      for (let k = 0; k < 40; k++) { ctx.fillStyle = `rgba(255,240,220,${Math.random() * 0.6})`; ctx.fillRect(Math.random() * L, Math.random() * H * 0.35, 1.5, 1.5); }
    }, 256, 192),
  }));
  desert.position.set(6.3, solY + 2.6, Z_MUR + 0.02);
  const cadreFenetre = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.5, 0.08), cadreMat);
  cadreFenetre.position.set(6.3, solY + 2.6, Z_MUR - 0.02);
  const croisillonV = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.3, 0.06), cadreMat);
  croisillonV.position.set(6.3, solY + 2.6, Z_MUR + 0.06);
  const croisillonH = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.06, 0.06), cadreMat);
  croisillonH.position.set(6.3, solY + 2.6, Z_MUR + 0.06);
  decor.add(cadreFenetre, desert, croisillonV, croisillonH);

  // Comptoir : bois sombre, plateau usé, barre de fer pour les bottes.
  const comptoirTex = texture(planches('#5a3820', { nb: 7, vertical: true, graine: 31 }), 512, 256, [3, 1]);
  const comptoir = new THREE.Mesh(new THREE.BoxGeometry(8.6, 1.5, 0.9), mat(0xffffff, { map: comptoirTex, roughness: 0.65 }));
  comptoir.position.set(0, solY + 0.75, Z_MUR + 1.9);
  const dessus = new THREE.Mesh(new THREE.BoxGeometry(8.9, 0.1, 1.1), mat(0x4a2c18, { roughness: 0.35 }));
  dessus.position.set(0, solY + 1.55, Z_MUR + 1.9);
  const barre = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 8.4, 12), chaineMat);
  barre.rotation.z = Math.PI / 2;
  barre.position.set(0, solY + 0.25, Z_MUR + 2.42);
  decor.add(comptoir, dessus, barre);
  // Sur le comptoir : une bouteille et deux verres à whisky
  const whisky = new THREE.Mesh(geoBouteille, verreBouteille[2]);
  whisky.position.set(1.4, solY + 1.78, Z_MUR + 2.0);
  decor.add(whisky);
  for (const x of [1.0, 1.8, -2.2]) {
    const v = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.1, 12),
      new THREE.MeshStandardMaterial({ color: 0xc9a060, roughness: 0.1, transparent: true, opacity: 0.6 }));
    v.position.set(x, solY + 1.65, Z_MUR + 2.1);
    decor.add(v);
  }
  // Crachoir en laiton
  const crachoir = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.28, 16), mat(0xa07a3a, { metalness: 0.85, roughness: 0.35 }));
  crachoir.position.set(-3.4, solY + 0.14, Z_MUR + 2.9);
  decor.add(crachoir);

  // Tonneaux et caisses dans les coins.
  const tonneauMat = mat(0x5a3820, { roughness: 0.7 });
  const cercleMat = mat(0x2b2724, { metalness: 0.6, roughness: 0.5 });
  const tonneau = (x, z, couche) => {
    const t = new THREE.Group();
    const corps = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.1, 20), tonneauMat);
    corps.scale.set(1, 1, 1);
    const ventre = new THREE.Mesh(new THREE.SphereGeometry(0.48, 20, 12), tonneauMat);
    ventre.scale.set(1, 1.15, 1);
    t.add(corps, ventre);
    for (const y of [-0.42, -0.15, 0.15, 0.42]) {
      const c = new THREE.Mesh(new THREE.TorusGeometry(Math.abs(y) > 0.3 ? 0.43 : 0.48, 0.02, 6, 24), cercleMat);
      c.rotation.x = Math.PI / 2; c.position.y = y;
      t.add(c);
    }
    t.position.set(x, solY + (couche ? 0.48 : 0.56), z);
    if (couche) t.rotation.z = Math.PI / 2;
    decor.add(t);
  };
  tonneau(-4.6, Z_MUR + 2.6, false);
  tonneau(-3.8, Z_MUR + 2.0, false);
  tonneau(4.5, Z_MUR + 2.7, true);
  const caisseMat = mat(0xffffff, { map: texture(planches('#8a6038', { nb: 4, graine: 37 }), 256, 256), roughness: 0.85 });
  for (const [x, y, z, rot] of [[3.7, 0.35, Z_MUR + 1.6, 0.2], [3.8, 1.05, Z_MUR + 1.6, -0.1], [-5.6, 0.35, Z_MUR + 3.8, 0.5]]) {
    if (leger && y > 0.5) continue;
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), caisseMat);
    c.position.set(x, solY + y, z);
    c.rotation.y = rot;
    decor.add(c);
  }

  // Lanternes murales : des flammes peintes, sans vraie lumière (économie).
  const flammeMat = lueur(0xffb347, 2.2);
  for (const x of [-2.9, 2.9]) {
    const lanterne = new THREE.Group();
    const cage = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.32, 8, 1, true),
      new THREE.MeshStandardMaterial({ color: 0xffd9a0, transparent: true, opacity: 0.35, side: THREE.DoubleSide }));
    const flamme = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), flammeMat);
    flamme.scale.set(1, 1.8, 1);
    const toit = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.12, 8), chaineMat);
    toit.position.y = 0.22;
    lanterne.add(cage, flamme, toit);
    lanterne.position.set(x, solY + 3.4, Z_MUR + 0.3);
    decor.add(lanterne);
  }

  // Lustre en roue de chariot au-dessus de la table, haut et fin : il ne
  // doit cacher ni la pile ni les étiquettes.
  const lustre = new THREE.Group();
  const roueMat = mat(0x3a2414, { roughness: 0.6 });
  const jante = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.04, 8, 48), roueMat);
  jante.rotation.x = Math.PI / 2;
  const moyeu = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.12, 12), roueMat);
  lustre.add(jante, moyeu);
  for (let k = 0; k < 8; k++) {
    const rayonRoue = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.03, 0.03), roueMat);
    rayonRoue.rotation.y = k * Math.PI / 8;
    lustre.add(rayonRoue);
  }
  const bougies = [];
  const cireMat = mat(0xf0e2c0, { roughness: 0.7 });
  for (let k = 0; k < 6; k++) {
    const a = k / 6 * Math.PI * 2;
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.14, 8), cireMat);
    b.position.set(Math.cos(a) * 0.62, 0.1, Math.sin(a) * 0.62);
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), flammeMat);
    f.scale.set(1, 1.9, 1);
    f.position.set(Math.cos(a) * 0.62, 0.2, Math.sin(a) * 0.62);
    lustre.add(b, f);
    bougies.push(f);
  }
  for (let k = 0; k < 3; k++) {
    const a = k / 3 * Math.PI * 2;
    const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1.5, 4), chaineMat);
    ch.position.set(Math.cos(a) * 0.35, 0.7, Math.sin(a) * 0.35);
    ch.rotation.z = Math.cos(a) * 0.22; ch.rotation.x = -Math.sin(a) * 0.22;
    lustre.add(ch);
  }
  lustre.position.set(0, 3.2, -0.6);
  decor.add(lustre);

  // La lumière des bougies : une seule, chaude, qui vacille (fixe en léger).
  const lumiere = new THREE.PointLight(0xffa04a, leger ? 1.4 : 1.6, 7, 1.6);
  lumiere.position.set(0, 2.7, -0.3);
  decor.add(lumiere);

  // Poussière en suspension dans le faisceau (pas en léger).
  let poussiere = null;
  if (!leger) {
    const nb = 220;
    const pos = new Float32Array(nb * 3);
    for (let k = 0; k < nb; k++) {
      pos[k * 3] = (r() - 0.5) * 4.5; pos[k * 3 + 1] = 0.3 + r() * 2.6; pos[k * 3 + 2] = (r() - 0.5) * 4.5 - 0.5;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    poussiere = new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0xffd9a0, size: 0.022, transparent: true, opacity: 0.45, depthWrite: false,
    }));
    decor.add(poussiere);
  }

  scene.add(decor);

  function animer(t) {
    if (!leger) {
      // Vacillement : deux sinus et un peu de bruit, jamais d'à-coup.
      const v = 1 + Math.sin(t * 7.3) * 0.05 + Math.sin(t * 13.1) * 0.03 + (Math.random() - 0.5) * 0.04;
      lumiere.intensity = 1.6 * v;
      bougies.forEach((f, k) => { f.scale.y = 1.9 * (1 + Math.sin(t * 9 + k * 1.7) * 0.12); });
    }
    if (poussiere) {
      const p = poussiere.geometry.attributes.position;
      for (let k = 0; k < p.count; k++) {
        let y = p.getY(k) + 0.0016;
        if (y > 2.9) y = 0.3;
        p.setY(k, y);
        p.setX(k, p.getX(k) + Math.sin(t * 0.6 + k) * 0.0008);
      }
      p.needsUpdate = true;
    }
    lustre.rotation.y = Math.sin(t * 0.3) * 0.04;
  }

  return { decor, animer, lumiere };
}
