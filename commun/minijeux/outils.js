// Outils communs des mini-jeux de La Tournée.
// Chaque mini-jeu est un module commun/minijeux/<id>.js qui exporte
//   jouer({ hote, graine, duree, rapporter }) -> { arreter() }
// Il dessine dans un canvas plein cadre posé dans `hote`, se joue en local
// (même graine pour tous les téléphones : même partie pour tous) et appelle
// rapporter(score) UNE fois, au plus tard à la fin de `duree` secondes.

// Générateur pseudo-aléatoire déterministe (mulberry32).
export function aleatoire(graine) {
  let a = (graine >>> 0) || 1;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Un canvas net (écran haute densité) qui suit la taille de l'hôte.
export function creerToile(hote) {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;touch-action:none;display:block;';
  hote.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const toile = { canvas, ctx, l: 0, h: 0 };
  const ajuster = () => {
    const r = hote.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    toile.l = Math.max(1, r.width); toile.h = Math.max(1, r.height);
    canvas.width = Math.round(toile.l * dpr); canvas.height = Math.round(toile.h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  ajuster();
  window.addEventListener('resize', ajuster);
  toile.liberer = () => { window.removeEventListener('resize', ajuster); canvas.remove(); };
  return toile;
}

// Boucle d'animation, avec le temps écoulé en secondes.
export function boucle(maj) {
  let actif = true, debut = performance.now(), prec = debut;
  const pas = (t) => {
    if (!actif) return;
    const dt = Math.min(0.1, (t - prec) / 1000);
    prec = t;
    maj((t - debut) / 1000, dt);
    requestAnimationFrame(pas);
  };
  requestAnimationFrame(pas);
  return () => { actif = false; };
}

// Bandeau du haut : nom du mini-jeu, manche, chrono.
export function bandeau(ctx, l, texte, reste, total) {
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(0, 0, l, 44);
  ctx.fillStyle = '#fff4e6';
  ctx.font = '700 17px Outfit, system-ui, sans-serif';
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(texte, 14, 22);
  ctx.textAlign = 'right';
  ctx.fillStyle = reste <= 5 ? '#ff8a8a' : '#ffc23a';
  ctx.fillText('⏱ ' + Math.max(0, Math.ceil(reste)) + ' s', l - 14, 22);
  ctx.fillStyle = reste <= 5 ? '#ff5a5a' : '#ffc23a';
  ctx.fillRect(0, 42, l * Math.max(0, reste / total), 3);
}

// Grand texte centré avec ombre.
export function texteCentre(ctx, texte, x, y, taille, couleur, graisse = 800) {
  ctx.font = `${graisse} ${taille}px Outfit, system-ui, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 10;
  ctx.fillStyle = couleur;
  ctx.fillText(texte, x, y);
  ctx.shadowBlur = 0;
}

// Coordonnées d'un événement pointeur dans le canvas.
export function point(canvas, e) {
  const r = canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}
