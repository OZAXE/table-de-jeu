// Sol glissant : tu portes un plateau de verres dans un bar bondé. Glisse à
// gauche ou à droite pour éviter les flaques et les bouteilles qui roulent.
// 3 chocs et le plateau tombe (1 gorgée). Score = dixièmes de seconde tenus.
import { aleatoire, creerToile, boucle, bandeau, texteCentre, point, fond, emoji } from './outils.js';

const VIES = 3, COULOIRS = 5;

export function jouer({ hote, graine, duree, rapporter }) {
  const rng = aleatoire(graine);
  const obstacles = [];
  for (let t = 1; t < duree; t += Math.max(0.28, 0.75 - t * 0.02) + rng() * 0.35) {
    obstacles.push({ t, c: Math.floor(rng() * COULOIRS), e: rng() < 0.6 ? '💧' : '🍾', v: 0.42 + rng() * 0.2 + t * 0.012, touche: false });
  }
  const toile = creerToile(hote);
  const { canvas, ctx } = toile;
  let x = 0.5, vies = VIES, tenu = 0, fini = false, tombe = false, choc = -10;

  const finir = () => { if (fini) return; fini = true; rapporter(Math.round(tenu * 10), { gorgees: tombe ? 1 : 0 }); };
  const bouge = (e) => { e.preventDefault(); const p = point(canvas, e); x = Math.max(0.05, Math.min(0.95, p.x / toile.l)); };
  canvas.addEventListener('pointerdown', bouge);
  canvas.addEventListener('pointermove', bouge);

  const arreterBoucle = boucle((t) => {
    const { l, h } = toile;
    if (!fini) tenu = Math.min(t, duree);
    if (t >= duree) finir();
    fond(ctx, l, h, '#2a2030', '#0e0a12');
    bandeau(ctx, l, 'Sol glissant · ' + '❤️'.repeat(vies), duree - t, duree);
    // Le parquet qui défile.
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    for (let k = 0; k < 14; k++) { const y = ((k * 70 + t * 260) % (h + 70)) - 20; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(l, y); ctx.stroke(); }
    const yMoi = h - 100, larg = l / COULOIRS;
    for (const o of obstacles) {
      if (t < o.t) continue;
      const y = 50 + (t - o.t) * o.v * h;
      if (y > h + 40) continue;
      const ox = (o.c + 0.5) * larg;
      if (!fini && !o.touche && Math.abs(y - yMoi) < 34 && Math.abs(ox - x * l) < larg * 0.55) {
        o.touche = true; vies--; choc = t;
        if (vies <= 0) { tombe = true; finir(); }
      }
      if (!o.touche) {
        ctx.save(); ctx.translate(ox, y); if (o.e === '🍾') ctx.rotate(t * 6 + o.c); emoji(ctx, o.e, 0, 0, 40); ctx.restore();
      }
    }
    const tremble = t - choc < 0.4 ? Math.sin(t * 60) * 8 : 0;
    emoji(ctx, tombe ? '💥' : '🧑‍🍳', x * l + tremble, yMoi + 10, 54);
    if (!tombe) emoji(ctx, '🍸', x * l + tremble, yMoi - 34, 30);
    if (t < 2.5) texteCentre(ctx, 'Glisse pour éviter les flaques', l / 2, h * 0.3, 18, '#e8dcf0', 600);
    if (fini) {
      texteCentre(ctx, tombe ? 'Plateau renversé !' : 'Service réussi !', l / 2, h * 0.38, 36, tombe ? '#ff8a6a' : '#9cff4a');
      texteCentre(ctx, tenu.toFixed(1) + ' s', l / 2, h * 0.46, 30, '#ffc23a');
      if (tombe) texteCentre(ctx, '🍺 Une gorgée', l / 2, h * 0.53, 20, '#ff8a6a', 700);
    }
  });
  return { arreter() { arreterBoucle(); canvas.removeEventListener('pointerdown', bouge); canvas.removeEventListener('pointermove', bouge); toile.liberer(); finir(); } };
}
