// La Bonne Couleur : un nom de couleur s'affiche, écrit dans une AUTRE couleur.
// Touche la couleur de l'encre, pas le mot ! Bonne réponse +1, mauvaise -1.
// Score = total (au moins 0).
import { aleatoire, creerToile, boucle, bandeau, texteCentre, point, fond, pave } from './outils.js';

const COULEURS = [['ROUGE', '#e8323a'], ['VERT', '#3ac85a'], ['BLEU', '#3a8aff'], ['JAUNE', '#ffd23a']];

export function jouer({ hote, graine, duree, rapporter }) {
  const rng = aleatoire(graine);
  const cartes = Array.from({ length: 80 }, () => {
    const mot = Math.floor(rng() * 4);
    let encre = Math.floor(rng() * 4);
    if (rng() < 0.75 && encre === mot) encre = (encre + 1 + Math.floor(rng() * 3)) % 4;
    return { mot, encre };
  });
  const toile = creerToile(hote);
  const { canvas, ctx } = toile;
  let k = 0, bons = 0, faux = 0, maintenant = 0, fini = false, flash = null;

  const score = () => Math.max(0, bons - faux);
  const finir = () => { if (fini) return; fini = true; rapporter(score()); };
  const boutons = () => {
    const { l, h } = toile;
    const lg = (l - 48) / 2, ht = 76, y0 = h - 200;
    return COULEURS.map((c, i) => ({ i, x: 16 + (i % 2) * (lg + 16), y: y0 + Math.floor(i / 2) * (ht + 14), lg, ht }));
  };
  const toucher = (e) => {
    e.preventDefault();
    if (fini) return;
    const p = point(canvas, e);
    const b = boutons().find(b => p.x >= b.x && p.x <= b.x + b.lg && p.y >= b.y && p.y <= b.y + b.ht);
    if (!b) return;
    const bon = b.i === cartes[k].encre;
    if (bon) bons++; else faux++;
    flash = { bon, t: maintenant };
    k = Math.min(k + 1, cartes.length - 1);
  };
  canvas.addEventListener('pointerdown', toucher);

  const arreterBoucle = boucle((t) => {
    maintenant = t;
    const { l, h } = toile;
    if (t >= duree) finir();
    fond(ctx, l, h, '#1a1a22', '#08080c');
    if (flash && t - flash.t < 0.15) { ctx.fillStyle = flash.bon ? 'rgba(58,200,90,0.25)' : 'rgba(232,50,58,0.3)'; ctx.fillRect(0, 0, l, h); }
    bandeau(ctx, l, 'La Bonne Couleur · ' + bons + ' ✓ · ' + faux + ' ✗', duree - t, duree);
    texteCentre(ctx, "Touche la couleur de l'ENCRE", l / 2, 80, 17, '#c8c8d8', 600);
    const c = cartes[k];
    if (!fini) texteCentre(ctx, COULEURS[c.mot][0], l / 2, h * 0.34, 64, COULEURS[c.encre][1], 900);
    for (const b of boutons()) { pave(ctx, b.x, b.y, b.lg, b.ht, 16, COULEURS[b.i][1]); }
    if (fini) texteCentre(ctx, score() + ' point' + (score() > 1 ? 's' : ''), l / 2, h * 0.34, 44, '#ffc23a');
  });
  return { arreter() { arreterBoucle(); canvas.removeEventListener('pointerdown', toucher); toile.liberer(); finir(); } };
}
