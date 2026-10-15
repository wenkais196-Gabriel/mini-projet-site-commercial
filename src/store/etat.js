/* =============================================================================
   etat.js — l'ÉTAT de l'application et ses TRANSITIONS, en fonctions PURES.

   Pourquoi ce fichier est séparé de DataContext.jsx : tout ce qui touche à l'état
   est ici sans une seule ligne de React, donc directement testable :

       npm test          (= node --test test/)

   DataContext.jsx ne garde que la colle React (useReducer, contexte, hook).

   Le vocabulaire est celui du pattern Command : chaque opération réalisée sur
   l'état est un OBJET de données conservé dans `historique`. `executerOperation`
   et `annulerOperation` sont ses deux interpréteurs — c'est ce qui rend
   l'annulation possible sans code spécifique par opération.
   ========================================================================== */

import { COMMANDES_INITIALES, PRODUITS_INITIAUX } from "../data/seed.js";
import { validerCommande } from "./selecteurs.js";

/**
 * Copie profonde explicite des données de départ.
 * Sans cette copie, l'état partagerait ses tableaux/objets avec les constantes du
 * module : la première commande muterait `PRODUITS_INITIAUX` et le bouton
 * « Réinitialiser » deviendrait inopérant.
 */
export function creerEtatInitial() {
  return {
    produits: PRODUITS_INITIAUX.map((produit) => ({ ...produit })),
    commandes: COMMANDES_INITIALES.map((commande) => ({
      ...commande,
      client: { ...commande.client },
      lignes: commande.lignes.map((ligne) => ({ ...ligne })),
    })),
    /* Les commandes livrées avec l'application ne sont pas dans l'historique :
       elles font partie des données de départ, elles ne sont pas « annulables ». */
    historique: [],
    prochainNumero: COMMANDES_INITIALES.length + 1,
  };
}

export function numeroCommande(numero) {
  return `C${String(numero).padStart(3, "0")}`;
}

/**
 * Fabrique l'OBJET-OPÉRATION correspondant à une commande passée.
 * C'est une donnée pure (aucune méthode) : elle peut être stockée dans l'état,
 * comparée, et annulée par un interpréteur unique.
 */
export function operationPasserCommande(commande) {
  return {
    type: "PASSER_COMMANDE",
    commandeId: commande.id,
    libelle: `commande ${commande.id}`,
    lignes: commande.lignes.map((ligne) => ({ ...ligne })),
    commande: {
      ...commande,
      client: { ...commande.client },
      lignes: commande.lignes.map((ligne) => ({ ...ligne })),
    },
  };
}

/** Décale le stock des produits concernés par `lignes` (sens = +1 pour rendre, -1 pour prélever). */
function decalerStock(produits, lignes, sens) {
  return produits.map((produit) => {
    const ligne = lignes.find((l) => l.idProduit === produit.id);
    return ligne
      ? { ...produit, quantite: produit.quantite + sens * ligne.quantite }
      : produit;
  });
}

/**
 * Exécute une opération sur l'état. Fonction pure : elle renvoie un NOUVEL état,
 * elle ne modifie jamais celui qu'on lui passe.
 */
export function executerOperation(etat, operation) {
  switch (operation.type) {
    case "PASSER_COMMANDE":
      return {
        ...etat,
        produits: decalerStock(etat.produits, operation.lignes, -1),
        commandes: [...etat.commandes, operation.commande],
        historique: [...etat.historique, operation],
      };

    default:
      return etat;
  }
}

/**
 * Annule une opération déjà exécutée. C'est l'opération INVERSE : elle rend le
 * stock prélevé et retire la commande de l'historique et de la liste.
 */
export function annulerOperation(etat, operation) {
  switch (operation.type) {
    case "PASSER_COMMANDE":
      return {
        ...etat,
        produits: decalerStock(etat.produits, operation.lignes, +1),
        commandes: etat.commandes.filter((commande) => commande.id !== operation.commandeId),
        historique: etat.historique.filter((o) => o !== operation),
      };

    default:
      return etat;
  }
}

/**
 * TRANSITION PURE : passer une commande.
 *
 * Elle sort du reducer et est exportée pour trois raisons :
 *  - une seule implémentation des règles (pas de validation dupliquée) ;
 *  - le reducer devient une ligne → ses cas restent lisibles ;
 *  - elle s'appelle directement dans les tests, sans React.
 *
 * @param {ReturnType<typeof creerEtatInitial>} etat
 * @param {{ nom: string, prenom: string, email: string,
 *           lignes: {idProduit: string, quantite: number}[] }} formulaire
 * @param {string} date  Date AAAA-MM-JJ (injectée → déterministe en test)
 * @returns {{ rapport: object, etat: ReturnType<typeof creerEtatInitial>,
 *             commande: import('../data/seed.js').Commande | null }}
 */
export function appliquerCommande(etat, formulaire, date) {
  // L'état est le dernier rempart : il ne fait confiance à aucun formulaire.
  const rapport = validerCommande(etat.produits, formulaire);
  if (!rapport.valide) {
    return { rapport, etat, commande: null };
  }

  const commande = {
    id: numeroCommande(etat.prochainNumero),
    date,
    client: {
      nom: formulaire.nom.trim(),
      prenom: formulaire.prenom.trim(),
      email: formulaire.email.trim(),
    },
    lignes: rapport.lignes,
  };

  const operation = operationPasserCommande(commande);
  const etatSuivant = executerOperation(
    { ...etat, prochainNumero: etat.prochainNumero + 1 },
    operation,
  );

  return { rapport, etat: etatSuivant, commande };
}

/**
 * TRANSITION PURE : annuler la dernière opération de l'historique.
 * Ne fait rien si l'historique est vide (et le signale via `operation === null`).
 */
export function annulerDerniereOperation(etat) {
  const operation = etat.historique.at(-1);
  if (operation === undefined) {
    return { etat, operation: null };
  }
  return { etat: annulerOperation(etat, operation), operation };
}

/** Le reducer : une fonction pure (état, action) → nouvel état. */
export function reducer(etat, action) {
  switch (action.type) {
    case "VALIDER_COMMANDE":
      return appliquerCommande(etat, action.formulaire, action.date).etat;

    case "ANNULER_DERNIERE_OPERATION":
      return annulerDerniereOperation(etat).etat;

    case "REINITIALISER":
      return creerEtatInitial();

    default:
      return etat;
  }
}
