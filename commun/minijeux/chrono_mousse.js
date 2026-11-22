// Chrono-Mousse : garde le doigt appuyé pour tirer la bière et relâche pile au
// temps demandé. Le chrono disparaît au bout d'une seconde : à toi de compter.
// 3 essais (3, 5 et 7 s). Score = écart total en millisecondes (le plus bas gagne).
import { creerToile, boucle, bandeau, texteCentre, fond, pave } from './outils.js';

const CIBLES = [3, 5, 7], RATE = 5000;

export function jouer({ hote, duree, rapporter }) {
  const toile = creerToile(hote);
  const { canvas, ctx } = toile;
  const ecarts = [];
  let essai = 0, etape = 'pret', debutAppui = 0, debutEtape = 0, maintenant = 0, fini = false, dernier = 0;

  const total = () => ecarts.reduce((a, b) => a + b, 0);
  const finir = () => {
    if (fini) return;
    fini = true;
    if (etape === 'appui') ecarts.push(Math.min(RATE, Math.abs(Math.round((maintenant - debutAppui - CIBLES[essai]) * 1000))));
    while (ecarts.length < CIBLES.length) ecarts.push(RATE);
    etape = 'fin';
    rapporter(total());
  };
  const bas = (e) => { e.preventDefault(); if (etape !== 'pret' || fini) return; etape = 'appui'; debutAppui = maintenant; };
  const haut = (e) => {
    if (etape !== 'appui' || fini) return;
    dernier = Math.min(RATE, Math.abs(Math.round((maintenant - debutAppui - CIBLES[essai]) * 1000)));
    ecarts.push(dernier);
    essai++;
    etape = essai >= CIBLES.length ? 'fin' : 'note';
    debutEtape = maintenant;
    if (etape === 'fin') finir();
  };
  canvas.addEventListener('pointerdown', bas);
  canvas.addEventListener('pointerup', haut);
  canvas.addEventListener('pointercancel', haut);

  const arreterBoucle = boucle((t) => {
    maintenant = t;
    const { l, h } = toile;
    if (t >= duree) finir();
    if (etape === 'note' && t - debutEtape > 1.6) etape = 'pret';
    fond(ctx, l, h, '#2a1a0a', '#100804');
    bandeau(ctx, l, 'Chrono-Mousse · essai ' + Math.min(essai + 1, CIBLES.length) + ' / ' + CIBLES.length, duree - t, duree);
    const cible = CIBLES[Math.min(essai, CIBLES.length - 1)];
    // La pinte qui se remplit ; au bout d'une seconde le verre se givre (plus d'indice).
    const gl = Math.min(150, l * 0.4), gh = gl * 1.5, gx = l / 2 - gl / 2, gy = h * 0.32;
    pave(ctx, gx, gy, gl, gh, 12, 'rgba(255,255,255,0.15)');
    const u = etape === 'appui' ? Math.min(1, (t - debutAppui) / 9) : 0;
    const hauteur = (gh - 12) * Math.min(1, u);
    ctx.fillStyle = '#f2b43a';
    ctx.fillRect(gx + 6, gy + gh - 6 - hauteur, gl - 12, hauteur);
    if (u > 0.05) { ctx.fillStyle = '#fff6e0'; ctx.fillRect(gx + 6, gy + gh - 6 - hauteur - 10, gl - 12, 10); }
    if (etape === 'appui' && t - debutAppui >= 1) { pave(ctx, gx, gy, gl, gh, 12, 'rgba(220,235,245,0.92)'); texteCentre(ctx, '❄', l / 2, gy + gh / 2, 48, '#9ab8c8'); }
    if (etape === 'pret') {
      texteCentre(ctx, cible + ',00 s', l / 2, h * 0.2, 52, '#ffc23a');
      texteCentre(ctx, 'Garde le doigt appuyé, relâche à ' + cible + ' s', l / 2, gy + gh + 40, 18, '#e0c8b4', 600);
    } else if (etape === 'appui') {
      const ecoule = t - debutAppui;
      texteCentre(ctx, ecoule < 1 ? ecoule.toFixed(2) + ' s' : '?,?? s', l / 2, h * 0.2, 52, '#fff4e6');
      texteCentre(ctx, 'Compte dans ta tête…', l / 2, gy + gh + 40, 18, '#e0c8b4', 600);
    } else if (etape === 'note') {
      texteCentre(ctx, 'Écart : ' + dernier + ' ms', l / 2, h * 0.2, 40, dernier < 200 ? '#9cff4a' : '#ffc23a');
    } else {
      texteCentre(ctx, 'Total : ' + total() + ' ms', l / 2, h * 0.2, 40, '#ffc23a');
    }
    ecarts.forEach((ms, k) => texteCentre(ctx, CIBLES[k] + ' s : ' + ms + ' ms', l / 2, h - 110 + k * 26, 17, '#e0c8b4', 600));
  });
  return { arreter() { arreterBoucle(); ['pointerdown', 'pointerup', 'pointercancel'].forEach((n, k) => canvas.removeEventListener(n, [bas, haut, haut][k])); toile.liberer(); finir(); } };
}
