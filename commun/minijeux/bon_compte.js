// Le Bon Compte : des verres défilent sur le comptoir. Compte seulement ceux
// qu'on te demande, puis donne ton total. Score = écart avec le vrai compte
// (le plus bas gagne). Écart de 3 ou plus : 1 gorgée.
import { aleatoire, creerToile, boucle, bandeau, texteCentre, point, fond, pave, emoji } from './outils.js';

const VERRES = ['🍺', '🍷', '🍸', '🥃', '🍹'];
const DEFILE = 10;   // secondes de défilé

export function jouer({ hote, graine, duree, rapporter }) {
  const rng = aleatoire(graine);
  const cible = VERRES[Math.floor(rng() * VERRES.length)];
  // Chaque verre : moment d'entrée, ligne, vitesse.
  const passages = [];
  let tt = 0.6;
  while (tt < DEFILE - 1.6) {
    passages.push({ t: tt, e: rng() < 0.38 ? cible : VERRES[Math.floor(rng() * VERRES.length)], ligne: Math.floor(rng() * 3), v: 0.55 + rng() * 0.5 });
    tt += 0.22 + rng() * 0.38;
  }
  const vrai = passages.filter(p => p.e === cible).length;
  const toile = creerToile(hote);
  const { canvas, ctx } = toile;
  let etape = 'defile', reponse = 0, fini = false, debutReponse = 0, ecart = null;

  const finir = () => {
    if (fini) return;
    fini = true;
    ecart = Math.abs(reponse - vrai);
    etape = 'fin';
    rapporter(ecart, { gorgees: ecart >= 3 ? 1 : 0 });
  };
  // Boutons de la réponse.
  const boutons = () => {
    const { l, h } = toile;
    const y = h * 0.62;
    return [
      { id: '-', x: l / 2 - 110, y, r: 34 },
      { id: '+', x: l / 2 + 110, y, r: 34 },
      { id: 'ok', x: l / 2, y: h * 0.8, r: 0, lg: 200, ht: 58 },
    ];
  };
  const toucher = (e) => {
    e.preventDefault();
    if (etape !== 'reponse') return;
    const p = point(canvas, e);
    for (const b of boutons()) {
      const dedans = b.r ? Math.hypot(p.x - b.x, p.y - b.y) <= b.r + 10 : Math.abs(p.x - b.x) <= b.lg / 2 && Math.abs(p.y - b.y) <= b.ht / 2;
      if (!dedans) continue;
      if (b.id === '-') reponse = Math.max(0, reponse - 1);
      else if (b.id === '+') reponse = Math.min(99, reponse + 1);
      else finir();
    }
  };
  canvas.addEventListener('pointerdown', toucher);

  const arreterBoucle = boucle((t) => {
    const { l, h } = toile;
    if (etape === 'defile' && t >= DEFILE) { etape = 'reponse'; debutReponse = t; }
    if (t >= duree) finir();
    fond(ctx, l, h, '#1d2a3a', '#0c121a');
    bandeau(ctx, l, 'Le Bon Compte', duree - t, duree);
    if (etape === 'defile') {
      texteCentre(ctx, 'Compte les', l / 2 - 26, 76, 20, '#e0c8b4', 600);
      emoji(ctx, cible, l / 2 + 50, 76, 30);
      for (let k = 0; k < 3; k++) {
        const y = h * 0.3 + k * h * 0.2;
        pave(ctx, 0, y + 26, l, 12, 3, '#6b4423');
      }
      for (const p of passages) {
        const x = (t - p.t) * p.v * l;
        if (x < -40 || x > l + 40) continue;
        emoji(ctx, p.e, x, h * 0.3 + p.ligne * h * 0.2, 44);
      }
    } else {
      emoji(ctx, cible, l / 2, h * 0.3, 60);
      texteCentre(ctx, etape === 'fin' ? 'Il y en avait ' + vrai : 'Combien ?', l / 2, h * 0.42, 28, '#fff4e6');
      texteCentre(ctx, String(reponse), l / 2, h * 0.62, 72, '#ffc23a', 900);
      if (etape === 'reponse') {
        for (const b of boutons()) {
          if (b.r) { ctx.fillStyle = '#2f4f6f'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.fill(); texteCentre(ctx, b.id === '-' ? '−' : '+', b.x, b.y, 40, '#fff'); }
          else { pave(ctx, b.x - b.lg / 2, b.y - b.ht / 2, b.lg, b.ht, 14, '#e0a63a'); texteCentre(ctx, 'Valider', b.x, b.y, 24, '#2a1408'); }
        }
      } else {
        texteCentre(ctx, ecart === 0 ? 'Pile ! 🎯' : 'Écart : ' + ecart, l / 2, h * 0.78, 30, ecart === 0 ? '#9cff4a' : '#ffc23a');
        if (ecart >= 3) texteCentre(ctx, '🍺 Une gorgée', l / 2, h * 0.86, 22, '#ff8a6a', 700);
      }
    }
  });
  return { arreter() { arreterBoucle(); canvas.removeEventListener('pointerdown', toucher); toile.liberer(); finir(); } };
}
