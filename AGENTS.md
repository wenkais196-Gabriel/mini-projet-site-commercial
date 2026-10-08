# AGENTS.md — contraintes non négociables du projet

Ce fichier prime sur toute autre considération. Si une demande entre en conflit
avec lui, on le signale au lieu de contourner.

---

## 1. Contraintes imposées par le sujet (`Mini Projet.pdf`)

1. **Pas de partie serveur.** Toutes les données sont en dur dans
   `src/data/seed.js`. Interdits : `fetch`, `axios`, `localStorage`,
   `sessionStorage`, IndexedDB, fichier de données chargé à distance.
2. **3 pages virtuelles, rien d'autre** : Accueil, Produits, Commande.
   Toute nouvelle fonctionnalité s'ajoute **dans** une de ces pages
   (pas de 4ᵉ page, pas de page de détail produit).
3. **`react-router-dom` reste en 6.x** (le tutoriel du cours est en 6.30).
   Ne pas passer en 7 : les imports et la structure changent.
4. **Bootstrap par CDN**, comme à l'exercice 4. Pas d'autre bibliothèque de
   composants, pas de Tailwind, pas de CSS-in-JS, pas de fichier CSS par composant
   (les états métier partagés sont dans `src/index.css`).
5. **Pas de bibliothèque de gestion d'état** (Redux, Zustand, MobX, Jotai…).
   La partie 2 du sujet demande d'expliquer les design patterns : les déléguer à une
   bibliothèque reviendrait à supprimer la réponse. L'état partagé est écrit à la
   main dans `src/store/DataContext.jsx`.

## 2. Règles d'architecture

1. Un composant ne lit **jamais** `src/data/seed.js` : il passe par `useData()`.
2. Aucun calcul métier dans un composant : tout est dans `src/store/selecteurs.js`.
3. Une donnée **dérivée** (filtrage, regroupement, statistiques, total, sous-total)
   ne va **jamais** dans un `useState`.
4. Aucun composant ne mute les données : il passe par une action du store.
5. `npm run build` doit passer **avant chaque commit** ; `npm run lint` doit
   afficher **0 avertissement**.

## 3. Langue et style

- Code, commentaires, interface, documentation : **en français** (français de France).
- Noms métier en français (`produit`, `quantite`, `seuil`, `validerCommande`) ;
  termes React en anglais (`useState`, `props`, `onChange`, `children`).
- Une fonction = un commentaire qui dit **pourquoi**, pas **ce que** la ligne fait.

## 4. Propriété des fichiers

| Périmètre | Propriétaire |
|---|---|
| `src/store/**`, `docs/**`, `pages/CommandePage.jsx`, `components/commande/**` | `__NOM1__` |
| `pages/AccueilPage.jsx`, `pages/ProduitsPage.jsx`, `components/produits/**`, `components/indicateurs/**`, `data/seed.js` | `__NOM2__` |
| `package.json`, `package-lock.json`, `.oxlintrc.json`, `AGENTS.md`, `README.md` | accord des deux |

## 5. Interdits explicites

- Pousser directement sur `main`.
- Commiter `node_modules/`, `dist/`, un `.zip`, un `.pdf` de rendu intermédiaire.
- Renommer ou déplacer un fichier dont on n'est pas propriétaire.
- Ajouter une dépendance npm sans accord préalable.
- Modifier le modèle de données ou les signatures de `useData()` sans le signaler.

## 6. À faire avant de rendre

- [ ] `npm run build` : 0 erreur
- [ ] `npm run lint` : 0 avertissement
- [ ] Les 3 pages se naviguent sans rechargement, depuis et vers n'importe quelle autre
- [ ] Un scénario complet passant par les 3 pages : commander → le stock baisse →
      le surlignage apparaît sur Produits → le compteur change sur Accueil
- [ ] `docs/analyse-design-patterns.md` : les 8 patterns traités (3 cas chacun)
- [ ] `docs/diagrammes/` : diagramme(s) de composants, source `.puml` **et** rendu
- [ ] Zip produit avec `git archive` (sans `node_modules`), nommé
      `Nom1-Prenom1_Nom2-Prenom2.zip`
