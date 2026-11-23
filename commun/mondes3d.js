// =====================================================================
// Les mondes 3D de La Tournée : chaque plateau devient une île en relief
// (collines, falaises, escaliers, ponts au-dessus de l'eau ou de la lave),
// découpée en quartiers comme les cartes de Mario Party, que le chemin de
// cases traverse. Tout est fabriqué ici en formes simples (style « low
// poly ») : aucun fichier à charger, léger pour un téléphone.
//
//   const monde = creerMonde(THREE, 'terrasse', cases, { leger });
//   scene.add(monde.groupe);   // et dans la boucle : monde.animer(t, dt)
//   monde.ambiance : { ciel, brouillard, lumiere, intensite, hemi: [ciel, sol, intensite] }
//   monde.bornes : points à garder dans le cadre ([[x, y, z], ...])
//   monde.hauteur(x, z) : la hauteur du sol
//
// cases : [{ x, y, z, suivants, type, nom?, moyen?, vers? }] en mètres (déjà
// mis à l'échelle). Chaque case est posée à sa hauteur y : le sol est
// aplani autour d'elle et la route monte ou descend d'une case à l'autre.
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

const lisse = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const melange = (a, b, t) => a + (b - a) * t;

// Bruit de valeur lissé (collines) : déterministe, sans dépendance.
function creerBruit(rng) {
  const T = 64, v = new Float32Array(T * T);
  for (let i = 0; i < v.length; i++) v[i] = rng();
  const val = (x, z) => {
    const xi = Math.floor(x), zi = Math.floor(z), fx = x - xi, fz = z - zi;
    const g = (a, b) => v[((a % T) + T) % T + (((b % T) + T) % T) * T];
    const sx = fx * fx * (3 - 2 * fx), sz = fz * fz * (3 - 2 * fz);
    return melange(melange(g(xi, zi), g(xi + 1, zi), sx), melange(g(xi, zi + 1), g(xi + 1, zi + 1), sx), sz);
  };
  return (x, z) => (val(x * 1.3, z * 1.3) * 0.55 + val(x * 2.9 + 17, z * 2.9 + 5) * 0.3 + val(x * 6.1 + 3, z * 6.1 + 31) * 0.15);
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
  const bruit = creerBruit(rng);
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
  const nb = (n) => Math.round(n * (leger ? 0.5 : 1));

  const P = {
    port: { herbe: [0x7ab84a, 0x5a9a3a], sable: 0xeed39a, roche: 0xb8946a, fond: 0xc8b07a, chemin: 0xd8b07a, eau: 0x1e9fc8, ciel: 0x7cc8f0, brume: 0xa8dcf4, lumiere: 0xfff0d0, intensite: 3.0, hemi: [0xcfefff, 0xe8d09a, 1.0], collines: 0.8, cote: 0.62 },
    ville: { herbe: [0x5a5e72, 0x4a5a4a], sable: 0x4a4a55, roche: 0x6a4a40, fond: 0x3a3a44, chemin: 0xa89e8e, eau: 0x1a3060, ciel: 0x0a0e2a, brume: 0x141a3e, lumiere: 0xb8c4ff, intensite: 2.3, hemi: [0x5a6aaa, 0x2a2030, 1.0], collines: 0.16, cote: 0.7 },
    volcan: { herbe: [0x3e3438, 0x4a3a3a], sable: 0x5a2a1a, roche: 0x2a2024, fond: 0x1a1214, chemin: 0x8a7a6a, eau: 0xff5a14, ciel: 0x1a0c08, brume: 0x2a1008, lumiere: 0xffa070, intensite: 2.2, hemi: [0x6a3030, 0xff5a14, 0.7], collines: 0.95, cote: 0.6 },
  }[theme];
  const NIVEAU = theme === 'volcan' ? -0.05 : -0.06;   // la mer, l'eau du port de nuit, la lave

  // --- Le chemin : segments en 3D entre les cases ---
  const segments = [];
  cases.forEach(c => c.suivants.forEach(s => { const b = cases[s]; if (b) segments.push([c.x, c.y || 0, c.z, b.x, b.y || 0, b.z]); }));
  // La distance au chemin, la hauteur du chemin le plus proche, et une hauteur
  // moyenne (pondérée par la distance) pour adoucir le sol entre deux routes.
  const infoChemin = (x, z) => {
    let d1 = Infinity, y1 = 0, sw = 0, sy = 0;
    for (let k = 0; k < segments.length; k++) {
      const s = segments[k];
      const dx = s[3] - s[0], dz = s[5] - s[2];
      const l2 = dx * dx + dz * dz || 1e-6;
      const u = Math.max(0, Math.min(1, ((x - s[0]) * dx + (z - s[2]) * dz) / l2));
      const d = Math.hypot(x - (s[0] + u * dx), z - (s[2] + u * dz));
      const y = s[1] + u * (s[4] - s[1]);
      if (d < d1) { d1 = d; y1 = y; }
      const w = 1 / (d * d * d * d + 0.0004);
      sw += w; sy += w * y;
    }
    return { d: d1, y: y1, moyenne: sy / sw };
  };
  const distChemin = (x, z) => infoChemin(x, z).d;

  // --- Ce qu'on creuse dans l'île : le canal de la ville, le lac de lave, la lagune du port ---
  const creux = [];   // (x, z) => profondeur voulue (hauteur max) ou null
  const distPolyligne = (pts, x, z) => {
    let m = Infinity;
    for (let k = 0; k + 1 < pts.length; k++) {
      const [ax, az] = pts[k], [bx, bz] = pts[k + 1];
      const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1e-6;
      const u = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
      m = Math.min(m, Math.hypot(x - ax - u * dx, z - az - u * dz));
    }
    return m;
  };
  const E = 1.1;   // échelle de la carte (comme le site)
  let canalPts = null;
  if (theme === 'ville') {
    canalPts = [[0.3, -2.9], [0.42, -1.3], [0.15, -0.1], [0.9, 0.75], [2.0, 0.95], [3.2, 1.25]].map(([x, z]) => [x * E, z * E]);
    creux.push((x, z) => { const d = distPolyligne(canalPts, x, z); return d < 0.17 ? melange(NIVEAU - 0.14, 9, lisse(0.11, 0.17, d)) : null; });
  } else if (theme === 'volcan') {
    creux.push((x, z) => { const e = Math.hypot((x - 0) / (1.55 * E), (z - 0.25 * E) / (0.62 * E)); return e < 1.15 ? melange(NIVEAU - 0.12, 9, lisse(0.85, 1.15, e)) : null; });
  } else {
    creux.push((x, z) => { const e = Math.hypot((x - 1.55 * E) / (0.3 * E), (z - 0.3 * E) / (0.4 * E)); return e < 1.2 ? melange(NIVEAU - 0.12, 9, lisse(0.8, 1.2, e)) : null; });
  }

  // --- La hauteur du sol ---
  const hauteurCalculee = (x, z) => {
    const { d, y, moyenne } = infoChemin(x, z);
    let h = d < 0.12 ? y : melange(y, moyenne, lisse(0.12, 0.4, d));
    // Des collines qui grandissent quand on s'éloigne du chemin.
    h += P.collines * Math.pow(bruit(x, z), 1.5) * lisse(0.2, 0.8, d);
    // La côte : une falaise (ou une plage) qui plonge dans l'eau.
    const cote = P.cote + bruit(x * 0.7 + 40, z * 0.7) * 0.35;
    if (d > cote) h = melange(h, NIVEAU - 0.4, lisse(cote, cote + 0.2, d));
    for (const f of creux) { const c = f(x, z); if (c !== null) h = Math.min(h, c); }
    return h;
  };

  // La grille du terrain : calculée une fois, réutilisée pour poser le décor.
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  cases.forEach(c => { minX = Math.min(minX, c.x); maxX = Math.max(maxX, c.x); minZ = Math.min(minZ, c.z); maxZ = Math.max(maxZ, c.z); });
  const BORD = 1.2;
  const x0 = minX - BORD, x1 = maxX + BORD, z0 = minZ - BORD, z1 = maxZ + BORD;
  const NX = leger ? 84 : 132, NZ = Math.round(NX * (z1 - z0) / (x1 - x0));
  const hs = new Float32Array((NX + 1) * (NZ + 1));
  for (let j = 0; j <= NZ; j++) for (let i = 0; i <= NX; i++) hs[j * (NX + 1) + i] = hauteurCalculee(x0 + (x1 - x0) * i / NX, z0 + (z1 - z0) * j / NZ);
  const hauteur = (x, z) => {
    const u = (x - x0) / (x1 - x0) * NX, v = (z - z0) / (z1 - z0) * NZ;
    if (u < 0 || v < 0 || u >= NX || v >= NZ) return NIVEAU - 0.4;
    const i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j;
    const g = (a, b) => hs[b * (NX + 1) + a];
    return melange(melange(g(i, j), g(i + 1, j), fu), melange(g(i, j + 1), g(i + 1, j + 1), fu), fv);
  };
  const pente = (x, z, r = 0.05) => Math.max(Math.abs(hauteur(x + r, z) - hauteur(x - r, z)), Math.abs(hauteur(x, z + r) - hauteur(x, z - r))) / (2 * r);
  const surTerre = (x, z, marge = 0.04) => hauteur(x, z) > NIVEAU + marge;

  // Le maillage du terrain, coloré selon la hauteur et la pente.
  {
    const geo = new THREE.PlaneGeometry(x1 - x0, z1 - z0, NX, NZ);
    geo.rotateX(-Math.PI / 2);
    geo.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
    const pos = geo.attributes.position;
    const coul = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    for (let k = 0; k < pos.count; k++) {
      const x = pos.getX(k), z = pos.getZ(k);
      const i = Math.round((x - x0) / (x1 - x0) * NX), j = Math.round((z - z0) / (z1 - z0) * NZ);
      const h = hs[j * (NX + 1) + i];
      pos.setY(k, h);
      const p = pente(x, z);
      if (h < NIVEAU + 0.02) c.set(P.fond);
      else if (p > 0.9) c.set(P.roche);
      else if (h < NIVEAU + 0.1 && theme !== 'ville') c.set(P.sable);
      else c.set(bruit(x * 2 + 9, z * 2) > 0.55 ? P.herbe[1] : P.herbe[0]);
      if (theme === 'volcan' && h > 0.75) c.lerp(new THREE.Color(0x6a5a5a), 0.5);   // la cendre en altitude
      coul[k * 3] = c.r; coul[k * 3 + 1] = c.g; coul[k * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(coul, 3));
    geo.computeVertexNormals();
    const sol = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, flatShading: true, envMapIntensity: 0.2 }));
    sol.receiveShadow = !leger;
    groupe.add(sol);
  }

  // --- La route : des dalles qui suivent la pente, des escaliers quand ça
  // grimpe fort, des ponts quand le sol se dérobe (canal, lave, lagune) ---
  const matRoute = mat(P.chemin);
  const matPont = mat(theme === 'volcan' ? 0x6a4a2a : theme === 'ville' ? 0x8a7a6a : 0x9a6a3a);
  const matPilier = mat(theme === 'volcan' ? 0x2a2024 : 0x6a6a74);
  const ponts = [];   // zones à garder vides (x, z, rayon)
  segments.forEach(([ax, ay, az, bx, by, bz]) => {
    const dxz = Math.hypot(bx - ax, bz - az);
    if (dxz < 0.01) return;
    const rot = Math.atan2(bx - ax, bz - az);
    const dy = by - ay;
    // Un pont si le sol est nettement sous la route au milieu du segment.
    let pont = false;
    for (const u of [0.3, 0.5, 0.7]) {
      if (hauteur(ax + (bx - ax) * u, az + (bz - az) * u) < ay + dy * u - 0.06) pont = true;
    }
    if (pont) {
      const g = new THREE.Group();
      const long = Math.hypot(dxz, dy);
      const tablier = maille(new THREE.BoxGeometry(0.2, 0.025, long + 0.02), matPont);
      g.add(tablier);
      for (const sx of [-1, 1]) {
        const garde = maille(new THREE.BoxGeometry(0.014, 0.04, long), theme === 'volcan' ? 0xc8a060 : 0x5a4a40);
        garde.position.set(sx * 0.1, 0.03, 0);
        g.add(garde);
      }
      g.position.set((ax + bx) / 2, (ay + by) / 2 - 0.004, (az + bz) / 2);
      g.rotation.order = 'YXZ';
      g.rotation.y = rot;
      g.rotation.x = -Math.atan2(dy, dxz);
      groupe.add(g);
      // Les piliers jusqu'à l'eau.
      for (const u of [0.15, 0.85]) {
        const px = ax + (bx - ax) * u, pz = az + (bz - az) * u, top = ay + dy * u - 0.02;
        const bas = Math.max(NIVEAU - 0.15, hauteur(px, pz));
        if (top - bas < 0.03) continue;
        const pil = maille(new THREE.BoxGeometry(0.04, top - bas, 0.04), matPilier);
        pil.position.set(px, (top + bas) / 2, pz);
        groupe.add(pil);
      }
      ponts.push([(ax + bx) / 2, (az + bz) / 2, dxz / 2 + 0.1]);
      return;
    }
    if (Math.abs(dy) / dxz > 0.28) {
      // Un escalier : des marches régulières.
      const n = Math.max(3, Math.ceil(Math.abs(dy) / 0.03));
      for (let k = 0; k < n; k++) {
        const u = (k + 0.5) / n;
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.17, Math.abs(dy) / n + 0.02, dxz / n + 0.004), matRoute);
        m.position.set(ax + (bx - ax) * u, ay + dy * (k + 1) / n - Math.abs(dy) / n / 2 - 0.004, az + (bz - az) * u);
        m.rotation.y = rot;
        m.receiveShadow = !leger;
        groupe.add(m);
      }
      return;
    }
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.014, Math.hypot(dxz, dy) + 0.02), matRoute);
    r.position.set((ax + bx) / 2, (ay + by) / 2 + 0.001, (az + bz) / 2);
    r.rotation.order = 'YXZ';
    r.rotation.y = rot;
    r.rotation.x = -Math.atan2(dy, dxz);
    r.receiveShadow = !leger;
    groupe.add(r);
  });

  // --- L'eau tout autour : la mer, l'eau du port de nuit, la lave ---
  const segEau = leger ? 24 : 48;
  const geoEau = new THREE.PlaneGeometry(34, 34, segEau, segEau);
  geoEau.rotateX(-Math.PI / 2);
  const eauMat = theme === 'volcan'
    ? new THREE.MeshBasicMaterial({ vertexColors: true })
    : new THREE.MeshStandardMaterial({ color: P.eau, roughness: theme === 'ville' ? 0.15 : 0.3, metalness: theme === 'ville' ? 0.4 : 0.05, flatShading: true, transparent: theme === 'port', opacity: 0.88 });
  eauMat.envMapIntensity = 0;   // pas de reflets du studio : l'eau reste de sa couleur
  const eau = new THREE.Mesh(geoEau, eauMat);
  eau.position.y = NIVEAU;
  groupe.add(eau);
  {
    const base = geoEau.attributes.position.array.slice();
    const pos = geoEau.attributes.position;
    const amp = theme === 'ville' ? 0.008 : 0.016;
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

  // --- Placer le décor ---
  const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
  const rMax = Math.max(...cases.map(c => Math.hypot(c.x - cx, c.z - cz))) + 0.7;
  const poses = [];
  const interdits = [];   // (x, z, rayon) => vrai si interdit
  const libre = (x, z, rayon, marge = 0.1, penteMax = 0.6) => surTerre(x, z, 0.04) && distChemin(x, z) > rayon + marge
    && pente(x, z, Math.max(0.03, rayon * 0.6)) < penteMax
    && poses.every(([px, pz, pr]) => Math.hypot(px - x, pz - z) > pr + rayon)
    && ponts.every(([px, pz, pr]) => Math.hypot(px - x, pz - z) > pr + rayon)
    && !interdits.some(f => f(x, z, rayon));
  // Le sol sous un objet : le plus bas de ses quatre coins (rien ne flotte).
  const solSous = (x, z, r) => Math.min(hauteur(x, z), hauteur(x + r, z), hauteur(x - r, z), hauteur(x, z + r), hauteur(x, z - r));
  const placer = (obj, x, z, rayon, angle = rng() * Math.PI * 2) => {
    obj.position.set(x, solSous(x, z, rayon * 0.6), z);
    obj.rotation.y = angle;
    groupe.add(obj);
    poses.push([x, z, rayon]);
    return obj;
  };
  const semer = (fabrique, nombre, rayon, essais = 40, filtre = null) => {
    for (let n = 0; n < nombre; n++) {
      for (let e = 0; e < essais; e++) {
        const x = cx + (rng() * 2 - 1) * (x1 - x0) / 2, z = cz + (rng() * 2 - 1) * (z1 - z0) / 2;
        if (libre(x, z, rayon) && (!filtre || filtre(x, z))) { placer(fabrique(), x, z, rayon); break; }
      }
    }
  };
  // À côté d'une case, du côté où il y a de la place : pour les boutiques, le péage...
  const aCote = (c, rayon, ecart = 0.3) => {
    const s = cases[c.suivants[0]] || c;
    let dx = s.x - c.x, dz = s.z - c.z;
    const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    let best = null;
    for (const sd of [1, -1]) for (const e of [ecart, ecart + 0.08, ecart + 0.16]) {
      const x = c.x - dz * sd * e, z = c.z + dx * sd * e;
      const score = (libre(x, z, rayon, 0.04, 1.2) ? 10 : 0) - Math.abs(hauteur(x, z) - (c.y || 0)) * 4 - e;
      if (!best || score > best.score) best = { x, z, score, face: Math.atan2(c.x - x, c.z - z) };
    }
    return best;
  };
  // Objets posés dans l'eau autour de l'île.
  const autour = (fabrique, nombre, de, a) => {
    for (let n = 0; n < nombre; n++) {
      for (let e = 0; e < 20; e++) {
        const ang = rng() * Math.PI * 2, r = rMax + de + rng() * (a - de);
        const x = cx + Math.cos(ang) * r, z = cz + Math.sin(ang) * r;
        if (hauteur(x, z) > NIVEAU - 0.1) continue;
        const o = fabrique();
        o.position.set(x, NIVEAU, z);
        o.rotation.y = rng() * Math.PI * 2;
        groupe.add(o);
        break;
      }
    }
  };
  // Le meilleur endroit pour un grand bâtiment (filtre et note au choix).
  const meilleurePlace = (rayon, note = (x, z, d) => d, filtre = null) => {
    let best = null;
    for (let x = x0; x <= x1; x += 0.07) {
      for (let z = z0; z <= z1; z += 0.07) {
        if (!libre(x, z, rayon, 0.06) || (filtre && !filtre(x, z))) continue;
        const n = note(x, z, distChemin(x, z));
        if (!best || n > best.n) best = { x, z, n };
      }
    }
    return best;
  };

  const niveau = NIVEAU;
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

  // ===================== REPÈRES DU PLATEAU =====================
  // Une enseigne : un panneau avec du texte (nom de la boutique, DÉPART...).
  const texEnseigne = (texte, fond, encre) => {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 128;
    const x = c.getContext('2d');
    x.fillStyle = fond; x.fillRect(0, 0, 512, 128);
    x.strokeStyle = encre; x.lineWidth = 8; x.strokeRect(6, 6, 500, 116);
    x.fillStyle = encre; x.textAlign = 'center'; x.textBaseline = 'middle';
    let taille = 64;
    x.font = 'bold ' + taille + 'px Georgia, serif';
    while (x.measureText(texte).width > 470 && taille > 20) { taille -= 4; x.font = 'bold ' + taille + 'px Georgia, serif'; }
    x.fillText(texte, 256, 68);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  const panneau = (texte, largeur, fond, encre) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(largeur, largeur / 4), new THREE.MeshBasicMaterial({ map: texEnseigne(texte, fond, encre), side: THREE.DoubleSide }));
    return m;
  };
  // La boutique : une échoppe avec un auvent rayé et son nom en grand.
  const boutique = (nom) => {
    const g = new THREE.Group();
    const couleurs = { port: [0xf2e0b0, 0xe8323a, '#fff6e0', '#a8261e'], ville: [0x3a2a3a, 0xff3ab0, '#1a0a1a', '#ff6ad0'], volcan: [0x5a4038, 0xffa020, '#2a1a10', '#ffc23a'] }[theme];
    const corps = maille(new THREE.BoxGeometry(0.26, 0.17, 0.18), couleurs[0]);
    corps.position.y = 0.085;
    const toit = maille(new THREE.BoxGeometry(0.29, 0.02, 0.21), 0x3a2a20);
    toit.position.y = 0.18;
    g.add(corps, toit);
    // L'auvent : des bandes alternées.
    for (let k = 0; k < 6; k++) {
      const b = maille(new THREE.BoxGeometry(0.045, 0.008, 0.1), k % 2 ? 0xffffff : couleurs[1]);
      b.position.set(-0.115 + k * 0.046, 0.13, 0.13);
      b.rotation.x = 0.4;
      g.add(b);
    }
    const vitrine = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.07), new THREE.MeshBasicMaterial({ color: theme === 'port' ? 0x8ad8ff : 0xffd080 }));
    vitrine.position.set(0, 0.06, 0.091);
    g.add(vitrine);
    const p = panneau(nom || 'Boutique', 0.42, couleurs[2], couleurs[3]);
    p.position.set(0, 0.28, 0.02);
    g.add(p);
    // Une caisse de marchandises devant.
    const caisse = maille(new THREE.BoxGeometry(0.06, 0.04, 0.05), 0xa8783a);
    caisse.position.set(0.1, 0.02, 0.15);
    g.add(caisse);
    animations.push((t) => { p.position.y = 0.28 + Math.sin(t * 2) * 0.006; });
    return g;
  };
  // Le péage : une arche au-dessus de la route et une barrière rouge et blanche.
  const peage = () => {
    const g = new THREE.Group();
    for (const sx of [-1, 1]) {
      const pil = maille(new THREE.BoxGeometry(0.035, 0.3, 0.035), 0x5a5a64);
      pil.position.set(sx * 0.16, 0.15, 0);
      g.add(pil);
    }
    const linteau = maille(new THREE.BoxGeometry(0.36, 0.04, 0.04), 0x5a5a64);
    linteau.position.y = 0.31;
    const p = panneau('PÉAGE', 0.3, '#ffc23a', '#1a1a1a');
    p.position.set(0, 0.31, 0.025);
    const barriere = new THREE.Group();
    for (let k = 0; k < 6; k++) {
      const b = maille(new THREE.BoxGeometry(0.05, 0.016, 0.016), k % 2 ? 0xffffff : 0xd8323a);
      b.position.x = 0.03 + k * 0.05;
      barriere.add(b);
    }
    barriere.position.set(-0.16, 0.11, 0.03);
    animations.push((t) => { barriere.rotation.z = Math.max(0, Math.sin(t * 0.8)) * 1.2; });
    g.add(linteau, p, barriere);
    return g;
  };
  // L'arche du départ.
  const archeDepart = () => {
    const g = new THREE.Group();
    for (const sx of [-1, 1]) {
      const pil = maille(new THREE.CylinderGeometry(0.018, 0.022, 0.34, 6), 0xffffff);
      pil.position.set(sx * 0.17, 0.17, 0);
      g.add(pil);
    }
    const p = panneau('DÉPART', 0.36, '#1a1a1a', '#ffffff');
    p.position.y = 0.33;
    g.add(p);
    return g;
  };
  // Les transports : bateau, tram, geyser.
  const ponton = () => {
    const g = new THREE.Group();
    const planches = maille(new THREE.BoxGeometry(0.12, 0.02, 0.5), 0x9a6a3a);
    planches.position.set(0, 0, 0.25);
    g.add(planches);
    for (let k = 0; k < 4; k++) for (const sx of [-1, 1]) {
      const pieu = maille(new THREE.CylinderGeometry(0.008, 0.008, 0.3, 5), 0x5a3a20);
      pieu.position.set(sx * 0.06, -0.14, 0.06 + k * 0.14);
      g.add(pieu);
    }
    return g;
  };
  const arretTram = () => {
    const g = new THREE.Group();
    const abri = maille(new THREE.BoxGeometry(0.22, 0.01, 0.1), 0x2a2a34);
    abri.position.y = 0.17;
    g.add(abri);
    for (const sx of [-1, 1]) {
      const p = maille(new THREE.BoxGeometry(0.01, 0.17, 0.01), 0x6a6a74);
      p.position.set(sx * 0.1, 0.085, -0.04);
      g.add(p);
    }
    const tram = new THREE.Group();
    const caisse = maille(new THREE.BoxGeometry(0.34, 0.12, 0.12), 0xffc23a);
    caisse.position.y = 0.08;
    const vitres = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.035, 0.125), new THREE.MeshBasicMaterial({ color: 0xfff0b0 }));
    vitres.position.y = 0.1;
    const perche = maille(new THREE.CylinderGeometry(0.004, 0.004, 0.12, 4), 0x2a2a2a);
    perche.position.set(0, 0.18, 0);
    perche.rotation.z = 0.5;
    tram.add(caisse, vitres, perche);
    tram.position.set(0, 0, 0.16);
    g.add(tram);
    const p = panneau('TRAM', 0.16, '#1a3a8a', '#ffffff');
    p.position.set(0, 0.22, -0.04);
    g.add(p);
    return g;
  };
  const bouche = (gros) => {
    const g = new THREE.Group();
    const cone = maille(new THREE.CylinderGeometry(0.05 * gros, 0.1 * gros, 0.07 * gros, 8), 0x2a2024);
    cone.position.y = 0.035 * gros;
    const lave = new THREE.Mesh(new THREE.CircleGeometry(0.045 * gros, 8), new THREE.MeshBasicMaterial({ color: 0xff7a1a }));
    lave.rotation.x = -Math.PI / 2;
    lave.position.y = 0.071 * gros;
    g.add(cone, lave);
    // Le jet : des boules de lave qui montent et retombent.
    const jet = [];
    for (let k = 0; k < (leger ? 3 : 6); k++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.018 * gros, 6, 4), new THREE.MeshBasicMaterial({ color: k % 2 ? 0xffa020 : 0xff5a14 }));
      g.add(b);
      jet.push({ b, ph: k / 6, dx: (rng() - 0.5) * 0.08, dz: (rng() - 0.5) * 0.08 });
    }
    animations.push((t) => {
      jet.forEach(s => {
        const u = (t * 0.6 + s.ph) % 1;
        s.b.position.set(s.dx * u, 0.07 * gros + u * (1 - u) * 1.2 * gros, s.dz * u);
      });
    });
    return g;
  };

  // Poser les repères sur les cases spéciales.
  const repere = (obj, x, z, rayon, angle) => {
    obj.position.set(x, solSous(x, z, rayon * 0.5), z);
    obj.rotation.y = angle;
    groupe.add(obj);
    poses.push([x, z, rayon]);
  };
  const dirCase = (c) => { const s = cases[c.suivants[0]] || c; return Math.atan2(s.x - c.x, s.z - c.z); };
  cases.forEach((c, k) => {
    if (c.type === 'boutique') {
      const p = aCote(c, 0.16, 0.3);
      if (p) repere(boutique(c.nom), p.x, p.z, 0.16, p.face);
    } else if (c.type === 'peage') {
      const o = peage();
      o.position.set(c.x, c.y || 0, c.z);
      o.rotation.y = dirCase(c);
      groupe.add(o);
    } else if (k === 0) {
      const o = archeDepart();
      o.position.set(c.x, c.y || 0, c.z);
      o.rotation.y = dirCase(c);
      groupe.add(o);
    } else if (c.type === 'transport') {
      const vers = cases[c.vers];
      [c, vers].forEach((q, n) => {
        if (!q) return;
        if (c.moyen === 'bateau') {
          // Le ponton part de la case vers l'eau la plus proche.
          let best = null;
          for (let a = 0; a < 16; a++) {
            const ang = a / 16 * Math.PI * 2;
            for (let r = 0.2; r < 1.0; r += 0.05) {
              const x = q.x + Math.sin(ang) * r, z = q.z + Math.cos(ang) * r;
              if (hauteur(x, z) < NIVEAU - 0.02) { if (!best || r < best.r) best = { r, ang, x, z }; break; }
            }
          }
          if (!best) return;
          const o = ponton();
          const r0 = Math.max(0.12, best.r - 0.3);
          o.position.set(q.x + Math.sin(best.ang) * r0, NIVEAU + 0.1, q.z + Math.cos(best.ang) * r0);
          o.rotation.y = best.ang;
          groupe.add(o);
          if (n === 0) {
            const b = bateau();
            b.position.set(q.x + Math.sin(best.ang) * (r0 + 0.45), NIVEAU, q.z + Math.cos(best.ang) * (r0 + 0.45));
            b.rotation.y = best.ang + Math.PI / 2;
            groupe.add(b);
          }
        } else if (c.moyen === 'tram') {
          const p = aCote(q, 0.12, 0.26);
          if (p) repere(arretTram(), p.x, p.z, 0.14, p.face + (n ? Math.PI : 0));
        } else {
          const p = aCote(q, 0.08, 0.22);
          if (p) repere(bouche(n ? 0.8 : 1.3), p.x, p.z, 0.1, 0);
        }
      });
    }
  });

  // ===================== COMPOSITION DE CHAQUE MONDE =====================
  const centreZone = (noms) => {
    const qs = cases.filter(c => noms.includes(c.zone));
    if (!qs.length) return { x: cx, z: cz };
    return { x: qs.reduce((s, c) => s + c.x, 0) / qs.length, z: qs.reduce((s, c) => s + c.z, 0) / qs.length };
  };
  // Des maisons le long des rues d'un quartier, tournées vers le chemin.
  const quartier = (noms, fabrique, rayon, pas = 2) => {
    cases.forEach((c, k) => {
      if (!noms.includes(c.zone) || k % pas) return;
      for (const e of [0.3, 0.42]) {
        const p = aCote(c, rayon, e);
        if (p && libre(p.x, p.z, rayon, 0.06)) { placer(fabrique(), p.x, p.z, rayon, p.face); break; }
      }
    });
  };

  if (theme === 'port') {
    // Le phare tout en haut de la colline.
    const ph = meilleurePlace(0.1, (x, z, d) => hauteur(x, z) * 3 + Math.min(d, 0.4));
    if (ph) placer(phare(), ph.x, ph.z, 0.1, 0);
    // La paillote sur la plage.
    const plage = centreZone(['la plage']);
    const pa = meilleurePlace(0.26, (x, z, d) => -Math.hypot(x - plage.x, z - plage.z) + Math.min(d, 0.3), (x, z) => hauteur(x, z) < 0.2);
    if (pa) { const o = paillote(); o.scale.setScalar(0.7); placer(o, pa.x, pa.z, 0.25, Math.atan2(cx - pa.x, cz - pa.z)); }
    // Le village et le port de pêche : des maisons colorées le long des rues.
    quartier(['la rue du village', 'les dunes', 'le marché', 'le port de pêche', 'les quais'], maisonPort, 0.09, 2);
    semer(palmier, nb(26), 0.07, 40, (x, z) => hauteur(x, z) < NIVEAU + 0.3);
    semer(parasol, nb(10), 0.09, 40, (x, z) => hauteur(x, z) < NIVEAU + 0.14);
    semer(herbe, nb(16), 0.1, 30, (x, z) => hauteur(x, z) > NIVEAU + 0.15);
    semer(rocher(0x9a8a7a), nb(10), 0.06);
    semer(() => { const g = palmier(); g.scale.setScalar(0.8); return g; }, nb(10), 0.06, 40, (x, z) => hauteur(x, z) > 0.3);
    // Des barques dans la lagune, des voiliers et des îlots au large.
    for (let k = 0; k < 2; k++) {
      const b = bateau();
      b.scale.setScalar(0.7);
      b.position.set(1.55 * E + (k - 0.5) * 0.18, NIVEAU, 0.3 * E + (k - 0.5) * 0.25);
      b.rotation.y = rng() * 6;
      groupe.add(b);
    }
    autour(bateau, nb(6), 0.4, 2.6);
    autour(() => { const g = new THREE.Group(); const r = maille(new THREE.DodecahedronGeometry(0.25 + rng() * 0.3, 0), 0x8a7a5a); r.scale.y = 0.5; g.add(r); const p = palmier(); p.position.y = 0.08; g.add(p); return g; }, nb(5), 1.2, 3.5);
  } else if (theme === 'ville') {
    const p = meilleurePlace(0.24);
    if (p) placer(pub(), p.x, p.z, 0.24, Math.atan2(cx - p.x, cz - p.z));
    // La ville : des immeubles partout où il y a de la place, plus hauts sur la butte.
    quartier(['la grand-place', 'les ruelles', 'les docks', 'le quartier des néons', 'le marché de nuit'], immeuble, 0.1, 1);
    semer(() => { const g = immeuble(); g.scale.set(1.4, 1.3 + rng() * 0.6, 1.4); return g; }, nb(55), 0.14, 40);
    // Des lampadaires le long du chemin.
    let n = 0;
    segments.forEach(([ax, ay, az, bx, by, bz], k) => {
      if (k % 2 || n > nb(30)) return;
      const mx = (ax + bx) / 2, mz = (az + bz) / 2, d = Math.hypot(bx - ax, bz - az) || 1;
      const x = mx + (bz - az) / d * 0.13, z = mz - (bx - ax) / d * 0.13;
      if (surTerre(x, z, 0.04) && Math.abs(hauteur(x, z) - (ay + by) / 2) < 0.08) { const l = lampadaire(); l.position.set(x, hauteur(x, z), z); groupe.add(l); n++; }
    });
    ciel();
    // L'autre rive : une ligne de grands immeubles éclairés au loin.
    for (let k = 0; k < nb(34); k++) {
      const a = k / nb(34) * Math.PI * 2 + rng() * 0.1, r = rMax + 2.4 + rng() * 1.2;
      const b = immeuble();
      b.scale.set(3, 2.5 + rng() * 3, 3);
      b.position.set(cx + Math.cos(a) * r, NIVEAU, cz + Math.sin(a) * r);
      b.rotation.y = -a;
      groupe.add(b);
    }
    // Des barques qui descendent le canal, lanterne allumée.
    for (let k = 0; k < 2; k++) {
      const barque = maille(new THREE.BoxGeometry(0.1, 0.025, 0.045), 0x8a5a34);
      const lanterne = new THREE.Mesh(new THREE.SphereGeometry(0.01, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffd060 }));
      lanterne.position.set(0.04, 0.03, 0);
      const b = new THREE.Group();
      b.add(barque, lanterne);
      groupe.add(b);
      const long = canalPts.slice(1).reduce((s, q, i) => s + Math.hypot(q[0] - canalPts[i][0], q[1] - canalPts[i][1]), 0);
      animations.push((t) => {
        let s = ((t * 0.08 + k * 0.5) % 1) * long;
        for (let i = 0; i + 1 < canalPts.length; i++) {
          const [ax, az] = canalPts[i], [bx, bz] = canalPts[i + 1], l = Math.hypot(bx - ax, bz - az);
          if (s <= l) { b.position.set(ax + (bx - ax) * s / l, NIVEAU + 0.012, az + (bz - az) * s / l); b.rotation.y = Math.atan2(bx - ax, bz - az) + Math.PI / 2; break; }
          s -= l;
        }
      });
    }
  } else {
    // Les fûts géants dans la galerie.
    const gal = centreZone(['la galerie des fûts']);
    const f = meilleurePlace(0.28, (x, z, d) => -Math.hypot(x - gal.x, z - gal.z) + Math.min(d, 0.35));
    if (f) placer(futs(), f.x, f.z, 0.27, Math.atan2(cx - f.x, cz - f.z) + Math.PI);
    semer(tonneau, nb(14), 0.06);
    semer(pic, nb(22), 0.05);
    // Des torches le long du chemin.
    segments.forEach(([ax, ay, az, bx, by, bz], k) => {
      if (k % 3) return;
      const mx = (ax + bx) / 2, mz = (az + bz) / 2, d = Math.hypot(bx - ax, bz - az) || 1;
      const x = mx + (bz - az) / d * 0.14, z = mz - (bx - ax) / d * 0.14;
      if (surTerre(x, z, 0.05) && Math.abs(hauteur(x, z) - (ay + by) / 2) < 0.1) { const t = torche(); t.position.set(x, hauteur(x, z), z); groupe.add(t); }
    });
    // Des fissures de lave dans le sol.
    for (let k = 0; k < nb(16); k++) {
      for (let e = 0; e < 30; e++) {
        const x = cx + (rng() * 2 - 1) * (x1 - x0) / 2, z = cz + (rng() * 2 - 1) * (z1 - z0) / 2;
        if (!libre(x, z, 0.08, 0.06, 0.4)) continue;
        const fi = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.004, 0.1 + rng() * 0.15), new THREE.MeshBasicMaterial({ color: 0xff6a1a }));
        fi.position.set(x, hauteur(x, z) + 0.003, z);
        fi.rotation.y = rng() * Math.PI;
        groupe.add(fi);
        const ph = rng() * 6;
        animations.push((t) => { fi.material.color.setRGB(1, 0.35 + Math.sin(t * 2 + ph) * 0.1, 0.08); });
        break;
      }
    }
    // Le grand volcan derrière la carte : il fume et crache des braises.
    {
      const vx = cx + 0.3, vz = minZ - 2.4;
      const cone = maille(new THREE.CylinderGeometry(0.45, 2.2, 2.4, 10, 3), 0x2a2024);
      cone.position.set(vx, NIVEAU + 1.2, vz);
      groupe.add(cone);
      const lave = new THREE.Mesh(new THREE.CircleGeometry(0.42, 10), new THREE.MeshBasicMaterial({ color: 0xff6a14 }));
      lave.rotation.x = -Math.PI / 2;
      lave.position.set(vx, NIVEAU + 2.41, vz);
      groupe.add(lave);
      // Des coulées sur les flancs.
      for (let k = 0; k < 3; k++) {
        const a = Math.PI / 2 + (k - 1) * 0.6;
        const c = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 1.9), new THREE.MeshBasicMaterial({ color: 0xff5a14 }));
        c.position.set(vx + Math.cos(a) * 0.95, NIVEAU + 1.3, vz + Math.sin(a) * 0.95);
        c.rotation.order = 'YXZ';
        c.rotation.y = -a + Math.PI / 2;
        c.rotation.x = 0.85;
        groupe.add(c);
      }
      const fumees = [];
      for (let k = 0; k < (leger ? 4 : 8); k++) {
        const s = new THREE.Mesh(new THREE.SphereGeometry(0.25, 7, 5), new THREE.MeshBasicMaterial({ color: 0x3a3030, transparent: true, opacity: 0.5, depthWrite: false }));
        groupe.add(s);
        fumees.push({ s, ph: k / 8 });
      }
      animations.push((t) => {
        fumees.forEach(f => {
          const u = (t * 0.08 + f.ph) % 1;
          f.s.position.set(vx + Math.sin(u * 5 + f.ph * 9) * 0.3 + u * 0.8, NIVEAU + 2.5 + u * 2.2, vz + u * 0.3);
          f.s.scale.setScalar(0.6 + u * 1.6);
          f.s.material.opacity = 0.5 * (1 - u);
        });
      });
    }
    // De grands piliers de roche dans la lave, comme les murs d'une caverne.
    for (let k = 0; k < nb(12); k++) {
      const a = k / 12 * Math.PI * 2 + rng() * 0.4, r = rMax + 2.6 + rng() * 2.5, h = 1.2 + rng() * 2;
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.15 + rng() * 0.2, 0.5 + rng() * 0.4, h, 6), mat(0x2a2024));
      c.position.set(cx + Math.cos(a) * r, NIVEAU + h / 2, cz + Math.sin(a) * r);
      groupe.add(c);
    }
    // Des bulles de lave qui jaillissent autour de l'île.
    const bulles = [];
    for (let k = 0; k < (leger ? 4 : 10); k++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffa020 }));
      groupe.add(b);
      let x = 0, z = 0;
      for (let e = 0; e < 20; e++) {
        const a = rng() * Math.PI * 2, r = rng() * (rMax + 1.5);
        x = cx + Math.cos(a) * r; z = cz + Math.sin(a) * r;
        if (hauteur(x, z) < NIVEAU - 0.05) break;
      }
      bulles.push({ b, x, z, ph: rng() * 4, v: 0.8 + rng() * 0.6 });
    }
    animations.push((t) => {
      bulles.forEach(s => {
        const u = ((t * 0.4 + s.ph) % 2.2);
        const vol = u < 1 ? u : 0;
        s.b.visible = vol > 0;
        s.b.position.set(s.x, NIVEAU + vol * (1 - vol) * s.v, s.z);
      });
    });
  }

  // Points à garder dans le cadre : le tour des cases, à leur hauteur.
  const yMax = Math.max(...cases.map(c => c.y || 0));
  const bornes = [
    [minX - 0.25, 0, minZ - 0.25], [maxX + 0.25, 0, minZ - 0.25], [minX - 0.25, 0, maxZ + 0.25], [maxX + 0.25, 0, maxZ + 0.25],
    [cx, yMax + 0.3, minZ], [cx, 0, maxZ + 0.3],
  ];

  return {
    groupe,
    theme,
    bornes,
    rayon: Math.max(maxX - minX, maxZ - minZ) / 2 + 0.35,
    largeur: maxX - minX,
    profondeur: maxZ - minZ,
    hauteur,
    ambiance: { ciel: P.ciel, brouillard: P.brume, lumiere: P.lumiere, intensite: P.intensite, hemi: P.hemi },
    animer(t, dt) { animations.forEach(f => f(t, dt || 0.016)); },
    liberer() {
      groupe.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material && o.material.map) o.material.map.dispose(); });
      Object.values(mats).forEach(m => m.dispose());
    },
  };
}
