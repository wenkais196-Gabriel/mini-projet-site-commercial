/* =============================================================================
   DataContext.jsx — le STORE de l'application. C'est la pièce centrale du sujet.

   Problème à résoudre : les 3 pages sont indépendantes, il n'y a pas de serveur,
   et pourtant « les données sont liées entre les pages virtuelles ». Une donnée
   ne peut donc pas appartenir à une page : elle doit appartenir à un ANCÊTRE
   COMMUN, ici le DataProvider placé au-dessus du router (voir src/App.jsx).

   Ce que ce fichier apporte pour la partie 2 (analyse de patterns) :
   - un ÉTAT unique (produits + commandes) dont toutes les transitions sont
     décrites par une seule fonction pure, `appliquerCommande` : un « magasin »
     dont tous les composants lisent la même version ;
   - les composants abonnés (useData) sont RE-RENDUS quand l'état change : c'est
     exactement un mécanisme publier/abonner (piste Observer) ;
   - l'instance unique fournie par le Provider est un point d'accès unique
     (piste Singleton), à la réserve qu'en React on préfère
     « état unique + notification » à « variable globale mutable ».

   Note outillage : ce module exporte à la fois un composant (DataProvider), un
   hook (useData) et des transitions pures. La règle de lint
   `react/only-export-components` vise les fichiers d'un seul composant et
   signalerait ici trois faux positifs : elle est donc désactivée pour CE fichier
   uniquement (voir .oxlintrc.json).
   ========================================================================== */

import { createContext, useCallback, useContext, useMemo, useReducer } from "react";
import { COMMANDES_INITIALES, PRODUITS_INITIAUX } from "../data/seed.js";
import { calculerStatistiques, validerCommande } from "./selecteurs.js";

const DataContext = createContext(null);

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
    prochainNumero: COMMANDES_INITIALES.length + 1,
  };
}

function numeroCommande(numero) {
  return `C${String(numero).padStart(3, "0")}`;
}

/**
 * TRANSITION PURE de l'état : passer une commande.
 *
 * Elle est volontairement sortie du reducer et exportée :
 *  - une seule implémentation des règles (pas de validation dupliquée) ;
 *  - le reducer devient une ligne → ses cas restent lisibles ;
 *  - elle est appelable directement en console pour vérifier le modèle.
 *
 * @param {ReturnType<typeof creerEtatInitial>} etat
 * @param {{ nom: string, prenom: string, email: string, lignes: {idProduit:string, quantite:number}[] }} formulaire
 * @param {string} date  Date au format AAAA-MM-JJ (injectée → déterministe en test)
 * @returns {{ rapport: ReturnType<typeof validerCommande>,
 *             etat: ReturnType<typeof creerEtatInitial>,
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

  // Décrémentation du stock : c'est ICI que les 3 pages deviennent « liées ».
  // Passer une commande change l'affichage de la page Produits (surlignage) et de
  // l'Accueil (nombre de commandes), sans que ces pages aient rien demandé.
  const produits = etat.produits.map((produit) => {
    const ligne = rapport.lignes.find((l) => l.idProduit === produit.id);
    return ligne
      ? { ...produit, quantite: produit.quantite - ligne.quantite }
      : produit;
  });

  return {
    rapport,
    etat: {
      ...etat,
      produits,
      commandes: [...etat.commandes, commande],
      prochainNumero: etat.prochainNumero + 1,
    },
    commande,
  };
}

/** Le reducer : une fonction pure (état, action) → nouvel état. */
function reducer(etat, action) {
  switch (action.type) {
    case "VALIDER_COMMANDE":
      return appliquerCommande(etat, action.formulaire, action.date).etat;

    case "REINITIALISER":
      return creerEtatInitial();

    default:
      return etat;
  }
}

/**
 * Fournit l'état et les actions à tout l'arbre de composants.
 * @param {{ children: React.ReactNode, dateDuJour?: string }} props
 *   `dateDuJour` est injectable pour rendre les tests déterministes
 *   (en production, on utilise la date du jour).
 */
export function DataProvider({ children, dateDuJour }) {
  const [etat, dispatch] = useReducer(reducer, undefined, creerEtatInitial);

  const validerCommandeAction = useCallback(
    (formulaire) => {
      const date = dateDuJour ?? new Date().toISOString().slice(0, 10);
      const { rapport, commande } = appliquerCommande(etat, formulaire, date);

      if (commande === null) return rapport; // la page affiche les erreurs

      dispatch({ type: "VALIDER_COMMANDE", formulaire, date });
      // On renvoie la commande créée pour que la page puisse la confirmer.
      return { ...rapport, commande };
    },
    [etat, dateDuJour],
  );

  const reinitialiser = useCallback(() => dispatch({ type: "REINITIALISER" }), []);

  const valeur = useMemo(
    () => ({
      /** @type {import('../data/seed.js').Produit[]} */
      produits: etat.produits,
      /** @type {import('../data/seed.js').Commande[]} */
      commandes: etat.commandes,
      /** Indicateurs dérivés, recalculés à chaque changement d'état. */
      statistiques: calculerStatistiques(etat.produits, etat.commandes),
      /** Enregistre une commande si elle est valide, sinon renvoie les erreurs. */
      validerCommande: validerCommandeAction,
      /** Rétablit les données de départ (démonstration / soutenance). */
      reinitialiser,
    }),
    [etat, validerCommandeAction, reinitialiser],
  );

  return <DataContext.Provider value={valeur}>{children}</DataContext.Provider>;
}

/**
 * Point d'accès unique à l'état partagé, utilisé par les pages et les composants.
 * L'erreur levée est volontairement explicite : c'est le piège n°1 en React
 * (composant utilisé hors de son fournisseur → contexte `null` silencieux).
 */
export function useData() {
  const contexte = useContext(DataContext);
  if (contexte === null) {
    throw new Error(
      "useData() doit être appelé dans un <DataProvider> (voir src/App.jsx).",
    );
  }
  return contexte;
}
