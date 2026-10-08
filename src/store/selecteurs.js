/* =============================================================================
   selecteurs.js — TOUTES les règles de calcul et de validation de l'application.

   Ce sont des fonctions PURES : elles ne connaissent ni React, ni le DOM, ni le
   store. Elles reçoivent des données et renvoient un résultat.

   Pourquoi ce fichier existe (à réutiliser tel quel dans le compte-rendu) :
   - une seule définition de chaque règle → les 3 pages ne peuvent pas diverger ;
   - testable sans navigateur (on peut appeler filtrerProduits() dans la console) ;
   - la page peut AFFICHER une erreur en appelant la même fonction que celle qui
     la BLOQUE côté modèle : la règle n'est donc écrite qu'une fois.
   ========================================================================== */

/* --- Choix de modélisation à justifier dans le compte-rendu ------------------
   « La quantité est en dessous du seuil » : on inclut l'égalité (quantité ≤ seuil).
   Autre lecture possible : strictement inférieur. Le cas limite est P05 (12/12). */
export const SEUIL_INCLUSIF = true;

/** Un produit dont le stock est exactement 0 est en rupture (cas particulier d'alerte). */
export function estEnRupture(produit) {
  return produit.quantite === 0;
}

/** Le produit doit être réapprovisionné : sa quantité a atteint (ou passé) le seuil. */
export function estEnAlerte(produit) {
  return SEUIL_INCLUSIF ? produit.quantite <= produit.seuil : produit.quantite < produit.seuil;
}

/** Affichage français du prix : 2.4 → « 2,40 € ». */
export function formaterPrix(prix) {
  return `${prix.toFixed(2).replace(".", ",")} €`;
}

export function trouverProduit(produits, id) {
  return produits.find((produit) => produit.id === id) ?? null;
}

/** Catégories réellement présentes, dans leur ordre d'apparition. */
export function categoriesUtilisees(produits) {
  return [...new Set(produits.map((produit) => produit.categorie))];
}

/**
 * Filtrage de la liste des produits (page Produits).
 * Tous les critères sont facultatifs et se CUMULENT (ET logique).
 * @param {import('../data/seed.js').Produit[]} produits
 * @param {{ nom?: string, categorie?: string, prixMax?: number|null, quantiteMax?: number|null,
 *           seuilMax?: number|null, seulementAlertes?: boolean }} filtres
 */
export function filtrerProduits(produits, filtres = {}) {
  const {
    nom = "",
    categorie = "",
    prixMax = null,
    quantiteMax = null,
    seuilMax = null,
    seulementAlertes = false,
  } = filtres;

  const recherche = nom.trim().toLowerCase();

  return produits.filter((produit) => {
    const okNom = recherche === "" || produit.nom.toLowerCase().includes(recherche);
    const okCategorie = categorie === "" || produit.categorie === categorie;
    const okPrix = prixMax === null || produit.prix <= prixMax;
    const okQuantite = quantiteMax === null || produit.quantite <= quantiteMax;
    const okSeuil = seuilMax === null || produit.seuil <= seuilMax;
    const okAlerte = !seulementAlertes || estEnAlerte(produit);
    return okNom && okCategorie && okPrix && okQuantite && okSeuil && okAlerte;
  });
}

/**
 * Regroupement par catégorie en conservant l'ordre d'apparition.
 * @returns {{ categorie: string, produits: import('../data/seed.js').Produit[] }[]}
 */
export function grouperParCategorie(produits) {
  const groupes = [];
  for (const produit of produits) {
    let groupe = groupes.find((g) => g.categorie === produit.categorie);
    if (!groupe) {
      groupe = { categorie: produit.categorie, produits: [] };
      groupes.push(groupe);
    }
    groupe.produits.push(produit);
  }
  return groupes;
}

/**
 * Bornes des curseurs de filtres, calculées sur les données réelles
 * (jamais codées en dur dans le composant).
 * @param {import('../data/seed.js').Produit[]} produits
 * @returns {{ prix: [number, number], quantite: [number, number], seuil: [number, number] }}
 */
export function bornesFiltres(produits) {
  const maximumDe = (champ) =>
    Math.max(1, Math.ceil(Math.max(...produits.map((produit) => produit[champ]))));

  return {
    prix: [0, maximumDe("prix")],
    quantite: [0, maximumDe("quantite")],
    seuil: [0, maximumDe("seuil")],
  };
}

