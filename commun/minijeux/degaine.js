// Dégaine : touche l'écran dès que « TCHIN ! » s'affiche. 3 manches.
// Score = somme des temps de réaction en millisecondes (le plus bas gagne).
// Trop tôt : 1 000 ms pour la manche. Rien au bout de 2 s : 2 000 ms.
import { aleatoire, creerToile, boucle, bandeau, texteCentre } from './outils.js';

const MANCHES = 3, TROP_TOT = 1000, TROP_TARD = 2000;

export function jouer({ hote, graine, duree, rapporter }) {
  const rng = aleatoire(graine);
  const attentes = Array.from({ length: MANCHES }, () => 1.3 + rng() * 2.4);
  const toile = creerToile(hote);
  const { canvas, ctx } = toile;
  const temps = [];
  let manche = 0, etape = 'attente', debutEtape = 0, maintenant = 0, signal = 0, dernier = '', fini = false;

  const finir = () => {
    if (fini) return;
    fini = true;
    while (temps.length < MANCHES) temps.push(TROP_TARD);
    rapporter(temps.reduce((a, b) => a + b, 0));
  };
  const suivante = (ms, texte) => {
    temps.push(ms);
    dernier = texte;
    manche++;
    etape = manche >= MANCHES ? 'fin' : 'pause';
    debutEtape = maintenant;
    if (etape === 'fin') finir();
  };
  const toucher = (e) => {
    e.preventDefault();
    if (etape === 'attente') suivante(TROP_TOT, 'Trop tôt ! +1 000 ms');
    else if (etape === 'signal') {
      const ms = Math.round((performance.now() - signal));
      suivante(ms, ms + ' ms');
    }
  };
  canvas.addEventListener('pointerdown', toucher);

  const arreterBoucle = boucle((t) => {
    maintenant = t;
    const { l, h } = toile;
    if (etape === 'attente' && t - debutEtape >= attentes[manche]) { etape = 'signal'; signal = performance.now(); debutEtape = t; }
    if (etape === 'signal' && t - debutEtape >= TROP_TARD / 1000) suivante(TROP_TARD, 'Trop lent ! 2 000 ms');
    if (etape === 'pause' && t - debutEtape >= 1.2) { etape = 'attente'; debutEtape = t; }
    if (t >= duree) finir();

    ctx.fillStyle = etape === 'signal' ? '#1f7a3e' : '#2a1216';
    ctx.fillRect(0, 0, l, h);
    bandeau(ctx, l, 'Dégaine · manche ' + Math.min(manche + 1, MANCHES) + ' / ' + MANCHES, duree - t, duree);
    if (etape === 'attente') {
      texteCentre(ctx, 'Attends…', l / 2, h * 0.45, 46, '#e0c8b4');
      texteCentre(ctx, 'Touche dès que ça trinque', l / 2, h * 0.45 + 50, 18, '#a08a7a', 600);
    } else if (etape === 'signal') {
      texteCentre(ctx, '🍻 TCHIN !', l / 2, h * 0.45, 64, '#ffffff');
    } else {
      texteCentre(ctx, dernier, l / 2, h * 0.42, 38, /Trop/.test(dernier) ? '#ff8a8a' : '#ffc23a');
      if (fini) texteCentre(ctx, 'Total : ' + temps.reduce((a, b) => a + b, 0) + ' ms', l / 2, h * 0.42 + 56, 26, '#fff4e6', 700);
    }
    temps.forEach((ms, k) => texteCentre(ctx, (k + 1) + '. ' + ms + ' ms', l / 2, h * 0.7 + k * 30, 18, '#e0c8b4', 600));
  });
  return { arreter() { arreterBoucle(); canvas.removeEventListener('pointerdown', toucher); toile.liberer(); finir(); } };
}
