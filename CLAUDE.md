# Consignes pour Claude

## Fusion systématique
Après chaque modification demandée, sans redemander l'accord :
1. commiter et pousser sur la branche de travail ;
2. ouvrir une pull request vers `main` ;
3. la fusionner dans `main` (fusion classique) dès que les vérifications passent.

Si le serveur (dépôt `kinito-serveur`) change aussi, fusionner d'abord le serveur, puis ce dépôt :
les pages appellent le serveur publié sur Render (`Soiree.SERVEURS` dans `commun/soiree.js`).

## Le projet
Site des jeux de soirée (application installable « SHIELD »), publié depuis `main`.
Chaque jeu en ligne est une page `*-3d-jeu.html` (Three.js) : kinito, beerbattle, buckshot,
picolopoly, menteur (affiché « Cal 12 »), casino, undercover. Les pages `*-en-ligne.html`
sont les anciennes versions : elles ne chargent pas `commun/soiree.js`.
Le serveur multijoueur est le dépôt `kinito-serveur` (son README décrit tous les messages).

## Direction artistique (`da/`)
- `da/themes/<thème>.css|.js` : l'identité de chaque jeu (bistrot, brasserie, casino60...).
- `da/mise-en-page.css` est chargé en DERNIER, après le style du jeu et son thème : il garantit
  que rien ne se superpose (téléphone, paysage). `da/cadrage.js` cadre la caméra sur la table
  dans la place qui reste.
- Décors 3D partagés dans `commun/` (`decors3d.js`, `manoir3d.js`).

## La soirée (commun/soiree.js)
Chargé par l'accueil et par chaque page de jeu : prénom saisi une seule fois (`shield.nom`),
code de soirée commun à tous les jeux (`shield.soiree`). Quand le serveur annonce `salon_jeu`,
chaque page ouvre le nouveau jeu.
Une nouvelle page de jeu doit appeler `Soiree.memoriser`, `Soiree.traiterMessage`,
`Soiree.verifierJeuEnCours` et passer son bouton de lancement par `Soiree.lancer`.

`Soiree.lancer` protège la partie en cours : si un autre jeu pas fini tourne à la table, il
demande confirmation (avec depuis quand et avec qui, via `/salon/{code}`) et n'ajoute
`remplacer: true` au message de démarrage qu'après un « Remplacer » explicite. Si la
vérification échoue (réseau), il envoie sans ce drapeau et le serveur refuse de remplacer.
Chaque page doit donc transmettre les options de `Soiree.lancer` à son message de démarrage.

## Les jeux en parallèle (onglet « En parallèle » de l'accueil)
Enquête (`enquete.html`) et Bingo de soirée (`bingo.html`) tournent pendant toute la soirée, à côté
des jeux de table. Ils parlent au serveur par `/ws-soiree` (le Bingo avec `?page=bingo`), jamais par
la place à une table. Dans chaque jeu, `commun/soiree.js` ajoute leurs onglets 🔍 et 🎯 sur le bord
gauche, chacun seulement si son jeu est lancé et pas fini (`couches_en_cours` de `/soiree/{code}`,
revérifié toutes les 30 s) ; ils s'ouvrent dans un calque plein écran.

## Appli installée
`service-worker.js` sert toujours le réseau d'abord (la copie gardée n'est qu'un secours si le
réseau du bar est lent) : une mise à jour du site arrive tout de suite, inutile de changer
`CACHE` pour la publier. Pas de mode hors ligne : sans serveur, on ne joue pas.
