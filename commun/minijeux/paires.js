// Paires de Sous-Bocks : 16 sous-bocks retournés, 8 paires. Retourne-les deux
// par deux pour retrouver toutes les paires, le plus vite possible.
// Score = temps en millisecondes + 1 s par erreur (le plus bas gagne).
// Pas fini à temps : 4 s par paire manquante en plus du temps.
import { aleatoire, creerToile, boucle, bandeau, texteCentre, point, fond, pave, emoji } from './outils.js';

const MOTIFS = ['🍺', '🍷', '🍸', '🥃', '🍹', '🍾', '🧉', '🍶'];
const ERREUR = 1000, MANQUE = 4000;

export function jouer({ hote, graine, duree, rapporter }) {
  const rng = aleatoire(graine);
  const cartes = [...MOTIFS, ...MOTIFS].map(m => ({ m, trouve: false }));
  for (let i = cartes.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [cartes[i], cartes[j]] = [cartes[j], cartes[i]]; }
  const toile = creerToile(hote);
  const { canvas, ctx } = toile;
  let ouvertes = [], erreurs = 0, maintenant = 0, fini = false, cacherA = 0, score = 0;

  const finir = () => {
    if (fini) return;
    fini = true;
    const manquantes = cartes.filter(c => !c.trouve).length / 2;
    score = Math.round(Math.min(maintenant, duree) * 1000) + erreurs * ERREUR + manquantes * MANQUE;
    rapporter(score);
  };
  const cases = () => {
    const { l, h } = toile;
    const c = Math.min((l - 24) / 4, (h - 140) / 4);
    const x0 = l / 2 - c * 2, y0 = 70 + Math.max(0, (h - 110 - c * 4) / 2);
    return cartes.map((k, i) => ({ x: x0 + (i % 4) * c, y: y0 + Math.floor(i / 4) * c, c }));
  };
  const toucher = (e) => {
    e.preventDefault();
    if (fini) return;
    if (ouvertes.length === 2) { if (maintenant < cacherA) return; ouvertes = []; }
    const p = point(canvas, e);
    const i = cases().findIndex(z => p.x >= z.x && p.x <= z.x + z.c && p.y >= z.y && p.y <= z.y + z.c);
    if (i < 0 || cartes[i].trouve || ouvertes.includes(i)) return;
    ouvertes.push(i);
    if (ouvertes.length === 2) {
      const [a, b] = ouvertes;
      if (cartes[a].m === cartes[b].m) { cartes[a].trouve = cartes[b].trouve = true; ouvertes = []; if (cartes.every(c => c.trouve)) finir(); }
      else { erreurs++; cacherA = maintenant + 0.7; }
    }
  };
  canvas.addEventListener('pointerdown', toucher);

  const arreterBoucle = boucle((t) => {
    maintenant = t;
    const { l, h } = toile;
    if (t >= duree) finir();
    if (ouvertes.length === 2 && t >= cacherA) ouvertes = [];
    fond(ctx, l, h, '#14283a', '#060e16');
    bandeau(ctx, l, 'Paires · ' + cartes.filter(c => c.trouve).length / 2 + ' / 8 · ' + erreurs + ' erreur' + (erreurs > 1 ? 's' : ''), duree - t, duree);
    for (const [i, z] of cases().entries()) {
      const k = cartes[i], vue = k.trouve || ouvertes.includes(i);
      pave(ctx, z.x + 5, z.y + 5, z.c - 10, z.c - 10, z.c * 0.2, k.trouve ? 'rgba(156,255,74,0.18)' : vue ? '#f0e6d0' : '#a8323a');
      if (vue) emoji(ctx, k.m, z.x + z.c / 2, z.y + z.c / 2, z.c * 0.5);
      else { ctx.strokeStyle = '#ffc23a88'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(z.x + z.c / 2, z.y + z.c / 2, z.c * 0.22, 0, 7); ctx.stroke(); }
    }
    if (fini) { pave(ctx, l / 2 - 140, h / 2 - 50, 280, 100, 20, 'rgba(0,0,0,0.75)'); texteCentre(ctx, (score / 1000).toFixed(1) + ' s', l / 2, h / 2, 44, '#ffc23a'); }
  });
  return { arreter() { arreterBoucle(); canvas.removeEventListener('pointerdown', toucher); toile.liberer(); finir(); } };
}
