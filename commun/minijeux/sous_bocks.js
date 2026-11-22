// Pile de Sous-Bocks : un sous-bock glisse de gauche à droite au-dessus de la
// pile. Touche pour le lâcher : ce qui dépasse tombe, la pile s'affine. Touche
// à côté et c'est fini. Score = nombre de sous-bocks empilés.
import { creerToile, boucle, bandeau, texteCentre, fond, pave } from './outils.js';

const EPAIS = 18, COULEURS = ['#c84a3a', '#e0a63a', '#3a7ac8', '#3aa856', '#8a4ac8', '#e06a9a'];

export function jouer({ hote, duree, rapporter }) {
  const toile = creerToile(hote);
  const { canvas, ctx } = toile;
  let pile = null, mobile = null, chutes = [], fini = false, maintenant = 0, parfait = 0;

  const debut = () => {
    const { l } = toile;
    const lg = Math.min(220, l * 0.55);
    pile = [{ x: l / 2 - lg / 2, lg }];
    nouveau();
  };
  const nouveau = () => {
    const haut = pile[pile.length - 1];
    const v = Math.min(420, 150 + pile.length * 14);
    mobile = { x: 0, lg: haut.lg, v };
  };
  const finir = () => { if (fini) return; fini = true; mobile = null; rapporter(Math.max(0, pile.length - 1)); };
  const toucher = (e) => {
    e.preventDefault();
    if (fini || !mobile) return;
    const haut = pile[pile.length - 1];
    const g = Math.max(mobile.x, haut.x), d = Math.min(mobile.x + mobile.lg, haut.x + haut.lg);
    if (d - g <= 2) { chutes.push({ x: mobile.x, lg: mobile.lg, y: 0, vy: 0, n: pile.length }); finir(); return; }
    if (Math.abs(mobile.x - haut.x) < 4) { parfait = maintenant; pile.push({ x: haut.x, lg: haut.lg }); }
    else {
      if (mobile.x < g) chutes.push({ x: mobile.x, lg: g - mobile.x, y: 0, vy: 0, n: pile.length });
      if (mobile.x + mobile.lg > d) chutes.push({ x: d, lg: mobile.x + mobile.lg - d, y: 0, vy: 0, n: pile.length });
      pile.push({ x: g, lg: d - g });
    }
    nouveau();
  };
  canvas.addEventListener('pointerdown', toucher);

  const arreterBoucle = boucle((t, dt) => {
    maintenant = t;
    const { l, h } = toile;
    if (!pile) debut();
    if (t >= duree) finir();
    if (mobile) {
      mobile.x += mobile.v * dt;
      if (mobile.x + mobile.lg > l) { mobile.x = l - mobile.lg; mobile.v = -Math.abs(mobile.v); }
      if (mobile.x < 0) { mobile.x = 0; mobile.v = Math.abs(mobile.v); }
    }
    fond(ctx, l, h, '#3a2416', '#140a06');
    bandeau(ctx, l, 'Sous-Bocks · ' + (pile.length - 1) + ' empilés', duree - t, duree);
    // La pile descend pour que le haut reste visible.
    const base = h - 60, decal = Math.max(0, pile.length * EPAIS - h * 0.5);
    const yDe = n => base - n * EPAIS + decal;
    pave(ctx, 0, base + EPAIS, l, 60, 0, '#6b4423');
    pile.forEach((b, n) => pave(ctx, b.x, yDe(n), b.lg, EPAIS - 2, 4, n === 0 ? '#8a6a4a' : COULEURS[n % COULEURS.length]));
    for (const c of chutes) { c.vy += 900 * dt; c.y += c.vy * dt; pave(ctx, c.x, yDe(c.n) + c.y, c.lg, EPAIS - 2, 4, 'rgba(200,200,200,0.5)'); }
    chutes = chutes.filter(c => yDe(c.n) + c.y < h + 40);
    if (mobile) pave(ctx, mobile.x, yDe(pile.length), mobile.lg, EPAIS - 2, 4, COULEURS[pile.length % COULEURS.length]);
    if (t - parfait < 0.6 && parfait) texteCentre(ctx, 'Parfait !', l / 2, h * 0.22, 32, '#9cff4a');
    if (pile.length === 1 && !fini) texteCentre(ctx, 'Touche pour lâcher le sous-bock', l / 2, h * 0.22, 18, '#e0c8b4', 600);
    if (fini) texteCentre(ctx, (pile.length - 1) + ' sous-bocks', l / 2, h * 0.3, 44, '#ffc23a');
  });
  return { arreter() { arreterBoucle(); canvas.removeEventListener('pointerdown', toucher); toile.liberer(); finir(); } };
}
