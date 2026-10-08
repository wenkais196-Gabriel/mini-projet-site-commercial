# Analyse des design patterns — Mini projet « Site commercial »

| | |
|---|---|
| Binôme | `__NOM1 Prénom1__` · `__NOM2 Prénom2__` |
| Application | Site commercial React — 3 pages virtuelles, sans partie serveur |
| Dépôt | https://github.com/wenkais196-Gabriel/mini-projet-site-commercial |
| Composants | `docs/diagrammes/` |

---

## 1. Architecture de l'application

Une seule page HTML réelle ; trois **pages virtuelles** gérées par `react-router`.
Aucun appel réseau : les données initiales sont en dur dans `src/data/seed.js`.

Le sujet impose que « les données soient liées entre les pages virtuelles ». Une
donnée ne peut donc appartenir à une page : elle appartient à un **ancêtre commun**,
le `DataProvider`, monté au-dessus du router.

```
App  (câblage : DataProvider + BrowserRouter)
└── DataProvider              ← état partagé : { produits, commandes }
    └── Layout                ← barre de navigation + <Outlet/>
        ├── AccueilPage       ← lit uniquement des indicateurs dérivés
        ├── ProduitsPage      ← orchestre FiltreProduits + TableProduits
        └── CommandePage      ← orchestre le formulaire et demande une commande
```

Deux séparations structurent tout le code :

- **composants de présentation** (ne connaissent que leurs `props`, aucun état) vs
  **composants orchestrateurs** (les 3 pages : ce sont les seules à avoir un état) ;
- **règles de calcul** (`src/store/selecteurs.js`, fonctions pures) séparées de
  **l'état** (`src/store/DataContext.jsx`, transitions pures) et de **l'affichage**.

---

## 2. Partie 1 — Modélisation et implémentation

### 2.1 Composants standards et composants non standards

| Composant | Catégorie | Ce qui le rend standard / non standard |
|---|---|---|
| `RowProduct` | **Standard** | Une ligne de produit, aucune décision, aucun état. Réutilisé tel quel depuis l'exercice 4. |
| `RowProduct` / `LigneCommande` | **Standard** | Présentation pure, pilotés entièrement par leurs `props`. |
| `SelecteurQuantite` | **Standard** | Ignore le métier : affiche « une quantité bornée dans [0, max] ». Réutilisable hors du projet. |
| `FiltreProduits` | **Non standard** | Orchestrateur : agrège 5 critères, totalement contrôlé, remonte chaque changement. |
| `TableProduits` | **Non standard** | Composite : regroupe par catégorie et **fabrique** ses lignes (donnée dérivée calculée au rendu). |
| `CarteKPI` | **Non standard** | À facette : `props.children` — la carte fournit le cadre, l'appelant fournit le contenu. |
| `DataProvider` | **Non standard** | Composant **sans rendu visible** (non visuel) : il n'affiche rien, il fournit un état. |
| `Layout` | **Non standard** | Gabarit de route parente : il ne sait pas quelle page il encadre (`<Outlet/>`). |

> Le point à retenir : les composants « non standards » sont ceux qui **décident**
> (ils orchestrent, regroupent, composent ou cachent un état), alors que les
> composants standard se contentent de **montrer** ce qu'on leur donne.

### 2.2 Correspondance avec la terminologie du cours (CCM → React)

| Terme du cours (CCM) | Réalisation dans ce projet |
|---|---|
| composant | fonction retournant du JSX (`RowProduct`, `CarteKPI`…) |
| attributs / propriétés | paramètres reçus par déstructuration (`{ produit }`, `{ quantite, max }`) |
| source d'événement | `onChange`, `onClick` → **flux inverse** via les props de rappel (`onQuantiteChange`) |
| sink | composants de présentation qui produisent le DOM (`RowProduct`) |
| facette | `props.children` de `CarteKPI` |
| réceptacle | `SelecteurQuantite.max`, et `DataProvider` qui reçoit `dateDuJour` en prop |
| configuration | le JSX de `App.jsx` : c'est le câblage de l'application |
| état local | `useState` dans les 3 pages uniquement (`filtres`, `client`, `quantites`) |

