import * as THREE from 'three';

// =====================================================================
// Cadrage commun des jeux 3D : la table tient TOUJOURS dans la zone libre
// de l'écran, sous le titre et la liste des joueurs, au-dessus du panneau
// du bas (ou à gauche du panneau quand il passe en colonne, en paysage).
// Rien de l'interface ne cache donc une place, une étiquette ou la pile.
//
// Utilisation dans une page :
//   const zone = suivreZoneLibre(() => { majCadrageTable(camera); camObjectifPos = CAM_POS.clone(); });
//   // dans distanceCadrage : LARGEUR / (tan(hHalf) * zone.c.fracL), HAUTEUR / (tan(vHalf) * zone.c.fracH)
//   // dans redimensionner, avant majCadrageTable : zone.recalculer();
//   // dans la boucle, après camera.lookAt :
//   //   zone.appliquer(camera, { rayon, places }, { pos: camObjectifPos, cible: camObjectifCible });
//   // (rayon : bord de la table ; places : rayon des verres et des prénoms)
//   // La TABLE elle-même (ses bords projetés à l'écran) est centrée dans la
//   // zone libre, et le recul ajusté (zone.c.zoom, à multiplier dans
//   // distanceCadrage) pour qu'elle la remplisse. Centrer le point visé par
//   // la caméra ne suffisait pas : en plongée, il flotte au-dessus de la
//   // table, qui finissait trop haut ou coupée.
//   // une fois la page prête : zone.mesurer();
// =====================================================================
// Mesure brute de la zone libre (pour une page qui garde son propre cadrage).
export function mesurerZone(options) {
  let z = null;
  suivreZoneLibre(() => {}, Object.assign({ observer: false, sortie: (x) => { z = x; } }, options)).recalculer();
  return z;
}

