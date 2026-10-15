# verif/ — vérification de bout en bout

Ce dossier ne fait pas partie de l'application : c'est un **outil de travail**.
Il peut être supprimé avant la remise sans rien casser.

## Ce qu'il vérifie

`verif-e2e.cjs` pilote un **vrai navigateur** (Microsoft Edge, celui déjà installé sur
la machine) et rejoue la propriété centrale du sujet — « les données sont liées entre
les pages virtuelles » :

| Étape | Ce qui doit se passer |
|---|---|
| Accueil | 4 indicateurs, 3 commandes, 3 catégories |
| Produits | filtres nom / catégorie / alertes, « effacer les filtres » |
| Commande | formulaire vide refusé → **état `Invalide`**, messages affichés |
| Commande | corriger → les messages disparaissent (**état `En cours de saisie`**) |
| Commande | saisir 999 dans une quantité → ramené au stock disponible |
| Commande | valider → **état `Enregistree`**, confirmation + récapitulatif |
| Produits | le stock a baissé **et** la ligne passe en surlignage |
| Accueil | le nombre de commandes a augmenté |
| Barre de nav. | le résumé annonce la dernière opération annulable |
| Annuler | le stock est rendu, le surlignage disparaît, le compteur revient en arrière |
| Console | aucune erreur **et aucun avertissement** |

## Lancement

```bash
npm i --no-save --no-package-lock playwright-core   # outil de vérification, NON déclaré
npm run dev                                         # dans un autre terminal
node verif/verif-e2e.cjs
```

- `--no-save --no-package-lock` : le projet reste propre, `package.json` et
  `package-lock.json` ne bougent pas. C'est aussi pour cela que `playwright-core`
  n'est pas une dépendance du projet (voir `AGENTS.md`, règle « pas de dépendance
  sans accord »).
- `channel: "msedge"` : on pilote le navigateur déjà installé, aucun noyau à
  télécharger.
- Les captures d'écran produites pendant la vérification sont écrites dans ce
  dossier — elles ne sont **pas** versionnées (voir `.gitignore`).

## Différence avec `npm test`

| | `npm test` | `node verif/verif-e2e.cjs` |
|---|---|---|
| Portée | règles, transitions, builder, machine à états | l'application entière dans un navigateur |
| Dépendances | aucune (Node suffit) | `playwright-core` (non déclarée) |
| Vitesse | ~0,2 s | ~20 s |
| À lancer | à chaque commit | avant de fusionner une branche |
