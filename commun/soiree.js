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
    picolopoly: { titre: 'Picopoly',   page: 'picolopoly-3d-jeu.html', icone: '🍕' },
    menteur:    { titre: 'Cal 12',     page: 'menteur-3d-jeu.html',    icone: '⚓' },
    casino:     { titre: 'Casino',     page: 'casino-3d-jeu.html',     icone: '🎰' },
    undercover: { titre: 'Undercover', page: 'undercover-3d-jeu.html', icone: '🕵️' },
    telephone:  { titre: 'Gribouillophone', page: 'telephone-jeu.html', icone: '🖍️' },
    conquete:   { titre: 'Royaumes',   page: 'conquete-3d-jeu.html',   icone: '🏰' },
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
  // ---------------- Animation de défaite (et petite victoire) ----------------
  // =====================================================================
  // ÉCRANS DE RÉSULTAT, communs à tous les jeux
  //
  // Le serveur annonce « table_resultat » à toute la table (manche de
  // Kinito, fin de partie de chaque jeu...). TOUT LE MONDE voit le même
  // écran : qui perd, qui gagne, et combien chacun boit. Le titre est
  // personnel (« Perdu ! », « Bien joué ! », « Fin de la manche ») et la
  // ligne du joueur est mise en avant. L'écran prend les couleurs et la
  // police du jeu (variables CSS --accent, --police-titre) ; il se ferme
  // seul après quelques secondes, ou d'un toucher.
  //
  // annonce() : la grande annonce d'un coup de jeu (un tir, une révélation),
  // en haut de l'écran, au-dessus de la 3D.
  // =====================================================================
  const hasard = (l) => l[Math.floor(Math.random() * l.length)];
  function stylesResultat() {
    if (document.getElementById('styles-resultat')) return;
    const st = document.createElement('style');
    st.id = 'styles-resultat';
    st.textContent = `
      .res-voile { position: fixed; inset: 0; z-index: 99993; display: grid; place-items: center; overflow: hidden; padding: 16px;
        font-family: var(--police, Outfit, system-ui, sans-serif); animation: res-entre 0.35s ease-out both; cursor: pointer; }
      .res-voile.sort { animation: res-sort 0.35s ease-in forwards; }
      .res-voile.perdu { background: radial-gradient(circle at 50% 40%, rgba(170, 16, 26, 0.85), rgba(26, 0, 4, 0.96) 72%); }
      .res-voile.gagne { background: radial-gradient(circle at 50% 40%, rgba(200, 150, 40, 0.75), rgba(20, 12, 0, 0.96) 72%); }
      .res-voile.neutre { background: radial-gradient(circle at 50% 40%, color-mix(in srgb, var(--accent, #f59e2e) 45%, rgba(6, 6, 8, 0.9)), rgba(6, 6, 8, 0.96) 72%); }
      .res-voile.perdu .res-carte { border-color: rgba(255, 110, 100, 0.55); }
      .res-voile.gagne .res-carte { border-color: rgba(255, 210, 120, 0.55); }
      .res-carte { position: relative; z-index: 2; width: min(440px, 100%); box-sizing: border-box; text-align: center; color: #fff;
        padding: 18px 16px 14px; border-radius: 22px; background: var(--verre-fort, rgba(12, 10, 8, 0.94));
        border: 1px solid rgba(255, 255, 255, 0.16); box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6); animation: res-secousse 0.5s 0.45s both; }
      .res-emoji { font-size: 76px; line-height: 1; display: inline-block; animation: res-chute 0.9s cubic-bezier(.3, 1.6, .5, 1) both; filter: drop-shadow(0 10px 18px rgba(0,0,0,.5)); }
      .res-titre { margin-top: 6px; font: 400 clamp(32px, 10vw, 44px)/1.05 var(--police-titre, var(--police, Outfit)), system-ui, sans-serif; font-weight: 800;
        letter-spacing: 0.02em; text-shadow: 0 4px 18px rgba(0,0,0,.6); animation: res-titre 0.5s 0.3s both; }
      .res-sous { margin-top: 8px; font-size: 18px; font-weight: 600; color: #ffe8cc; animation: res-titre 0.5s 0.45s both; }
      .res-moi { display: inline-block; margin-top: 14px; padding: 10px 20px; border-radius: 999px; font-size: 24px; font-weight: 800;
        background: rgba(0, 0, 0, 0.55); border: 2px solid var(--accent, #f59e2e); animation: res-titre 0.5s 0.6s both; }
      .res-liste { margin: 16px auto 0; display: flex; flex-direction: column; gap: 6px; animation: res-monte 0.45s 0.75s both; }
      .res-ligne { display: flex; align-items: center; gap: 10px; padding: 8px 14px; border-radius: 12px; font-size: 17px; font-weight: 600;
        background: rgba(0, 0, 0, 0.45); border: 1px solid rgba(255, 255, 255, 0.12); text-align: left; }
      .res-ligne .n { flex: 1 1 auto; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .res-ligne .g { font-weight: 800; white-space: nowrap; }
      .res-ligne.perdant { border-color: rgba(255, 110, 100, 0.7); background: rgba(120, 10, 16, 0.55); }
      .res-ligne.gagnant { border-color: rgba(255, 210, 120, 0.7); background: rgba(90, 60, 0, 0.5); }
      .res-ligne.moi { outline: 2px solid #fff; outline-offset: 1px; }
      .res-fermer { margin-top: 14px; font-size: 13px; color: rgba(255, 255, 255, 0.55); animation: res-monte 0.4s 1s both; }
      .res-pluie { position: absolute; z-index: 1; top: -60px; font-size: 32px; pointer-events: none; animation: res-pluie linear forwards; }
      .res-annonce { position: fixed; left: calc(var(--zone-gauche, 0px) + 8px); right: calc(var(--zone-droite, 0px) + 8px); top: calc(var(--haut-libre, 16vh) + 6px); z-index: 99970; text-align: center; pointer-events: none; }
      .res-annonce .gros { font: 400 clamp(34px, 12vmin, 86px)/1.05 var(--police-titre, var(--police, Outfit)), system-ui, sans-serif; font-weight: 900;
        letter-spacing: 0.03em; color: var(--c); text-shadow: 0 0 24px var(--c), 0 6px 22px rgba(0, 0, 0, 0.9); animation: res-pop 0.45s cubic-bezier(.2, 1.6, .4, 1) both; }
      .res-annonce .petit { display: inline-block; margin-top: 10px; padding: 8px 18px; border-radius: 999px; background: rgba(0, 0, 0, 0.7);
        border: 1px solid var(--c); color: #fff; font: 700 clamp(17px, 5vw, 23px)/1.25 var(--police, Outfit), system-ui, sans-serif; animation: res-monte 0.4s 0.12s both; }
      .res-annonce.sort { animation: res-sort 0.3s ease-in forwards; }
      .res-flash { position: fixed; inset: 0; z-index: 99969; pointer-events: none; background: var(--c); animation: res-flash 0.6s ease-out forwards; }
      @keyframes res-entre { from { opacity: 0; } to { opacity: 1; } }
      @keyframes res-sort { to { opacity: 0; } }
      @keyframes res-chute { 0% { transform: translateY(-120vh) rotate(-30deg) scale(.6); } 70% { transform: translateY(0) rotate(8deg) scale(1.1); } 100% { transform: none; } }
      @keyframes res-titre { from { opacity: 0; transform: scale(1.8); } to { opacity: 1; transform: none; } }
      @keyframes res-monte { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
      @keyframes res-pop { from { opacity: 0; transform: scale(2.2) rotate(-6deg); } to { opacity: 1; transform: none; } }
      @keyframes res-flash { 0% { opacity: 0.5; } 100% { opacity: 0; } }
      @keyframes res-secousse { 0%, 100% { transform: none; } 20% { transform: translateX(-14px) rotate(-2deg); } 40% { transform: translateX(12px) rotate(2deg); }
        60% { transform: translateX(-8px); } 80% { transform: translateX(5px); } }
      @keyframes res-pluie { to { transform: translateY(115vh) rotate(var(--tour, 200deg)); } }
      @media (prefers-reduced-motion: reduce) { .res-carte, .res-emoji, .res-titre, .res-sous, .res-moi, .res-liste, .res-annonce .gros, .res-annonce .petit { animation: none; } .res-pluie, .res-flash { display: none; } }
    `;
    document.head.appendChild(st);
  }

  const egal = (a, b) => (a || '').trim().toLowerCase() === (b || '').trim().toLowerCase();
  function texteDose(n, passe) {
    if (n === null) return passe ? 'cul sec' : 'cul sec !';
    if (typeof n === 'number' && n > 0) return (passe ? '' : '+') + n + ' gorgée' + (n > 1 ? 's' : '');
    return passe ? '0 gorgée' : '';
  }

  // donnees : {
  //   evt: 'manche' | 'victoire',
  //   perdants: [noms], gagnants: [noms],
  //   gorgees: { nom: n | null (cul sec) }  -> à boire MAINTENANT,
  //   bues:    { nom: n }                   -> déjà bues (bilan, ex. Buckshot),
  //   joueurs: [noms] (facultatif : pour lister aussi ceux qui ne boivent pas),
  //   notes:   { nom: texte } (facultatif : ce qu'on écrit à droite quand il ne boit pas,
  //            ex. « distribue 2 🍺 » au casino),
  //   titre, sous (facultatifs : remplacent les textes par défaut),
  //   duree (s, défaut 5.5)
  // }
  let ecranCourant = null;
  function ecranResultat(d) {
    stylesResultat();
    if (ecranCourant) ecranCourant.remove();
    const moi = Soiree.nom();
    const perdants = d.perdants || [], gagnants = d.gagnants || [];
    const gorgees = d.gorgees || {}, bues = d.bues || null;
    const perdu = !!moi && perdants.some(n => egal(n, moi));
    const gagne = !!moi && !perdu && gagnants.some(n => egal(n, moi));
    const partie = d.evt === 'victoire';

    const voile = document.createElement('div');
    voile.className = 'res-voile ' + (perdu ? 'perdu' : gagne ? 'gagne' : 'neutre');
    voile.setAttribute('role', 'alertdialog');
    voile.setAttribute('aria-live', 'assertive');
    const carte = document.createElement('div');
    carte.className = 'res-carte';
    const emoji = document.createElement('div');
    emoji.className = 'res-emoji';
    emoji.textContent = perdu ? hasard(['💀', '🥴', '🤡', '😵', '🫠']) : gagne ? hasard(['🏆', '👑', '🥇']) : (partie ? '🏁' : '🍻');
    const titre = document.createElement('div');
    titre.className = 'res-titre';
    titre.textContent = d.titre || (perdu ? hasard(['Perdu !', 'Aïe aïe aïe…', 'Raté !']) : gagne ? hasard(['Bien joué !', 'Victoire !'])
      : partie ? 'Fin de la partie' : 'Fin de la manche');
    const sous = document.createElement('div');
    sous.className = 'res-sous';
    const liste = (l) => l.length > 2 ? l.slice(0, -1).join(', ') + ' et ' + l[l.length - 1] : l.join(' et ');
    sous.textContent = d.sous || [
      gagnants.length ? liste(gagnants) + (gagnants.length > 1 ? ' gagnent' : ' gagne') + (partie ? ' la partie' : ' la manche') : '',
      perdants.length ? liste(perdants) + (perdants.length > 1 ? ' perdent' : ' perd') + (partie && !gagnants.length ? ' la partie' : '') : '',
    ].filter(Boolean).join(' · ');
    carte.append(emoji, titre, sous);

    // Ma dose, en gros : c'est ce qu'il faut voir de loin.
    const maDose = moi ? Object.keys(gorgees).find(n => egal(n, moi)) : undefined;
    if (maDose !== undefined && (gorgees[maDose] === null || gorgees[maDose] > 0)) {
      const m = document.createElement('div');
      m.className = 'res-moi';
      m.textContent = '🍺 Tu bois : ' + texteDose(gorgees[maDose], true);
      carte.appendChild(m);
    }

    // Toute la table : perdants d'abord, puis les autres, puis les gagnants.
    const noms = [];
    const ajouter = (n) => { if (n && !noms.some(x => egal(x, n))) noms.push(n); };
    perdants.forEach(ajouter);
    Object.keys(gorgees).forEach(ajouter);
    if (bues) Object.keys(bues).sort((a, b) => (bues[b] || 0) - (bues[a] || 0)).forEach(ajouter);
    (d.joueurs || []).forEach(ajouter);
    gagnants.forEach(ajouter);
    if (noms.length) {
      const l = document.createElement('div');
      l.className = 'res-liste';
      noms.forEach(n => {
        const ligne = document.createElement('div');
        const estPerdant = perdants.some(x => egal(x, n)), estGagnant = gagnants.some(x => egal(x, n));
        ligne.className = 'res-ligne' + (estPerdant ? ' perdant' : estGagnant ? ' gagnant' : '') + (moi && egal(n, moi) ? ' moi' : '');
        const a = document.createElement('span');
        a.className = 'n';
        a.textContent = (estPerdant ? '💀 ' : estGagnant ? '🏆 ' : '') + n + (moi && egal(n, moi) ? ' (toi)' : '');
        const b = document.createElement('span');
        b.className = 'g';
        const k = Object.keys(gorgees).find(x => egal(x, n));
        if (k !== undefined && (gorgees[k] === null || gorgees[k] > 0)) b.textContent = '🍺 ' + texteDose(gorgees[k], false);
        else if (bues) { const kb = Object.keys(bues).find(x => egal(x, n)); b.textContent = '🍺 ' + texteDose(kb !== undefined ? bues[kb] : 0, true); }
        else {
          const kn = d.notes ? Object.keys(d.notes).find(x => egal(x, n)) : undefined;
          b.textContent = kn !== undefined ? d.notes[kn] : estGagnant ? 'ne boit pas' : '';
        }
        ligne.append(a, b);
        l.appendChild(ligne);
      });
      carte.appendChild(l);
    }
    const fermer = document.createElement('div');
    fermer.className = 'res-fermer';
    fermer.textContent = 'Touche pour fermer';
    carte.appendChild(fermer);
    voile.appendChild(carte);

    if (perdu || gagne) {
      const pluie = perdu ? ['🍺', '💀', '🤡', '🍺', '🥴'] : ['🎉', '✨', '🏆', '🎊'];
      for (let i = 0; i < 14; i++) {
        const g = document.createElement('span');
        g.className = 'res-pluie';
        g.textContent = hasard(pluie);
        g.style.left = Math.round(Math.random() * 96) + 'vw';
        g.style.animationDuration = (1.4 + Math.random() * 1.2).toFixed(2) + 's';
        g.style.animationDelay = (0.2 + Math.random() * 0.9).toFixed(2) + 's';
        g.style.setProperty('--tour', Math.round(Math.random() * 360 - 180) + 'deg');
        voile.appendChild(g);
      }
      try { if (navigator.vibrate) navigator.vibrate(perdu ? [90, 60, 220] : [40, 40, 40]); } catch (e) { /* pas de vibreur */ }
    }
    const fin = () => {
      if (!voile.isConnected) return;
      voile.classList.add('sort');
      setTimeout(() => voile.remove(), 360);
      if (ecranCourant === voile) ecranCourant = null;
    };
    voile.addEventListener('click', fin);
    document.body.appendChild(voile);
    ecranCourant = voile;
    setTimeout(fin, (d.duree || 5.5) * 1000);
  }

  let annonceCourante = null, minuteurAnnonce = null;
  function annonce(gros, petit, { couleur = '#f4f1ea', duree = 1.8, flash = false, vibrer = null } = {}) {
    stylesResultat();
    if (annonceCourante) annonceCourante.remove();
    clearTimeout(minuteurAnnonce);
    const a = document.createElement('div');
    a.className = 'res-annonce';
    a.setAttribute('role', 'status');
    a.style.setProperty('--c', couleur);
    const g = document.createElement('div'); g.className = 'gros'; g.textContent = gros; a.appendChild(g);
    if (petit) { const p = document.createElement('div'); p.className = 'petit'; p.textContent = petit; a.appendChild(p); }
    if (flash) {
      const f = document.createElement('div'); f.className = 'res-flash'; f.style.setProperty('--c', couleur);
      document.body.appendChild(f); setTimeout(() => f.remove(), 700);
    }
    if (vibrer) { try { if (navigator.vibrate) navigator.vibrate(vibrer); } catch (e) { /* pas de vibreur */ } }
    document.body.appendChild(a);
    annonceCourante = a;
    minuteurAnnonce = setTimeout(() => { a.classList.add('sort'); setTimeout(() => { a.remove(); if (annonceCourante === a) annonceCourante = null; }, 320); }, duree * 1000);
  }

  function animerResultat(msg) {
    if (!Array.isArray(msg.perdants)) return;
    // Laisse le jeu jouer son propre coup (révélation, tir) d'abord.
    setTimeout(() => ecranResultat({
      evt: msg.evt, perdants: msg.perdants, gagnants: msg.gagnants || [],
      gorgees: msg.gorgees || {}, bues: msg.bues || null, joueurs: msg.joueurs || [],
    }), msg.delai != null ? msg.delai : 1200);
  }

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

    // --- Écrans communs : résultat de manche / partie, annonce d'un coup ---
    ecranResultat,
    annonce,

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
      if (msg.type === 'table_resultat') { animerResultat(msg); return true; }
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
      Soiree.ongletsParalleles();
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
    // pour tout le monde, donc on demande d'abord. envoyer({ remplacer: true })
    // seulement après un « Remplacer » explicite : sans ce drapeau, le serveur
    // refuse de remplacer une partie pas finie. Ainsi, une page qui rame et
    // n'arrive pas à vérifier ce qui tourne ne casse plus la partie des autres.
    async lancer(jeuPage, envoyer) {
      const s = Soiree.actuelle();
      let options = {};
      if (s) {
        try {
          const info = await Soiree.info(s.table, s.serveur);
          if (info.existe && info.jeu && info.jeu !== jeuPage && JEUX[info.jeu]) {
            const titre = JEUX[info.jeu].titre;
            const min = info.depuis ? Math.round(info.depuis / 60) : 0;
            const depuis = min >= 1 ? ' depuis ' + (min >= 60 ? Math.floor(min / 60) + ' h ' + String(min % 60).padStart(2, '0') : min + ' min') : '';
            const qui = (info.joueurs || []).length ? ' avec ' + info.joueurs.join(', ') : '';
            const ok = await confirmer((info.fini ? 'La partie de ' + titre + ' est finie à ta table.\n'
              : '⚠️ Une partie de ' + titre + ' est en cours à ta table' + depuis + qui + '.\n') +
              'La remplacer par ' + (JEUX[jeuPage] || {}).titre + ' pour toute la table ?' +
              (info.fini ? '' : ' Elle sera perdue pour tout le monde.'), 'Remplacer', 'Garder ' + titre);
            if (!ok) return;
            options = { remplacer: true };
          }
        } catch (e) { /* serveur injoignable : on envoie sans « remplacer », le serveur protège la partie en cours */ }
      }
      cacherBandeau();
      envoyer(options);
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

  // --- Les jeux en parallèle par-dessus le jeu (Enquête, Bingo) ---
  // Un onglet sur le bord gauche ouvre la page du jeu parallèle dans un
  // calque plein écran. Elle a sa propre connexion (« soirée ») : la partie
  // en cours n'est pas dérangée. Fermer le calque le cache sans le détruire,
  // pour garder la connexion et l'état.
  const PARALLELES = {
    enquete: { icone: '🔍', titre: 'l\'enquête', page: 'enquete.html?dans=1', haut: '42%', fond: '#1a0b0e',
      bord: 'rgba(201,162,74,.5)', teinte: 'rgba(26,11,14,.88)', texte: '#f3e6cf', message: 'enquete' },
    bingo: { icone: '🎯', titre: 'le bingo', page: 'bingo.html?dans=1', haut: 'calc(42% + 52px)', fond: '#050a14',
      bord: 'rgba(52,211,153,.55)', teinte: 'rgba(5,10,20,.9)', texte: '#d1fae5', message: null },
  };
  const calques = {};
  function boutonParallele(cle) {
    const p = PARALLELES[cle];
    if (document.getElementById('onglet-' + cle) || !Soiree.actuelle()) return;
    const b = document.createElement('button');
    b.id = 'onglet-' + cle;
    b.type = 'button';
    b.setAttribute('aria-label', 'Ouvrir ' + p.titre);
    b.textContent = p.icone;
    b.style.cssText = 'position:fixed;left:0;top:' + p.haut + ';z-index:99990;border:1px solid ' + p.bord + ';' +
      'border-left:0;border-radius:0 14px 14px 0;padding:10px 9px 10px 7px;font-size:20px;line-height:1;' +
      'background:' + p.teinte + ';color:' + p.texte + ';cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.4)';
    b.addEventListener('click', () => ouvrirParallele(cle));
    document.body.appendChild(b);
  }
  function ouvrirParallele(cle) {
    const p = PARALLELES[cle];
    let calque = calques[cle];
    if (!calque) {
      calque = calques[cle] = document.createElement('div');
      calque.style.cssText = 'position:fixed;inset:0;z-index:99995;background:' + p.fond + ';display:flex;flex-direction:column';
      const fermer = document.createElement('button');
      fermer.type = 'button';
      fermer.textContent = '✕ Retour au jeu';
      fermer.style.cssText = 'align-self:flex-end;margin:max(10px, env(safe-area-inset-top)) 12px 0 0;border:1px solid ' + p.bord + ';' +
        'border-radius:999px;padding:8px 14px;background:rgba(255,255,255,.08);color:' + p.texte + ';font:600 14px Outfit, system-ui, sans-serif;cursor:pointer';
      const cadre = document.createElement('iframe');
      fermer.addEventListener('click', () => {
        calque.style.display = 'none';
        // La maison 3D de l'enquête se met en pause : un seul rendu 3D à la fois.
        if (p.message) try { cadre.contentWindow.postMessage(p.message + ':pause', '*'); } catch (e) { /* tant pis */ }
      });
      cadre.src = p.page;
      cadre.title = p.titre;
      cadre.style.cssText = 'flex:1;border:0;width:100%';
      calque.append(fermer, cadre);
      document.body.appendChild(calque);
    }
    // Un seul calque visible à la fois.
    Object.entries(calques).forEach(([k, c]) => { if (k !== cle) c.style.display = 'none'; });
    calque.style.display = 'flex';
    const cadreOuvert = calque.querySelector('iframe');
    if (p.message) try { cadreOuvert.contentWindow.postMessage(p.message + ':reprise', '*'); } catch (e) { /* tant pis */ }
  }
  // Chaque onglet n'apparaît que si son jeu est en cours dans la soirée
  // (couche « enq » pour l'Enquête, « bng » pour le Bingo), et disparaît
  // quand il se termine. Revérifié toutes les 30 s et au retour sur l'appli : une enquête
  // lancée pendant la partie fait apparaître sa loupe sans recharger.
  const COUCHES = { enquete: 'enq', bingo: 'bng' };
  let suiviParalleles = null;
  async function majOngletsParalleles() {
    const s = Soiree.actuelle();
    let couches = [];
    if (s) {
      try {
        const info = await Soiree.infoSoiree(s.code, s.serveur, Soiree.nom(), s.table);
        // Seulement les jeux LANCÉS (pas une enquête restée en salle
        // d'attente ni un bingo terminé). Ancien serveur sans cette liste :
        // aucun onglet plutôt que des onglets fantômes.
        couches = info.existe ? info.couches_en_cours || [] : [];
      } catch (e) { return; }      // serveur injoignable : on ne touche à rien
    }
    Object.entries(COUCHES).forEach(([cle, couche]) => {
      if (couches.includes(couche)) boutonParallele(cle);
      else {
        const b = document.getElementById('onglet-' + cle);
        if (b) b.remove();
        // Calque fermé ou jamais ouvert : on l'oublie (il se recréera au besoin).
        if (calques[cle] && calques[cle].style.display === 'none') { calques[cle].remove(); delete calques[cle]; }
      }
    });
  }
  Soiree.ongletsParalleles = function () {
    majOngletsParalleles();
    if (suiviParalleles) return;
    suiviParalleles = setInterval(() => { if (!document.hidden) majOngletsParalleles(); }, 30000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) majOngletsParalleles(); });
  };
  // Anciens noms, gardés pour les pages qui les appelleraient encore.
  Soiree.boutonEnquete = Soiree.ongletsParalleles;
  Soiree.boutonBingo = Soiree.ongletsParalleles;

  Soiree.confirmer = confirmer;
  Soiree.animerResultat = animerResultat;
  window.Soiree = Soiree;
})();
