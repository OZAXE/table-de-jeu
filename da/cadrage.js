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
//   // dans la boucle, après camera.lookAt : zone.appliquer(camera);
//   // une fois la page prête : zone.mesurer();
// =====================================================================
export function suivreZoneLibre(apresChangement, {
  hauts = ['bandeau', 'joueurs', 'btn-regles', 'boutons-haut', 'onglet-enquete'],
  panneaux = ['panneau'],
  vitesse = 0.12,
} = {}) {
  const c = { fracH: 1, fracL: 1, dx: 0, dy: 0 };
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
    return { haut, bas, gauche, droite, L, H };
  }

  function calculer() {
    const z = zone();
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
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', surveiller); else surveiller();

  // Recentre l'image sur la zone libre, sans à-coup.
  function appliquer(camera) {
    actuel.x += (c.dx - actuel.x) * vitesse;
    actuel.y += (c.dy - actuel.y) * vitesse;
    const L = window.innerWidth, H = window.innerHeight;
    camera.setViewOffset(L, H, -actuel.x, -actuel.y, L, H);
  }

  return { c, mesurer: () => { recalculer(); apresChangement(); }, recalculer, appliquer };
}
