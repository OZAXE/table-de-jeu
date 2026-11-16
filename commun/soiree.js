// La soirée, commune à tous les jeux du site.
//
// - Le prénom est saisi UNE fois (sur l'accueil ou dans le premier jeu) et
//   repris partout : le serveur reconnaît un joueur à son prénom d'un jeu à
//   l'autre (index, jetons et sessions changent, le prénom reste).
// - La soirée a UN code de salon pour tous les jeux. Quand quelqu'un lance un
//   autre jeu, le serveur prévient tout le monde (message « salon_jeu ») et
//   chaque téléphone ouvre tout seul la page du nouveau jeu.
// - Lancer un jeu alors qu'un AUTRE tourne demande confirmation : il est
//   remplacé pour tout le monde.
//
// Script classique (pas un module) : il est chargé avant le script du jeu et
// s'expose en window.Soiree. localStorage peut lever (navigation privée,
// données bloquées) : tout est gardé, le site marche alors sans mémoire.
(function () {
  const CLE_NOM = 'shield.nom';
  const CLE_SOIREE = 'shield.soiree';
  // Une soirée oubliée de la veille ne doit pas renvoyer dans un vieux salon.
  const DUREE_SOIREE = 18 * 3600 * 1000;

  const SERVEURS = {
    render: { http: 'https://kinito-serveur.onrender.com', ws: 'wss://kinito-serveur.onrender.com' },
    local:  { http: 'http://127.0.0.1:8000',               ws: 'ws://127.0.0.1:8000' },
  };

  const JEUX = {
    kinito:     { titre: 'Kinito',     page: 'kinito-3d-jeu.html',     icone: '🎲' },
    beerbattle: { titre: 'BeerBattle', page: 'beerbattle-3d-jeu.html', icone: '🃏' },
    buckshot:   { titre: 'Buckshot',   page: 'buckshot-3d-jeu.html',   icone: '💥' },
    picolopoly: { titre: 'Picopoly',   page: 'picolopoly-3d-jeu.html', icone: '🍻' },
    menteur:    { titre: 'Menteur',    page: 'menteur-3d-jeu.html',    icone: '🎭' },
    casino:     { titre: 'Casino',     page: 'casino-3d-jeu.html',     icone: '🎰' },
  };

  function lire(cle) {
    try { return JSON.parse(localStorage.getItem(cle) || 'null'); } catch (e) { return null; }
  }
  function ecrire(cle, valeur) {
    try {
      if (valeur == null) localStorage.removeItem(cle);
      else localStorage.setItem(cle, JSON.stringify(valeur));
    } catch (e) { /* tant pis */ }
  }
  function propre(nom) {
    return String(nom || '').replace(/\s+/g, ' ').trim().slice(0, 16);
  }

  // Bandeau discret en haut de l'écran, au-dessus de tout (scène 3D comprise).
  let bandeau = null;
  function afficherBandeau(texte, boutons) {
    if (!bandeau) {
      bandeau = document.createElement('div');
      bandeau.setAttribute('role', 'status');
      bandeau.style.cssText = [
        'position:fixed', 'left:12px', 'right:12px', 'top:max(12px, env(safe-area-inset-top))',
        'z-index:99999', 'display:flex', 'flex-wrap:wrap', 'align-items:center', 'gap:8px 12px',
        'padding:12px 14px', 'border-radius:16px', 'background:rgba(8,14,28,.94)',
        'border:1px solid rgba(255,255,255,.14)', 'box-shadow:0 10px 30px rgba(0,0,0,.45)',
        'color:#f4f1ea', 'font:600 15px/1.35 Outfit, system-ui, sans-serif', 'max-width:560px',
        'margin:0 auto',
      ].join(';');
      document.body.appendChild(bandeau);
    }
    bandeau.textContent = '';
    const t = document.createElement('span');
    t.style.flex = '1 1 200px';
    t.textContent = texte;
    bandeau.appendChild(t);
    (boutons || []).forEach(([libelle, action, discret]) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = libelle;
      b.style.cssText = 'border:0;border-radius:999px;padding:8px 14px;font:700 14px Outfit, system-ui, sans-serif;cursor:pointer;' +
        (discret ? 'background:rgba(255,255,255,.1);color:#f4f1ea' : 'background:#dfe6ef;color:#0b1220');
      b.addEventListener('click', action);
      bandeau.appendChild(b);
    });
    bandeau.style.display = 'flex';
  }
  function cacherBandeau() {
    if (bandeau) bandeau.style.display = 'none';
  }

  // Jeu de la page ouverte (connu dès sa première connexion). Sert au réveil
  // du téléphone : s'il dormait pendant que le groupe changeait de jeu, il a
  // pu rater l'annonce « salon_jeu » (connexion restée ouverte mais muette),
  // et la page croirait encore jouer à l'ancien jeu.
  let jeuDeLaPage = null;

  const Soiree = {
    JEUX,
    SERVEURS,

    // --- Prénom ---
    nom() { return propre(lire(CLE_NOM)); },
    definirNom(nom) {
      nom = propre(nom);
      if (nom) ecrire(CLE_NOM, nom);
      return nom;
    },

    // --- Soirée en cours ---
    // code : la soirée (4 lettres, c'est aussi sa table 1) ;
    // table : la table où l'on joue ("ABCD", "ABCD-2"...).
    actuelle() {
      const s = lire(CLE_SOIREE);
      if (!s || !/^[A-Z]{4}$/.test(s.code || '')) return null;
      if (Date.now() - (s.vu || 0) > DUREE_SOIREE) { ecrire(CLE_SOIREE, null); return null; }
      if (!Soiree.estTable(s.table) || Soiree.soireeDe(s.table) !== s.code) s.table = s.code;
      return s;
    },
    estTable(code) { return /^[A-Z]{4}(-[2-9])?$/.test(String(code || '')); },
    soireeDe(code) { return String(code || '').split('-')[0]; },
    numeroTable(code) { const n = String(code || '').split('-')[1]; return n ? Number(n) : 1; },
    // Appelé à chaque connexion d'une page de jeu, et par l'accueil.
    memoriser(code, serveur) {
      code = String(code || '').toUpperCase();
      if (!Soiree.estTable(code)) return;
      ecrire(CLE_SOIREE, { code: Soiree.soireeDe(code), table: code,
        serveur: SERVEURS[serveur] ? serveur : 'render', vu: Date.now() });
    },
    oublier() { ecrire(CLE_SOIREE, null); },

    http(serveur) { return (SERVEURS[serveur] || SERVEURS.render).http; },
    async info(code, serveur) {
      const rep = await fetch(Soiree.http(serveur) + '/salon/' + encodeURIComponent(code));
      return rep.json();
    },
    async infoSoiree(code, serveur) {
      const rep = await fetch(Soiree.http(serveur) + '/soiree/' + encodeURIComponent(code));
      return rep.json();
    },
    async nouvelleTable(code, serveur) {
      const rep = await fetch(Soiree.http(serveur) + '/soiree/' + encodeURIComponent(code) + '/nouvelle-table');
      return rep.json();
    },
    lienJeu(jeu, code) {
      const page = JEUX[jeu] ? JEUX[jeu].page : jeu;
      return code ? page + '?salon=' + encodeURIComponent(code) : page;
    },

    // --- Dans une page de jeu ---

    // À appeler sur chaque message du serveur, avant le jeu. Renvoie vrai si
    // le message concernait la soirée (le jeu n'a alors rien à en faire).
    traiterMessage(msg, jeuPage) {
      jeuDeLaPage = jeuPage;
      if (!msg || typeof msg.type !== 'string') return false;
      const s = Soiree.actuelle();
      if (msg.type === 'salon_jeu') {
        if (msg.jeu === jeuPage) { cacherBandeau(); return true; }
        const titre = msg.titre || (JEUX[msg.jeu] || {}).titre || 'un autre jeu';
        afficherBandeau('Le groupe passe à ' + titre + '…');
        setTimeout(() => { location.href = Soiree.lienJeu(msg.page || msg.jeu, s && s.table); }, 1200);
        return true;
      }
      if (msg.type === 'salon_retour') {
        // Retour en salle d'attente : on recharge la page, qui rejoint le
        // salon et affiche sa salle d'attente.
        location.href = Soiree.lienJeu(jeuPage, s && s.table);
        return true;
      }
      return false;
    },

    // Après la connexion : si un AUTRE jeu tourne dans la soirée, on le dit
    // et on propose de le rejoindre (on arrive sinon dans une salle
    // d'attente vide de sens).
    async verifierJeuEnCours(jeuPage) {
      jeuDeLaPage = jeuPage;
      const s = Soiree.actuelle();
      if (!s) return;
      try {
        const info = await Soiree.info(s.table, s.serveur);
        if (info.existe && info.jeu && info.jeu !== jeuPage && JEUX[info.jeu]) {
          const j = JEUX[info.jeu];
          const ou = Soiree.numeroTable(s.table) > 1 ? ' (table ' + Soiree.numeroTable(s.table) + ')' : '';
          afficherBandeau(j.icone + ' Ta table joue à ' + j.titre + ou + '.', [
            ['Rejoindre', () => { location.href = Soiree.lienJeu(info.jeu, s.table); }],
            ['Rester ici', cacherBandeau, true],
          ]);
        } else {
          cacherBandeau();
        }
      } catch (e) { /* serveur injoignable : rien à dire */ }
    },

    // Bouton « Démarrer » d'un jeu : si un autre jeu tourne, il sera remplacé
    // pour tout le monde, donc on demande d'abord.
    async lancer(jeuPage, envoyer) {
      const s = Soiree.actuelle();
      if (s) {
        try {
          const info = await Soiree.info(s.table, s.serveur);
          if (info.existe && info.jeu && info.jeu !== jeuPage && JEUX[info.jeu]) {
            const ok = confirm('Une partie de ' + JEUX[info.jeu].titre + ' est en cours à ta table.\n' +
              'La remplacer par ' + (JEUX[jeuPage] || {}).titre + ' pour toute la table ?');
            if (!ok) return;
          }
        } catch (e) { /* serveur injoignable : le lancement partira quand même */ }
      }
      cacherBandeau();
      envoyer();
    },
  };

  // Retour sur la page (téléphone déverrouillé, appli rouverte, réseau
  // revenu) : on revérifie quel jeu tourne dans la soirée.
  let cacheeDepuis = 0;
  function auReveil() {
    if (!jeuDeLaPage) return;
    const absence = cacheeDepuis ? Date.now() - cacheeDepuis : 0;
    cacheeDepuis = 0;
    if (absence > 2000) Soiree.verifierJeuEnCours(jeuDeLaPage);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cacheeDepuis = Date.now(); else auReveil();
  });
  window.addEventListener('online', () => { if (jeuDeLaPage) Soiree.verifierJeuEnCours(jeuDeLaPage); });

  window.Soiree = Soiree;
})();
