// Bonneteau : une capsule d'or sous un des trois verres retournés. Les verres
// se mélangent, de plus en plus vite. Touche le bon ! 5 manches.
// Score = bonnes réponses × 10 (le mélange est le même pour tout le monde).
import { aleatoire, creerToile, boucle, bandeau, texteCentre, point, fond, pave, emoji } from './outils.js';

const MANCHES = 5;

export function jouer({ hote, graine, duree, rapporter }) {
  const rng = aleatoire(graine);
  const manches = Array.from({ length: MANCHES }, (_, m) => ({
    depart: Math.floor(rng() * 3),
    echanges: Array.from({ length: 4 + m * 2 }, () => { const a = Math.floor(rng() * 3); return [a, (a + 1 + Math.floor(rng() * 2)) % 3]; }),
    pas: Math.max(0.22, 0.5 - m * 0.06),
  }));
  const toile = creerToile(hote);
  const { canvas, ctx } = toile;
  let m = 0, etape = 'montre', debut = 0.3, bons = 0, choisi = -1, maintenant = 0, fini = false;
  // place[k] = position (0..2) du verre k ; capsule sous le verre `depart`.
  let place = [0, 1, 2], fait = 0;

  const finir = () => { if (fini) return; fini = true; etape = 'fin'; rapporter(bons * 10); };
  const xPos = (p) => toile.l / 2 + (p - 1) * Math.min(120, toile.l * 0.3);
  const yVerres = () => toile.h * 0.5;
  const toucher = (e) => {
    e.preventDefault();
    if (etape !== 'choix') return;
    const p = point(canvas, e);
    const pos = [0, 1, 2].find(q => Math.abs(p.x - xPos(q)) < 50 && Math.abs(p.y - yVerres()) < 80);
    if (pos === undefined) return;
    choisi = place.indexOf(pos);
    if (choisi === manches[m].depart) bons++;
    etape = 'revele'; debut = maintenant;
  };
  canvas.addEventListener('pointerdown', toucher);

  const arreterBoucle = boucle((t) => {
    maintenant = t;
    const { l, h } = toile;
    if (t >= duree) finir();
    const M = manches[Math.min(m, MANCHES - 1)];
    // Positions animées pendant le mélange.
    let anim = place.map(p => xPos(p)), leve = 0;
    if (etape === 'montre') { leve = Math.min(1, (t - debut) / 0.3) * (t - debut < 1.2 ? 1 : Math.max(0, 1 - (t - debut - 1.2) / 0.3)); if (t - debut > 1.6) { etape = 'melange'; debut = t; } }
    if (etape === 'melange') {
      const k = Math.floor((t - debut) / M.pas);
      // Applique les échanges déjà terminés.
      while (fait < Math.min(k, M.echanges.length)) { const [x, y] = M.echanges[fait]; place = place.map(p => p === x ? y : p === y ? x : p); fait++; }
      anim = place.map(p => xPos(p));
      if (k >= M.echanges.length) etape = 'choix';
      else {
        // Les verres en positions a et b s'échangent.
        const u = (t - debut) / M.pas - k, [a, b] = M.echanges[k];
        place.forEach((p, v) => { if (p === a || p === b) anim[v] = xPos(p) + (xPos(p === a ? b : a) - xPos(p)) * u; });
      }
    }
    if (etape === 'revele') { leve = 1; if (t - debut > 1.3) { m++; if (m >= MANCHES) finir(); else { etape = 'montre'; debut = t; place = [0, 1, 2]; fait = 0; } } }

    fond(ctx, l, h, '#2a1a2a', '#0e080e');
    bandeau(ctx, l, 'Bonneteau · manche ' + Math.min(m + 1, MANCHES) + ' / ' + MANCHES + ' · ' + bons + ' ✓', duree - t, duree);
    pave(ctx, 0, yVerres() + 50, l, 14, 0, '#6b4423');
    const y = yVerres();
    for (let v = 0; v < 3; v++) {
      const montre = etape === 'montre' || etape === 'revele';
      if (montre && v === M.depart) emoji(ctx, '🪙', anim[v], y + 32, 34);
      const dy = montre && (etape === 'montre' || v === choisi || v === M.depart) ? -leve * 60 : 0;
      ctx.save(); ctx.translate(anim[v], y + dy); ctx.rotate(Math.PI); emoji(ctx, '🥃', 0, 0, 90); ctx.restore();
    }
    const titre = { montre: 'Regarde bien la capsule…', melange: 'Ça mélange !', choix: 'Où est la capsule ?', revele: choisi === M.depart ? 'Bien vu ! 🎯' : 'Raté !' }[etape];
    if (titre) texteCentre(ctx, titre, l / 2, h * 0.22, 28, etape === 'revele' ? (choisi === M.depart ? '#9cff4a' : '#ff8a8a') : '#fff4e6');
    if (fini) texteCentre(ctx, bons + ' / ' + MANCHES + ' trouvées', l / 2, h * 0.22, 36, '#ffc23a');
  });
  return { arreter() { arreterBoucle(); canvas.removeEventListener('pointerdown', toucher); toile.liberer(); finir(); } };
}
