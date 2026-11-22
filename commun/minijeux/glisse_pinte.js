// Glisse-Pinte : lance la pinte vers le haut du comptoir d'un coup de doigt ;
// elle doit s'arrêter dans la zone dorée. 3 lancers, chacun sur 100.
// Tombée au bout du comptoir : 0.
import { aleatoire, creerToile, boucle, bandeau, texteCentre, point } from './outils.js';

const LANCERS = 3;
const FROTTEMENT = 1.25;   // décélération, en longueurs de comptoir par seconde²

export function jouer({ hote, graine, duree, rapporter }) {
  const rng = aleatoire(graine);
  const zones = Array.from({ length: LANCERS }, () => 0.55 + rng() * 0.3);   // centre, en fraction du comptoir
  const LARGEUR_ZONE = 0.09;
  const toile = creerToile(hote);
  const { canvas, ctx } = toile;
  const notes = [];
  let lancer = 0, pos = 0, vitesse = 0, etape = 'pret', debutEtape = 0, maintenant = 0, fini = false;
  let tenue = null;   // { y0, t0, suivi: [{y, t}] }

  const finir = () => {
    if (fini) return;
    fini = true;
    while (notes.length < LANCERS) notes.push(0);
    rapporter(notes.reduce((a, b) => a + b, 0));
  };
  const noter = (tombe) => {
    const c = zones[lancer];
    const n = tombe ? 0 : Math.max(0, Math.round(100 - Math.max(0, Math.abs(pos - c) - LARGEUR_ZONE / 2) / 0.22 * 100));
    notes.push(n);
    lancer++;
    etape = lancer >= LANCERS ? 'fin' : 'note';
    debutEtape = maintenant;
    if (etape === 'fin') finir();
  };
  // Géométrie du comptoir : du bas (départ) vers le haut.
  const geo = () => {
    const { l, h } = toile;
    const yBas = h - 70, yHaut = 90;
    return { l, h, yBas, yHaut, longueur: yBas - yHaut, x: l / 2 };
  };
  const bas = (e) => {
    e.preventDefault();
    if (etape !== 'pret') return;
    const p = point(canvas, e);
    tenue = { suivi: [{ y: p.y, t: performance.now() }] };
    canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
  };
  const bouge = (e) => {
    if (!tenue) return;
    const p = point(canvas, e);
    tenue.suivi.push({ y: p.y, t: performance.now() });
    if (tenue.suivi.length > 12) tenue.suivi.shift();
  };
  const haut = (e) => {
    if (!tenue) return;
    const p = point(canvas, e);
    tenue.suivi.push({ y: p.y, t: performance.now() });
    const fin = tenue.suivi[tenue.suivi.length - 1];
    const debut = tenue.suivi.find(s => fin.t - s.t <= 120) || tenue.suivi[0];
    const dt = Math.max(16, fin.t - debut.t) / 1000;
    const v = (debut.y - fin.y) / dt;   // px/s vers le haut
    tenue = null;
    const { longueur } = geo();
    vitesse = Math.min(3.2, Math.max(0, v / longueur));   // en longueurs/s
    if (vitesse > 0.15) { etape = 'glisse'; pos = 0; }
  };
  canvas.addEventListener('pointerdown', bas);
  canvas.addEventListener('pointermove', bouge);
  canvas.addEventListener('pointerup', haut);
  canvas.addEventListener('pointercancel', haut);

  const arreterBoucle = boucle((t, dt) => {
    maintenant = t;
    if (etape === 'glisse') {
      pos += vitesse * dt;
      vitesse -= FROTTEMENT * dt;
      if (pos > 1.02) noter(true);
      else if (vitesse <= 0) { vitesse = 0; noter(false); }
    }
    if (etape === 'note' && t - debutEtape >= 1.3) { etape = 'pret'; pos = 0; }
    if (t >= duree) finir();

    const { l, h, yBas, yHaut, longueur, x } = geo();
    ctx.fillStyle = '#1a0c0e'; ctx.fillRect(0, 0, l, h);
    // Le comptoir, en perspective légère
    const larg = Math.min(l * 0.5, 190);
    ctx.fillStyle = '#5a2a16';
    ctx.beginPath(); ctx.moveTo(x - larg / 2, yBas + 30); ctx.lineTo(x + larg / 2, yBas + 30); ctx.lineTo(x + larg * 0.32, yHaut - 20); ctx.lineTo(x - larg * 0.32, yHaut - 20); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#d9a640'; ctx.lineWidth = 3; ctx.stroke();
    // Zone dorée
    const z = zones[Math.min(lancer, LANCERS - 1)];
    const yz = yBas - z * longueur;
    ctx.fillStyle = 'rgba(255,194,58,0.35)';
    ctx.fillRect(x - larg * 0.4, yz - LARGEUR_ZONE / 2 * longueur, larg * 0.8, LARGEUR_ZONE * longueur);
    ctx.strokeStyle = '#ffc23a'; ctx.lineWidth = 2;
    ctx.strokeRect(x - larg * 0.4, yz - LARGEUR_ZONE / 2 * longueur, larg * 0.8, LARGEUR_ZONE * longueur);
    // Bout du comptoir
    ctx.fillStyle = '#ff3c6a'; ctx.fillRect(x - larg * 0.32, yHaut - 24, larg * 0.64, 4);
    bandeau(ctx, l, 'Glisse-Pinte · lancer ' + Math.min(lancer + 1, LANCERS) + ' / ' + LANCERS, duree - t, duree);
    // La pinte
    const yp = yBas - Math.min(1.05, pos) * longueur;
    const echelle = 1 - Math.min(1, pos) * 0.35;
    const pl = 34 * echelle, ph = 50 * echelle;
    ctx.fillStyle = '#e8a528'; ctx.fillRect(x - pl / 2, yp - ph, pl, ph);
    ctx.fillStyle = '#fff6e0'; ctx.fillRect(x - pl / 2, yp - ph - 8 * echelle, pl, 9 * echelle);
    ctx.strokeStyle = 'rgba(230,245,255,0.8)'; ctx.lineWidth = 2; ctx.strokeRect(x - pl / 2, yp - ph - 8 * echelle, pl, ph + 8 * echelle);
    if (etape === 'pret') texteCentre(ctx, 'Glisse la pinte vers le haut ↑', l / 2, h - 28, 18, '#e0c8b4', 600);
    else if (etape === 'note' || etape === 'fin') {
      const n = notes[notes.length - 1];
      texteCentre(ctx, n === 0 && pos > 1 ? 'Tombée ! 0' : n + ' / 100', l / 2, h * 0.5, 34, n >= 70 ? '#ffc23a' : '#ff8a8a');
      if (fini) texteCentre(ctx, 'Total ' + notes.reduce((a, b) => a + b, 0), l / 2, h * 0.5 + 44, 22, '#fff4e6', 700);
    }
  });
  return { arreter() {
    arreterBoucle();
    canvas.removeEventListener('pointerdown', bas);
    canvas.removeEventListener('pointermove', bouge);
    canvas.removeEventListener('pointerup', haut);
    canvas.removeEventListener('pointercancel', haut);
    toile.liberer(); finir();
  } };
}
