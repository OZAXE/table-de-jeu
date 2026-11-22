// Plateau en équilibre : tu portes un plateau avec une pinte dessus. Le plateau
// penche tout seul ; glisse le doigt du côté opposé pour garder la pinte au
// centre. Elle tombe si elle arrive au bord (1 gorgée).
// Score = dixièmes de seconde tenus.
import { aleatoire, creerToile, boucle, bandeau, texteCentre, point, fond, pave, emoji } from './outils.js';

export function jouer({ hote, graine, duree, rapporter }) {
  const rng = aleatoire(graine);
  const ph = Array.from({ length: 4 }, () => rng() * 6.28);
  const toile = creerToile(hote);
  const { canvas, ctx } = toile;
  let doigt = 0, pos = 0, vit = 0, tenu = 0, fini = false, tombe = false, chute = 0;

  const finir = () => { if (fini) return; fini = true; rapporter(Math.round(tenu * 10), { gorgees: tombe ? 1 : 0 }); };
  const bouge = (e) => { e.preventDefault(); const p = point(canvas, e); doigt = Math.max(-1, Math.min(1, (p.x / toile.l) * 2 - 1)); };
  const lache = () => { doigt = 0; };
  canvas.addEventListener('pointerdown', bouge);
  canvas.addEventListener('pointermove', bouge);
  canvas.addEventListener('pointerup', lache);

  const arreterBoucle = boucle((t, dt) => {
    const { l, h } = toile;
    if (!fini) {
      // Le vent (le bar qui bouscule) grandit avec le temps ; le doigt contre-penche.
      const force = 0.75 + t * 0.03;
      const vent = force * (Math.sin(t * 0.55 + ph[0]) * 0.7 + Math.sin(t * 1.7 + ph[1]) * 0.3);
      const pente = vent - doigt * 1.1;
      vit += (pente * 0.8 - vit) * Math.min(1, dt * 6);   // la pinte glisse du côté où ça penche
      pos += vit * dt;
      tenu = Math.min(t, duree);
      if (Math.abs(pos) >= 1) { tombe = true; chute = t; finir(); }
    }
    if (t >= duree) finir();
    fond(ctx, l, h, '#202a1a', '#0a0e08');
    bandeau(ctx, l, 'Plateau en équilibre · ' + tenu.toFixed(1) + ' s', duree - t, duree);
    const cx = l / 2, cy = h * 0.55, lg = Math.min(l * 0.42, 170);
    const angle = Math.max(-0.35, Math.min(0.35, (fini ? 0 : 1) * 0.3 * (vit + pos * 0.4)));
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(angle);
    pave(ctx, -lg, -6, lg * 2, 12, 6, '#c0c4c8');
    ctx.fillStyle = 'rgba(156,255,74,0.35)'; ctx.fillRect(-lg * 0.25, -8, lg * 0.5, 4);
    const px = Math.max(-1.2, Math.min(1.2, pos)) * lg;
    const yp = tombe ? (t - chute) * (t - chute) * 900 : 0;
    emoji(ctx, '🍺', px, -34 + yp, 54);
    ctx.restore();
    emoji(ctx, '✋', cx + doigt * lg * 0.6, cy + 60, 40);
    if (t < 2.5) texteCentre(ctx, 'Garde la pinte au centre : glisse le doigt', l / 2, h * 0.25, 17, '#e0ecd8', 600);
    if (fini) {
      texteCentre(ctx, tombe ? 'Pinte renversée !' : 'Pas une goutte !', l / 2, h * 0.25, 34, tombe ? '#ff8a6a' : '#9cff4a');
      texteCentre(ctx, tenu.toFixed(1) + ' s', l / 2, h * 0.32, 28, '#ffc23a');
      if (tombe) texteCentre(ctx, '🍺 Une gorgée', l / 2, h * 0.8, 20, '#ff8a6a', 700);
    }
  });
  return { arreter() { arreterBoucle(); canvas.removeEventListener('pointerdown', bouge); canvas.removeEventListener('pointermove', bouge); canvas.removeEventListener('pointerup', lache); toile.liberer(); finir(); } };
}
