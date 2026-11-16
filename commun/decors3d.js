// Décors 3D des univers autres que le Manoir : Station Aurora-7 (science-
// fiction) et Velvet Room (bar clandestin, 1931). Mobilier par pièce, sols,
// textures de façade et extérieur (espace étoilé, rue de nuit).
//
// Le moteur (manoir3d.js) passe ses petits outils de construction dans `h`,
// pour que les trois univers partagent les mêmes proportions et le même
// style de maquette.

export function decors(h) {
  const { THREE, boite, cyl, sphere, mat, lueur, place, couche, texture, carreaux, pierre, tapis, table, chaise, fauteuil, plante,
    NOYER, NOYER_FONCE, CUIR, VELOURS, LAITON, aleatoire, texteSprite } = h;

  // ------------------------------------------------------------------
  // Matériaux et textures
  // ------------------------------------------------------------------
  const ACIER = () => mat(0x8a96a6, { metalness: 0.65, roughness: 0.35 });
  const ACIER_SOMBRE = () => mat(0x3a4250, { metalness: 0.6, roughness: 0.4 });
  const BLANC = () => mat(0xe8eef2, { roughness: 0.4 });
  const VERRE = () => new THREE.MeshPhysicalMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.22, roughness: 0.05 });
  const CYAN = (i = 2) => lueur(0x4fd6ff, i);
  const FEUTRE = () => mat(0x1f6a3a, { roughness: 0.95 });

  const brique = (base = '#6a2e22') => texture((ctx, T) => {
    ctx.fillStyle = '#2a1a16'; ctx.fillRect(0, 0, T, T);
    const r = aleatoire(7);
    const hb = T / 8, lb = T / 4;
    for (let y = 0; y < 8; y++) {
      for (let x = -1; x < 5; x++) {
        const dx = (y % 2) * lb / 2;
        const c = new THREE.Color(base).multiplyScalar(0.75 + r() * 0.4);
        ctx.fillStyle = '#' + c.getHexString();
        ctx.fillRect(x * lb + dx + 2, y * hb + 2, lb - 4, hb - 4);
      }
    }
  }, 256, [2, 1]);
  const panneaux = (a = '#9aa4b2', b = '#7e8896') => texture((ctx, T) => {
    ctx.fillStyle = a; ctx.fillRect(0, 0, T, T);
    ctx.strokeStyle = b; ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, T / 2 - 12, T - 12); ctx.strokeRect(T / 2 + 6, 6, T / 2 - 12, T - 12);
    ctx.fillStyle = b;
    [[20, 20], [T / 2 - 28, 20], [20, T - 28], [T / 2 - 28, T - 28]].forEach(([x, y]) => { ctx.fillRect(x, y, 8, 8); ctx.fillRect(x + T / 2, y, 8, 8); });
  }, 256, [2, 1]);
  const grille = (fond, trait) => texture((ctx, T) => {
    ctx.fillStyle = fond; ctx.fillRect(0, 0, T, T);
    ctx.strokeStyle = trait; ctx.lineWidth = 3;
    for (let i = 0; i <= T; i += T / 8) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, T); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(T, i); ctx.stroke(); }
  });
  const asphalte = () => texture((ctx, T) => {
    ctx.fillStyle = '#17181c'; ctx.fillRect(0, 0, T, T);
    const r = aleatoire(3);
    for (let i = 0; i < 900; i++) { const g = 20 + r() * 30; ctx.fillStyle = `rgb(${g},${g},${g + 4})`; ctx.fillRect(r() * T, r() * T, 2, 2); }
  }, 256, [6, 6]);

  // ------------------------------------------------------------------
  // Petits objets réutilisés
  // ------------------------------------------------------------------
  function ecran(l, h2, couleur = 0x2aa8ff) {
    const g = new THREE.Group();
    g.add(place(boite(l + 0.02, h2 + 0.02, 0.012, ACIER_SOMBRE()), 0, 0, 0));
    g.add(place(boite(l, h2, 0.004, lueur(couleur, 1.5)), 0, 0, 0.008));
    return g;
  }
  function caisse(t, couleur) {
    const g = new THREE.Group();
    g.add(place(boite(t, t * 0.8, t, mat(couleur, { metalness: 0.4, roughness: 0.5 })), 0, t * 0.4, 0));
    g.add(place(boite(t + 0.004, 0.012, t + 0.004, mat(0xe0b020)), 0, t * 0.55, 0));
    return g;
  }
  function tonneau() {
    const g = new THREE.Group();
    const b = couche(cyl(0.06, 0.06, 0.15, h.materiauNoyer(0x5a3a1e, 0.8), 14));
    b.position.y = 0.065; g.add(b);
    [-0.05, 0.05].forEach((x) => { const c = couche(cyl(0.064, 0.064, 0.008, mat(0x2a2a2a, { metalness: 0.7 }), 14)); c.position.set(x, 0.065, 0); g.add(c); });
    return g;
  }
  function bouteilles(n, largeur, couleurs, lumineuses = false) {
    const g = new THREE.Group();
    for (let k = 0; k < n; k++) {
      const c = couleurs[k % couleurs.length];
      const m = lumineuses ? new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.35, roughness: 0.15 }) : mat(c, { roughness: 0.15 });
      g.add(place(cyl(0.011, 0.013, 0.06, m, 8), -largeur / 2 + (k + 0.5) * largeur / n, 0.03, 0));
    }
    return g;
  }
  function tabouret(m) {
    const g = new THREE.Group();
    g.add(place(cyl(0.008, 0.012, 0.13, ACIER(), 8), 0, 0.065, 0));
    g.add(place(cyl(0.035, 0.035, 0.015, m, 14), 0, 0.135, 0));
    return g;
  }
  function lampeSuspendue(couleur, abat = 0x1f5a2a) {
    const g = new THREE.Group();
    g.add(place(cyl(0.003, 0.003, 0.2, mat(0x111111), 4), 0, 0.42, 0));
    g.add(place(new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.05, 16, 1, true), mat(abat, { side: THREE.DoubleSide })), 0, 0.31, 0));
    g.add(place(sphere(0.016, lueur(couleur, 2.6), 8), 0, 0.295, 0));
    return g;
  }
  const neon = (texte, couleur, hauteur = 0.16) => {
    const s = texteSprite(texte, { taille: 54, hauteur, fond: 'rgba(0,0,0,0)', couleur, police: 'Limelight, Georgia, serif', poids: 400 });
    s.userData.neon = true;
    return s;
  };

  // ------------------------------------------------------------------
  // STATION AURORA-7
  // ------------------------------------------------------------------
  const STATION = {
    coursive(g, l, p) {
      // Bandes lumineuses au sol, conduites le long des parois, gyrophares
      const long = l > p;
      const L = long ? l : p, P = long ? p : l;
      const g2 = new THREE.Group(); if (!long) g2.rotation.y = Math.PI / 2; g.add(g2);
      [-1, 1].forEach((s) => {
        g2.add(place(boite(L * 0.96, 0.004, 0.02, CYAN(1.4)), 0, 0.003, s * P * 0.32));
        g2.add(place(couche(cyl(0.018, 0.018, L * 0.96, ACIER(), 10)), 0, 0.42, s * (P / 2 - 0.05)).rotateY(0));
        g2.add(place(couche(cyl(0.012, 0.012, L * 0.96, mat(0xc27c2a, { metalness: 0.6 }), 8)), 0, 0.36, s * (P / 2 - 0.05)));
      });
      for (let k = -2; k <= 2; k++) {
        const b = place(boite(0.04, 0.025, 0.04, lueur(0xff2a3a, 0.3)), k * L * 0.2, 0.52, 0);
        b.userData.alarme = true;
        g2.add(b);
      }
    },
    sas(g, l, p) {
      // Bandes de danger, écoutille, combinaisons spatiales sur leurs supports
      for (let k = 0; k < 8; k++) g.add(place(boite(l * 0.1, 0.003, 0.05, mat(k % 2 ? 0x111111 : 0xe0b020)), -l * 0.4 + k * l * 0.115, 0.002, -p * 0.38));
      const ecoutille = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.03, 10, 28), ACIER());
      ecoutille.position.set(0, 0.2, -p / 2 + 0.06); g.add(ecoutille);
      g.add(place(cyl(0.13, 0.13, 0.02, ACIER_SOMBRE(), 24).rotateX(Math.PI / 2), 0, 0.2, -p / 2 + 0.05));
      g.add(place(sphere(0.02, lueur(0xff3a3a, 2), 8), 0.2, 0.36, -p / 2 + 0.05));
      for (let k = 0; k < 3; k++) {
        const x = -l * 0.32 + k * 0.17;
        g.add(place(new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.12, 4, 10), BLANC()), x, 0.14, p * 0.32));
        g.add(place(sphere(0.045, VERRE(), 12), x, 0.29, p * 0.32));
        g.add(place(boite(0.04, 0.04, 0.02, mat(0xff8a2a)), x, 0.16, p * 0.32 - 0.05));
      }
      g.add(place(boite(0.4, 0.05, 0.1, ACIER()), l * 0.25, 0.06, p * 0.35));
    },
    hydroponie(g, l, p) {
      // Bacs de culture sous lampes violettes, réservoir d'eau
      const verts = [0x3f8f4f, 0x5aa04a, 0x2f7a3f];
      for (let r = 0; r < 3; r++) {
        const z = -p * 0.3 + r * p * 0.28;
        g.add(place(boite(l * 0.62, 0.07, 0.12, ACIER()), -l * 0.08, 0.06, z));
        g.add(place(boite(l * 0.6, 0.01, 0.1, mat(0x3a2a1a)), -l * 0.08, 0.1, z));
        for (let k = 0; k < 7; k++) g.add(place(sphere(0.035 + (k % 3) * 0.006, mat(verts[(k + r) % 3], { roughness: 1 }), 8), -l * 0.36 + k * l * 0.093, 0.13, z));
        g.add(place(boite(l * 0.6, 0.012, 0.03, lueur(0xc070ff, 2)), -l * 0.08, 0.34, z));
      }
      g.add(place(cyl(0.1, 0.1, 0.32, VERRE(), 20), l * 0.36, 0.16, p * 0.25));
      g.add(place(cyl(0.09, 0.09, 0.22, lueur(0x2a7fbf, 0.6), 20), l * 0.36, 0.11, p * 0.25));
    },
    passerelle(g, l, p) {
      // Consoles en arc face à la verrière, fauteuil du commandant, table holographique
      for (let k = 0; k < 5; k++) {
        const a = -0.9 + k * 0.45;
        const c = new THREE.Group();
        c.add(place(boite(0.24, 0.12, 0.1, ACIER_SOMBRE()), 0, 0.06, 0));
        const e = ecran(0.2, 0.08, k % 2 ? 0x2aa8ff : 0x4fd6ff); e.position.set(0, 0.17, -0.03); e.rotation.x = -0.4; c.add(e);
        c.position.set(Math.sin(a) * p * 0.36, 0, -Math.cos(a) * p * 0.36 + p * 0.05);
        c.rotation.y = -a;
        g.add(c);
      }
      const f = fauteuil(0x1e3a5a); f.position.set(0, 0, p * 0.12); f.rotation.y = Math.PI; g.add(f);
      g.add(place(cyl(0.12, 0.14, 0.1, ACIER_SOMBRE(), 24), l * 0.28, 0.05, p * 0.28));
      g.add(place(cyl(0.11, 0.11, 0.006, CYAN(1.8), 24), l * 0.28, 0.104, p * 0.28));
      g.add(place(new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 10), new THREE.MeshBasicMaterial({ color: 0x4fd6ff, wireframe: true, transparent: true, opacity: 0.7 })), l * 0.28, 0.22, p * 0.28));
    },
    laboratoire(g, l, p) {
      // Paillasses, éprouvettes lumineuses, cuve à spécimen, microscope
      [-1, 1].forEach((s) => {
        g.add(place(boite(l * 0.7, 0.14, 0.13, BLANC()), 0, 0.07, s * p * 0.32));
        g.add(place(bouteilles(9, l * 0.5, [0x4fd6ff, 0x7aff6a, 0xff4adf, 0xffd24a], true), -l * 0.05, 0.14, s * p * 0.32));
      });
      g.add(place(cyl(0.09, 0.1, 0.03, ACIER_SOMBRE(), 18), l * 0.32, 0.015, 0));
      g.add(place(cyl(0.08, 0.08, 0.3, VERRE(), 18), l * 0.32, 0.18, 0));
      g.add(place(cyl(0.07, 0.07, 0.24, lueur(0x3aff8a, 0.7), 18), l * 0.32, 0.16, 0));
      g.add(place(sphere(0.03, mat(0x2a4a2a), 8), l * 0.32, 0.18, 0));
      g.add(place(boite(0.04, 0.05, 0.05, ACIER_SOMBRE()), -l * 0.2, 0.165, -p * 0.32));
      g.add(place(cyl(0.008, 0.008, 0.07, ACIER(), 8), -l * 0.2, 0.22, -p * 0.32));
    },
    infirmerie(g, l, p) {
      // Lits, arche de scanner, armoire à pharmacie marquée d'une croix
      for (let k = 0; k < 3; k++) {
        const x = -l * 0.3 + k * l * 0.3;
        g.add(place(boite(0.14, 0.08, 0.3, BLANC()), x, 0.06, -p * 0.22));
        g.add(place(boite(0.12, 0.025, 0.06, mat(0xcfe6f2)), x, 0.11, -p * 0.22 - 0.11));
        g.add(place(boite(0.13, 0.015, 0.18, mat(0x5aa0c8)), x, 0.105, -p * 0.22 + 0.04));
      }
      const arche = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.022, 10, 24, Math.PI), BLANC());
      arche.position.set(l * 0.25, 0, p * 0.25); g.add(arche);
      g.add(place(boite(0.1, 0.05, 0.3, BLANC()), l * 0.25, 0.05, p * 0.25));
      g.add(place(new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.006, 6, 24, Math.PI), CYAN(2)), l * 0.25, 0.005, p * 0.25));
      g.add(place(boite(0.16, 0.26, 0.06, BLANC()), -l * 0.36, 0.13, p * 0.38));
      g.add(place(boite(0.06, 0.018, 0.004, lueur(0xff3a3a, 1.6)), -l * 0.36, 0.2, p * 0.38 - 0.032));
      g.add(place(boite(0.018, 0.06, 0.004, lueur(0xff3a3a, 1.6)), -l * 0.36, 0.2, p * 0.38 - 0.032));
    },
    cantine(g, l, p) {
      // Longues tables, tabourets, distributeur de rations
      [-1, 1].forEach((s) => {
        g.add(place(boite(l * 0.6, 0.015, 0.12, ACIER()), -l * 0.05, 0.12, s * p * 0.18));
        g.add(place(boite(0.02, 0.12, 0.08, ACIER_SOMBRE()), -l * 0.05, 0.06, s * p * 0.18));
        for (let k = 0; k < 4; k++) [-1, 1].forEach((c) => g.add(place(tabouret(mat(0x2a7fbf)), -l * 0.3 + k * l * 0.17, 0, s * p * 0.18 + c * 0.11)));
        for (let k = 0; k < 3; k++) g.add(place(boite(0.06, 0.006, 0.04, mat(0xb8a14a)), -l * 0.25 + k * l * 0.2, 0.13, s * p * 0.18));
      });
      g.add(place(boite(0.14, 0.32, 0.08, ACIER_SOMBRE()), l * 0.4, 0.16, -p * 0.38));
      g.add(place(boite(0.1, 0.12, 0.004, lueur(0xffb04a, 1.4)), l * 0.4, 0.22, -p * 0.38 + 0.042));
    },
    reacteur(g, l, p) {
      // Cœur du réacteur : colonne vitrée lumineuse, anneaux, conduites, rambarde
      g.add(place(cyl(0.2, 0.24, 0.08, ACIER_SOMBRE(), 28), 0, 0.04, 0));
      g.add(place(cyl(0.12, 0.12, 0.5, VERRE(), 24), 0, 0.33, 0));
      g.add(place(cyl(0.08, 0.08, 0.48, CYAN(2.6), 20), 0, 0.32, 0));
      [0.18, 0.32, 0.46].forEach((y) => { const r = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.012, 8, 32), CYAN(1.6)); r.rotation.x = Math.PI / 2; r.position.y = y; g.add(r); });
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dz]) => {
        const t = cyl(0.025, 0.025, Math.max(l, p) * 0.32, mat(0xc27c2a, { metalness: 0.6 }), 10);
        t.rotation.z = dx ? Math.PI / 2 : 0; t.rotation.x = dz ? Math.PI / 2 : 0;
        t.position.set(dx * l * 0.3, 0.1, dz * p * 0.3); g.add(t);
      });
      const rampe = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.008, 6, 40), mat(0xe0b020, { metalness: 0.5 }));
      rampe.rotation.x = Math.PI / 2; rampe.position.y = 0.16; g.add(rampe);
      for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5; g.add(place(cyl(0.005, 0.005, 0.16, ACIER(), 6), Math.cos(a) * 0.32, 0.08, Math.sin(a) * 0.32)); }
    },
    soute(g, l, p) {
      // Conteneurs empilés, fûts, drone de manutention
      const couleurs = [0xd2691e, 0x6a7a8a, 0x3a6a4a, 0xb8a14a];
      [[-0.3, -0.3], [-0.15, -0.32], [-0.3, -0.12]].forEach(([fx, fz], k) => g.add(place(caisse(0.14, couleurs[k % 4]), fx * l, 0, fz * p)));
      g.add(place(caisse(0.12, couleurs[3]), -0.3 * l, 0.112, -0.3 * p));
      for (let k = 0; k < 3; k++) g.add(place(cyl(0.045, 0.045, 0.13, mat(k % 2 ? 0x2a5a8a : 0x8a2a2a, { metalness: 0.5 }), 14), l * 0.25 + k * 0.1, 0.065, p * 0.3));
      const drone = new THREE.Group();
      drone.add(place(boite(0.12, 0.04, 0.12, ACIER_SOMBRE()), 0, 0, 0));
      [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([a, b]) => drone.add(place(cyl(0.035, 0.035, 0.006, CYAN(1.2), 14), a * 0.08, 0.02, b * 0.08)));
      drone.position.set(l * 0.1, 0.3, 0); g.add(drone);
    },
  };

  // ------------------------------------------------------------------
  // VELVET ROOM
  // ------------------------------------------------------------------
  const VELVET = {
    comptoir(g, l, p) {
      // Le bar : comptoir à rampe de laiton, tabourets, étagère de bouteilles, enseigne au néon
      const long = p > l;
      const g2 = new THREE.Group(); if (long) g2.rotation.y = Math.PI / 2; g.add(g2);
      const L = long ? p : l, P = long ? l : p;
      g2.add(place(boite(L * 0.7, 0.16, 0.1, NOYER_FONCE()), 0, 0.08, -P / 2 + 0.2));
      g2.add(place(boite(L * 0.72, 0.012, 0.13, mat(0x1a0e0a, { roughness: 0.25 })), 0, 0.166, -P / 2 + 0.2));
      g2.add(place(couche(cyl(0.006, 0.006, L * 0.7, LAITON(), 8)), 0, 0.03, -P / 2 + 0.26));
      for (let k = 0; k < 5; k++) g2.add(place(tabouret(VELOURS(0x8a1a2a)), -L * 0.28 + k * L * 0.14, 0, -P / 2 + 0.32));
      g2.add(place(boite(L * 0.6, 0.22, 0.04, NOYER()), 0, 0.2, -P / 2 + 0.04));
      [0.13, 0.22].forEach((y) => g2.add(place(bouteilles(14, L * 0.55, [0xc27c2a, 0x2a6a3a, 0x8a1a2a, 0xe0c070], true), 0, y, -P / 2 + 0.07)));
      const n = neon('VELVET', '#ff3a5a'); n.position.set(0, 0.44, -P / 2 + 0.05); g2.add(n);
      tapis(g, l * 0.5, p * 0.5, '#4a0d14', '#1a0608', '#d9a441', 0, p * 0.1);
    },
    salle_de_jeu(g, l, p) {
      // Roulette, tables de cartes au tapis vert, lampes basses
      tapis(g, l * 0.8, p * 0.8, '#5a0d18', '#22060a', '#d9a441');
      const roulette = new THREE.Group();
      roulette.add(place(boite(0.42, 0.13, 0.22, NOYER_FONCE()), 0, 0.065, 0));
      roulette.add(place(boite(0.4, 0.01, 0.2, FEUTRE()), 0, 0.135, 0));
      roulette.add(place(cyl(0.07, 0.06, 0.03, NOYER(), 24), -0.12, 0.15, 0));
      for (let k = 0; k < 8; k++) roulette.add(place(boite(0.06, 0.004, 0.006, LAITON(), 4), -0.12, 0.168, 0, k * Math.PI / 8));
      roulette.position.set(-l * 0.15, 0, -p * 0.2); g.add(roulette);
      [[l * 0.22, p * 0.15], [-l * 0.2, p * 0.25]].forEach(([x, z]) => {
        g.add(place(cyl(0.13, 0.13, 0.012, FEUTRE(), 24), x, 0.14, z));
        g.add(place(cyl(0.14, 0.14, 0.01, NOYER_FONCE(), 24), x, 0.13, z));
        g.add(place(cyl(0.02, 0.05, 0.13, NOYER_FONCE(), 10), x, 0.065, z));
        for (let k = 0; k < 4; k++) { const c = chaise(VELOURS(0x7a1a2a)); const a = k * Math.PI / 2 + 0.4; c.position.set(x + Math.cos(a) * 0.2, 0, z + Math.sin(a) * 0.2); c.rotation.y = -a - Math.PI / 2; g.add(c); }
        g.add(place(lampeSuspendue(0xffd27a), x, 0, z));
      });
    },
    scene(g, l, p) {
      // Rideaux rouges, piano à queue, micro sur pied, projecteurs
      for (let k = 0; k < 9; k++) g.add(place(boite(l * 0.105, 0.5, 0.03, VELOURS(k % 2 ? 0x8a0d1e : 0x7a0a18)), -l * 0.42 + k * l * 0.105, 0.25, -p / 2 + 0.07));
      const piano = new THREE.Group();
      const noir = mat(0x0a0a0a, { roughness: 0.15 });
      piano.add(place(boite(0.26, 0.05, 0.2, noir), 0, 0.14, 0));
      const couvercle = boite(0.24, 0.006, 0.18, noir); couvercle.position.set(0.02, 0.22, 0); couvercle.rotation.z = 0.6; piano.add(couvercle);
      piano.add(place(boite(0.24, 0.01, 0.04, mat(0xf2efe6)), 0, 0.17, 0.11));
      [[-0.1, -0.07], [0.1, -0.07], [0, 0.08]].forEach(([x, z]) => piano.add(place(cyl(0.01, 0.01, 0.12, noir, 6), x, 0.06, z)));
      piano.position.set(-l * 0.22, 0, -p * 0.05); g.add(piano);
      g.add(place(cyl(0.004, 0.004, 0.28, LAITON(), 6), l * 0.1, 0.14, p * 0.1));
      g.add(place(sphere(0.016, mat(0x222222, { metalness: 0.6 }), 8), l * 0.1, 0.29, p * 0.1));
      [-1, 1].forEach((s) => {
        const c = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.5, 18, 1, true), new THREE.MeshBasicMaterial({ color: 0xffe2a0, transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false }));
        c.position.set(s * l * 0.2, 0.3, p * 0.05); g.add(c);
      });
    },
    arriere_salle(g, l, p) {
      // Table de poker sous une lampe verte, caisses d'alcool de contrebande
      g.add(place(cyl(0.16, 0.16, 0.012, FEUTRE(), 24), 0, 0.14, 0));
      g.add(place(cyl(0.17, 0.17, 0.012, NOYER_FONCE(), 24), 0, 0.13, 0));
      g.add(place(cyl(0.03, 0.06, 0.13, NOYER_FONCE(), 10), 0, 0.065, 0));
      for (let k = 0; k < 5; k++) { const c = chaise(CUIR()); const a = k * 2 * Math.PI / 5; c.position.set(Math.cos(a) * 0.24, 0, Math.sin(a) * 0.24); c.rotation.y = -a - Math.PI / 2; g.add(c); }
      for (let k = 0; k < 6; k++) g.add(place(cyl(0.008, 0.008, 0.006 + (k % 3) * 0.006, mat([0xb3261e, 0x1a1a1a, 0xe8e2d0][k % 3]), 10), Math.cos(k) * 0.08, 0.15, Math.sin(k) * 0.08));
      g.add(place(lampeSuspendue(0xc8ffb0, 0x1f5a2a), 0, 0, 0));
      [[0.36, 0.34], [0.36, 0.2]].forEach(([fx, fz], k) => { const c = h.materiauNoyer(0x7a5a32, 0.9); g.add(place(boite(0.12, 0.09, 0.1, c), fx * l, 0.045 + k * 0, -fz * p)); });
      g.add(place(bouteilles(4, 0.1, [0xc27c2a]), l * 0.36, 0.1, -p * 0.34));
    },
    bureau_patron(g, l, p) {
      // Grand bureau, fauteuil de cuir, coffre-fort, lampe à abat-jour vert
      tapis(g, l * 0.6, p * 0.6, '#2a1c14', '#120a06', '#d9a441');
      g.add(place(table(0.4, 0.2, 0.18, NOYER_FONCE()), 0, 0, -p * 0.12));
      const f = fauteuil(0x3a1a10); f.position.set(0, 0, -p * 0.3); g.add(f);
      g.add(place(cyl(0.004, 0.012, 0.08, LAITON(), 8), 0.13, 0.22, -p * 0.12));
      g.add(place(boite(0.07, 0.025, 0.04, mat(0x1f5a2a)), 0.13, 0.27, -p * 0.12));
      g.add(place(boite(0.05, 0.004, 0.035, mat(0xf2efe6)), -0.08, 0.183, -p * 0.12));
      const coffre = new THREE.Group();
      coffre.add(place(boite(0.16, 0.2, 0.14, mat(0x2a2e2a, { metalness: 0.6, roughness: 0.4 })), 0, 0.1, 0));
      coffre.add(place(cyl(0.025, 0.025, 0.01, LAITON(), 16).rotateX(Math.PI / 2), 0, 0.12, 0.072));
      coffre.position.set(l * 0.36, 0, p * 0.3); g.add(coffre);
      g.add(place(boite(0.1, 0.26, 0.06, NOYER()), -l * 0.38, 0.13, p * 0.35));
      g.add(place(bouteilles(3, 0.08, [0xc27c2a, 0x8a1a2a]), -l * 0.38, 0.27, p * 0.35));
    },
    cave_alcool(g, l, p) {
      // Tonneaux, étagères de bouteilles, alambic de cuivre
      for (let k = 0; k < 4; k++) g.add(place(tonneau(), -l * 0.32 + k * 0.16, 0, -p * 0.32));
      g.add(place(tonneau(), -l * 0.24, 0.12, -p * 0.32));
      g.add(place(boite(l * 0.5, 0.26, 0.06, NOYER()), l * 0.12, 0.13, p * 0.38));
      [0.1, 0.19].forEach((y) => g.add(place(bouteilles(10, l * 0.45, [0x2a4a1a, 0x6a2a10, 0xc8a050]), l * 0.12, y, p * 0.36)));
      const cuivre = mat(0xb8632a, { metalness: 0.85, roughness: 0.3 });
      g.add(place(cyl(0.07, 0.09, 0.16, cuivre, 18), l * 0.3, 0.08, -p * 0.05));
      g.add(place(sphere(0.06, cuivre, 14), l * 0.3, 0.19, -p * 0.05));
      const tube = cyl(0.008, 0.008, 0.2, cuivre, 8); tube.position.set(l * 0.3 - 0.08, 0.2, -p * 0.05); tube.rotation.z = 1.2; g.add(tube);
    },
    vestiaire(g, l, p) {
      // Comptoir avec sonnette, portants de manteaux, chapeaux
      g.add(place(boite(l * 0.5, 0.14, 0.08, NOYER_FONCE()), 0, 0.07, -p * 0.05));
      g.add(place(cyl(0.012, 0.016, 0.012, LAITON(), 12), l * 0.15, 0.146, -p * 0.05));
      const couleurs = [0x2a2a3a, 0x5a2414, 0x1f3a2a, 0x4a4a4a, 0x3a1a2a];
      [-1, 1].forEach((s) => {
        const tringle = cyl(0.005, 0.005, 0.36, LAITON(), 6); tringle.rotation.x = Math.PI / 2; tringle.position.set(s * l * 0.38, 0.3, 0); g.add(tringle);
        for (let k = 0; k < 5; k++) g.add(place(boite(0.03, 0.2, 0.06, mat(couleurs[(k + (s > 0 ? 2 : 0)) % 5], { roughness: 0.9 })), s * l * 0.38, 0.19, -0.14 + k * 0.07));
      });
      for (let k = 0; k < 3; k++) {
        g.add(place(cyl(0.03, 0.03, 0.004, mat(0x1a1a1a), 14), -l * 0.15 + k * 0.08, 0.15, -p * 0.05));
        g.add(place(cyl(0.02, 0.022, 0.03, mat(0x1a1a1a), 14), -l * 0.15 + k * 0.08, 0.166, -p * 0.05));
      }
    },
    ruelle(g, l, p) {
      // Poubelles, caisses, flaques, réverbère, escalier de secours
      const zinc = mat(0x6a6e72, { metalness: 0.6, roughness: 0.5 });
      [[-0.3, -0.3], [-0.18, -0.34]].forEach(([fx, fz]) => {
        g.add(place(cyl(0.05, 0.045, 0.12, zinc, 14), fx * l, 0.06, fz * p));
        g.add(place(cyl(0.055, 0.055, 0.01, zinc, 14), fx * l, 0.125, fz * p));
      });
      g.add(place(boite(0.12, 0.09, 0.1, h.materiauNoyer(0x6a4a2a, 0.9)), l * 0.3, 0.045, -p * 0.3));
      const flaque = new THREE.MeshStandardMaterial({ color: 0x0a0a12, roughness: 0.02, metalness: 0.8 });
      [[0.05, 0.1, 0.12], [-0.2, 0.25, 0.08]].forEach(([fx, fz, r]) => g.add(place(cyl(r, r, 0.002, flaque, 18), fx * l, 0.002, fz * p)));
      g.add(place(cyl(0.008, 0.012, 0.5, mat(0x1a1a1a), 8), l * 0.35, 0.25, p * 0.3));
      g.add(place(sphere(0.03, lueur(0xffc46b, 2.4), 10), l * 0.35, 0.5, p * 0.3));
      const fer = mat(0x2a2a2a, { metalness: 0.5 });
      for (let k = 0; k < 6; k++) g.add(place(boite(0.16, 0.008, 0.04, fer), -l * 0.32, 0.05 + k * 0.07, p * 0.1 + k * 0.035));
      [-0.08, 0.08].forEach((dx) => { const r = boite(0.008, 0.45, 0.008, fer); r.position.set(-l * 0.32 + dx, 0.22, p * 0.18); r.rotation.x = -0.45; g.add(r); });
    },
  };

  // ------------------------------------------------------------------
  // Sols
  // ------------------------------------------------------------------
  function sol(id, l, p) {
    const rep = (t, n) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(Math.max(1, l * n), Math.max(1, p * n)); return t; };
    const m = (t, opts = {}) => new THREE.MeshStandardMaterial(Object.assign({ map: t, roughness: 0.5 }, opts));
    switch (id) {
      case 'coursive': return m(rep(grille('#5a6472', '#3a4250'), 1.2), { metalness: 0.5, roughness: 0.4 });
      case 'sas': return m(rep(carreaux('#4a525e', '#3e4652', 4), 1), { metalness: 0.5 });
      case 'hydroponie': return m(rep(grille('#2e3a34', '#1e2a24'), 1), { metalness: 0.3 });
      case 'passerelle': return m(rep(carreaux('#1a2438', '#141c2c', 4), 1), { metalness: 0.3, roughness: 0.3 });
      case 'laboratoire': case 'infirmerie': return m(rep(carreaux('#e8eef2', '#d0d8e0', 6), 0.6), { roughness: 0.3 });
      case 'cantine': return m(rep(carreaux('#b8c0c8', '#a0a8b2', 6), 0.6), { roughness: 0.4 });
      case 'reacteur': return m(rep(grille('#2a2f38', '#14181e'), 1.5), { metalness: 0.6, roughness: 0.4 });
      case 'soute': return m(rep(carreaux('#5a5e62', '#4a4e52', 3), 1), { metalness: 0.5 });
      case 'comptoir': return m(rep(carreaux('#1a1210', '#3a2418', 8), 0.5), { roughness: 0.3 });
      case 'salle_de_jeu': return m(rep(carreaux('#3a0a10', '#2a060a', 6), 0.6), { roughness: 0.9 });
      case 'arriere_salle': return m(rep(carreaux('#1a2a1e', '#142018', 6), 0.6), { roughness: 0.9 });
      case 'vestiaire': return m(rep(carreaux('#e8e2d4', '#1a1414', 10), 0.4), { roughness: 0.3 });
      case 'cave_alcool': return m(rep(pierre('#4a4038'), 0.7), { roughness: 1 });
      case 'ruelle': return m(rep(pierre('#3a3a40'), 1.1), { roughness: 0.6, metalness: 0.2 });
      default: return null;
    }
  }

  // ------------------------------------------------------------------
  // Extérieurs
  // ------------------------------------------------------------------
  // ctx : { scene, largeur, profondeur, entree, dansMaison }
  function espace(ctx) {
    const { scene, largeur, profondeur } = ctx;
    // Étoiles
    const r = aleatoire(11);
    const n = 1400, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = r() * 2 - 1, t = r() * Math.PI * 2, R = 26 + r() * 10;
      const s = Math.sqrt(1 - u * u);
      pos.set([R * s * Math.cos(t), R * u, R * s * Math.sin(t)], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xdfe8ff, size: 0.09, sizeAttenuation: true, fog: false })));
    // Planète et son atmosphère
    const planete = new THREE.Mesh(new THREE.SphereGeometry(7, 40, 28), new THREE.MeshStandardMaterial({ color: 0x24507a, emissive: 0x0a2240, emissiveIntensity: 0.6, roughness: 0.9, fog: false }));
    planete.position.set(-24, -12, 6); scene.add(planete);
    const atmo = new THREE.Mesh(new THREE.SphereGeometry(7.4, 40, 28), new THREE.MeshBasicMaterial({ color: 0x4fd6ff, transparent: true, opacity: 0.12, side: THREE.BackSide, fog: false }));
    atmo.position.copy(planete.position); scene.add(atmo);
    // Coque sous la station, feux de position
    scene.add(place(boite(largeur + 0.3, 0.1, profondeur + 0.3, ACIER_SOMBRE()), 0, -0.05, 0));
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, b]) => scene.add(place(sphere(0.03, lueur(a > 0 ? 0x3aff6a : 0xff3a3a, 2.4), 8), a * (largeur / 2 + 0.12), 0.02, b * (profondeur / 2 + 0.12))));
    // Panneaux solaires de part et d'autre
    [-1, 1].forEach((s) => {
      const bras = boite(1.6, 0.03, 0.05, ACIER());
      bras.position.set(s * (largeur / 2 + 0.8), 0.15, 0); scene.add(bras);
      const panneau = new THREE.MeshStandardMaterial({ map: grille('#14244a', '#4a6a9a'), metalness: 0.4, roughness: 0.3 });
      [-0.5, 0.5].forEach((dz) => { const pnl = boite(1.2, 0.012, 0.7, panneau); pnl.position.set(s * (largeur / 2 + 1.0), 0.15, dz * 1.1); scene.add(pnl); });
    });
    // Antenne
    const antenne = cyl(0.01, 0.01, 0.6, ACIER(), 6); antenne.position.set(largeur * 0.3, 0.9, -profondeur * 0.3); scene.add(antenne);
    const parabole = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 8, 0, Math.PI * 2, 0, Math.PI / 3), mat(0xdfe6ee, { side: THREE.DoubleSide }));
    parabole.position.set(largeur * 0.3, 1.2, -profondeur * 0.3); parabole.rotation.x = -0.6; scene.add(parabole);
  }

  function rue(ctx) {
    const { scene, largeur, profondeur, entree } = ctx;
    const lx = largeur + 5, lz = profondeur + 5;
    scene.add(place(boite(lx + 4, 0.04, lz + 4, new THREE.MeshStandardMaterial({ map: asphalte(), roughness: 0.55, metalness: 0.25 })), 0, -0.02, 0));
    // Trottoir autour du bâtiment
    scene.add(place(boite(largeur + 1.0, 0.03, profondeur + 1.0, mat(0x4a4a4e, { roughness: 0.9 })), 0, 0.015, 0));
    // Rue devant l'entrée, lignes jaunes
    const dz = entree && entree.sens === 'h' ? entree.dehors : 1;
    const zr = dz * (profondeur / 2 + 1.2);
    for (let k = -6; k <= 6; k++) scene.add(place(boite(0.3, 0.004, 0.04, mat(0xd8b030)), k * 0.6, 0.002, zr));
    // Immeubles voisins, fenêtres allumées au hasard
    const r = aleatoire(5);
    const briques = [brique('#5a2a20'), brique('#4a3a30'), brique('#3a2a2a')];
    const fen = lueur(0xffc46b, 1.4), fenEteinte = mat(0x101418, { roughness: 0.2 });
    const immeuble = (x, z, w, d, hh) => {
      const m = new THREE.MeshStandardMaterial({ map: briques[Math.floor(r() * 3)], roughness: 0.9 });
      scene.add(place(boite(w, hh, d, m), x, hh / 2, z));
      const face = z > 0 ? -1 : 1;
      for (let i = 0.25; i < hh - 0.1; i += 0.28) for (let j = -w / 2 + 0.15; j < w / 2 - 0.1; j += 0.22) {
        scene.add(place(boite(0.1, 0.13, 0.01, r() < 0.35 ? fen : fenEteinte), x + j, i, z + face * (d / 2 + 0.005)));
      }
    };
    for (let k = -2; k <= 2; k++) {
      immeuble(k * 1.5, -(profondeur / 2 + 1.6), 1.3, 0.8, 1.2 + r() * 1.2);
      if (Math.abs(k) > 0) immeuble(k * 1.5 + (k > 0 ? 0.4 : -0.4), zr + dz * 1.0, 1.3, 0.8, 1.0 + r() * 1.0);
    }
    // Réverbères le long du trottoir
    [-1, 1].forEach((s) => [-1, 1].forEach((t) => {
      const x = s * (largeur / 2 + 0.35), z = t * (profondeur / 2 + 0.35);
      scene.add(place(cyl(0.012, 0.016, 0.55, mat(0x1a1a1a), 8), x, 0.28, z));
      scene.add(place(sphere(0.035, lueur(0xffc46b, 2.6), 10), x, 0.56, z));
    }));
    const lampe = new THREE.PointLight(0xffb45a, 1.4, 3.4, 1.2);
    lampe.position.set(0, 0.6, dz * (profondeur / 2 + 0.5)); scene.add(lampe);
    // Voiture d'époque garée devant
    const voiture = new THREE.Group();
    const laque = mat(0x0a0a0c, { roughness: 0.2, metalness: 0.5 });
    voiture.add(place(boite(0.5, 0.1, 0.2, laque), 0, 0.09, 0));
    voiture.add(place(boite(0.24, 0.09, 0.18, laque), -0.04, 0.18, 0));
    voiture.add(place(boite(0.2, 0.06, 0.182, new THREE.MeshStandardMaterial({ color: 0x1a2a3a, roughness: 0.1 })), -0.04, 0.19, 0));
    [[-0.17, 1], [0.17, 1], [-0.17, -1], [0.17, -1]].forEach(([x, s]) => { const w = cyl(0.045, 0.045, 0.03, mat(0x111111), 14); w.rotation.x = Math.PI / 2; w.position.set(x, 0.045, s * 0.1); voiture.add(w); });
    [-1, 1].forEach((s) => voiture.add(place(sphere(0.018, lueur(0xfff0c0, 2), 8), 0.25, 0.11, s * 0.07)));
    voiture.position.set(largeur * 0.25, 0.03, zr - dz * 0.35); scene.add(voiture);
    // Enseigne au néon au-dessus de l'entrée
    if (entree) {
      const n = neon('VELVET ROOM', '#ff3a5a', 0.34);
      n.position.copy(entree.pos).setY(0.95);
      n.position.z += (entree.sens === 'h' ? entree.dehors : 0) * 0.12;
      n.position.x += (entree.sens === 'v' ? entree.dehors : 0) * 0.12;
      scene.add(n);
    }
  }

  return {
    MOBILIER: Object.assign({}, STATION, VELVET),
    sol,
    EXTERIEURS: { espace, rue },
    textures: { brique, panneaux },
  };
}
