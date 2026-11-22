// Saute-Tabouret : tu cours dans le bar, touche l'écran pour sauter par-dessus
// les tabourets. 3 chocs et c'est fini. Score = tabourets sautés.
import { aleatoire, creerToile, boucle, bandeau, texteCentre, fond, pave, emoji } from './outils.js';

const VIES = 3, SAUT = 0.62;   // durée du saut en secondes

export function jouer({ hote, graine, duree, rapporter }) {
  const rng = aleatoire(graine);
  // Les tabourets : moment où ils arrivent sur le coureur.
  const obstacles = [];
  for (let t = 1.6; t < duree - 0.5; t += Math.max(0.75, 1.4 - t * 0.025) + rng() * 0.7) obstacles.push({ t, passe: false, touche: false, e: rng() < 0.75 ? '🪑' : '🛢️' });
  const toile = creerToile(hote);
  const { canvas, ctx } = toile;
  let debutSaut = -10, vies = VIES, sautes = 0, maintenant = 0, fini = false, choc = -10;

  const finir = () => { if (fini) return; fini = true; rapporter(sautes); };
  const toucher = (e) => { e.preventDefault(); if (!fini && maintenant - debutSaut > SAUT) debutSaut = maintenant; };
  canvas.addEventListener('pointerdown', toucher);
  const enLair = (t) => { const u = (t - debutSaut) / SAUT; return u >= 0 && u <= 1 ? Math.sin(u * Math.PI) : 0; };

  const arreterBoucle = boucle((t) => {
    maintenant = t;
    const { l, h } = toile;
    if (t >= duree) finir();
    const sol = h * 0.68, xMoi = l * 0.25, vit = l * 0.55;
    for (const o of obstacles) {
      if (fini || o.passe || o.touche) continue;
      if (Math.abs(t - o.t) < 0.09 && enLair(t) < 0.45) { o.touche = true; vies--; choc = t; if (vies <= 0) finir(); }
      else if (t - o.t > 0.09) { o.passe = true; sautes++; }
    }
    fond(ctx, l, h, '#2a1810', '#100806');
    bandeau(ctx, l, 'Saute-Tabouret · ' + sautes + ' · ' + '❤️'.repeat(Math.max(0, vies)), duree - t, duree);
    // Décor qui défile : lampes au plafond.
    for (let k = 0; k < 6; k++) { const x = ((k * 140 - t * vit * 0.5) % (l + 140) + l + 140) % (l + 140) - 70; emoji(ctx, '💡', x, 80, 22); }
    pave(ctx, 0, sol + 24, l, h - sol, 0, '#4a2c18');
    for (let k = 0; k < 12; k++) { const x = ((k * 60 - t * vit) % (l + 60) + l + 60) % (l + 60) - 30; ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x, sol + 24, 3, h); }
    for (const o of obstacles) {
      const x = xMoi + (o.t - t) * vit;
      if (x < -40 || x > l + 40 || o.touche) continue;
      emoji(ctx, o.e, x, sol, 46);
    }
    const y = sol - enLair(t) * h * 0.2;
    const clign = t - choc < 0.6 && Math.floor(t * 12) % 2;
    if (!clign) { ctx.save(); ctx.translate(xMoi, y - 6); ctx.scale(-1, 1); emoji(ctx, fini && vies <= 0 ? '😵' : '🏃', 0, 0, 50); ctx.restore(); }
    if (t < 1.6) texteCentre(ctx, 'Touche pour sauter !', l / 2, h * 0.35, 22, '#f0dcc8', 700);
    if (fini) { pave(ctx, l / 2 - 140, h * 0.35 - 45, 280, 90, 18, 'rgba(0,0,0,0.8)'); texteCentre(ctx, sautes + ' tabourets', l / 2, h * 0.35, 36, '#ffc23a'); }
  });
  return { arreter() { arreterBoucle(); canvas.removeEventListener('pointerdown', toucher); toile.liberer(); finir(); } };
}
