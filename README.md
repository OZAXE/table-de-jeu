# table-de-jeu
## Mode test (jouer seul)

Avec le pseudo **Admin01** (majuscules indifférentes), chaque jeu affiche un onglet 🧪 sur le
bord gauche, une fois la page connectée à une table. Il ajoute des « joueurs test » (Bot 1,
Bot 2… jusqu'à 7) : chacun est la vraie page du jeu, ouverte dans un cadre et connectée sous son
prénom comme un vrai téléphone. La barre du haut sert à jouer à la place d'un bot (toucher son
nom) ou à revenir à sa propre partie (« Moi », c'est là qu'on lance le jeu). Les bots suivent la
table quand on change de jeu ; « Retirer » en fait partir un. Marche aussi dans l'Enquête et le
Bingo. Rien côté serveur : pour lui, ce sont des joueurs ordinaires. La liste des pseudos est
`PSEUDOS_TEST` dans `commun/soiree.js`.
