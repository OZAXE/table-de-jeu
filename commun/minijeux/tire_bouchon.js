// Tire-Bouchon : fais tourner ton doigt en rond sur la bouteille pour visser le
// tire-bouchon, puis le bouchon saute. 3 bouteilles, le plus vite possible.
// Score = temps total en millisecondes (le plus bas gagne). Pas fini : temps
// max plus 5 s par bouteille restante.
import { creerToile, boucle, bandeau, texteCentre, point, fond, pave, emoji } from './outils.js';

const BOUTEILLES = 3, TOURS = 6, RESTE = 5000;

export function jouer({ hote, duree, rapporter }) {
  const toile = creerToile(hote);
  const { canvas, ctx } = toile;
  let n = 0, angle = 0, dernier = null, maintenant = 0, fini = false, pop = -10, score = 0;

  const finir = () => {
    if (fini) return;
    fini = true;
    score = Math.round(Math.min(maintenant, duree) * 1000) + (BOUTEILLES - n) * RESTE;
    rapporter(score);
  };
  const centre = () => ({ x: toile.l / 2, y: toile.h * 0.5 });
  const bouge = (e) => {
    e.preventDefault();
    if (fini || maintenant - pop < 0.6) { dernier = null; return; }
    const p = point(canvas, e), c = centre();
    const a = Math.atan2(p.y - c.y, p.x - c.x);
    if (dernier !== null && Math.hypot(p.x - c.x, p.y - c.y) > 25) {
      let d = a - dernier;
      if (d > Math.PI) d -= 2 * Math.PI;
      if (d < -Math.PI) d += 2 * Math.PI;
      angle += Math.abs(d);   // dans un sens ou dans l'autre, ça visse
    }
    dernier = a;
    if (angle >= TOURS * 2 * Math.PI) { n++; angle = 0; pop = maintenant; dernier = null; if (n >= BOUTEILLES) finir(); }
  };
  const haut = () => { dernier = null; };
  canvas.addEventListener('pointerdown', bouge);
  canvas.addEventListener('pointermove', bouge);
  canvas.addEventListener('pointerup', haut);

  const arreterBoucle = boucle((t) => {
    maintenant = t;
    const { l, h } = toile;
    if (t >= duree) finir();
    fond(ctx, l, h, '#2a0e18', '#0e0408');
    bandeau(ctx, l, 'Tire-Bouchon · bouteille ' + Math.min(n + 1, BOUTEILLES) + ' / ' + BOUTEILLES, duree - t, duree);
    const c = centre(), r = Math.min(l, h) * 0.32;
    ctx.strokeStyle = 'rgba(255,194,58,0.25)'; ctx.lineWidth = 26; ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, 7); ctx.stroke();
    const u = angle / (TOURS * 2 * Math.PI);
    ctx.strokeStyle = '#ffc23a'; ctx.beginPath(); ctx.arc(c.x, c.y, r, -Math.PI / 2, -Math.PI / 2 + u * 2 * Math.PI); ctx.stroke();
    ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(angle); emoji(ctx, '🍾', 0, 0, r * 0.9); ctx.restore();
    if (t - pop < 0.6) texteCentre(ctx, 'POP !', c.x, c.y - r - 40, 50, '#9cff4a');
    for (let k = 0; k < BOUTEILLES; k++) emoji(ctx, k < n ? '🥂' : '🍷', l / 2 + (k - 1) * 60, h - 60, 36);
    if (t < 2.5) texteCentre(ctx, 'Tourne le doigt en rond autour de la bouteille', l / 2, 80, 16, '#f0d8e0', 600);
    if (fini) { pave(ctx, l / 2 - 130, c.y - 45, 260, 90, 18, 'rgba(0,0,0,0.8)'); texteCentre(ctx, (score / 1000).toFixed(1) + ' s', c.x, c.y, 42, '#ffc23a'); }
  });
  return { arreter() { arreterBoucle(); canvas.removeEventListener('pointerdown', bouge); canvas.removeEventListener('pointermove', bouge); canvas.removeEventListener('pointerup', haut); toile.liberer(); finir(); } };
}
