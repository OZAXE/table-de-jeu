// Mémo-Cocktail : le barman montre une recette (une suite d'ingrédients),
// refais-la dans l'ordre. Chaque recette réussie en ajoute un. Une erreur et
// c'est fini. Score = longueur de la plus longue recette réussie.
import { aleatoire, creerToile, boucle, bandeau, texteCentre, point, fond, pave, emoji } from './outils.js';

const INGREDIENTS = [
  { e: '🍋', c: '#e8d23a' }, { e: '🍊', c: '#f08a2a' },
  { e: '🍒', c: '#d8324a' }, { e: '🌿', c: '#3aa856' },
];
const DEPART = 3, MONTRE = 0.55, PAUSE = 0.18;

export function jouer({ hote, graine, duree, rapporter }) {
  const rng = aleatoire(graine);
  const suite = Array.from({ length: 40 }, () => Math.floor(rng() * 4));
  const toile = creerToile(hote);
  const { canvas, ctx } = toile;
  let longueur = DEPART, reussi = 0, etape = 'montre', debut = 0.6, saisie = 0, maintenant = 0;
  let fini = false, allume = -1, allumeJusqua = 0, message = '';

  const finir = () => { if (fini) return; fini = true; etape = 'fin'; rapporter(reussi); };
  const zones = () => {
    const { l, h } = toile;
    const c = Math.min(l * 0.42, h * 0.22), x0 = l / 2 - c - 8, y0 = h * 0.42;
    return INGREDIENTS.map((_, k) => ({ x: x0 + (k % 2) * (c + 16), y: y0 + Math.floor(k / 2) * (c + 16), c }));
  };
  const toucher = (e) => {
    e.preventDefault();
    if (etape !== 'saisie') return;
    const p = point(canvas, e);
    const k = zones().findIndex(z => p.x >= z.x && p.x <= z.x + z.c && p.y >= z.y && p.y <= z.y + z.c);
    if (k < 0) return;
    allume = k; allumeJusqua = maintenant + 0.2;
    if (k !== suite[saisie]) { message = 'Raté ! La recette : ' + suite.slice(0, longueur).map(i => INGREDIENTS[i].e).join(''); finir(); return; }
    saisie++;
    if (saisie >= longueur) {
      reussi = longueur; longueur++; saisie = 0;
      etape = 'bravo'; debut = maintenant;
    }
  };
  canvas.addEventListener('pointerdown', toucher);

  const arreterBoucle = boucle((t) => {
    maintenant = t;
    const { l, h } = toile;
    if (t >= duree) finir();
    if (etape === 'bravo' && t - debut > 0.7) { etape = 'montre'; debut = t; }
    let montre = -1;
    if (etape === 'montre') {
      const u = t - debut, pas = MONTRE + PAUSE, k = Math.floor(u / pas);
      if (u < 0) montre = -1;
      else if (k >= longueur) { etape = 'saisie'; saisie = 0; }
      else if (u - k * pas < MONTRE) montre = suite[k];
    }
    fond(ctx, l, h, '#2a1438', '#0e0614');
    bandeau(ctx, l, 'Mémo-Cocktail · ' + reussi + ' réussis', duree - t, duree);
    const titre = etape === 'montre' ? 'Regarde la recette…' : etape === 'saisie' ? 'À toi : ' + saisie + ' / ' + longueur : etape === 'bravo' ? 'Bravo ! +1 ingrédient' : '';
    texteCentre(ctx, titre, l / 2, h * 0.2, 24, etape === 'bravo' ? '#9cff4a' : '#fff4e6');
    zones().forEach((z, k) => {
      const actif = k === montre || (k === allume && t < allumeJusqua);
      pave(ctx, z.x, z.y, z.c, z.c, 18, actif ? INGREDIENTS[k].c : 'rgba(255,255,255,0.08)');
      emoji(ctx, INGREDIENTS[k].e, z.x + z.c / 2, z.y + z.c / 2, z.c * (actif ? 0.55 : 0.45));
    });
    if (etape === 'fin') {
      texteCentre(ctx, reussi + ' ingrédients', l / 2, h * 0.3, 40, '#ffc23a');
      if (message) texteCentre(ctx, message, l / 2, h * 0.92, 15, '#ff8a8a', 600);
    }
  });
  return { arreter() { arreterBoucle(); canvas.removeEventListener('pointerdown', toucher); toile.liberer(); finir(); } };
}