export function suivreZoneLibre(apresChangement, {
  // L'onglet « 🔍 » de l'Enquête (bord gauche) n'est PAS compté : il ne fait
  // que 30 px et le compter décalait toute la table vers la droite.
  hauts = ['bandeau', 'joueurs', 'btn-regles', 'boutons-haut'],
  panneaux = ['panneau'],
  vitesse = 0.12,
  observer = true,
  sortie = null,
} = {}) {
  const c = { fracH: 1, fracL: 1, dx: 0, dy: 0, zoom: 1, z: null };
  const actuel = { x: 0, y: 0 };

  function zone() {
    const L = window.innerWidth, H = window.innerHeight;
    const visible = (r) => r.width > 0 && r.height > 0;
    const milieu = (r) => r.right > L * 0.25 && r.left < L * 0.75;
    let haut = 0, bas = H, gauche = 0, droite = L;
    hauts.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (!visible(r)) return;
      if (milieu(r) && r.top < H * 0.5) haut = Math.max(haut, r.bottom);
      // Liste en colonne dans la marge de gauche (ordinateur) : elle ne gêne
      // que si elle descend dans la hauteur de la table.
      else if (r.right < L * 0.5 && r.bottom > H * 0.3) gauche = Math.max(gauche, r.right);
    });
    panneaux.forEach(id => {
      const p = document.getElementById(id);
      if (!p || p.classList.contains('cache')) return;
      const r = p.getBoundingClientRect();
      if (!visible(r)) return;
      if (r.top > H * 0.3) bas = Math.min(bas, r.top);                // panneau en bas
      else if (r.left > L * 0.35) droite = Math.min(droite, r.left);  // colonne à droite
    });
    haut += 4; bas -= 4; gauche += 4; droite -= 4;
    // Les grandes annonces se placent juste sous le haut de l'écran, dans
    // la zone libre : elles ne recouvrent ni le titre ni les joueurs.
    const racine = document.documentElement.style;
    racine.setProperty('--haut-libre', Math.round(haut) + 'px');
    racine.setProperty('--zone-gauche', Math.round(gauche) + 'px');
    racine.setProperty('--zone-droite', Math.round(L - droite) + 'px');
    // Garde-fous : jamais moins d'un tiers de l'écran pour la table.
    if (bas - haut < H * 0.34) bas = Math.min(H, haut + H * 0.34);
    if (droite - gauche < L * 0.4) droite = Math.min(L, gauche + L * 0.4);
    const res = { haut, bas, gauche, droite, L, H };
    if (sortie) sortie(res);
    return res;
  }

  function calculer() {
    const z = zone();
    c.z = z;
    return {
      fracH: (z.bas - z.haut) / z.H, fracL: (z.droite - z.gauche) / z.L,
      dx: (z.gauche + z.droite) / 2 - z.L / 2, dy: (z.haut + z.bas) / 2 - z.H / 2,
    };
  }

  function recalculer() { Object.assign(c, calculer()); }

  function mesurer() {
    const n = calculer();
    if (Math.abs(n.fracH - c.fracH) < 0.01 && Math.abs(n.fracL - c.fracL) < 0.01
        && Math.abs(n.dx - c.dx) < 2 && Math.abs(n.dy - c.dy) < 2) return;
    Object.assign(c, n);
    apresChangement();
  }

  // Le panneau, le titre et la liste changent de taille au fil de la partie.
  const surveiller = () => {
    if (window.ResizeObserver) {
      const obs = new ResizeObserver(() => mesurer());
      [...hauts, ...panneaux].forEach(id => { const el = document.getElementById(id); if (el) obs.observe(el); });
    }
    panneaux.forEach(id => {
      const el = document.getElementById(id);
      if (el) new MutationObserver(() => mesurer()).observe(el, { attributes: true, attributeFilter: ['class'] });
    });
  };
  if (observer) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', surveiller); else surveiller();
  }

  // Recentre l'image sur la table (ou, à défaut, sur la zone libre), sans à-coup.
  const essai = new THREE.PerspectiveCamera();
  const v = new THREE.Vector3();
  let dernierZoom = 0;
  function appliquer(camera, table, objectif) {
    const L = window.innerWidth, H = window.innerHeight;
    const z = c.z || zone();
    let cx = -c.dx, cy = -c.dy;
    if (table) {
      // Où tomberont les bords de la table, vue depuis la position VISÉE de
      // la caméra (pas sa position courante, qui glisse encore) ?
      essai.fov = camera.fov; essai.aspect = camera.aspect; essai.near = camera.near; essai.far = camera.far;
      essai.updateProjectionMatrix();
      essai.position.copy(objectif ? objectif.pos : camera.position);
      essai.lookAt(objectif ? objectif.cible : new THREE.Vector3(0, 0.3, 0));
      essai.updateMatrixWorld();
      const R = table.rayon, P = table.places || R * 0.82, h = table.hauteur ?? 0.72;
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      [[0, h, -P], [0, 0.02, R + 0.05], [-(R + 0.05), 0, 0], [R + 0.05, 0, 0], [-(P + 0.45), h, 0], [P + 0.45, h, 0]].forEach(([x, y, zz]) => {
        v.set(x, y, zz).project(essai);
        const px = (v.x + 1) / 2 * L, py = (1 - v.y) / 2 * H;
        x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py);
      });
      cx = (x0 + x1) / 2 - (z.gauche + z.droite) / 2;
      cy = (y0 + y1) / 2 - (z.haut + z.bas) / 2;
      // Trop grande ou trop petite pour la zone : on recule ou on avance.
      const rapport = Math.max((y1 - y0) / ((z.bas - z.haut) * 0.94), (x1 - x0) / ((z.droite - z.gauche) * 0.96));
      const t = performance.now();
      if (Math.abs(rapport - 1) > 0.025 && t - dernierZoom > 60) {
        dernierZoom = t;
        c.zoom = Math.min(3, Math.max(0.45, c.zoom * (1 + (rapport - 1) * 0.5)));
        apresChangement();
      }
    }
    actuel.x += (cx - actuel.x) * vitesse;
    actuel.y += (cy - actuel.y) * vitesse;
    camera.setViewOffset(L, H, actuel.x, actuel.y, L, H);
  }

  // Inclinaison de la caméra : la même pour tous les jeux sur un écran
  // large ; quand la zone libre est haute et étroite (téléphone en
  // portrait), on plonge un peu plus pour que la table paraisse ronde et
  // remplisse l'espace au lieu de laisser du plancher vide en dessous.
  function direction(base, max = 0.88) {
    const z = c.z || zone();
    const rapport = (z.bas - z.haut) / Math.max(1, z.droite - z.gauche);
    const y = Math.min(max, base + Math.max(0, Math.min(0.3, (rapport - 0.9) * 0.5)));
    return new THREE.Vector3(0, y, Math.sqrt(1 - y * y));
  }

  return { c, mesurer: () => { recalculer(); apresChangement(); }, recalculer, appliquer, direction };
}
