// Chasse-Mouches : des mouches se posent sur le comptoir quelques instants.
// Écrase-les avant qu'elles repartent ! Une guêpe : -3. Score = points.
import { aleatoire, creerToile, boucle, bandeau, texteCentre, point, fond, pave, emoji } from './outils.js';

const TROUS = 9;

export function jouer({ hote, graine, duree, rapporter }) {
  const rng = aleatoire(graine);
  const apparitions = [];
  for (let t = 0.8; t < duree - 1; t += Math.max(0.28, 0.6 - t * 0.012) + rng() * 0.3) {
    apparitions.push({ t, trou: Math.floor(rng() * TROUS), vie: Math.max(0.55, 1.1 - t * 0.02), guepe: rng() < 0.15, frappe: false });
  }
  const toile = creerToile(hote);
  const { canvas, ctx } = toile;
  let points = 0, maintenant = 0, fini = false, coup = null;

  const finir = () => { if (fini) return; fini = true; rapporter(Math.max(0, points)); };
  const trous = () => {
    const { l, h } = toile;
    const c = Math.min((l - 20) / 3, (h - 160) / 3);
    const x0 = l / 2 - c * 1.5, y0 = 80 + Math.max(0, (h - 120 - c * 3) / 2);
    return Array.from({ length: TROUS }, (_, k) => ({ x: x0 + (k % 3) * c + c / 2, y: y0 + Math.floor(k / 3) * c + c / 2, r: c * 0.4 }));
  };
  const toucher = (e) => {
    e.preventDefault();
    if (fini) return;
    const p = point(canvas, e);
    coup = { x: p.x, y: p.y, t: maintenant };
    const tr = trous();
    for (const a of apparitions) {
      if (a.frappe || maintenant < a.t || maintenant > a.t + a.vie) continue;
      const z = tr[a.trou];
      if (Math.hypot(p.x - z.x, p.y - z.y) <= z.r * 1.15) { a.frappe = true; points += a.guepe ? -3 : 1; }
    }
  };
  canvas.addEventListener('pointerdown', toucher);

  const arreterBoucle = boucle((t) => {
    maintenant = t;
    const { l, h } = toile;
    if (t >= duree) finir();
    fond(ctx, l, h, '#3a2818', '#120a06');
    bandeau(ctx, l, 'Chasse-Mouches · ' + points + ' pts', duree - t, duree);
    const tr = trous();
    for (const z of tr) { ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(z.x, z.y + z.r * 0.3, z.r, z.r * 0.45, 0, 0, 7); ctx.fill(); }
    for (const a of apparitions) {
      if (t < a.t || t > a.t + a.vie + 0.3) continue;
      const z = tr[a.trou];
      if (a.frappe) { if (t < a.t + a.vie + 0.3) texteCentre(ctx, a.guepe ? '-3' : '+1', z.x, z.y - z.r, 22, a.guepe ? '#ff6a5a' : '#9cff4a'); continue; }
      if (t > a.t + a.vie) continue;
      const b = Math.sin(t * 30) * 2;
      emoji(ctx, a.guepe ? '🐝' : '🪰', z.x + b, z.y, z.r * 1.1);
    }
    if (coup && t - coup.t < 0.15) emoji(ctx, '🗞️', coup.x, coup.y, 60);
    if (t < 2) texteCentre(ctx, 'Écrase les mouches, pas les guêpes 🐝', l / 2, h - 40, 16, '#e0c8b4', 600);
    if (fini) { pave(ctx, l / 2 - 130, h / 2 - 45, 260, 90, 18, 'rgba(0,0,0,0.75)'); texteCentre(ctx, points + ' points', l / 2, h / 2, 40, '#ffc23a'); }
  });
  return { arreter() { arreterBoucle(); canvas.removeEventListener('pointerdown', toucher); toile.liberer(); finir(); } };
}
