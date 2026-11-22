// Le Bon Tempo : des capsules descendent sur trois colonnes. Touche la colonne
// quand la capsule passe sur la ligne. Pile : 10, presque : 5, raté : 0.
// Score = total.
import { aleatoire, creerToile, boucle, bandeau, texteCentre, point, fond, pave } from './outils.js';

const COLS = 3, VITESSE = 0.42, PILE = 0.07, PRESQUE = 0.15;   // secondes d'écart

export function jouer({ hote, graine, duree, rapporter }) {
  const rng = aleatoire(graine);
  // Les notes : moment où elles touchent la ligne, colonne.
  const notes = [];
  let tt = 2.2;
  while (tt < duree - 1.5) {
    notes.push({ t: tt, c: Math.floor(rng() * COLS), fait: null });
    tt += [0.4, 0.6, 0.8][Math.floor(rng() * 3)] * (tt > duree / 2 ? 0.8 : 1);
  }
  const toile = creerToile(hote);
  const { canvas, ctx } = toile;
  let points = 0, maintenant = 0, fini = false, serie = 0;
  const eclats = [];

  const finir = () => { if (fini) return; fini = true; rapporter(points); };
  const toucher = (e) => {
    e.preventDefault();
    if (fini) return;
    const p = point(canvas, e);
    const c = Math.max(0, Math.min(COLS - 1, Math.floor(p.x / (toile.l / COLS))));
    const cible = notes.filter(n => n.c === c && n.fait === null && Math.abs(n.t - maintenant) <= PRESQUE)
      .sort((a, b) => Math.abs(a.t - maintenant) - Math.abs(b.t - maintenant))[0];
    if (!cible) { serie = 0; eclats.push({ c, txt: 'Raté', v: 0.5, coul: '#ff8a8a' }); return; }
    const pile = Math.abs(cible.t - maintenant) <= PILE;
    cible.fait = pile ? 10 : 5;
    points += cible.fait;
    serie++;
    eclats.push({ c, txt: pile ? 'Pile !' : 'Presque', v: 0.5, coul: pile ? '#9cff4a' : '#ffc23a' });
  };
  canvas.addEventListener('pointerdown', toucher);

  const arreterBoucle = boucle((t, dt) => {
    maintenant = t;
    const { l, h } = toile;
    if (t >= duree) finir();
    for (const n of notes) if (n.fait === null && t - n.t > PRESQUE) { n.fait = 0; serie = 0; }
    fond(ctx, l, h, '#1a1030', '#08040e');
    bandeau(ctx, l, 'Le Bon Tempo · ' + points + ' pts', duree - t, duree);
    const lc = l / COLS, yLigne = h - 120, vit = VITESSE * h;
    for (let c = 0; c < COLS; c++) {
      ctx.fillStyle = c % 2 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)';
      ctx.fillRect(c * lc, 46, lc, h);
    }
    pave(ctx, 8, yLigne - 4, l - 16, 8, 4, '#ffc23a');
    for (const n of notes) {
      if (n.fait !== null && n.fait > 0) continue;
      const y = yLigne - (n.t - t) * vit;
      if (y < 30 || y > h + 30) continue;
      ctx.fillStyle = n.fait === 0 ? '#5a3a3a' : ['#d8324a', '#3a7ac8', '#3aa856'][n.c];
      ctx.beginPath(); ctx.arc((n.c + 0.5) * lc, y, 22, 0, 7); ctx.fill();
      ctx.strokeStyle = '#fff6'; ctx.lineWidth = 3; ctx.stroke();
    }
    for (const e of eclats) { e.v -= dt; texteCentre(ctx, e.txt, (e.c + 0.5) * lc, yLigne - 50 - (0.5 - e.v) * 60, 20, e.coul); }
    while (eclats.length && eclats[0].v <= 0) eclats.shift();
    if (serie >= 5) texteCentre(ctx, 'Série ×' + serie, l / 2, 80, 22, '#4af0ff');
    if (t < 2) texteCentre(ctx, 'Touche quand la capsule passe sur la ligne', l / 2, h * 0.35, 17, '#e0d8f0', 600);
    if (fini) texteCentre(ctx, points + ' points', l / 2, h * 0.4, 44, '#ffc23a');
  });
  return { arreter() { arreterBoucle(); canvas.removeEventListener('pointerdown', toucher); toile.liberer(); finir(); } };
}
