// Lancer de Cacahuètes : la bouche du copain bouge de gauche à droite en haut
// de l'écran. Lance la cacahuète d'un coup de doigt vers le haut. 6 lancers.
// Dans la bouche : 3 points, frôlée : 1. Score = total.
import { aleatoire, creerToile, boucle, bandeau, texteCentre, point, fond, emoji } from './outils.js';

const LANCERS = 6;

export function jouer({ hote, graine, duree, rapporter }) {
  const rng = aleatoire(graine);
  const ph = rng() * 6.28, vit = 1.4 + rng() * 0.6;
  const toile = creerToile(hote);
  const { canvas, ctx } = toile;
  const notes = [];
  let vol = null, tenue = null, maintenant = 0, fini = false, retour = null;

  const total = () => notes.reduce((a, b) => a + b, 0);
  const finir = () => { if (fini) return; fini = true; while (notes.length < LANCERS) notes.push(0); rapporter(total()); };
  const bouche = (t) => ({ x: toile.l / 2 + Math.sin(t * vit * (1 + notes.length * 0.12) + ph) * toile.l * 0.36, y: 120 });
  const bas = (e) => { e.preventDefault(); if (fini || vol) return; const p = point(canvas, e); tenue = [{ ...p, t: maintenant }]; };
  const bouge = (e) => { if (!tenue) return; const p = point(canvas, e); tenue.push({ ...p, t: maintenant }); if (tenue.length > 8) tenue.shift(); };
  const haut = (e) => {
    if (!tenue || vol) { tenue = null; return; }
    const p = point(canvas, e), a = tenue[0];
    tenue = null;
    const dt = Math.max(0.03, maintenant - a.t), vy = (a.y - p.y) / dt, vx = (p.x - a.x) / dt;
    if (vy < 150) return;
    vol = { x: toile.l / 2, y: toile.h - 90, vx: vx * 0.6, vy: -Math.min(1600, vy * 1.1) };
  };
  canvas.addEventListener('pointerdown', bas);
  canvas.addEventListener('pointermove', bouge);
  canvas.addEventListener('pointerup', haut);

  const arreterBoucle = boucle((t, dt) => {
    maintenant = t;
    const { l, h } = toile;
    if (t >= duree) finir();
    const b = bouche(t);
    if (vol) {
      vol.x += vol.vx * dt; vol.y += vol.vy * dt; vol.vy += 900 * dt;
      if (vol.y <= b.y + 10 && vol.vy < 0 || vol.y < 0 || vol.vy > 0) {
        const d = Math.abs(vol.x - b.x);
        const n = vol.y <= b.y + 30 ? (d < 28 ? 3 : d < 60 ? 1 : 0) : 0;
        notes.push(n); retour = { n, t };
        vol = null;
        if (notes.length >= LANCERS) finir();
      }
    }
    fond(ctx, l, h, '#2a2010', '#0e0a04');
    bandeau(ctx, l, 'Cacahuètes · ' + total() + ' pts · lancer ' + Math.min(notes.length + 1, LANCERS) + '/' + LANCERS, duree - t, duree);
    emoji(ctx, retour && t - retour.t < 0.6 && retour.n === 3 ? '😋' : '😮', b.x, b.y, 70);
    if (vol) emoji(ctx, '🥜', vol.x, vol.y, 30);
    else if (!fini) emoji(ctx, '🥜', l / 2, h - 90, 34);
    if (retour && t - retour.t < 0.8) texteCentre(ctx, retour.n === 3 ? 'Dans le mille ! +3' : retour.n ? 'Frôlé +1' : 'Raté', l / 2, h * 0.45, 30, retour.n === 3 ? '#9cff4a' : retour.n ? '#ffc23a' : '#ff8a8a');
    if (t < 2.5) texteCentre(ctx, "Lance d'un coup de doigt vers le haut", l / 2, h * 0.6, 17, '#f0e6d0', 600);
    if (fini) texteCentre(ctx, total() + ' points', l / 2, h * 0.45, 44, '#ffc23a');
  });
  return { arreter() { arreterBoucle(); canvas.removeEventListener('pointerdown', bas); canvas.removeEventListener('pointermove', bouge); canvas.removeEventListener('pointerup', haut); toile.liberer(); finir(); } };
}
