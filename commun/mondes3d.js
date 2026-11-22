// =====================================================================
// Les mondes 3D de La Tournée : chaque plateau devient une petite île en
// maquette (relief, eau ou lave, bâtiments, végétation) que le chemin de
// cases traverse. Tout est fabriqué ici en formes simples (style « low
// poly ») : aucun fichier à charger, léger pour un téléphone.
//
//   const monde = creerMonde(THREE, 'terrasse', cases, { leger });
//   scene.add(monde.groupe);   // et dans la boucle : monde.animer(t, dt)
//   monde.ambiance : { ciel, brouillard, lumiere, intensite, hemi: [ciel, sol, intensite] }
//   monde.bornes : points à garder dans le cadre ([[x, y, z], ...])
//
// cases : [{ x, z, suivants: [id...] }] en mètres (déjà mis à l'échelle).
// Le dessus de l'île est à y = 0 : les cases et les pions s'y posent.
// =====================================================================

// Générateur déterministe : le même monde chez tout le monde.
function aleatoire(graine) {
  let a = graine >>> 0 || 1;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Distance d'un point à un segment (dans le plan x, z).
function distSegment(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const l2 = dx * dx + dz * dz || 1e-6;
  const u = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l2));
  return Math.hypot(px - (ax + u * dx), pz - (az + u * dz));
}

// Les trois mondes, dans l'univers du bar : le port ensoleillé (facile), la
// ville de nuit (moyen), les caves volcaniques aux fûts géants (difficile).
export const THEMES_MONDES = {
  terrasse: 'port',
  pub: 'ville',
  cave: 'volcan',
};

