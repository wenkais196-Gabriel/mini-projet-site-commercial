# Site commercial — mini projet React

Application commerciale de démonstration : **3 pages virtuelles** dans une seule
page HTML, **sans partie serveur**, avec des données en dur mais **partagées entre
les pages**.

| | |
|---|---|
| Cours | Développement Front |
| Binôme | SONG Wenkai (A) · SUI Wenhui (B) |
| Dépôt | https://github.com/wenkais196-Gabriel/mini-projet-site-commercial (public) |
| Remise Moodle | `SONG-Wenkai_SUI-Wenhui.zip` |

> Avant de coder : lire **[AGENTS.md](AGENTS.md)** (contraintes non négociables).
> Le compte-rendu à rendre est dans **[docs/analyse-design-patterns.md](docs/analyse-design-patterns.md)**.

---

## 1. Démarrage

```bash
npm install
npm run dev     # http://localhost:5173
npm run build   # à lancer avant CHAQUE commit : 0 erreur = on peut pousser
npm run lint    # 0 avertissement attendu
```

Node 22+ / npm 11+. Rien d'autre à installer : Bootstrap est chargé par CDN, comme
dans l'exercice 4.

---

## 2. Ce que fait l'application

| Page | Route | Contenu |
|---|---|---|
| Accueil | `/` | Indicateurs + synthèse par catégorie. Aucune interaction. |
| Produits | `/produits` | Liste filtrable (5 attributs) + surlignage sous le seuil |
| Commande | `/commande` | Formulaire client + sélection de produits, dans la limite du stock |

**Le point clé du sujet** : « les données sont liées entre les pages virtuelles ».
Ce n'est pas décoratif. Passer une commande :

1. décrémente le stock des produits commandés ;
2. ce qui peut faire passer un produit **sous son seuil** → il devient surligné sur
   la page Produits ;
3. et incrémente le nombre de commandes de la page Accueil.

Aucune page ne « prévient » les autres : elles lisent toutes le même état partagé.

---

## 3. Architecture

```
App  (câblage : provider de données + router)
└── DataProvider              ← l'état partagé (produits + commandes)
    └── BrowserRouter
        └── Layout            ← barre de navigation commune + <Outlet/>
            ├── AccueilPage
            ├── ProduitsPage
            └── CommandePage
```

```
src/
  data/seed.js             données de départ (source de vérité unique)
  store/DataContext.jsx    état partagé : useData() + transitions
  store/selecteurs.js      calculs et validations PURES (filtres, stats, règles)
  pages/                   1 fichier = 1 page virtuelle (orchestration + état local)
  components/produits/     RowProduct, TableProduits, FiltreProduits
  components/commande/     LigneCommande, SelecteurQuantite
  components/indicateurs/  CarteKPI
  components/layout/       Layout (barre de navigation)
docs/
  analyse-design-patterns.md   document de remise (partie 2)
  diagrammes/                  diagrammes de composants (sources .puml + rendus)
```

Deux règles d'architecture à ne jamais casser :

1. **Aucun composant ne lit `src/data/seed.js`** : tout passe par `useData()`.
   Sinon les pages cessent de voir les mêmes données.
2. **Les calculs vivent dans `selecteurs.js`**, jamais dans un composant.
   Une règle = un seul endroit = impossible de diverger entre deux pages.

---

## 4. Contrat d'interface (gelé — ne pas casser sans prévenir le binôme)

`useData()` renvoie :

| Clé | Type | Usage |
|---|---|---|
| `produits` | `{ id, nom, categorie, prix, quantite, seuil }[]` | liste courante |
| `commandes` | `{ id, date, client, lignes[] }[]` | commandes enregistrées |
| `statistiques` | objet | indicateurs dérivés (page Accueil) |
| `validerCommande(formulaire)` | fonction | enregistre si valide, renvoie `{ valide, erreurs, erreursParProduit, commande? }` |
| `reinitialiser()` | fonction | rétablit les données de départ |

Le modèle de données et ces signatures sont **gelés** : toute évolution doit être
annoncée avant d'être codée, sinon le binôme travaille sur deux versions différentes.

---

## 5. Répartition du travail

| Qui | Périmètre | Fichiers |
|---|---|---|
| **A — SONG Wenkai** | Commande, architecture, compte-rendu | `pages/CommandePage.jsx`, `components/commande/**`, `store/**`, `docs/**` |
| **B — SUI Wenhui** | Accueil, Produits, données | `pages/AccueilPage.jsx`, `pages/ProduitsPage.jsx`, `components/produits/**`, `components/indicateurs/**`, `data/seed.js` |

Chacun ne modifie que ses fichiers. `src/store/` n'est modifié que par A — si B a
besoin d'un nouveau calcul, il le demande (ou l'ajoute dans `selecteurs.js` après
accord, c'est le fichier partagé le moins conflictuel).

---

## 6. Collaboration Git

- `main` reste toujours fonctionnelle (`npm run build` passe).
  **Personne ne pousse directement sur `main`.**
- Une branche courte par tâche : `feat/filtres-produits`, `feat/formulaire-commande`…

```bash
git switch main && git pull --rebase        # 1. partir de la dernière version
git switch -c feat/ma-tache                 # 2. créer sa branche

# ... coder ...

npm run build && npm run lint               # 3. vérifier AVANT de commiter
git add -A
git commit -m "feat(produits): filtres sur les 5 attributs"
git push -u origin feat/ma-tache            # 4. pousser
gh pr create --fill                         # 5. ouvrir la PR ; l'autre relit et fusionne
```

Préfixes de commit : `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`.

Fichiers à ne pas modifier sans accord (ils concernent les deux) :
`package.json`, `package-lock.json`, `.oxlintrc.json`, `AGENTS.md`.

---

## 7. Livrer sur Moodle

Le dossier `node_modules` ne doit **pas** figurer dans le zip. Comme il n'est pas
versionné, la commande suivante produit exactement le bon paquet :

```bash
git archive --format=zip -o "SONG-Wenkai_SUI-Wenhui.zip" HEAD
```

Le document de remise (analyse des design patterns + diagrammes) est déjà dans
`docs/`, il est donc inclus automatiquement. Si Moodle exige un `.docx` ou un
`.pdf` séparé, on l'exporte depuis `docs/analyse-design-patterns.md`.

**Contenu du zip attendu par le sujet :** le dossier du projet sans
`node_modules`, **et** un document avec l'analyse design pattern, le(s) diagramme(s)
de composants, et les remarques éventuelles (dont « ce qui n'est pas complètement
implémenté mais pour quoi on a des idées » — à ne pas oublier, c'est explicitement
demandé).
