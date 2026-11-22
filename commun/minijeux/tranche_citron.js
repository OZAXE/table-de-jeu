// Tranche-Citron : citrons et oranges sautent à l'écran, tranche-les d'un coup
// de doigt. Pas les bouteilles ! (-5 et 1 gorgée, 2 au plus). Score = points.
import { aleatoire, creerToile, boucle, bandeau, texteCentre, point, fond, emoji } from './outils.js';

const FRUITS = [{ e: '🍋', pts: 1 }, { e: '🍊', pts: 1 }, { e: '🍈', pts: 2 }, { e: '🍾', pts: -5 }];

export function jouer({ hote, graine, duree, rapporter }) {
  const rng = aleatoire(graine);
  const lancers = [];
  for (let t = 0.6; t < duree - 1.2; t += 0.35 + rng() * 0.45) {
    const r = rng();
    const f = r < 0.4 ? FRUITS[0] : r < 0.72 ? FRUITS[1] : r < 0.85 ? FRUITS[2] : FRUITS[3];
    lancers.push({ t, x: 0.15 + rng() * 0.7, vx: (rng() - 0.5) * 0.35, vy: 1.15 + rng() * 0.35, f, coupe: false });
  }
  const toile = creerToile(hote);
  const { canvas, ctx } = toile;
  let points = 0, bouteilles = 0, maintenant = 0, fini = false, trace = [], appui = false;
  const eclats = [];
  const G = 1.4;   // gravité, en hauteurs d'écran / s²

  const ou = (o, t) => {
    const u = t - o.t;
    return { x: (o.x + o.vx * u) * toile.l, y: toile.h - (o.vy * u - G * u * u / 2) * toile.h };
  };
  const finir = () => { if (fini) return; fini = true; rapporter(Math.max(0, points), { gorgees: Math.min(2, bouteilles) }); };
  const couper = (p) => {
    for (const o of lancers) {
      if (o.coupe || maintenant < o.t) continue;
      const q = ou(o, maintenant);
      if (Math.hypot(q.x - p.x, q.y - p.y) < 34) {
        o.coupe = true;
        points += o.f.pts;
        if (o.f.pts < 0) bouteilles++;
        eclats.push({ x: q.x, y: q.y, txt: (o.f.pts > 0 ? '+' : '') + o.f.pts, v: 0.7, bon: o.f.pts > 0 });
      }
    }
  };
  const bas = (e) => { e.preventDefault(); appui = true; const p = point(canvas, e); trace = [{ ...p, v: 0.25 }]; couper(p); };
  const bouge = (e) => { if (!appui || fini) return; const p = point(canvas, e); trace.push({ ...p, v: 0.25 }); couper(p); };
  const haut = () => { appui = false; };
  canvas.addEventListener('pointerdown', bas);
  canvas.addEventListener('pointermove', bouge);
  canvas.addEventListener('pointerup', haut);

  const arreterBoucle = boucle((t, dt) => {
    maintenant = t;
    const { l, h } = toile;
    if (t >= duree) finir();
    fond(ctx, l, h, '#1a3020', '#081008');
    bandeau(ctx, l, 'Tranche-Citron · ' + points + ' pts', duree - t, duree);
    for (const o of lancers) {
      if (o.coupe || t < o.t) continue;
      const q = ou(o, t);
      if (q.y > h + 50 && t - o.t > 0.3) continue;
      ctx.save(); ctx.translate(q.x, q.y); ctx.rotate((t - o.t) * 3); emoji(ctx, o.f.e, 0, 0, 46); ctx.restore();
    }
    for (const p of trace) p.v -= dt;
    trace = trace.filter(p => p.v > 0);
    if (trace.length > 1) {
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); trace.forEach((p, k) => k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke();
    }
    for (const e of eclats) { e.y -= 40 * dt; e.v -= dt; texteCentre(ctx, e.txt, e.x, e.y, 24, e.bon ? '#9cff4a' : '#ff6a5a'); }
    while (eclats.length && eclats[0].v <= 0) eclats.shift();
    if (t < 2.2) texteCentre(ctx, 'Tranche les fruits, pas les bouteilles 🍾', l / 2, h * 0.3, 17, '#e0f0e4', 600);
    if (fini) {
      texteCentre(ctx, points + ' points', l / 2, h * 0.4, 44, '#ffc23a');
      if (bouteilles) texteCentre(ctx, '🍺 ' + Math.min(2, bouteilles) + ' gorgée' + (bouteilles > 1 ? 's' : ''), l / 2, h * 0.48, 20, '#ff8a6a', 700);
    }
  });
  return { arreter() { arreterBoucle(); canvas.removeEventListener('pointerdown', bas); canvas.removeEventListener('pointermove', bouge); canvas.removeEventListener('pointerup', haut); toile.liberer(); finir(); } };
}
