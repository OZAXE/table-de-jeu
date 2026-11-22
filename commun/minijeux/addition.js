// L'Addition : le serveur pose la note, trouve le bon total parmi 4, le plus
// de notes possible en 30 s. Bonne réponse +1, mauvaise -1 (3 erreurs : 1 gorgée).
// Score = bonnes réponses moins mauvaises (au moins 0).
import { aleatoire, creerToile, boucle, bandeau, texteCentre, point, fond, pave, emoji } from './outils.js';

const ARTICLES = [['🍺', 'Pinte', 6], ['🍷', 'Verre de vin', 5], ['🥃', 'Whisky', 8], ['🍸', 'Cocktail', 9], ['🍟', 'Frites', 4], ['🥜', 'Cacahuètes', 2], ['🍹', 'Mojito', 7], ['🧀', 'Planche', 12]];

export function jouer({ hote, graine, duree, rapporter }) {
  const rng = aleatoire(graine);
  const notes = Array.from({ length: 40 }, (_, k) => {
    const n = 2 + Math.min(2, Math.floor(k / 4));
    const lignes = Array.from({ length: n }, () => { const a = ARTICLES[Math.floor(rng() * ARTICLES.length)]; return [a, 1 + Math.floor(rng() * 2)]; });
    const total = lignes.reduce((s, [a, q]) => s + a[2] * q, 0);
    const choix = new Set([total]);
    while (choix.size < 4) { const d = [1, 2, 3, 4, 5, 6, 10][Math.floor(rng() * 7)] * (rng() < 0.5 ? -1 : 1); if (total + d > 0) choix.add(total + d); }
    const liste = [...choix];
    for (let i = liste.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [liste[i], liste[j]] = [liste[j], liste[i]]; }
    return { lignes, total, liste };
  });
  const toile = creerToile(hote);
  const { canvas, ctx } = toile;
  let k = 0, bons = 0, faux = 0, maintenant = 0, fini = false, retour = null;

  const score = () => Math.max(0, bons - faux);
  const finir = () => { if (fini) return; fini = true; rapporter(score(), { gorgees: faux >= 3 ? 1 : 0 }); };
  const boutons = () => {
    const { l, h } = toile;
    const lg = (l - 48) / 2, ht = 64, y0 = h - 170;
    return [0, 1, 2, 3].map(i => ({ x: 16 + (i % 2) * (lg + 16), y: y0 + Math.floor(i / 2) * (ht + 14), lg, ht }));
  };
  const toucher = (e) => {
    e.preventDefault();
    if (fini || (retour && maintenant < retour.jusqua)) return;
    const p = point(canvas, e);
    const i = boutons().findIndex(b => p.x >= b.x && p.x <= b.x + b.lg && p.y >= b.y && p.y <= b.y + b.ht);
    if (i < 0) return;
    const bon = notes[k].liste[i] === notes[k].total;
    if (bon) bons++; else faux++;
    retour = { bon, i, jusqua: maintenant + 0.45, total: notes[k].total };
  };
  canvas.addEventListener('pointerdown', toucher);

  const arreterBoucle = boucle((t) => {
    maintenant = t;
    const { l, h } = toile;
    if (retour && t >= retour.jusqua) { retour = null; k = Math.min(k + 1, notes.length - 1); }
    if (t >= duree) finir();
    fond(ctx, l, h, '#2a2418', '#0e0c08');
    bandeau(ctx, l, "L'Addition · " + bons + ' ✓ · ' + faux + ' ✗', duree - t, duree);
    const n = notes[k];
    const yh = 64, hn = 50 + n.lignes.length * 40;
    pave(ctx, 24, yh, l - 48, hn, 10, '#f4ecd8');
    n.lignes.forEach(([a, q], j) => {
      const y = yh + 34 + j * 40;
      emoji(ctx, a[0], 52, y, 26);
      ctx.fillStyle = '#2a1a10'; ctx.font = '600 17px Outfit, system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(q + ' × ' + a[1], 74, y);
      ctx.textAlign = 'right'; ctx.fillText(a[2] + ' €', l - 40, y);
    });
    ctx.strokeStyle = '#2a1a10'; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(40, yh + hn - 22); ctx.lineTo(l - 40, yh + hn - 22); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#2a1a10'; ctx.textAlign = 'left'; ctx.fillText('Total ?', 40, yh + hn - 8);
    boutons().forEach((b, i) => {
      let c = '#3a3024';
      if (retour && i === retour.i) c = retour.bon ? '#2a8a4a' : '#a83232';
      else if (retour && n.liste[i] === n.total) c = '#2a6a3a';
      pave(ctx, b.x, b.y, b.lg, b.ht, 14, c);
      texteCentre(ctx, n.liste[i] + ' €', b.x + b.lg / 2, b.y + b.ht / 2, 28, '#fff4e6');
    });
    if (fini) { pave(ctx, l / 2 - 140, h * 0.42 - 50, 280, 100, 18, 'rgba(0,0,0,0.8)'); texteCentre(ctx, score() + ' point' + (score() > 1 ? 's' : ''), l / 2, h * 0.42 - 10, 38, '#ffc23a'); if (faux >= 3) texteCentre(ctx, '🍺 Une gorgée', l / 2, h * 0.42 + 26, 18, '#ff8a6a', 700); }
  });
  return { arreter() { arreterBoucle(); canvas.removeEventListener('pointerdown', toucher); toile.liberer(); finir(); } };
}