### 2.3 Diagrammes

| Fichier | Contenu |
|---|---|
| `docs/diagrammes/01-diagramme-composants.puml` `.png` | Diagramme de composants : dépendances, ports, points d'assemblage |
| `docs/diagrammes/02-arbre-composants.puml` `.png` | Arbre des composants avec les valeurs réelles des `props` |
| `docs/diagrammes/03-sequence-commande.puml` `.png` | Séquence : passer une commande, et l'effet sur les deux autres pages |

---

## 3. Partie 2 — Analyse des design patterns

### 3.1 Vue d'ensemble

| Pattern | Verdict | Où c'est / où ce serait | Effort |
|---|---|---|---|
| **MVC** | Présence partielle — version classique **incompatible** | Modèle = `store` + `selecteurs` ; Vue = composants ; Contrôleur = pages et gestionnaires d'événements | — |
| **Singleton** | **Présent** (sous une forme adaptée à React) | `DataProvider` + `useData()` : un seul état partagé, un seul point d'accès | — |
| **Abstract Factory** | **Incompatible en l'état** (compatible si on introduit des familles) | Fabrique de lignes/labels par famille de produits | élevé |
| **Builder** | Compatible, non implémenté — pertinent | `CommandeBuilder.setClient().ajouterLigne(…).build()` | moyen |
| **Decorator** | Compatible, non implémenté — immédiat | HOC `avecSurlignage(Ligne)` ou fonction de formatage | faible |
| **Command** | **Présence partielle** (les actions du store *sont* des objets-commandes) | Envelopper les transitions + pile d'historique → « annuler » | moyen |
| **Observer** | **Présent** (assuré par React) | Abonnement des composants à l'état partagé | — |
| **State** | Compatible, non implémenté (aujourd'hui : états *dérivés*) | Machine à états du statut de commande / de l'état produit | faible |

### 3.2 MVC

**Verdict — présence partielle ; l'implémentation « classique » est incompatible.**

*Présence.* L'application est bien séparée en trois responsabilités :

| MVC | Ici |
|---|---|
| Modèle | `src/store/DataContext.jsx` (état) + `src/store/selecteurs.js` (règles pures) |
| Vue | tous les composants de `src/components/` |
| Contrôleur | les pages (`ProduitsPage`, `CommandePage`) et leurs gestionnaires d'événements |

*Pourquoi la version classique est incompatible.* Dans un MVC historique (Java,
Swing, Struts), la Vue observe le Modèle et peut lui écrire : c'est un **flux en
deux sens**. React impose l'inverse : un flux descendant par les `props` et un flux
montant par les callbacks (remontée d'événements). Il n'y a jamais de « vue » qui
modifie directement le modèle. De plus, le Contrôleur MVC est un objet distinct
du Modèle ; ici, la logique de contrôle est répartie dans les fonctions de rendu
(hooks), ce qui n'a pas d'équivalent MVC strict.

*Ce qu'on pourrait rapprocher.* Remplacer les `useState` des pages par des
gestionnaires nommés (`FiltresControleur`) rendrait la ressemblance plus explicite,
mais ce serait un habillage : React n'est pas un framework MVC, et le forcer coûte
plus qu'il ne rapporte.

### 3.3 Singleton

**Verdict — présent, sous une forme adaptée à React.**

`App.jsx` monte **un seul** `<DataProvider>` : il n'existe qu'une seule instance de
l'état `{ produits, commandes }` pour toute l'application. `useData()` est le
**point d'accès unique** : aucun composant ne peut créer une seconde copie des
données. C'est la propriété essentielle du Singleton — accès contrôlé à une
ressource unique — et c'est précisément ce qui rend les 3 pages cohérentes.

*La nuance, à dire en soutenance.* Le Singleton « objet global mutable » est un
anti-pattern en React (état partagé invisible, difficile à tester, incompatible avec
le rendu déclaratif). La forme retenue est **état unique + notification** :
l'instance est unique, mais elle est fournie par le haut de l'arbre plutôt que
ramassée dans un coin du code. Le jour où l'on voudrait deux instances (deux
paniers indépendants dans un test), il suffirait de monter deux `DataProvider` —
ce qui est impossible avec un vrai Singleton, et c'est un avantage.

*Reste du code concerné.* Aucune autre ressource globale : le CDN Bootstrap est un
`<link>` dans `index.html`, il n'y a pas d'objet de configuration partagé.

### 3.4 Abstract Factory

**Verdict — incompatible en l'état ; compatible si l'on introduit des familles.**

*Pourquoi incompatible aujourd'hui.* Une fabrique abstraite sert à créer **des
familles d'objets cohérentes entre elles**, choisies à l'exécution. Ici, il n'y a
qu'**une seule famille** : des produits à 5 attributs (`nom`, `categorie`, `prix`,
`quantite`, `seuil`) et une seule façon de les afficher (`RowProduct`). Créer une
fabrique pour une famille unique ajouterait une couche d'indirection sans aucun
choix à faire derrière : du code décoratif.

