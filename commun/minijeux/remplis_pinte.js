// Remplis la pinte : appuie pour tirer la bière, relâche pile sur le trait.
// 3 pintes, chacune sur 100 (écart au trait), 0 si ça déborde.
import { aleatoire, creerToile, boucle, bandeau, texteCentre } from './outils.js';

const PINTES = 3;

export function jouer({ hote, graine, duree, rapporter }) {
  const rng = aleatoire(graine);
  const cibles = Array.from({ length: PINTES }, () => 0.55 + rng() * 0.33);
  const vitesses = [0.28, 0.36, 0.46].map(v => v * (0.9 + rng() * 0.2));
  const toile = creerToile(hote);
  const { canvas, ctx } = toile;
  const notes = [];
  let pinte = 0, niveau = 0, mousse = 0, appui = false, etape = 'pret', debutEtape = 0, maintenant = 0, fini = false;

  const finir = () => {
    if (fini) return;
    fini = true;
    while (notes.length < PINTES) notes.push(0);
    rapporter(notes.reduce((a, b) => a + b, 0));
  };
  const noter = () => {
    const n = niveau > 1 ? 0 : Math.max(0, Math.round(100 - Math.abs(niveau - cibles[pinte]) * 400));
    notes.push(n);
    pinte++;
    etape = pinte >= PINTES ? 'fin' : 'note';
    debutEtape = maintenant;
    if (etape === 'fin') finir();
  };
  const bas = (e) => { e.preventDefault(); if (etape === 'pret' || etape === 'tire') { appui = true; etape = 'tire'; } };
  const haut = (e) => { e.preventDefault(); if (appui && etape === 'tire') { appui = false; if (niveau > 0.02) noter(); } };
  canvas.addEventListener('pointerdown', bas);
  window.addEventListener('pointerup', haut);
  window.addEventListener('pointercancel', haut);

  const arreterBoucle = boucle((t, dt) => {
    maintenant = t;
    const { l, h } = toile;
    if (etape === 'tire' && appui) {
      niveau += vitesses[pinte] * dt;
      mousse = Math.min(0.08, mousse + dt * 0.12);
      if (niveau > 1.06) { appui = false; noter(); }
    }
    if (etape === 'note' && t - debutEtape >= 1.3) { etape = 'pret'; niveau = 0; mousse = 0; }
    if (t >= duree) finir();

    ctx.fillStyle = '#2a1216'; ctx.fillRect(0, 0, l, h);
    bandeau(ctx, l, 'Remplis la pinte · ' + Math.min(pinte + 1, PINTES) + ' / ' + PINTES, duree - t, duree);
    // Le verre
    const vh = Math.min(h * 0.55, 330), vl = vh * 0.55;
    const x0 = l / 2 - vl / 2, y0 = h * 0.2 + 20;
    const p = Math.min(pinte, PINTES - 1);
    const niv = etape === 'pret' ? 0 : Math.min(1.06, niveau);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x0, y0); ctx.lineTo(x0 + vl, y0); ctx.lineTo(x0 + vl * 0.9, y0 + vh); ctx.lineTo(x0 + vl * 0.1, y0 + vh); ctx.closePath();
    ctx.fillStyle = 'rgba(220,240,255,0.08)'; ctx.fill();
    ctx.clip();
    const hb = vh * Math.min(1, niv);
    const g = ctx.createLinearGradient(0, y0 + vh - hb, 0, y0 + vh);
    g.addColorStop(0, '#f2b134'); g.addColorStop(1, '#c4700e');
    ctx.fillStyle = g; ctx.fillRect(x0, y0 + vh - hb, vl, hb);
    if (niv > 0.02) { ctx.fillStyle = '#fff6e0'; ctx.fillRect(x0, y0 + vh - hb - vh * mousse, vl, vh * mousse); }
    ctx.restore();
    ctx.strokeStyle = 'rgba(230,245,255,0.7)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + vl * 0.1, y0 + vh); ctx.lineTo(x0 + vl * 0.9, y0 + vh); ctx.lineTo(x0 + vl, y0); ctx.stroke();
    // Le trait
    const yc = y0 + vh * (1 - cibles[p]);
    ctx.strokeStyle = '#ff3c6a'; ctx.lineWidth = 3; ctx.setLineDash([10, 6]);
    ctx.beginPath(); ctx.moveTo(x0 - 26, yc); ctx.lineTo(x0 + vl + 26, yc); ctx.stroke(); ctx.setLineDash([]);
    if (niv > 1) texteCentre(ctx, 'Ça déborde !', l / 2, y0 - 10, 26, '#ff8a8a');
    const yb = y0 + vh + 40;
    if (etape === 'pret') texteCentre(ctx, 'Appuie et garde le doigt', l / 2, yb, 20, '#e0c8b4', 600);
    else if (etape === 'tire') texteCentre(ctx, 'Relâche sur le trait !', l / 2, yb, 20, '#ffc23a', 700);
    else texteCentre(ctx, notes[notes.length - 1] + ' / 100' + (fini ? '  ·  total ' + notes.reduce((a, b) => a + b, 0) : ''), l / 2, yb, 26, '#ffc23a');
  });
  return { arreter() {
    arreterBoucle();
    canvas.removeEventListener('pointerdown', bas);
    window.removeEventListener('pointerup', haut);
    window.removeEventListener('pointercancel', haut);
    toile.liberer(); finir();
  } };
}
