/* =============================================================================
   statutCommande.js — machine à états du formulaire de commande (pattern State).

   Pourquoi une machine à états plutôt que trois booléens ? Parce que le formulaire
   a des états qui s'EXCLUENT et des enchaînements qui ne sont pas tous permis :
   on ne peut pas enregistrer une commande jamais vérifiée, ni afficher les erreurs
   d'une commande déjà enregistrée. Le tableau TRANSITIONS ci-dessous est la
   définition unique de ce qui est permis — et ce qui ne l'est pas est REFUSÉ au
   lieu d'être simplement non prévu.

   Ce que la page y gagne : ses messages sont pilotés par l'état
   (`afficheLesErreurs`, `afficheLaConfirmation`) au lieu d'être déduits de
   conditions imbriquées dans le JSX.
   ========================================================================== */

export const STATUTS = {
  BROUILLON: "Brouillon",
  EN_SAISIE: "En cours de saisie",
  INVALIDE: "Invalide",
  VALIDE: "Valide",
  ENREGISTREE: "Enregistree",
};

export const EVENEMENTS = {
  SAISIE: "saisie",
  EFFACEMENT: "effacement",
  VERIFICATION_REUSSIE: "verification-reussie",
  VERIFICATION_ECHOUEE: "verification-echouee",
  ENREGISTREMENT: "enregistrement",
  NOUVELLE_COMMANDE: "nouvelle-commande",
};

const { BROUILLON, EN_SAISIE, INVALIDE, VALIDE, ENREGISTREE } = STATUTS;
const {
  SAISIE,
  EFFACEMENT,
  VERIFICATION_REUSSIE,
  VERIFICATION_ECHOUEE,
  ENREGISTREMENT,
  NOUVELLE_COMMANDE,
} = EVENEMENTS;

/**
 * LA machine à états : pour chaque état, les événements acceptés et l'état d'arrivée.
 * Un couple (état, événement) absent de cette table est une transition interdite.
 */
export const TRANSITIONS = {
  [BROUILLON]: {
    [SAISIE]: EN_SAISIE,
    [VERIFICATION_ECHOUEE]: INVALIDE,
  },
  [EN_SAISIE]: {
    [SAISIE]: EN_SAISIE,
    [EFFACEMENT]: BROUILLON,
    [VERIFICATION_REUSSIE]: VALIDE,
    [VERIFICATION_ECHOUEE]: INVALIDE,
  },
  [INVALIDE]: {
    [SAISIE]: EN_SAISIE,
    [EFFACEMENT]: BROUILLON,
    [VERIFICATION_REUSSIE]: VALIDE,
    [VERIFICATION_ECHOUEE]: INVALIDE,
  },
  [VALIDE]: {
    [SAISIE]: EN_SAISIE,
    [EFFACEMENT]: BROUILLON,
    [ENREGISTREMENT]: ENREGISTREE,
  },
  [ENREGISTREE]: {
    [SAISIE]: EN_SAISIE,
    [EFFACEMENT]: BROUILLON,
    [NOUVELLE_COMMANDE]: BROUILLON,
  },
};

export function peutTransitionner(statut, evenement) {
  return Boolean(TRANSITIONS[statut]?.[evenement]);
}

/**
 * Applique un événement à un état.
 * - événement inconnu → erreur de programmation, on la signale ;
 * - événement connu mais interdit depuis cet état → l'état est inchangé
 *   (une interface ne doit jamais planter sur une action de l'utilisateur).
 */
export function transitionner(statut, evenement) {
  if (!Object.values(EVENEMENTS).includes(evenement)) {
    throw new Error(`Événement inconnu : « ${evenement} ».`);
  }
  return peutTransitionner(statut, evenement) ? TRANSITIONS[statut][evenement] : statut;
}

/** L'utilisateur a modifié (ou vidé) le formulaire. */
export function statutApresSaisie(statut, { formulaireVide }) {
  return transitionner(statut, formulaireVide ? EFFACEMENT : SAISIE);
}

/**
 * L'utilisateur a demandé la validation.
 * Chemin nominal : EN_SAISIE → VALIDE → ENREGISTREE (deux transitions successives).
 * Chemin d'erreur : → INVALIDE (les messages s'affichent).
 */
export function statutApresSoumission(statut, { valide }) {
  if (!valide) {
    return transitionner(statut, VERIFICATION_ECHOUEE);
  }
  return transitionner(transitionner(statut, VERIFICATION_REUSSIE), ENREGISTREMENT);
}

/** L'utilisateur repart d'une commande vierge après un enregistrement. */
export function statutApresNouvelleCommande(statut) {
  return transitionner(statut, NOUVELLE_COMMANDE);
}

/* --- Ce que l'état autorise à afficher (messages pilotés par l'état) ------- */

export const afficheLesErreurs = (statut) => statut === INVALIDE;
export const afficheLaConfirmation = (statut) => statut === ENREGISTREE;