*Comment on l'ajouterait.* Il faudrait de vraies familles. Par exemple :

1. modéliser des sous-types (`ProduitFrais` avec DLC, `ProduitSec` avec poids,
   `ProduitBoisson` avec contenance) ;
2. définir `FabriqueProduit` avec `creerLigne()` et `creerEtiquette()` ;
3. `FabriqueFrais`, `FabriqueSec`, `FabriqueBoisson` en implémentations ;
4. à l'affichage, `TableProduits` demanderait la fabrique de la ligne et
   obtiendrait des composants cohérents sans jamais connaître le type réel.

*Coût.* Élevé pour le gain : cela suppose de faire évoluer tout le modèle de
données (donc les 3 pages et le store), à la veille de la remise.

### 3.5 Builder

**Verdict — compatible, non implémenté. C'est l'un des deux patterns les plus
pertinents pour cette application.**

*Pourquoi c'est pertinent.* Le sujet impose un formulaire de commande qui doit
« respecter les contraintes de quantité disponible ». Une commande se construit
aujourd'hui en agrégeant un objet à la main dans `CommandePage` :

```js
const lignes = Object.entries(quantites)
  .map(([idProduit, quantite]) => ({ idProduit, quantite: Number(quantite) }))
  .filter((ligne) => ligne.quantite > 0);
```

Ce code fait déjà trois choses (transformer, filtrer, valider à côté). Un Builder
le remplacerait avantageusement, et il y a là **un vrai cas d'usage** :

```js
const commande = new CommandeBuilder()
  .setClient({ nom, prenom, email })
  .ajouterLigne("P07", 2)      // refuse et signale si le stock est insuffisant
  .ajouterLigne("P11", 4)
  .build();                    // ne construit qu'une commande valide, ou lève/renvoie les erreurs
```

`build()` deviendrait le seul endroit où la commande est validée, et la page ne
manipulerait plus qu'un objet en cours de construction. La méthode
`ajouterLigne` peut consulter le stock via un `ProduitRepository` injecté — le
Builder devient alors aussi un point de contrôle naturel.

*Coût.* Moyen : une classe d'une quarantaine de lignes plus la réécriture du
`onSubmit` de `CommandePage`.

### 3.6 Decorator

**Verdict — compatible, non implémenté, et immédiat à ajouter.**

React encourage la composition plutôt que l'héritage : envelopper un composant
pour lui ajouter un comportement **est** le motif Decorator. Deux emplacements
prêts à l'emploi :

1. **Sur les lignes.** `RowProduct` décide déjà de son surlignage. On pourrait
   extraire cette décision dans un décorateur, et composer plusieurs
   préoccupations indépendantes :

   ```js
   export function avecSurlignage(Composant) {
     return function LigneSurlignee(props) {
       const alerte = estEnAlerte(props.produit);
       return (
         <div className={alerte ? "ligne-alerte" : undefined}>
           <Composant {...props} />
         </div>
       );
     };
   }
   const LigneRuption = avecRupture(avecSurlignage(RowProduct));
   ```

