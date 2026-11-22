// Le Bon Verre : un client commande un verre ; trouve-le le plus vite possible
// parmi ceux du comptoir. 6 commandes. Mauvais verre : +1,5 s.
// Score = temps total en millisecondes (le plus bas gagne).
import { aleatoire, creerToile, boucle, bandeau, texteCentre, point, fond, pave, emoji } from './outils.js';

const VERRES = ['🍺', '🍻', '🥂', '🍷', '🍸', '🍹', '🍾', '🥃', '🧉', '🍶', '🥤', '🧋', '☕', '🍵', '🥛', '🧃'];
const COMMANDES = 6, COLS = 4, LIGNES = 4, PENALITE = 1500, NON_FAIT = 6000;

export function jouer({ hote, graine, duree, rapporter }) {
  const rng = aleatoire(graine);
  const manches = Array.from({ length: COMMANDES }, () => {
    const cible = VERRES[Math.floor(rng() * VERRES.length)];
    const autres = VERRES.filter(v => v !== cible);
    const grille = Array.from({ length: COLS * LIGNES }, () => autres[Math.floor(rng() * autres.length)]);
    grille[Math.floor(rng() * grille.length)] = cible;
    return { cible, grille };
  });
  const toile = creerToile(hote);
  const { canvas, ctx } = toile;
  const temps = [];
  let manche = 0, debutManche = 0.4, penalites = 0, maintenant = 0, fini = false, rouge = -1, rougeJusqua = 0, pause = 0;

  const total = () => temps.reduce((a, b) => a + b, 0);
  const finir = () => {
    if (fini) return;
    fini = true;
    while (temps.length < COMMANDES) temps.push(NON_FAIT);
    rapporter(total());
  };
  const cases = () => {
    const { l, h } = toile;
    const c = Math.min((l - 40) / COLS, (h * 0.6) / LIGNES);
    const x0 = l / 2 - (c * COLS) / 2, y0 = h * 0.33;
    return manches[Math.min(manche, COMMANDES - 1)].grille.map((v, k) => ({ v, x: x0 + (k % COLS) * c, y: y0 + Math.floor(k / COLS) * c, c }));
  };
  const toucher = (e) => {
    e.preventDefault();
    if (fini || maintenant < debutManche || maintenant < pause) return;
    const p = point(canvas, e);
    const k = cases().findIndex(z => p.x >= z.x && p.x <= z.x + z.c && p.y >= z.y && p.y <= z.y + z.c);
    if (k < 0) return;
    if (manches[manche].grille[k] !== manches[manche].cible) { penalites++; rouge = k; rougeJusqua = maintenant + 0.3; return; }
    temps.push(Math.round((maintenant - debutManche) * 1000) + penalites * PENALITE);
    penalites = 0;
    manche++;
    pause = maintenant + 0.5;
    debutManche = pause;
    if (manche >= COMMANDES) finir();
  };
  canvas.addEventListener('pointerdown', toucher);

  const arreterBoucle = boucle((t) => {
    maintenant = t;
    const { l, h } = toile;
    if (t >= duree) finir();
    fond(ctx, l, h, '#33241a', '#120c08');
    bandeau(ctx, l, 'Le Bon Verre · ' + Math.min(manche + 1, COMMANDES) + ' / ' + COMMANDES, duree - t, duree);
    if (fini) {
      texteCentre(ctx, (total() / 1000).toFixed(2) + ' s', l / 2, h * 0.4, 52, '#ffc23a');
      texteCentre(ctx, 'au total', l / 2, h * 0.47, 20, '#e0c8b4', 600);
      return;
    }
    const m = manches[manche];
    pave(ctx, l / 2 - 120, 58, 240, 90, 18, 'rgba(255,255,255,0.1)');
    texteCentre(ctx, 'Le client veut :', l / 2 - 30, 103, 17, '#e0c8b4', 600);
    emoji(ctx, m.cible, l / 2 + 70, 103, 48);
    if (t < pause) return;
    for (const [k, z] of cases().entries()) {
      pave(ctx, z.x + 4, z.y + 4, z.c - 8, z.c - 8, 12, k === rouge && t < rougeJusqua ? '#a83232' : 'rgba(255,255,255,0.06)');
      emoji(ctx, z.v, z.x + z.c / 2, z.y + z.c / 2, z.c * 0.52);
    }
  });
  return { arreter() { arreterBoucle(); canvas.removeEventListener('pointerdown', toucher); toile.liberer(); finir(); } };
}
