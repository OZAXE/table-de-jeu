// Fléchettes : le viseur tremble sur la cible (on a un peu bu...). Touche pour
// lancer. 5 fléchettes. Centre 50, puis 30, 20, 10, 5. Score = total.
import { aleatoire, creerToile, boucle, bandeau, texteCentre, fond } from './outils.js';

const FLECHETTES = 5, ANNEAUX = [[0.1, 50, '#d8324a'], [0.3, 30, '#2a8a4a'], [0.55, 20, '#f0e6d0'], [0.8, 10, '#1e1e1e'], [1, 5, '#d8324a']];

export function jouer({ hote, graine, duree, rapporter }) {
  const rng = aleatoire(graine);
  // Le tremblement : une somme de sinus (même pour tous), qui s'emballe à chaque fléchette.
  const ph = Array.from({ length: 6 }, () => rng() * 6.28);
  const toile = creerToile(hote);
  const { canvas, ctx } = toile;
  const tirs = [];
  let maintenant = 0, fini = false, pause = 0;

  const total = () => tirs.reduce((a, b) => a + b.pts, 0);
  const finir = () => { if (fini) return; fini = true; rapporter(total()); };
  const geo = () => { const { l, h } = toile; const r = Math.min(l * 0.42, h * 0.3); return { cx: l / 2, cy: h * 0.48, r }; };
  const viseur = (t) => {
    const { cx, cy, r } = geo();
    const a = 0.35 + tirs.length * 0.09;
    return {
      x: cx + r * a * (Math.sin(t * 1.7 + ph[0]) * 0.6 + Math.sin(t * 3.1 + ph[1]) * 0.4),
      y: cy + r * a * (Math.sin(t * 1.3 + ph[2]) * 0.6 + Math.sin(t * 2.7 + ph[3]) * 0.4),
    };
  };
  const toucher = (e) => {
    e.preventDefault();
    if (fini || maintenant < pause) return;
    const v = viseur(maintenant), { cx, cy, r } = geo();
    const d = Math.hypot(v.x - cx, v.y - cy) / r;
    const an = ANNEAUX.find(a => d <= a[0]);
    tirs.push({ x: (v.x - cx) / r, y: (v.y - cy) / r, pts: an ? an[1] : 0 });
    pause = maintenant + 0.6;
    if (tirs.length >= FLECHETTES) finir();
  };
  canvas.addEventListener('pointerdown', toucher);

  const arreterBoucle = boucle((t) => {
    maintenant = t;
    const { l, h } = toile;
    if (t >= duree) finir();
    fond(ctx, l, h, '#2a1a12', '#0e0806');
    bandeau(ctx, l, 'Fléchettes · ' + total() + ' pts', duree - t, duree);
    const { cx, cy, r } = geo();
    for (let k = ANNEAUX.length - 1; k >= 0; k--) {
      ctx.fillStyle = ANNEAUX[k][2]; ctx.beginPath(); ctx.arc(cx, cy, r * ANNEAUX[k][0], 0, 7); ctx.fill();
    }
    ctx.strokeStyle = '#c8a86a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.stroke();
    for (const s of tirs) {
      ctx.fillStyle = '#ffc23a'; ctx.beginPath(); ctx.arc(cx + s.x * r, cy + s.y * r, 6, 0, 7); ctx.fill();
      ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5; ctx.stroke();
    }
    if (!fini) {
      const v = viseur(t);
      ctx.strokeStyle = '#4af0ff'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(v.x, v.y, 14, 0, 7); ctx.moveTo(v.x - 22, v.y); ctx.lineTo(v.x + 22, v.y); ctx.moveTo(v.x, v.y - 22); ctx.lineTo(v.x, v.y + 22); ctx.stroke();
      texteCentre(ctx, 'Fléchette ' + Math.min(tirs.length + 1, FLECHETTES) + ' / ' + FLECHETTES + ' · touche pour lancer', l / 2, h - 40, 16, '#e0c8b4', 600);
    } else texteCentre(ctx, total() + ' points', l / 2, h - 60, 40, '#ffc23a');
    if (tirs.length && t < pause) { const s = tirs[tirs.length - 1]; texteCentre(ctx, s.pts ? '+' + s.pts : 'À côté !', l / 2, 80, 30, s.pts ? '#9cff4a' : '#ff8a8a'); }
  });
  return { arreter() { arreterBoucle(); canvas.removeEventListener('pointerdown', toucher); toile.liberer(); finir(); } };
}
