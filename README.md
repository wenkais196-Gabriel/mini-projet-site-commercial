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
décrite dans [`check/README.md`](check/README.md).

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
            ├── HomePage
            ├── ProductsPage
            └── OrderPage
```

```
src/
  data/seed.js               données de départ (source de vérité unique)
  store/DataContext.jsx      colle React : useData() + actions (AUCUNE règle métier)
  store/state.js             état et transitions PURES (pattern Command)
  store/selectors.js         calculs et validations PURES (filtres, stats, règles)
  store/orderBuilder.js      construction d'une commande (pattern Builder)
  store/orderStatus.js       machine à états du formulaire (pattern State)
  pages/                     1 fichier = 1 page virtuelle (orchestration + état local)
  components/form/           atomes réutilisables : Input, Checkbox, Range
  components/products/       RowProduct, TableCategory, TableProducts, ProductFilter
  components/order/          OrderRow, QuantitySelector
  components/indicators/     KpiCard
  components/layout/         Layout (barre de navigation + commandes globales)
docs/
  analyse-design-patterns.md document de remise (partie 2)
  diagrammes/                diagrammes de composants (sources .puml + rendus)
test/                        tests unitaires des modules purs (node --test, 0 dépendance)
check/                       vérification de bout en bout dans un navigateur (outil)
```

Deux règles d'architecture à ne jamais casser :

1. **Aucun composant ne lit `src/data/seed.js`** : tout passe par `useData()`.
   Sinon les pages cessent de voir les mêmes données.
2. **Les calculs vivent dans `selectors.js`**, jamais dans un composant.
   Une règle = un seul endroit = impossible de diverger entre deux pages.

---

## 4. Contrat d'interface (gelé — ne pas casser sans prévenir le binôme)

`useData()` renvoie :

| Clé | Type | Usage |
|---|---|---|
| `products` | `{ id, name, category, price, quantity, threshold }[]` | liste courante |
| `orders` | `{ id, date, customer, lines[] }[]` | commandes enregistrées |
| `stats` | objet | indicateurs dérivés (page Accueil) |
| `saveOrder(form)` | fonction | enregistre si valide, renvoie `{ valid, errors, errorsByProduct, order? }` |
| `undoLastOperation()` | fonction | défait la dernière opération (pattern Command) ; renvoie `{ undone, label? }` |
| `lastOperation` | `{ label, … }` ou `null` | la dernière opération annulable (libellé du bouton) |
| `canUndo` | booléen | vrai s'il reste une opération à annuler |
| `reset()` | fonction | rétablit les données de départ |

Le modèle de données et ces signatures sont **gelés** : toute évolution doit être
annoncée avant d'être codée, sinon le binôme travaille sur deux versions différentes.

---

## 5. Répartition du travail

| Qui | Périmètre | Fichiers |
|---|---|---|
| **A — SONG Wenkai** | Commande, architecture, compte-rendu | `src/pages/OrderPage.jsx`, `src/components/order/**`, `src/store/**`, `docs/**` |
| **B — SUI Wenhui** | Accueil, Produits, données | `src/pages/HomePage.jsx`, `src/pages/ProductsPage.jsx`, `src/components/products/**`, `src/components/indicators/**`, `src/data/seed.js` |
| **B — SUI Wenhui** | Atomes de formulaire partagés | `src/components/form/**` (Input, Checkbox, Range) |

Chacun ne modifie que ses fichiers. `src/store/` n'est modifié que par A — si B a
besoin d'un nouveau calcul, il le demande (ou l'ajoute dans `selectors.js` après
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

Le zip contient **deux choses** : le document de remise, et le dossier du projet.

```
SONG-Wenkai_SUI-Wenhui.zip
├── SONG-Wenkai_SUI-Wenhui.pdf        ← le document (analyse + diagrammes)
└── mini-projet-site-commercial/      ← le dossier du projet, sans node_modules
```

Le dossier `node_modules` ne doit **pas** figurer dans le zip ; comme il n'est pas
versionné, `git archive` produit l'arborescence propre du projet :

```bash
# 1. le dossier du projet, prefixe par son nom
git archive --format=zip --prefix=mini-projet-site-commercial/ -o project.zip HEAD

# 2. le document de remise a la racine, a cote du dossier (script Python standard)
python - <<'PY'
import zipfile, os
pdf = r"docs/SONG-Wenkai_SUI-Wenhui.pdf"
out = "SONG-Wenkai_SUI-Wenhui.zip"
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    z.write(pdf, os.path.basename(pdf))
    with zipfile.ZipFile("project.zip") as p:
        for name in p.namelist():
            z.writestr(name, p.read(name))
PY
```

Le document est `docs/SONG-Wenkai_SUI-Wenhui.pdf` (11 pages A4, figures vectorielles).
Il est donc **déjà dans le dossier du projet**, et on le place aussi à la racine du zip
pour qu'il soit visible au premier coup d'œil.

**Régénérer le PDF** après une modification du compte-rendu — markdown → HTML →
impression A4 par le navigateur, aucun outil à installer hors de npm :

```bash
npm i --no-save --no-package-lock marked playwright-core
node docs/build-report.cjs
```

**Contenu du document attendu par le sujet :** l'analyse design pattern (les 8
patterns, chacun avec sa présence — et s'il est complet —, sa compatibilité ou son
incompatibilité), le(s) diagramme(s) de composants, et les remarques éventuelles
(dont « ce qui n'est pas complètement implémenté mais pour quoi on a des idées » —
à ne pas oublier, c'est explicitement demandé, et c'est le § 4.2 du document).
