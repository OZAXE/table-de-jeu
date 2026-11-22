// Tape-Tonneau : tape le plus vite possible sur le tonneau pour pomper la bière.
// 3 s de préparation, puis 8 s de tapes. Score = nombre de tapes.
import { creerToile, boucle, bandeau, texteCentre, fond, pave, emoji } from './outils.js';

const PREP = 3, JEU = 8, POUR_PLEIN = 70;

export function jouer({ hote, duree, rapporter }) {
  const toile = creerToile(hote);
  const { canvas, ctx } = toile;
  let tapes = 0, fini = false, maintenant = 0, choc = 0;
  const gouttes = [];

  const finir = () => { if (fini) return; fini = true; rapporter(tapes); };
  const toucher = (e) => {
    e.preventDefault();
    if (fini || maintenant < PREP || maintenant >= PREP + JEU) return;
    tapes++;
    choc = 1;
    gouttes.push({ x: (Math.random() - 0.5) * 60, y: 0, vx: (Math.random() - 0.5) * 120, vy: -120 - Math.random() * 120, v: 0.8 });
  };
  canvas.addEventListener('pointerdown', toucher);

  const arreterBoucle = boucle((t, dt) => {
    maintenant = t;
    const { l, h } = toile;
    if (t >= PREP + JEU || t >= duree) finir();
    choc = Math.max(0, choc - dt * 8);
    fond(ctx, l, h, '#3a1d0e', '#120804');
    const reste = t < PREP ? JEU : Math.max(0, PREP + JEU - t);
    bandeau(ctx, l, 'Tape-Tonneau · ' + tapes + ' tapes', reste, JEU);

    // Le tonneau.
    const cx = l / 2, cy = h * 0.52, rl = Math.min(l * 0.36, 150), rh = rl * 1.25;
    const ech = 1 + choc * 0.05;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(ech, 1 / ech);
    pave(ctx, -rl, -rh, rl * 2, rh * 2, rl * 0.45, '#8a5226');
    for (const k of [-0.62, 0.62]) { ctx.fillStyle = '#4a4a52'; ctx.fillRect(-rl, rh * k - 7, rl * 2, 14); }
    for (let k = -2; k <= 2; k++) { ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(k * rl * 0.38 - 2, -rh + 10, 4, rh * 2 - 20); }
    ctx.restore();

    // La chope qui se remplit à côté.
    const rempli = Math.min(1, tapes / POUR_PLEIN);
    const gl = 64, gh = 90, gx = l / 2, gy = Math.min(h - 30, cy + rh + 30 + gh);
    pave(ctx, gx - gl / 2, gy - gh, gl, gh, 8, 'rgba(255,255,255,0.18)');
    ctx.fillStyle = '#f2b43a';
    ctx.fillRect(gx - gl / 2 + 5, gy - 5 - (gh - 10) * rempli, gl - 10, (gh - 10) * rempli);
    if (rempli > 0) { ctx.fillStyle = '#fff6e0'; ctx.fillRect(gx - gl / 2 + 5, gy - 5 - (gh - 10) * rempli - 8, gl - 10, 8); }

    for (const g of gouttes) { g.x += g.vx * dt; g.y += g.vy * dt; g.vy += 600 * dt; g.v -= dt; }
    while (gouttes.length && gouttes[0].v <= 0) gouttes.shift();
    ctx.fillStyle = '#ffd36a';
    for (const g of gouttes) { ctx.beginPath(); ctx.arc(cx + g.x, cy - rh * 0.4 + g.y, 5, 0, 7); ctx.fill(); }

    if (t < PREP) texteCentre(ctx, String(PREP - Math.floor(t)), cx, cy, 90, '#fff4e6');
    else if (!fini) texteCentre(ctx, 'TAPE !', cx, cy, 54, '#ffc23a');
    else { texteCentre(ctx, tapes + ' tapes', cx, cy, 52, '#ffc23a'); }
    if (t < PREP) texteCentre(ctx, 'Tape le tonneau le plus vite possible', cx, h * 0.2, 18, '#e0c8b4', 600);
  });
  return { arreter() { arreterBoucle(); canvas.removeEventListener('pointerdown', toucher); toile.liberer(); finir(); } };
}