export function creerMonde(THREE, idPlateau, cases, { leger = false } = {}) {
  const theme = THEMES_MONDES[idPlateau] || 'port';
  const rng = aleatoire([...idPlateau].reduce((h, c) => h * 31 + c.charCodeAt(0), 7));
  const groupe = new THREE.Group();
  const animations = [];   // fonctions (t, dt)
  const mats = {};
  const mat = (couleur, opts = {}) => {
    const cle = couleur + JSON.stringify(opts);
    if (!mats[cle]) mats[cle] = new THREE.MeshStandardMaterial(Object.assign({ color: couleur, roughness: 0.85, flatShading: true, envMapIntensity: 0.3 }, opts));
    return mats[cle];
  };
  const ombre = (m, recoit = false) => { if (!leger) { m.castShadow = true; m.receiveShadow = recoit; } return m; };
  const maille = (geo, couleur, opts) => ombre(new THREE.Mesh(geo, (couleur instanceof THREE.Material || Array.isArray(couleur)) ? couleur : mat(couleur, opts)));

  // --- Les segments du chemin (pour laisser la place aux cases) ---
  const segments = [];
  cases.forEach(c => c.suivants.forEach(s => { const b = cases[s]; if (b) segments.push([c.x, c.z, b.x, b.z]); }));
  const distChemin = (x, z) => segments.reduce((m, [ax, az, bx, bz]) => Math.min(m, distSegment(x, z, ax, az, bx, bz)), Infinity);

  // --- La forme de l'île : englobe toutes les cases, avec une côte irrégulière ---
  const N = 64;
  const rayons = [];
  for (let k = 0; k < N; k++) {
    const a = k / N * Math.PI * 2;
    let r = 0.6;
    cases.forEach(c => {
      const ac = Math.atan2(c.z, c.x), rc = Math.hypot(c.x, c.z);
      let d = Math.abs(ac - a); d = Math.min(d, Math.PI * 2 - d);
      if (d < 0.5) r = Math.max(r, rc * Math.cos(d) + 0.0);
    });
    rayons.push(r + 0.5 + Math.sin(a * 3 + rng() * 0.6) * 0.06 + rng() * 0.08);
  }
  // Lissage de la côte.
  const cote = rayons.map((r, k) => (rayons[(k + N - 1) % N] + r * 2 + rayons[(k + 1) % N]) / 4);
  const rayonIle = (a) => {
    const u = ((a / (Math.PI * 2)) % 1 + 1) % 1 * N, k = Math.floor(u), f = u - k;
    return cote[k % N] * (1 - f) + cote[(k + 1) % N] * f;
  };
  const dansIle = (x, z, marge = 0) => Math.hypot(x, z) < rayonIle(Math.atan2(z, x)) - marge;
  const rMax = Math.max(...cote);

  // Le bloc de l'île (dessus à y = 0, flancs vers le bas).
  const forme = new THREE.Shape();
  cote.forEach((r, k) => {
    const a = k / N * Math.PI * 2;
    const x = Math.cos(a) * r, y = -Math.sin(a) * r;
    if (k === 0) forme.moveTo(x, y); else forme.lineTo(x, y);
  });
  const EPAIS = theme === 'volcan' ? 0.6 : 0.45;
  const geoIle = new THREE.ExtrudeGeometry(forme, { depth: EPAIS, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.05, bevelSegments: 1 });
  geoIle.rotateX(-Math.PI / 2);
  geoIle.translate(0, -EPAIS - 0.042, 0);   // le dessus du biseau affleure y = 0

  const P = {
    port: { dessus: 0xeed39a, flanc: 0xb8946a, chemin: 0xa8784a, eau: 0x1e9fc8, ciel: 0x7cc8f0, brume: 0xa8dcf4, lumiere: 0xfff0d0, intensite: 3.0, hemi: [0xcfefff, 0xe8d09a, 1.0] },
    ville: { dessus: 0x5a5e72, flanc: 0x7a4034, chemin: 0xa89e8e, eau: 0x1a3060, ciel: 0x0a0e2a, brume: 0x141a3e, lumiere: 0xb8c4ff, intensite: 2.3, hemi: [0x5a6aaa, 0x2a2030, 1.0] },
    volcan: { dessus: 0x3e3438, flanc: 0x221a1e, chemin: 0x7a6a60, eau: 0xff5a14, ciel: 0x1a0c08, brume: 0x2a1008, lumiere: 0xffa070, intensite: 2.2, hemi: [0x6a3030, 0xff5a14, 0.7] },
  }[theme];

  const ile = new THREE.Mesh(geoIle, [mat(P.dessus), mat(P.flanc)]);
  ile.receiveShadow = !leger;
  groupe.add(ile);
  // Un rebord plus large sous l'île : la plage du port, le quai de la ville,
  // l'éboulis des caves.
  {
    const g = new THREE.ExtrudeGeometry(forme, { depth: 0.08, bevelEnabled: true, bevelThickness: 0, bevelSize: theme === 'port' ? 0.32 : 0.12, bevelSegments: 1 });
    g.rotateX(-Math.PI / 2);
    g.translate(0, (theme === 'volcan' ? -0.34 : -0.27), 0);
    const rebord = new THREE.Mesh(g, mat({ port: 0xf6e2b0, ville: 0x5a5a66, volcan: 0x2a2024 }[theme]));
    rebord.receiveShadow = !leger;
    groupe.add(rebord);
  }

  // --- La route : des dalles entre les cases ---
  const matRoute = mat(P.chemin);
  segments.forEach(([ax, az, bx, bz]) => {
    const d = Math.hypot(bx - ax, bz - az);
    if (d < 0.01) return;
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.012, d), matRoute);
    r.position.set((ax + bx) / 2, 0.002, (az + bz) / 2);
    r.rotation.y = Math.atan2(bx - ax, bz - az);
    r.receiveShadow = !leger;
    groupe.add(r);
  });

  // --- Ce qui entoure l'île : la mer, l'eau du port de nuit, la lave ---
  const segEau = leger ? 24 : 48;
  const geoEau = new THREE.PlaneGeometry(30, 30, segEau, segEau);
  geoEau.rotateX(-Math.PI / 2);
  const niveau = theme === 'volcan' ? -0.3 : -0.22;
  const eauMat = theme === 'volcan'
    ? new THREE.MeshBasicMaterial({ vertexColors: true })
    : new THREE.MeshStandardMaterial({ color: P.eau, roughness: theme === 'ville' ? 0.15 : 0.3, metalness: theme === 'ville' ? 0.4 : 0.05, flatShading: true });
  eauMat.envMapIntensity = 0;   // pas de reflets du studio : l'eau reste de sa couleur
  const eau = new THREE.Mesh(geoEau, eauMat);
  eau.position.y = niveau;
  groupe.add(eau);
  {
    const base = geoEau.attributes.position.array.slice();
    const pos = geoEau.attributes.position;
    const amp = theme === 'ville' ? 0.012 : 0.025;
    const couleurs = theme === 'volcan' ? new THREE.BufferAttribute(new Float32Array(pos.count * 3), 3) : null;
    if (couleurs) geoEau.setAttribute('color', couleurs);
    let compte = 0;
    animations.push((t) => {
      if (leger && (compte++ % 3)) return;
      for (let i = 0; i < pos.count; i++) {
        const x = base[i * 3], z = base[i * 3 + 2];
        pos.array[i * 3 + 1] = Math.sin(x * 2.1 + t * 1.4) * amp + Math.cos(z * 1.7 + t * 1.1) * amp;
      }
      pos.needsUpdate = true;
      if (theme === 'volcan') {
        // La lave : une croûte sombre qui se fend sur des veines brillantes, qui glissent lentement.
        for (let i = 0; i < pos.count; i++) {
          const x = base[i * 3], z = base[i * 3 + 2];
          const v = Math.sin(x * 2.6 + t * 0.35) * Math.cos(z * 2.2 - t * 0.28) + Math.sin((x + z) * 4.1 + t * 0.6) * 0.35;
          const f = Math.max(0, Math.min(1, 1 - Math.abs(v) * 2.2));
          couleurs.array[i * 3] = 0.16 + f * 0.84;
          couleurs.array[i * 3 + 1] = 0.03 + f * f * 0.42;
          couleurs.array[i * 3 + 2] = 0.01 + f * f * 0.05;
        }
        couleurs.needsUpdate = true;
      } else geoEau.computeVertexNormals();
    });
  }

  // --- Les objets du décor ---
  // Une place libre : sur l'île, loin du chemin et des autres objets.
  const poses = [];
  const interdits = [];   // zones à garder vides (le canal de la ville) : (x, z, rayon) => vrai si interdit
  const libre = (x, z, rayon, marge = 0.12) => dansIle(x, z, rayon * 0.6 + 0.04) && distChemin(x, z) > rayon + marge && poses.every(([px, pz, pr]) => Math.hypot(px - x, pz - z) > pr + rayon) && !interdits.some(f => f(x, z, rayon));
  const placer = (obj, x, z, rayon, angle = rng() * Math.PI * 2) => {
    obj.position.set(x, 0, z);
    obj.rotation.y = angle;
    groupe.add(obj);
    poses.push([x, z, rayon]);
    return obj;
  };
  // Le meilleur endroit pour un grand bâtiment : le plus loin possible du chemin.
  const meilleurePlace = (rayonVoulu) => {
    let best = null;
    for (let x = -rMax; x <= rMax; x += 0.08) {
      for (let z = -rMax; z <= rMax; z += 0.08) {
        if (!dansIle(x, z, 0.12)) continue;
        if (poses.some(([px, pz, pr]) => Math.hypot(px - x, pz - z) < pr + 0.1) || interdits.some(f => f(x, z, 0.15))) continue;
        const d = Math.min(distChemin(x, z) - 0.1, rayonIle(Math.atan2(z, x)) - Math.hypot(x, z) - 0.05);
        if (!best || d > best.d) best = { x, z, d };
      }
    }
    if (!best || best.d < 0.08) return null;
    return { x: best.x, z: best.z, echelle: Math.min(1, best.d / rayonVoulu) };
  };
  const semer = (fabrique, nombre, rayon, essais = 40) => {
    for (let n = 0; n < nombre; n++) {
      for (let e = 0; e < essais; e++) {
        const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * rMax;
        const x = Math.cos(a) * r, z = Math.sin(a) * r;
        if (libre(x, z, rayon)) { placer(fabrique(), x, z, rayon); break; }
      }
    }
  };
  // Objets posés dans l'eau / le désert autour de l'île.
  const autour = (fabrique, nombre, de, a) => {
    for (let n = 0; n < nombre; n++) {
      const ang = rng() * Math.PI * 2, r = rMax + de + rng() * (a - de);
      const o = fabrique();
      o.position.set(Math.cos(ang) * r, niveau, Math.sin(ang) * r);
      o.rotation.y = rng() * Math.PI * 2;
      groupe.add(o);
    }
  };
  const nb = (n) => Math.round(n * (leger ? 0.5 : 1));

  // ===================== PORT =====================
  const palmier = () => {
    const g = new THREE.Group();
    const h = 0.32 + rng() * 0.16, pench = (rng() - 0.5) * 0.5;
    const tronc = mat(0x8a6038);
    for (let k = 0; k < 5; k++) {
      const s = maille(new THREE.CylinderGeometry(0.018 - k * 0.002, 0.022 - k * 0.002, h / 5 + 0.005, 6), tronc);
      s.position.set(pench * (k / 5) ** 2 * 0.3, h / 10 + k * h / 5, 0);
      s.rotation.z = -pench * k * 0.12;
      g.add(s);
    }
    const sommet = new THREE.Vector3(pench * 0.3 * 0.64, h, 0);
    const vert = mat(0x2f9a3a);
    for (let k = 0; k < 6; k++) {
      const f = maille(new THREE.ConeGeometry(0.035, 0.22, 4), vert);
      f.scale.set(1, 1, 0.25);
      f.position.copy(sommet);
      f.rotation.set(0, k / 6 * Math.PI * 2, Math.PI / 2 - 0.5);
      f.translateY(0.1);
      g.add(f);
    }
    const noix = maille(new THREE.SphereGeometry(0.02, 6, 4), 0x5a3a1a);
    noix.position.copy(sommet).add(new THREE.Vector3(0, -0.02, 0));
    g.add(noix);
    return g;
  };
  const parasol = () => {
    const g = new THREE.Group();
    const c = [0xe8323a, 0x2a7ad8, 0xffc23a, 0x3ab06a][Math.floor(rng() * 4)];
    const mat1 = maille(new THREE.CylinderGeometry(0.006, 0.006, 0.2, 5), 0xeeeeee);
    mat1.position.y = 0.1;
    const toile = maille(new THREE.ConeGeometry(0.11, 0.05, 8), c);
    toile.position.y = 0.21;
    const serviette = maille(new THREE.BoxGeometry(0.07, 0.004, 0.13), [0xffffff, 0xff8ac8, 0x8ad8ff][Math.floor(rng() * 3)]);
    serviette.position.set(0.08, 0.003, 0);
    g.add(mat1, toile, serviette);
    return g;
  };
  const paillote = () => {
    const g = new THREE.Group();
    const bambou = mat(0xc8a060), paille = mat(0xe0b860);
    const base = maille(new THREE.CylinderGeometry(0.2, 0.2, 0.12, 10), 0x9a6a3a);
    base.position.y = 0.06;
    const comptoir = maille(new THREE.CylinderGeometry(0.23, 0.23, 0.02, 10), 0x6a4020);
    comptoir.position.y = 0.13;
    g.add(base, comptoir);
    for (let k = 0; k < 6; k++) {
      const p = maille(new THREE.CylinderGeometry(0.01, 0.01, 0.28, 5), bambou);
      const a = k / 6 * Math.PI * 2;
      p.position.set(Math.cos(a) * 0.21, 0.14, Math.sin(a) * 0.21);
      g.add(p);
    }
    const toit = maille(new THREE.ConeGeometry(0.34, 0.2, 10), paille);
    toit.position.y = 0.37;
    g.add(toit);
    // Des verres colorés sur le comptoir.
    for (let k = 0; k < 5; k++) {
      const v = maille(new THREE.CylinderGeometry(0.012, 0.009, 0.03, 6), [0xff6a3a, 0x3ad8ff, 0xffe03a, 0xff3a9a, 0x9aff3a][k]);
      const a = k / 5 * Math.PI * 2 + 0.3;
      v.position.set(Math.cos(a) * 0.2, 0.155, Math.sin(a) * 0.2);
      g.add(v);
    }
    // Torches tiki.
    [-1, 1].forEach(s => {
      const t = maille(new THREE.CylinderGeometry(0.008, 0.01, 0.22, 5), 0x6a4020);
      t.position.set(s * 0.32, 0.11, 0.18);
      const fl = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.05, 6), new THREE.MeshBasicMaterial({ color: 0xffa020 }));
      fl.position.set(s * 0.32, 0.25, 0.18);
      g.add(t, fl);
      animations.push((tt) => { fl.scale.y = 1 + Math.sin(tt * 12 + s * 3) * 0.25; });
    });
    return g;
  };
  const phare = () => {
    const g = new THREE.Group();
    for (let k = 0; k < 5; k++) {
      const s = maille(new THREE.CylinderGeometry(0.07 - k * 0.008, 0.075 - k * 0.008, 0.11, 10), k % 2 ? 0xffffff : 0xd8323a);
      s.position.y = 0.055 + k * 0.11;
      g.add(s);
    }
    const lampe = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.06, 8), new THREE.MeshBasicMaterial({ color: 0xfff2a0 }));
    lampe.position.y = 0.6;
    const toit = maille(new THREE.ConeGeometry(0.06, 0.06, 8), 0x2a2a2a);
    toit.position.y = 0.66;
    const faisceau = new THREE.Mesh(new THREE.ConeGeometry(0.12, 1.2, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff2a0, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }));
    faisceau.rotation.z = Math.PI / 2;
    faisceau.position.x = 0.6;
    const pivot = new THREE.Group();
    pivot.position.y = 0.6;
    pivot.add(faisceau);
    g.add(lampe, toit, pivot);
    animations.push((t) => { pivot.rotation.y = t * 0.9; });
    return g;
  };
  const bateau = () => {
    const g = new THREE.Group();
    const coque = maille(new THREE.BoxGeometry(0.22, 0.05, 0.08), [0xffffff, 0xd8323a, 0x2a6ad8][Math.floor(rng() * 3)]);
    coque.position.y = 0.03;
    const mat2 = maille(new THREE.CylinderGeometry(0.005, 0.005, 0.2, 4), 0x8a6038);
    mat2.position.y = 0.14;
    const voile = maille(new THREE.ConeGeometry(0.06, 0.16, 3), 0xfff8e8);
    voile.scale.z = 0.1;
    voile.position.set(0.03, 0.15, 0);
    g.add(coque, mat2, voile);
    const ph = rng() * 6;
    animations.push((t) => { g.position.y = niveau + Math.sin(t * 1.6 + ph) * 0.015; g.rotation.z = Math.sin(t * 1.2 + ph) * 0.06; });
    return g;
  };
  const rocher = (c) => () => {
    const r = maille(new THREE.DodecahedronGeometry(0.05 + rng() * 0.05, 0), c);
    r.scale.y = 0.6;
    r.position.y = 0.02;
    const g = new THREE.Group();
    g.add(r);
    return g;
  };


  const herbe = () => {
    const g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.CircleGeometry(0.09 + rng() * 0.07, 7), mat(0x7ab84a));
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.003;
    m.scale.set(1, 0.6 + rng() * 0.5, 1);
    m.receiveShadow = !leger;
    g.add(m);
    for (let k = 0; k < 3; k++) {
      const b = maille(new THREE.ConeGeometry(0.012, 0.04, 4), 0x5a9a3a);
      b.position.set((rng() - 0.5) * 0.1, 0.02, (rng() - 0.5) * 0.06);
      g.add(b);
    }
    return g;
  };
  // Une maison du port : murs colorés, toit en pente.
  const maisonPort = () => {
    const g = new THREE.Group();
    const l = 0.12 + rng() * 0.05, p = 0.11, h = 0.1 + rng() * 0.08;
    const corps = maille(new THREE.BoxGeometry(l, h, p), [0xf2a0a0, 0xa0d0f2, 0xf2e0a0, 0xffffff, 0xb8f2a0, 0xf2c0e0][Math.floor(rng() * 6)]);
    corps.position.y = h / 2;
    const toit = maille(new THREE.CylinderGeometry(0.0001, p * 0.62, l * 1.08, 3), [0xc8502a, 0x2a5aa8, 0x8a3a2a][Math.floor(rng() * 3)]);
    toit.rotation.z = Math.PI / 2;
    toit.rotation.y = Math.PI / 2;
    toit.rotation.order = 'YZX';
    toit.position.y = h + p * 0.27;
    toit.scale.set(1, 1, 0.75);
    const porte = maille(new THREE.BoxGeometry(0.03, 0.05, 0.005), 0x5a3a20);
    porte.position.set(0, 0.025, p / 2 + 0.003);
    g.add(corps, toit, porte);
    for (const sx of [-1, 1]) {
      const f = maille(new THREE.BoxGeometry(0.022, 0.022, 0.004), 0x2a4a6a);
      f.position.set(sx * l * 0.28, h * 0.62, p / 2 + 0.003);
      g.add(f);
    }
    return g;
  };
  // Le quai : un ponton de bois qui part de la côte vers la mer, des bateaux amarrés.
  const quai = (a) => {
    const r0 = rayonIle(a) - 0.05, lg = 0.75;
    const g = new THREE.Group();
    const planches = maille(new THREE.BoxGeometry(0.12, 0.02, lg), 0x9a6a3a);
    planches.position.set(0, -0.012, lg / 2);
    g.add(planches);
    for (let k = 0; k < 5; k++) for (const sx of [-1, 1]) {
      const pieu = maille(new THREE.CylinderGeometry(0.008, 0.008, 0.3, 5), 0x5a3a20);
      pieu.position.set(sx * 0.06, -0.15, 0.08 + k * lg / 5);
      g.add(pieu);
    }
    g.position.set(Math.cos(a) * r0, 0, Math.sin(a) * r0);
    g.rotation.y = Math.PI / 2 - a;
    groupe.add(g);
    // Deux bateaux amarrés de part et d'autre.
    [-1, 1].forEach((sx, k) => {
      const b = bateau();
      const loc = new THREE.Vector3(sx * 0.17, 0, 0.35 + k * 0.2).applyAxisAngle(new THREE.Vector3(0, 1, 0), g.rotation.y);
      b.position.set(g.position.x + loc.x, niveau, g.position.z + loc.z);
      b.rotation.y = g.rotation.y + Math.PI / 2;
      groupe.add(b);
    });
  };

  // ===================== VILLE DE NUIT =====================
  // Les fenêtres allumées : une texture de façade, dessinée une fois.
  const texFacade = (() => {
    const c = document.createElement('canvas');
    c.width = 64; c.height = 128;
    const x = c.getContext('2d');
    x.fillStyle = '#1a1a26'; x.fillRect(0, 0, 64, 128);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 8; j++) {
      x.fillStyle = rng() < 0.55 ? ['#ffd88a', '#ffe8b0', '#ffb860'][Math.floor(rng() * 3)] : '#262636';
      x.fillRect(5 + i * 15, 6 + j * 15, 9, 9);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  })();
  const facades = [0x9a7a7a, 0x7a7a9a, 0x8a8a8a, 0x9a8a6a].map(c => new THREE.MeshStandardMaterial({ color: c, map: texFacade, emissive: 0xffffff, emissiveMap: texFacade, emissiveIntensity: 0.85, roughness: 0.8 }));
  const immeuble = () => {
    const g = new THREE.Group();
    const l = 0.11 + rng() * 0.07, p = 0.11 + rng() * 0.05, h = 0.12 + rng() * 0.2;
    const facade = facades[Math.floor(rng() * facades.length)];
    const toitMat = mat(0x2a2a34);
    const geo = new THREE.BoxGeometry(l, h, p);
    // Les fenêtres gardent leur taille : on étire les coordonnées de texture.
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * l / 0.12, uv.getY(i) * h / 0.24);
    const corps = maille(geo, [facade, facade, toitMat, toitMat, facade, facade]);
    corps.position.y = h / 2;
    g.add(corps);
    if (rng() < 0.4) {
      const ant = maille(new THREE.CylinderGeometry(0.003, 0.003, 0.08, 4), 0x444444);
      ant.position.set(l * 0.2, h + 0.04, 0);
      const feu = new THREE.Mesh(new THREE.SphereGeometry(0.008, 6, 4), new THREE.MeshBasicMaterial({ color: 0xff3030 }));
      feu.position.set(l * 0.2, h + 0.085, 0);
      g.add(ant, feu);
      const ph = rng() * 6;
      animations.push((t) => { feu.visible = Math.sin(t * 3 + ph) > 0; });
    }
    return g;
  };
  const texNeon = (texte, couleur) => {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 96;
    const x = c.getContext('2d');
    x.font = 'bold 64px Georgia, serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.shadowColor = couleur; x.shadowBlur = 18;
    x.strokeStyle = couleur; x.lineWidth = 5; x.strokeText(texte, 128, 50);
    x.fillStyle = '#ffffff'; x.fillText(texte, 128, 50);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  const enseigneNeon = (texte, couleur, largeur) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(largeur, largeur * 0.375), new THREE.MeshBasicMaterial({ map: texNeon(texte, couleur), transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    const ph = rng() * 10;
    animations.push((t) => { m.material.opacity = Math.sin(t * 17 + ph) > 0.97 ? 0.3 : 1; });
    return m;
  };
  const pub = () => {
    const g = new THREE.Group();
    const l = 0.34, p = 0.24, h = 0.2;
    const corps = maille(new THREE.BoxGeometry(l, h, p), 0x3a2a1e);
    corps.position.y = h / 2;
    const toit = maille(new THREE.BoxGeometry(l * 1.08, 0.025, p * 1.08), 0x1e1612);
    toit.position.y = h + 0.012;
    const vitrine = new THREE.Mesh(new THREE.PlaneGeometry(l * 0.7, h * 0.4), new THREE.MeshBasicMaterial({ color: 0xffb860 }));
    vitrine.position.set(0, h * 0.35, p / 2 + 0.002);
    const neon = enseigneNeon('PUB', '#ff3ab0', l * 1.1);
    neon.position.set(0, h + 0.1, p / 2 - 0.02);
    const neon2 = enseigneNeon('BAR', '#3ae0ff', l * 0.6);
    neon2.position.set(0, h + 0.07, -p / 2 + 0.02);
    neon2.rotation.y = Math.PI;
    g.add(corps, toit, vitrine, neon, neon2);
    // Des tables en terrasse devant la porte.
    for (const sx of [-1, 1]) {
      const t = maille(new THREE.CylinderGeometry(0.025, 0.025, 0.04, 8), 0x8a6a4a);
      t.position.set(sx * 0.1, 0.02, p / 2 + 0.07);
      g.add(t);
    }
    return g;
  };
  const lampadaire = () => {
    const g = new THREE.Group();
    const p = maille(new THREE.CylinderGeometry(0.004, 0.006, 0.2, 5), 0x2a2a2a);
    p.position.y = 0.1;
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe2a0 }));
    l.position.y = 0.205;
    const halo = new THREE.Mesh(new THREE.CircleGeometry(0.09, 16), new THREE.MeshBasicMaterial({ color: 0xffd890, transparent: true, opacity: 0.22, depthWrite: false }));
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = 0.004;
    g.add(p, l, halo);
    return g;
  };
  // Le canal qui traverse la ville : de l'eau sombre, et un pont à chaque
  // endroit où le chemin le franchit.
  const canal = () => {
    const ang = 0.35;   // direction du canal
    const ux = Math.cos(ang), uz = Math.sin(ang), nx = -uz, nz = ux, LARG = 0.2;
    const dCanal = (x, z) => Math.abs(x * nx + z * nz);
    interdits.push((x, z, r) => dCanal(x, z) < LARG / 2 + r + 0.03);
    const eauCanal = new THREE.MeshStandardMaterial({ color: 0x1a3a6a, roughness: 0.1, metalness: 0.5, emissive: 0x0a1a3a, emissiveIntensity: 0.6 });
    const bordMat = mat(0x6a6a74);
    for (let s = -rMax - 0.3; s < rMax + 0.3; s += 0.06) {
      const x = ux * s, z = uz * s;
      if (!dansIle(x, z, 0.02)) continue;
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.004, LARG), eauCanal);
      m.position.set(x, 0.0035, z);
      m.rotation.y = -ang;
      groupe.add(m);
      for (const sd of [-1, 1]) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.012, 0.018), bordMat);
        b.position.set(x + nx * sd * (LARG / 2 + 0.009), 0.006, z + nz * sd * (LARG / 2 + 0.009));
        b.rotation.y = -ang;
        groupe.add(b);
      }
    }
    // Les ponts : là où un segment du chemin coupe l'axe du canal.
    segments.forEach(([ax, az, bx, bz]) => {
      const da = ax * nx + az * nz, db = bx * nx + bz * nz;
      if (da * db > 0) return;
      const u = da / (da - db);
      const x = ax + (bx - ax) * u, z = az + (bz - az) * u;
      if (!dansIle(x, z, 0.02)) return;
      const rot = Math.atan2(bx - ax, bz - az);
      const pont = new THREE.Group();
      const tablier = maille(new THREE.BoxGeometry(0.19, 0.02, LARG + 0.08), 0x8a7a6a);
      tablier.position.y = 0.012;
      pont.add(tablier);
      for (const sx of [-1, 1]) {
        const garde = maille(new THREE.BoxGeometry(0.012, 0.035, LARG + 0.08), 0x5a4a40);
        garde.position.set(sx * 0.095, 0.035, 0);
        pont.add(garde);
      }
      pont.position.set(x, 0, z);
      pont.rotation.y = rot;
      groupe.add(pont);
    });
    // Une petite barque qui descend le canal.
    const barque = maille(new THREE.BoxGeometry(0.1, 0.025, 0.045), 0x8a5a34);
    const lanterne = new THREE.Mesh(new THREE.SphereGeometry(0.01, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffd060 }));
    const b = new THREE.Group();
    b.add(barque, lanterne);
    lanterne.position.set(0.04, 0.03, 0);
    groupe.add(b);
    animations.push((t) => {
      const s = ((t * 0.12) % 2) * (rMax + 0.3) - (rMax + 0.3);
      b.position.set(ux * s, 0.015, uz * s);
      b.rotation.y = -ang;
      b.visible = dansIle(b.position.x, b.position.z, 0.03);
    });
  };
  // Le ciel étoilé et la lune.
  const ciel = () => {
    const n = leger ? 150 : 400;
    const pos = new Float32Array(n * 3);
    for (let k = 0; k < n; k++) {
      const a = rng() * Math.PI * 2, h = 0.15 + rng() * 0.85, r = 14;
      pos[k * 3] = Math.cos(a) * r * Math.sqrt(1 - h * h); pos[k * 3 + 1] = h * r; pos[k * 3 + 2] = Math.sin(a) * r * Math.sqrt(1 - h * h);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    groupe.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 0.05, fog: false })));
    const lune = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 12), new THREE.MeshBasicMaterial({ color: 0xfff4d0, fog: false }));
    lune.position.set(-7, 4.5, -13);
    lune.scale.setScalar(0.8);
    groupe.add(lune);
  };

  // ===================== CAVES VOLCANIQUES =====================
  // Les fûts géants : une pyramide de tonneaux et un robinet qui verse la bière.
  const futs = () => {
    const g = new THREE.Group();
    const fut = (r, x, y, z) => {
      const corps = maille(new THREE.CylinderGeometry(r, r, r * 2.1, 14), 0x8a5428);
      corps.rotation.x = Math.PI / 2;
      corps.position.set(x, y, z);
      g.add(corps);
      for (const dz of [-0.6, 0.6]) {
        const c = maille(new THREE.TorusGeometry(r * 1.01, r * 0.06, 4, 16), 0x2a2a2a);
        c.position.set(x, y, z + dz * r);
        g.add(c);
      }
      const fond = maille(new THREE.CircleGeometry(r * 0.95, 14), 0xa8703a);
      fond.position.set(x, y, z + r * 1.06);
      g.add(fond);
    };
    const R = 0.11;
    fut(R, -R * 1.05, R, 0); fut(R, R * 1.05, R, 0); fut(R, 0, R * 2.8, 0);
    // Le robinet de cuivre et le filet de bière (qui coule en boucle).
    const robinet = maille(new THREE.CylinderGeometry(0.012, 0.012, 0.06, 6), 0xd8a040, { metalness: 0.8, roughness: 0.3 });
    robinet.rotation.x = Math.PI / 2;
    robinet.position.set(0, R * 2.6, R * 1.25);
    const filet = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1, 6), new THREE.MeshBasicMaterial({ color: 0xffc23a, transparent: true, opacity: 0.85 }));
    const chope = maille(new THREE.CylinderGeometry(0.03, 0.028, 0.06, 10), 0xe8f0f4, { transparent: true, opacity: 0.6 });
    chope.position.set(0, 0.03, R * 1.55);
    const mousse = maille(new THREE.CylinderGeometry(0.029, 0.029, 0.01, 10), 0xfff6e0);
    mousse.position.set(0, 0.06, R * 1.55);
    g.add(robinet, filet, chope, mousse);
    const hautF = R * 2.6, basF = 0.06;
    filet.scale.y = hautF - basF;
    filet.position.set(0, (hautF + basF) / 2, R * 1.55);
    animations.push((t) => { filet.scale.x = filet.scale.z = 1 + Math.sin(t * 20) * 0.15; mousse.scale.y = 1 + Math.sin(t * 6) * 0.3; });
    return g;
  };
  const fissures = () => {
    for (let k = 0; k < (leger ? 6 : 12); k++) {
      for (let e = 0; e < 30; e++) {
        const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * rMax;
        const x = Math.cos(a) * r, z = Math.sin(a) * r;
        if (!dansIle(x, z, 0.1) || distChemin(x, z) < 0.14) continue;
        const f = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.003, 0.1 + rng() * 0.15), new THREE.MeshBasicMaterial({ color: 0xff6a1a }));
        f.position.set(x, 0.002, z);
        f.rotation.y = rng() * Math.PI;
        groupe.add(f);
        const ph = rng() * 6;
        animations.push((t) => { f.material.color.setRGB(1, 0.35 + Math.sin(t * 2 + ph) * 0.1, 0.08); });
        break;
      }
    }
  };

  // Objets des caves.
  const tour = (h = 0.32, r = 0.07) => () => {
    const g = new THREE.Group();
    const pierre = mat(0x5a5258);
    const c = maille(new THREE.CylinderGeometry(r, r * 1.1, h, 8), pierre);
    c.position.y = h / 2;
    const toit = maille(new THREE.ConeGeometry(r * 1.35, r * 2.2, 8), 0x7a1a1a);
    toit.position.y = h + r * 1.1;
    const fen = new THREE.Mesh(new THREE.BoxGeometry(r * 0.4, r * 0.6, 0.01), new THREE.MeshBasicMaterial({ color: 0xffa040 }));
    fen.position.set(0, h * 0.7, r * 1.02);
    g.add(c, toit, fen);
    return g;
  };
  const forteresse = () => {
    const g = new THREE.Group();
    const pierre = mat(0x5a5258);
    const L = 0.42;
    for (let k = 0; k < 4; k++) {
      const a = k / 4 * Math.PI * 2;
      const mur = maille(new THREE.BoxGeometry(L, 0.14, 0.04), pierre);
      mur.position.set(Math.cos(a) * L / 2, 0.07, Math.sin(a) * L / 2);
      mur.rotation.y = -a + Math.PI / 2;
      g.add(mur);
      for (let c = -2; c <= 2; c++) {
        const cr = maille(new THREE.BoxGeometry(0.035, 0.035, 0.045), pierre);
        cr.position.copy(mur.position).add(new THREE.Vector3(-Math.sin(a) * c * 0.08, 0.085, Math.cos(a) * c * 0.08));
        cr.rotation.y = mur.rotation.y;
        g.add(cr);
      }
      const t = tour(0.24, 0.05)();
      t.position.set(Math.cos(a + Math.PI / 4) * L * 0.7, 0, Math.sin(a + Math.PI / 4) * L * 0.7);
      g.add(t);
    }
    const donjon = tour(0.42, 0.09)();
    g.add(donjon);
    // Le drapeau.
    const hampe = maille(new THREE.CylinderGeometry(0.004, 0.004, 0.12, 4), 0x222222);
    hampe.position.y = 0.66;
    const drapeau = maille(new THREE.BoxGeometry(0.06, 0.035, 0.003), 0xffc23a);
    drapeau.position.set(0.03, 0.7, 0);
    g.add(hampe, drapeau);
    animations.push((t) => { drapeau.rotation.y = Math.sin(t * 3) * 0.3; });
    return g;
  };
  const tonneau = () => {
    const g = new THREE.Group();
    const s = 0.7 + rng() * 0.6;
    const corps = maille(new THREE.CylinderGeometry(0.05 * s, 0.05 * s, 0.11 * s, 10), 0x8a5428);
    corps.rotation.z = rng() < 0.5 ? Math.PI / 2 : 0;
    corps.position.y = corps.rotation.z ? 0.05 * s : 0.055 * s;
    g.add(corps);
    [-0.035, 0.035].forEach(y => {
      const cercle = maille(new THREE.CylinderGeometry(0.052 * s, 0.052 * s, 0.01 * s, 10), 0x2a2a2a);
      cercle.rotation.z = corps.rotation.z;
      if (corps.rotation.z) cercle.position.set(y * s, corps.position.y, 0); else cercle.position.y = corps.position.y + y * s;
      g.add(cercle);
    });
    return g;
  };
  const torche = () => {
    const g = new THREE.Group();
    const p = maille(new THREE.CylinderGeometry(0.006, 0.008, 0.16, 5), 0x3a2a20);
    p.position.y = 0.08;
    const fl = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.05, 6), new THREE.MeshBasicMaterial({ color: 0xffb030 }));
    fl.position.y = 0.18;
    g.add(p, fl);
    const ph = rng() * 6;
    animations.push((t) => { fl.scale.set(1, 1 + Math.sin(t * 14 + ph) * 0.3, 1); });
    return g;
  };
  const pic = () => {
    const g = new THREE.Group();
    const h = 0.12 + rng() * 0.18;
    const c = maille(new THREE.ConeGeometry(0.04 + rng() * 0.03, h, 5), 0x2a2226);
    c.position.y = h / 2;
    g.add(c);
    return g;
  };
  // Des bulles de lave qui jaillissent autour de l'île.
  const geysers = () => {
    const bulles = [];
    for (let k = 0; k < (leger ? 4 : 8); k++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffa020 }));
      groupe.add(b);
      const a = rng() * Math.PI * 2, r = rMax + 0.3 + rng() * 1.2;
      bulles.push({ b, x: Math.cos(a) * r, z: Math.sin(a) * r, ph: rng() * 4, v: 0.8 + rng() * 0.6 });
    }
    animations.push((t) => {
      bulles.forEach(s => {
        const u = ((t * 0.4 + s.ph) % 2.2);
        const vol = u < 1 ? u : 0;
        s.b.visible = vol > 0;
        s.b.position.set(s.x, niveau + vol * (1 - vol) * s.v, s.z);
      });
    });
  };


  // --- Composition de chaque monde ---
  if (theme === 'port') {
    // Le quai, du côté où la côte est la plus libre.
    let bestA = 0, bestD = -1;
    for (let k = 0; k < 32; k++) {
      const a = k / 32 * Math.PI * 2, r = rayonIle(a) - 0.1;
      const d = distChemin(Math.cos(a) * r, Math.sin(a) * r);
      if (d > bestD) { bestD = d; bestA = a; }
    }
    quai(bestA);
    poses.push([Math.cos(bestA) * (rayonIle(bestA) - 0.1), Math.sin(bestA) * (rayonIle(bestA) - 0.1), 0.15]);
    const p = meilleurePlace(0.4);
    if (p) { const o = paillote(); const e = Math.max(0.55, Math.min(0.85, p.echelle)); o.scale.setScalar(e); placer(o, p.x, p.z, 0.34 * e, 0); }
    // Le phare sur la côte, à l'opposé du quai.
    for (let e = 0; e < 80; e++) {
      const a = bestA + Math.PI + (rng() - 0.5) * 2, r = rayonIle(a) - 0.12;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (libre(x, z, 0.09, 0.08)) { placer(phare(), x, z, 0.1); break; }
    }
    // Les maisons du port, groupées près du quai.
    for (let k = 0; k < nb(7); k++) {
      for (let e = 0; e < 80; e++) {
        const a = bestA + (rng() - 0.5) * 1.6, r = rayonIle(a) - 0.12 - rng() * 0.35;
        const x = Math.cos(a) * r, z = Math.sin(a) * r;
        if (libre(x, z, 0.09, 0.07)) { placer(maisonPort(), x, z, 0.09, Math.atan2(-x, -z)); break; }
      }
    }
    semer(herbe, nb(8), 0.1, 30);
    semer(palmier, nb(12), 0.07);
    semer(parasol, nb(6), 0.09);
    semer(rocher(0x9a8a7a), nb(4), 0.05);
    autour(bateau, nb(4), 0.7, 2.4);
    autour(rocher(0x7a6a5a), nb(5), 0.4, 1.6);
  } else if (theme === 'ville') {
    canal();
    const p = meilleurePlace(0.3);
    if (p) placer(pub(), p.x, p.z, 0.24, Math.atan2(-p.x, -p.z));
    for (let k = 0; k < nb(22); k++) {
      for (let e = 0; e < 50; e++) {
        const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * rMax;
        const x = Math.cos(a) * r, z = Math.sin(a) * r;
        if (libre(x, z, 0.1, 0.06)) { placer(immeuble(), x, z, 0.1, Math.round(rng() * 4) * Math.PI / 2 + 0.35); break; }
      }
    }
    // Des lampadaires le long du chemin.
    let n = 0;
    segments.forEach(([ax, az, bx, bz], k) => {
      if (k % 3 || n > nb(14)) return;
      const mx = (ax + bx) / 2, mz = (az + bz) / 2, d = Math.hypot(bx - ax, bz - az) || 1;
      const x = mx + (bz - az) / d * 0.13, z = mz - (bx - ax) / d * 0.13;
      if (dansIle(x, z, 0.03) && !interdits.some(f => f(x, z, 0.01))) { const l = lampadaire(); l.position.set(x, 0, z); groupe.add(l); n++; }
    });
    ciel();
    autour(() => { const g = new THREE.Group(); const b = maille(new THREE.BoxGeometry(0.2, 0.04, 0.08), 0x2a2a3a); b.position.y = 0.02; const f = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffe080 })); f.position.set(0.08, 0.06, 0); g.add(b, f); return g; }, nb(3), 0.6, 2.2);
  } else {
    const p = meilleurePlace(0.32);
    if (p) { const o = futs(); const e = Math.max(0.6, Math.min(1, p.echelle)); o.scale.setScalar(e); placer(o, p.x, p.z, 0.26 * e, Math.atan2(-p.x, -p.z) + Math.PI); }
    fissures();
    semer(tonneau, nb(10), 0.06);
    semer(torche, nb(10), 0.03);
    semer(pic, nb(14), 0.05);
    geysers();
    autour(pic, nb(12), 0.3, 2.5);
    // De grands piliers de roche dans la lave, comme les murs d'une caverne.
    for (let k = 0; k < nb(10); k++) {
      const a = k / 10 * Math.PI * 2 + rng() * 0.4, r = rMax + 2.2 + rng() * 2.5, h = 1.2 + rng() * 2;
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.15 + rng() * 0.2, 0.5 + rng() * 0.4, h, 6), mat(0x2a2024));
      c.position.set(Math.cos(a) * r, niveau + h / 2, Math.sin(a) * r);
      groupe.add(c);
    }
  }

  // Points à garder dans le cadre : le tour de l'île.
  const bornes = [];
  for (let k = 0; k < 16; k++) {
    const a = k / 16 * Math.PI * 2, r = rayonIle(a);
    bornes.push([Math.cos(a) * r, 0, Math.sin(a) * r]);
  }
  bornes.push([0, 0.45, 0]);

  return {
    groupe,
    theme,
    bornes,
    rayon: rMax,
    ambiance: { ciel: P.ciel, brouillard: P.brume, lumiere: P.lumiere, intensite: P.intensite, hemi: P.hemi },
    animer(t, dt) { animations.forEach(f => f(t, dt || 0.016)); },
    liberer() {
      groupe.traverse(o => { if (o.geometry) o.geometry.dispose(); });
      Object.values(mats).forEach(m => m.dispose());
    },
  };
}