2. **Sur le prix.** `formaterPrix` est aujourd'hui une fonction. Un
   `PrixDecorator` permettrait d'empiler des règles de présentation (prix barré si
   promotion, couleur si prix élevé, affichage HT/TTC) sans toucher aux composants.

*Coût.* Faible — le vrai intérêt pédagogique est de montrer qu'on peut ajouter un
comportement **sans modifier** la classe/composant d'origine (principe ouvert/fermé).
En contrepartie, il faut savoir s'arrêter : empiler des HOC rend l'arbre de
composants difficile à suivre (le « wrapper hell »), et un simple `className`
conditionnel est parfois plus lisible. C'est la raison pour laquelle nous avons
choisi de **ne pas** décorer `RowProduct` dans la version actuelle.

### 3.7 Command

**Verdict — présence partielle : les actions de notre store *sont* déjà des
objets-commandes ; ce qui manque est l'historique et l'annulation.**

*Où c'est déjà présent.* Le store reçoit des objets de la forme :

```js
dispatch({ type: "VALIDER_COMMANDE", formulaire, date })
```

Chaque action est un objet autonome qui transporte à la fois l'intention (`type`) et
ses paramètres (`formulaire`, `date`) ; le `reducer` est l'exécutant qui traduit
cet objet en modification d'état. C'est exactement la structure du pattern Command :
**une demande encapsulée dans un objet**, que le destinataire exécute sans avoir à
connaître l'appelant. `dispatch` joue le rôle d'invocateur.

*Ce qui manque pour un Command complet.* Le pattern demande aussi de pouvoir
mémoriser et **rejouer ou annuler** une commande. Il faudrait :

1. une pile `historique[]` dans l'état ;
2. une fonction inverse par action (`ANNULER_COMMANDE`) qui réincrémente le stock
   et retire la commande ;
3. un bouton « Annuler la dernière opération » — la barre de navigation s'y prête
   (à côté de « Réinitialiser »).

*Pourquoi ce serait cohérent avec la suite du sujet.* La partie 4 rendrait
l'application démontrable en soutenance (« on commande, on annule, on voit le stock
revenir et le surlignage disparaître »), et cela ne coûte que quelques dizaines de
lignes — à condition de ne pas ouvrir la porte à un vrai undo/redo multi-niveaux,
qui n'a pas de sens ici.

### 3.8 Observer

**Verdict — présent : c'est le mécanisme central de React, et il est ici directement
visible.**

React applique exactement le pattern Observer : un composant « s'abonne » à une
donnée, et il est automatiquement notifié (re-rendu) quand cette donnée change. Le
`DataProvider` est le **sujet** ; tous les composants qui appellent `useData()` sont
les **observateurs**. Le cas est particulièrement net sur notre application :

```
CommandePage → validerCommande() → l'état { produits, commandes } change
        ├── Layout         re-rendu  → le compteur de commandes change
        ├── AccueilPage    re-rendu  → les indicateurs changent
        └── ProduitsPage   re-rendu  → le surlignage des produits change
```

Aucune de ces trois pages n'est prévenue par `CommandePage` : elles observent la
même source. C'est aussi ce qui rend possible l'exigence du sujet (« les données
sont liées entre les pages virtuelles ») sans écrire une seule ligne de
synchronisation manuelle.

*Pour rendre le motif encore plus explicite (option).* On pourrait abandonner le
contexte au profit d'un petit store écrit à la main avec `subscribe(observateur)` /
`notify()`, branché sur `useSyncExternalStore`. Ce serait une démonstration
« à la main » du même mécanisme, mais en réécrivant un équivalent de ce que React
fournit déjà — donc un gain pédagogique contre une perte de simplicité.

### 3.9 State

**Verdict — compatible, non implémenté : nous avons des états *dérivés*, pas encore
de machine à états.**

*Où l'on en est.* L'état de santé d'un produit est **calculé** à la volée :

```js
export function estEnAlerte(produit)  { return produit.quantite <= produit.seuil; }
export function estEnRupture(produit) { return produit.quantite === 0; }
```