function arrondi(valeur, decimales = 1) {
  const facteur = 10 ** decimales;
  return Math.round(valeur * facteur) / facteur;
}

/**
 * Indicateurs de la page Accueil — DONNÉES DÉRIVÉES, jamais stockées dans un état.
 * @param {import('../data/seed.js').Produit[]} produits
 * @param {import('../data/seed.js').Commande[]} commandes
 */
export function calculerStatistiques(produits, commandes) {
  const parCategorie = grouperParCategorie(produits).map((groupe) => {
    const stockTotal = groupe.produits.reduce((somme, p) => somme + p.quantite, 0);
    return {
      categorie: groupe.categorie,
      nbProduits: groupe.produits.length,
      stockTotal,
      stockMoyen: arrondi(stockTotal / groupe.produits.length),
      nbAlertes: groupe.produits.filter(estEnAlerte).length,
      prixMoyen: arrondi(
        groupe.produits.reduce((somme, p) => somme + p.prix, 0) / groupe.produits.length,
        2,
      ),
    };
  });

  return {
    nbProduits: produits.length,
    nbUnites: produits.reduce((somme, p) => somme + p.quantite, 0),
    nbCommandes: commandes.length,
    nbLignesCommandees: commandes.reduce((somme, c) => somme + c.lignes.length, 0),
    nbAlertes: produits.filter(estEnAlerte).length,
    nbRuptures: produits.filter(estEnRupture).length,
    valeurStock: arrondi(
      produits.reduce((somme, p) => somme + p.prix * p.quantite, 0),
      2,
    ),
    parCategorie,
  };
}

/* --- Validation de la commande --------------------------------------------- */

const MOTIF_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Valide un formulaire de commande ET son respect des stocks disponibles.
 * Règle unique, appelée deux fois : par la page (pour afficher) et par le store
 * (pour refuser une commande invalide).
 *
 * @param {import('../data/seed.js').Produit[]} produits
 * @param {{ nom?: string, prenom?: string, email?: string,
 *           lignes?: { idProduit: string, quantite: number }[] }} formulaire
 * @returns {{ valide: boolean, erreurs: Record<string, string>,
 *             erreursParProduit: Record<string, string>,
 *             lignes: { idProduit: string, quantite: number }[] }}
 */
export function validerCommande(produits, formulaire) {
  const nom = formulaire?.nom ?? "";
  const prenom = formulaire?.prenom ?? "";
  const email = formulaire?.email ?? "";
  const lignes = formulaire?.lignes ?? [];

  const erreurs = {};
  const erreursParProduit = {};

  if (nom.trim() === "") erreurs.nom = "Le nom est obligatoire.";
  if (prenom.trim() === "") erreurs.prenom = "Le prénom est obligatoire.";
  if (email.trim() === "") {
    erreurs.email = "L'adresse mail est obligatoire.";
  } else if (!MOTIF_EMAIL.test(email.trim())) {
    erreurs.email = "Format d'adresse mail invalide (attendu : nom@domaine.fr).";
  }

  // On ne conserve que les lignes réellement commandées.
  const lignesRetenues = lignes.filter((ligne) => Number(ligne.quantite) > 0);
  if (lignesRetenues.length === 0) {
    erreurs.lignes = "Sélectionnez au moins un produit avec une quantité supérieure à 0.";
  }

  for (const ligne of lignesRetenues) {
    const produit = trouverProduit(produits, ligne.idProduit);
    const quantite = Number(ligne.quantite);

    if (!produit) {
      erreursParProduit[ligne.idProduit] = "Produit inconnu.";
      continue;
    }
    if (!Number.isInteger(quantite)) {
      erreursParProduit[ligne.idProduit] = "La quantité doit être un nombre entier.";
      continue;
    }
    if (quantite > produit.quantite) {
      erreursParProduit[ligne.idProduit] =
        `Stock insuffisant : ${produit.quantite} disponible(s) pour « ${produit.nom} ».`;
    }
  }

  const valide =
    Object.keys(erreurs).length === 0 && Object.keys(erreursParProduit).length === 0;

  return {
    valide,
    erreurs,
    erreursParProduit,
    lignes: valide
      ? lignesRetenues.map((ligne) => ({
          idProduit: ligne.idProduit,
          quantite: Number(ligne.quantite),
        }))
      : [],
  };
}
