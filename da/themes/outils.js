// =====================================================================
// Petits outils partagés par les thèmes de décor (da/themes/*.js) :
// aléatoire reproductible, textures dessinées sur canvas, matériaux,
// veinage, planches, étiquettes de prénom, chaises, ombre au sol.
// =====================================================================
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export function aleatoire(graine) {
  let s = graine >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

export function texture(dessiner, l, h, repetition) {
  const c = document.createElement('canvas');
  c.width = l; c.height = h || l;
  dessiner(c.getContext('2d'), c.width, c.height);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repetition) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repetition[0], repetition[1]); }
  t.anisotropy = 4;
  return t;
}

export const mat = (couleur, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: couleur, roughness: 0.8, metalness: 0 }, o));
export const lueur = (couleur, i = 1.6) => new THREE.MeshBasicMaterial({ color: new THREE.Color(couleur).multiplyScalar(i) });

// Bois au veinage continu (plateaux, chaises).
export function veinage(base, graine = 1) {
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

// Planches (sols, murs, caisses).
export function planches(base, { nb = 6, vertical = false, graine = 3, usure = 0.25 } = {}) {
  return (ctx, L, H) => {
    const r = aleatoire(graine);
    ctx.fillStyle = '#1a0e07'; ctx.fillRect(0, 0, L, H);
    const pas = (vertical ? L : H) / nb;
    for (let k = 0; k < nb; k++) {
      const c = new THREE.Color(base).multiplyScalar(0.72 + r() * 0.45);
      ctx.fillStyle = '#' + c.getHexString();
      if (vertical) ctx.fillRect(k * pas + 2, 0, pas - 4, H); else ctx.fillRect(0, k * pas + 2, L, pas - 4);
      ctx.strokeStyle = 'rgba(20,10,4,0.28)'; ctx.lineWidth = 1.2;
      for (let v = 0; v < 6; v++) {
        ctx.beginPath();
        const o = k * pas + 4 + r() * (pas - 8);
        for (let t = 0; t <= 1.001; t += 0.05) {
          const ondule = Math.sin(t * 9 + v + k) * 2.2;
          if (vertical) ctx.lineTo(o + ondule, t * H); else ctx.lineTo(t * L, o + ondule);
        }
        ctx.stroke();
      }
    }
    for (let p = 0; p < L * H * usure / 900; p++) {
      ctx.fillStyle = `rgba(${r() < 0.5 ? '230,200,150' : '10,5,2'},${0.04 + r() * 0.06})`;
      ctx.fillRect(r() * L, r() * H, 1 + r() * 3, 1 + r() * 3);
    }
  };
}

// Grain fin (béton, cuir, papier) sur une couleur de fond.
export function grain(base, { intensite = 0.06, graine = 5, nb = 3000 } = {}) {
  return (ctx, L, H) => {
    const r = aleatoire(graine);
    ctx.fillStyle = base; ctx.fillRect(0, 0, L, H);
    for (let k = 0; k < nb; k++) {
      ctx.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '0,0,0'},${r() * intensite})`;
      ctx.fillRect(r() * L, r() * H, 1 + r() * 2, 1 + r() * 2);
    }
  };
}

// Ambiance : fond, brouillard, reflets doux (pas en version légère).
export function ambiance(renderer, scene, { fond, ciel, sol, intensite = 0.6, leger = false }) {
  scene.background = new THREE.Color(fond);
  if (scene.fog) scene.fog.color = new THREE.Color(fond);
  if (!leger) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
  }
  scene.add(new THREE.HemisphereLight(ciel, sol, leger ? intensite * 1.4 : intensite));
}

// Ombre douce au sol sous la table : elle se pose au lieu de flotter.
export function ombreAuSol(rayon, solY) {
  const o = new THREE.Mesh(new THREE.CircleGeometry(rayon, 48), new THREE.MeshBasicMaterial({
    transparent: true, depthWrite: false,
    map: texture((ctx, L) => {
      const g = ctx.createRadialGradient(L / 2, L / 2, 0, L / 2, L / 2, L / 2);
      g.addColorStop(0, 'rgba(0,0,0,0.7)'); g.addColorStop(0.6, 'rgba(0,0,0,0.42)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, L, L);
    }, 128),
  }));
  o.rotation.x = -Math.PI / 2;
  o.position.y = solY + 0.005;
  return o;
}

// Étiquette de prénom, aux couleurs du thème.
// style : { police, fond: [haut, bas], fondActif: [haut, bas], bord, bordActif, texte, texteActif, rayon (0..0.5) }
export function dessinerEtiquetteTheme(ctx, texte, { actif = false, absent = false } = {}, style) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  ctx.clearRect(0, 0, W, H);
  const taille = Math.round(H * 0.4);
  ctx.font = `${style.graisse || 700} ${taille}px ${style.police}`;
  const l = Math.min(W - 8, ctx.measureText(texte).width + H * 0.7);
  const x = (W - l) / 2, h = H * 0.68, y = (H - h) / 2, r = h * (style.rayon ?? 0.22);
  ctx.globalAlpha = absent ? 0.5 : 1;
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + l, y, x + l, y + h, r); ctx.arcTo(x + l, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + l, y, r); ctx.closePath();
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  const f = actif ? style.fondActif : style.fond;
  g.addColorStop(0, f[0]); g.addColorStop(1, f[1]);
  ctx.fillStyle = g; ctx.fill();
  ctx.lineWidth = Math.max(3, H * 0.035);
  ctx.strokeStyle = actif ? style.bordActif : style.bord;
  ctx.stroke();
  ctx.fillStyle = actif ? style.texteActif : style.texte;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(texte, W / 2, H / 2 + H * 0.02, W - 24);
  ctx.globalAlpha = 1;
}

// Attend les polices d'un thème (Google Fonts) avant de redessiner.
export function quandPolices(polices, fn) {
  if (!document.fonts || !document.fonts.load) return;
  Promise.all(polices.map(p => document.fonts.load(p))).then(fn).catch(() => {});
}

export function lisserTheme(objet, reflets = 0.3) {
  objet.traverse(o => {
    if (!o.isMesh || !o.material) return;
    (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => {
      if ('envMapIntensity' in m && !m.userData.refletsRegles) { m.envMapIntensity = reflets; m.userData.refletsRegles = true; }
    });
  });
}
