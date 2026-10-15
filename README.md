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
npm test        # tests unitaires : règles, transitions, Builder, machine à états
```

`npm test` utilise le lanceur de tests intégré à Node : **aucune dépendance à
installer**. La vérification de l'application entière dans un vrai navigateur est
décrite dans [`verif/README.md`](verif/README.md).

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
  data/seed.js               données de départ (source de vérité unique)
  store/DataContext.jsx      colle React : useData() + actions (AUCUNE règle métier)
  store/etat.js              état et transitions PURES (patterns Command)
  store/selecteurs.js        calculs et validations PURES (filtres, stats, règles)
  store/commandeBuilder.js   construction d'une commande (pattern Builder)
  store/statutCommande.js    machine à états du formulaire (pattern State)
  pages/                     1 fichier = 1 page virtuelle (orchestration + état local)
  components/produits/       RowProduct, TableProduits, FiltreProduits
  components/commande/       LigneCommande, SelecteurQuantite
  components/indicateurs/    CarteKPI
  components/layout/         Layout (barre de navigation + commandes globales)
docs/
  analyse-design-patterns.md document de remise (partie 2)
  diagrammes/                diagrammes de composants (sources .puml + rendus)
test/                        tests unitaires des modules purs (node --test, 0 dépendance)
verif/                       vérification de bout en bout dans un navigateur (outil)
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
| `annulerDerniereOperation()` | fonction | défait la dernière opération (pattern Command) ; renvoie `{ annulee, libelle? }` |
| `derniereOperation` | `{ libelle, … }` ou `null` | la dernière opération annulable (libellé du bouton) |
| `peutAnnuler` | booléen | vrai s'il reste une opération à annuler |
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

Trois niveaux seulement (projet à 2 personnes, une seule livraison) :

| Branche | Rôle | Protection |
|---|---|---|
| `main` | **état livrable** — c'est ce que produit le zip de remise | PR obligatoire + **1 approbation** |
| `dev` | **intégration** — tout le travail courant arrive ici d'abord | PR obligatoire, **auto-fusion autorisée** |
| `feat/…`, `fix/…` | une tâche, une branche courte | aucune |

Pourquoi un `dev` : `main` doit rester un état **démontrable et livrable**. `dev` sert
de sas d'intégration ; comme il autorise l'auto-fusion, personne n'est bloqué parce
que l'autre n'est pas disponible pour approuver.

```bash
git switch dev && git pull --rebase         # 1. partir de l'état intégré
git switch -c feat/ma-tache                 # 2. créer sa branche

# ... coder ...

npm test && npm run lint && npm run build   # 3. vérifier AVANT de commiter
git add -A
git commit -m "feat(produits): filtres sur les 5 attributs"
git push -u origin feat/ma-tache            # 4. pousser
gh pr create --base dev --fill              # 5. PR vers dev (auto-fusion possible)

# 6. avant la remise (et à chaque fois qu'on veut figer un état démontrable) :
gh pr create --base main --head dev --title "Intégration avant remise"
#    → cette PR-là exige l'approbation de l'autre membre
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
