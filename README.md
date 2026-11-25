# table-de-jeu
## Mode test (jouer contre des bots)

Avec le pseudo **Admin01** (majuscules indifférentes), chaque jeu affiche un onglet 🧪 sur le
bord gauche, une fois la page connectée à une table. Il ouvre un petit panneau pour ajouter des
bots à sa table (« ＋ Ajouter un bot ») ou en faire partir un (✕). Les bots vivent sur le serveur
(`bots.py` du dépôt `kinito-serveur`) : ils s'assoient comme des joueurs ordinaires, jouent tout
seuls avec un temps de réflexion, et restent à la table quand elle change de jeu. Un jeu dont les
bots ne savent pas encore jouer le signale dans le panneau (ils restent assis sans jouer). La
liste des pseudos est `PSEUDOS_TEST` dans `commun/soiree.js` (et dans `serveur.py`).
