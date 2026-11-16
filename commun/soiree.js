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

  // Confirmation dessinée dans la page. Surtout pas confirm() : la boîte
  // native fige toute la page (battement de cœur compris) ; un joueur qui
  // met plus de 25 s à répondre était alors déclaré parti par le serveur,
  // sa connexion coupée, et son « oui » partait dans le vide.
  function confirmer(texte, oui, non) {
    return new Promise((resolve) => {
      const voile = document.createElement('div');
      voile.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.6);display:grid;place-items:center;padding:20px';
      const boiteC = document.createElement('div');
      boiteC.setAttribute('role', 'dialog');
      boiteC.style.cssText = 'max-width:420px;width:100%;background:#0d1626;color:#f4f1ea;border:1px solid rgba(255,255,255,.16);' +
        'border-radius:18px;padding:18px;font:500 16px/1.4 Outfit, system-ui, sans-serif;box-shadow:0 20px 50px rgba(0,0,0,.5)';
      const p = document.createElement('p');
      p.style.whiteSpace = 'pre-line';
      p.textContent = texte;
      const ligne = document.createElement('div');
      ligne.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;margin-top:16px;flex-wrap:wrap';
      const bouton = (libelle, valeur, principal) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = libelle;
        b.style.cssText = 'border:0;border-radius:12px;padding:10px 16px;font:700 15px Outfit, system-ui, sans-serif;cursor:pointer;' +
          (principal ? 'background:#dfe6ef;color:#0b1220' : 'background:rgba(255,255,255,.1);color:#f4f1ea');
        b.addEventListener('click', () => { voile.remove(); resolve(valeur); });
        return b;
      };
      ligne.append(bouton(non || 'Annuler', false, false), bouton(oui || 'Confirmer', true, true));
      boiteC.append(p, ligne);
      voile.appendChild(boiteC);
      document.body.appendChild(voile);
    });
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
    // nom : se compter présent dans la soirée (la liste « Dans la soirée » de l'accueil)
    // table : la sienne, pour qu'on puisse le rejoindre depuis la liste des présents
    async infoSoiree(code, serveur, nom, table) {
      const rep = await fetch(Soiree.http(serveur) + '/soiree/' + encodeURIComponent(code) +
        (nom ? '?nom=' + encodeURIComponent(nom) + (table ? '&table=' + encodeURIComponent(table) : '') : ''));
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
      Soiree.boutonEnquete();
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
            const ok = await confirmer('Une partie de ' + JEUX[info.jeu].titre + ' est en cours à ta table.\n' +
              'La remplacer par ' + (JEUX[jeuPage] || {}).titre + ' pour toute la table ?', 'Remplacer', 'Garder ' + JEUX[info.jeu].titre);
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

  // --- L'Enquête par-dessus le jeu ---
  // Un onglet « 🔍 » sur le bord gauche ouvre la page de l'Enquête dans un
  // calque plein écran. Elle a sa propre connexion (« soirée ») : la partie
  // en cours n'est pas dérangée. Fermer le calque le cache sans le détruire,
  // pour garder la connexion et l'état.
  let calque = null;
  Soiree.boutonEnquete = function () {
    if (document.getElementById('onglet-enquete') || !Soiree.actuelle()) return;
    const b = document.createElement('button');
    b.id = 'onglet-enquete';
    b.type = 'button';
    b.setAttribute('aria-label', 'Ouvrir l\'enquête');
    b.textContent = '🔍';
    b.style.cssText = 'position:fixed;left:0;top:42%;z-index:99990;border:1px solid rgba(201,162,74,.5);' +
      'border-left:0;border-radius:0 14px 14px 0;padding:10px 9px 10px 7px;font-size:20px;line-height:1;' +
      'background:rgba(26,11,14,.88);color:#f3e6cf;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.4)';
    b.addEventListener('click', ouvrirEnquete);
    document.body.appendChild(b);
  };
  function ouvrirEnquete() {
    if (!calque) {
      calque = document.createElement('div');
      calque.style.cssText = 'position:fixed;inset:0;z-index:99995;background:#1a0b0e;display:flex;flex-direction:column';
      const fermer = document.createElement('button');
      fermer.type = 'button';
      fermer.textContent = '✕ Retour au jeu';
      fermer.style.cssText = 'align-self:flex-end;margin:max(10px, env(safe-area-inset-top)) 12px 0 0;border:1px solid rgba(201,162,74,.4);' +
        'border-radius:999px;padding:8px 14px;background:rgba(243,230,207,.08);color:#f3e6cf;font:600 14px Outfit, system-ui, sans-serif;cursor:pointer';
      fermer.addEventListener('click', () => {
        calque.style.display = 'none';
        // La maison 3D de l'enquête se met en pause : un seul rendu 3D à la fois.
        try { cadre.contentWindow.postMessage('enquete:pause', '*'); } catch (e) { /* tant pis */ }
      });
      const cadre = document.createElement('iframe');
      cadre.src = 'enquete.html?dans=1';
      cadre.title = 'Enquête';
      cadre.style.cssText = 'flex:1;border:0;width:100%';
      calque.append(fermer, cadre);
      document.body.appendChild(calque);
    }
    calque.style.display = 'flex';
    const cadreOuvert = calque.querySelector('iframe');
    try { cadreOuvert.contentWindow.postMessage('enquete:reprise', '*'); } catch (e) { /* tant pis */ }
  }

  Soiree.confirmer = confirmer;
  window.Soiree = Soiree;
})();