Un produit est donc « disponible », « à réapprovisionner » ou « en rupture » par
déduction, à chaque rendu. C'est un bon choix : rien ne peut se désynchroniser
(il ne peut pas exister un produit marqué « en rupture » qui aurait du stock).
Mais ce n'est pas le pattern State : il n'y a ni objet d'état, ni transitions
explicites, et le comportement de l'application ne change pas selon l'état.

*Comment l'ajouter, là où c'est réellement utile : le cycle de vie d'une commande.*

Un formulaire de commande a de vrais états et de vraies transitions :

| État | Peut aller vers | Déclencheur |
|---|---|---|
| `Brouillon` | `En cours de saisie` | premier produit sélectionné |
| `En cours de saisie` | `Valide` / `Invalide` | à chaque modification (règles du modèle) |
| `Invalide` | `En cours de saisie` | correction d'une erreur |
| `Valide` | `Enregistrée` | clic sur « Valider » |
| `Enregistrée` | `Brouillon` | nouvelle commande / annulation (cf. Command) |

Aujourd'hui, ces états existent de façon implicite (variables `confirmation`,
`rapport`). Les rendre explicites dans un objet `StatutCommande` avec
`peutTransitionnerVers()` aurait deux avantages concrets : les messages affichés
seraient pilotés par l'état (plus de combinaisons `si` imbriquées dans le JSX), et
les transitions impossibles seraient refusées au lieu d'être simplement non prévues.

*Coût.* Faible : c'est de la logique pure, testable, concentrée dans
`selecteurs.js`. C'est le deuxième pattern que nous retiendrions avec le Builder.

---

## 4. Remarques autour de l'implémentation

### 4.1 Choix de lecture du sujet (à valider avec l'enseignant)

| Point ambigu | Notre lecture | Conséquence |
|---|---|---|
| « données liées entre les pages » | une commande **décrémente le stock** ; les autres pages s'en trouvent modifiées | c'est ce qui donne du sens à Observer, Singleton et State |
| « quantité en dessous du seuil » | **≤** (l'égalité déclenche l'alerte) — cas limite visible avec le produit `Orange` (12/12) | une seule fonction `estEnAlerte()` pour toute l'application |
| valeur du « stock moyen » | moyenne des quantités disponibles, arrondie au dixième | affiché sur la page Accueil |
| filtre « prix maximum » | curseur dont la position maximale signifie « aucun filtre » | un `Range` ne sait pas représenter une absence de valeur |

### 4.2 Ce qui n'est pas complètement implémenté (et pour quoi on a des idées)

Le sujet invite explicitement à signaler ces points — c'est un endroit où il ne faut
pas être modeste :

1. **Builder de commande** (voir 3.5) : le code de `CommandePage` fait le travail
   sans le pattern ; la classe `CommandeBuilder` est le prochain ajout.
2. **Annulation de la dernière opération** (voir 3.7) : la pile d'historique n'est
   pas en place, le `dispatch` est déjà au bon format pour l'accueillir.
3. **Machine à états du formulaire** (voir 3.9) : les états existent de façon
   implicite (`confirmation`, `rapport`).
4. **Fabrique de produits** (voir 3.4) : volontairement écartée, faute de familles
   réelles à instancier.
5. **Filtres** : les 5 attributs sont couverts ; un tri par colonne et une
   mémoïsation (chapitre memoisation du cours) restent à faire.

### 4.3 Ce que nous avons volontairement refusé

- **Une bibliothèque de gestion d'état** (Redux, Zustand) : elle aurait rendu
  Singleton, Observer et Command implicites — donc invisibles dans cette analyse.
  C'était le contraire du but de la partie 2.
- **`localStorage`** : le sujet impose des données en dur ; persister l'état
  aurait masqué le comportement de l'application au rechargement (et donc rendu la
  démonstration moins lisible).
- **Un vrai système d'annulation multi-niveaux** : disproportionné pour un
  formulaire, et source de bugs d'historique difficiles à expliquer en soutenance.
