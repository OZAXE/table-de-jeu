// Le Rond Parfait : dessine d'un seul trait le rond d'un sous-bock, le plus
// parfait possible. 3 essais, chacun noté sur 100. Score = total.
import { creerToile, boucle, bandeau, texteCentre, point, fond } from './outils.js';

const ESSAIS = 3;

function noter(pts) {
  if (pts.length < 12) return 0;
  const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length, cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
  const rs = pts.map(p => Math.hypot(p.x - cx, p.y - cy));
  const r = rs.reduce((a, b) => a + b, 0) / rs.length;
  if (r < 30) return 0;
  const ecart = Math.sqrt(rs.reduce((s, x) => s + (x - r) ** 2, 0) / rs.length) / r;
  // Le tour doit être complet : on additionne les angles parcourus.
  let tour = 0;
  for (let i = 1; i < pts.length; i++) {
    let d = Math.atan2(pts[i].y - cy, pts[i].x - cx) - Math.atan2(pts[i - 1].y - cy, pts[i - 1].x - cx);
    if (d > Math.PI) d -= 2 * Math.PI;
    if (d < -Math.PI) d += 2 * Math.PI;
    tour += d;
  }
  const complet = Math.min(1, Math.abs(tour) / (2 * Math.PI));
  const fermeture = Math.hypot(pts[0].x - pts[pts.length - 1].x, pts[0].y - pts[pts.length - 1].y) / r;
  return Math.max(0, Math.round(100 * (1 - ecart * 2.5) * complet ** 3 - Math.max(0, fermeture - 0.25) * 25));
}

export function jouer({ hote, duree, rapporter }) {
  const toile = creerToile(hote);
  const { canvas, ctx } = toile;
  const notes = [];
  let trait = null, dernierTrait = null, maintenant = 0, fini = false, montre = -10;

  const finir = () => { if (fini) return; fini = true; while (notes.length < ESSAIS) notes.push(0); rapporter(notes.reduce((a, b) => a + b, 0)); };
  const bas = (e) => { e.preventDefault(); if (fini || maintenant - montre < 1.2) return; trait = [point(canvas, e)]; canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId); };
  const bouge = (e) => { if (trait) trait.push(point(canvas, e)); };
  const haut = () => {
    if (!trait) return;
    notes.push(noter(trait));
    dernierTrait = trait; trait = null; montre = maintenant;
    if (notes.length >= ESSAIS) finir();
  };
  canvas.addEventListener('pointerdown', bas);
  canvas.addEventListener('pointermove', bouge);
  canvas.addEventListener('pointerup', haut);
  canvas.addEventListener('pointercancel', haut);

  const arreterBoucle = boucle((t) => {
    maintenant = t;
    const { l, h } = toile;
    if (t >= duree) finir();
    fond(ctx, l, h, '#1e2a2a', '#080e0e');
    bandeau(ctx, l, 'Le Rond Parfait · essai ' + Math.min(notes.length + 1, ESSAIS) + ' / ' + ESSAIS, duree - t, duree);
    const dessin = trait || (t - montre < 1.2 ? dernierTrait : null);
    if (dessin && dessin.length > 1) {
      ctx.strokeStyle = trait ? '#fff4e6' : '#ffc23a'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); dessin.forEach((p, k) => k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke();
    }
    if (!trait && t - montre < 1.2 && notes.length) texteCentre(ctx, notes[notes.length - 1] + ' / 100', l / 2, h * 0.18, 44, notes[notes.length - 1] >= 85 ? '#9cff4a' : '#ffc23a');
    if (!trait && t - montre >= 1.2 && !fini) texteCentre(ctx, "Dessine un rond d'un seul trait", l / 2, h * 0.18, 20, '#d8ecec', 600);
    notes.forEach((n, k) => texteCentre(ctx, (k + 1) + '. ' + n + ' / 100', l / 2, h - 110 + k * 28, 18, '#d8ecec', 600));
    if (fini && t - montre >= 1.2) texteCentre(ctx, 'Total : ' + notes.reduce((a, b) => a + b, 0), l / 2, h * 0.18, 40, '#ffc23a');
  });
  return { arreter() { arreterBoucle(); ['pointerdown', 'pointermove', 'pointerup', 'pointercancel'].forEach((n, k) => canvas.removeEventListener(n, [bas, bouge, haut, haut][k])); toile.liberer(); finir(); } };
}
