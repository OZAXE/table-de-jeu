// Attrape-Glaçons : fais glisser ton verre en bas de l'écran pour attraper ce
// qui tombe. Glaçon +1, citron +3, piment -3 (et 1 gorgée, 2 au plus).
// Score = points à la fin.
import { aleatoire, creerToile, boucle, bandeau, texteCentre, point, fond, emoji } from './outils.js';

const CHOSES = [
  { e: '🧊', pts: 1, p: 0.62 }, { e: '🍋', pts: 3, p: 0.2 }, { e: '🌶️', pts: -3, p: 0.18 },
];

export function jouer({ hote, graine, duree, rapporter }) {
  const rng = aleatoire(graine);
  // La même pluie pour tout le monde : moment, colonne (0..1), vitesse.
  const pluie = [];
  for (let t = 0.5; t < duree - 1.5; t += 0.28 + rng() * 0.3) {
    const r = rng();
    const c = r < CHOSES[0].p ? CHOSES[0] : r < CHOSES[0].p + CHOSES[1].p ? CHOSES[1] : CHOSES[2];
    pluie.push({ t, x: 0.08 + rng() * 0.84, v: 0.32 + rng() * 0.25 + t * 0.012, c, pris: false });
  }
  const toile = creerToile(hote);
  const { canvas, ctx } = toile;
  let verreX = 0.5, points = 0, piments = 0, fini = false;
  const eclats = [];

  const finir = () => { if (fini) return; fini = true; rapporter(Math.max(0, points), { gorgees: Math.min(2, piments) }); };
  const bouge = (e) => { e.preventDefault(); const p = point(canvas, e); verreX = Math.max(0.06, Math.min(0.94, p.x / toile.l)); };
  canvas.addEventListener('pointerdown', bouge);
  canvas.addEventListener('pointermove', bouge);

  const arreterBoucle = boucle((t, dt) => {
    const { l, h } = toile;
    if (t >= duree) finir();
    fond(ctx, l, h, '#0e2a33', '#061014');
    bandeau(ctx, l, 'Attrape-Glaçons · ' + points + ' pts', duree - t, duree);
    const yVerre = h - 80, demi = 42;
    for (const o of pluie) {
      if (o.pris || t < o.t) continue;
      const y = 50 + (t - o.t) * o.v * h;
      if (y > h + 30) { o.pris = true; continue; }
      if (!fini && y >= yVerre - 30 && y <= yVerre + 10 && Math.abs(o.x - verreX) * l <= demi) {
        o.pris = true;
        points += o.c.pts;
        if (o.c.pts < 0) piments++;
        eclats.push({ x: o.x * l, y: yVerre - 40, txt: (o.c.pts > 0 ? '+' : '') + o.c.pts, v: 0.8, bon: o.c.pts > 0 });
        continue;
      }
      emoji(ctx, o.c.e, o.x * l, y, 36);
    }
    emoji(ctx, '🥛', verreX * l, yVerre, 70);
    for (const e of eclats) { e.y -= 50 * dt; e.v -= dt; texteCentre(ctx, e.txt, e.x, e.y, 24, e.bon ? '#9cff4a' : '#ff6a5a'); }
    while (eclats.length && eclats[0].v <= 0) eclats.shift();
    if (t < 2.5) texteCentre(ctx, 'Glisse ton verre ! Évite les piments 🌶️', l / 2, h * 0.32, 18, '#e0f0f4', 600);
    if (fini) {
      texteCentre(ctx, points + ' points', l / 2, h * 0.4, 44, '#ffc23a');
      if (piments) texteCentre(ctx, '🍺 ' + Math.min(2, piments) + ' gorgée' + (piments > 1 ? 's' : '') + ' (piment)', l / 2, h * 0.48, 20, '#ff8a6a', 700);
    }
  });
  return { arreter() { arreterBoucle(); canvas.removeEventListener('pointerdown', bouge); canvas.removeEventListener('pointermove', bouge); toile.liberer(); finir(); } };
}
