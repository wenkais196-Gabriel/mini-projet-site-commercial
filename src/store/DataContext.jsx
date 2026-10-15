/* =============================================================================
   DataContext.jsx — la COLLE React de l'état partagé.

   Ce fichier ne contient plus aucune règle métier : les calculs sont dans
   `selecteurs.js`, les transitions dans `etat.js`, la construction d'une commande
   dans `commandeBuilder.js`, les états du formulaire dans `statutCommande.js`.
   Ici on ne fait que trois choses :

     1. créer l'état unique de l'application (un seul <DataProvider> monté) ;
     2. exposer les actions qui le font évoluer ;
     3. fournir le hook `useData()` qui y donne accès.

   Problème à résoudre : les 3 pages sont indépendantes, il n'y a pas de serveur,
   et pourtant « les données sont liées entre les pages virtuelles ». Une donnée
   ne peut donc pas appartenir à une page : elle appartient à un ANCÊTRE COMMUN,
   ici le DataProvider placé au-dessus du router (voir src/App.jsx).

   Ce que ce fichier apporte pour la partie 2 (analyse de patterns) :
   - un ÉTAT unique dont les transitions sont des fonctions pures (piste Command) ;
   - les composants abonnés (useData) sont RE-RENDUS quand l'état change : c'est
     exactement un mécanisme publier/abonner (piste Observer) ;
   - l'instance unique fournie par le Provider est un point d'accès unique
     (piste Singleton), à la réserve qu'en React on préfère « état unique +
     notification » à « variable globale mutable ».

   Note outillage : ce module exporte à la fois un composant (DataProvider) et un
   hook (useData). La règle de lint `react/only-export-components` vise les fichiers
   d'un seul composant et signalerait ici un faux positif : elle est donc
   désactivée pour CE fichier uniquement (voir .oxlintrc.json).
   ========================================================================== */

import { createContext, useCallback, useContext, useMemo, useReducer } from "react";
import { calculerStatistiques } from "./selecteurs.js";
import {
  annulerDerniereOperation as transitionAnnulerDerniereOperation,
  appliquerCommande,
  creerEtatInitial,
  reducer,
} from "./etat.js";

const DataContext = createContext(null);

/**
 * Fournit l'état et les actions à tout l'arbre de composants.
 * @param {{ children: React.ReactNode, dateDuJour?: string }} props
 *   `dateDuJour` est injectable pour rendre les tests déterministes
 *   (en production, on utilise la date du jour).
 */
export function DataProvider({ children, dateDuJour }) {
  const [etat, dispatch] = useReducer(reducer, undefined, creerEtatInitial);

  /**
   * Enregistre une commande si elle est valide, sinon renvoie le rapport d'erreurs.
   * La transition est calculée AVANT le dispatch : c'est ce qui permet de renvoyer
   * à l'appelant la commande réellement créée (un reducer, lui, ne renvoie rien).
   */
  const validerCommande = useCallback(
    (formulaire) => {
      const date = dateDuJour ?? new Date().toISOString().slice(0, 10);
      const { rapport, commande } = appliquerCommande(etat, formulaire, date);

      if (commande === null) return rapport; // la page affiche les erreurs

      dispatch({ type: "VALIDER_COMMANDE", formulaire, date });
      return { ...rapport, commande };
    },
    [etat, dateDuJour],
  );

  /**
   * Annule la dernière opération enregistrée (pattern Command).
   * @returns {{ annulee: boolean, libelle?: string }}
   */
  const annulerDerniereOperation = useCallback(() => {
    const { operation } = transitionAnnulerDerniereOperation(etat);
    if (operation === null) return { annulee: false };

    dispatch({ type: "ANNULER_DERNIERE_OPERATION" });
    return { annulee: true, libelle: operation.libelle };
  }, [etat]);

  /** Rétablit les données de départ (démonstration / soutenance). */
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
      validerCommande,
      /** Annule la dernière opération ; renvoie `{ annulee, libelle }`. */
      annulerDerniereOperation,
      /** Dernière opération annulable, ou `null` (sert au libellé du bouton). */
      derniereOperation: etat.historique.at(-1) ?? null,
      peutAnnuler: etat.historique.length > 0,
      /** Rétablit les données de départ. */
      reinitialiser,
    }),
    [etat, validerCommande, annulerDerniereOperation, reinitialiser],
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
