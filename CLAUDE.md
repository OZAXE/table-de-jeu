# Consignes pour Claude

## Fusion systématique
Après chaque modification demandée, sans redemander l'accord :
1. commiter et pousser sur la branche de travail ;
2. ouvrir une pull request vers `main` ;
3. la fusionner dans `main` (fusion classique) dès que les vérifications passent.

Si le serveur (dépôt `kinito-serveur`) change aussi, fusionner d'abord le serveur, puis ce dépôt :
les pages appellent le serveur publié sur Render.

## Le projet
Site des jeux de soirée (application installable « SHIELD »), publié depuis `main`.
Chaque jeu en ligne est une page `*-3d-jeu.html` (Three.js, DA commune dans `da/`).
Le serveur multijoueur est le dépôt `kinito-serveur`.
