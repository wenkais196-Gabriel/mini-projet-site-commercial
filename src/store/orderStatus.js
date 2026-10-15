/* =============================================================================
   orderStatus.js — state machine of the order form (State pattern).

   Why a state machine rather than three booleans? Because the form has states that
   EXCLUDE each other and sequences that are not all allowed: you cannot save an
   order that was never checked, and you cannot display the errors of an order that
   is already saved. The TRANSITIONS table below is the single definition of what
   is allowed — and what is not is REFUSED instead of merely not foreseen.

   What the page gains from it: its messages are driven by the state
   (`showsErrors`, `showsConfirmation`) instead of being derived from conditions
   nested in the JSX.

   Note: the keys are English (code rule) but the VALUES are the labels displayed
   on screen, so they stay French.
   ========================================================================== */

export const STATUSES = {
  DRAFT: "Brouillon",
  EDITING: "En cours de saisie",
  INVALID: "Invalide",
  VALID: "Valide",
  SAVED: "Enregistrée",
};

export const EVENTS = {
  EDIT: "edit",
  CLEAR: "clear",
  VERIFICATION_SUCCEEDED: "verification-succeeded",
  VERIFICATION_FAILED: "verification-failed",
  SAVE: "save",
  NEW_ORDER: "new-order",
};

const { DRAFT, EDITING, INVALID, VALID, SAVED } = STATUSES;
const { EDIT, CLEAR, VERIFICATION_SUCCEEDED, VERIFICATION_FAILED, SAVE, NEW_ORDER } = EVENTS;

/**
 * THE state machine: for every state, the accepted events and the resulting state.
 * A (state, event) pair missing from this table is a forbidden transition.
 */
export const TRANSITIONS = {
  [DRAFT]: {
    [EDIT]: EDITING,
    [VERIFICATION_FAILED]: INVALID,
  },
  [EDITING]: {
    [EDIT]: EDITING,
    [CLEAR]: DRAFT,
    [VERIFICATION_SUCCEEDED]: VALID,
    [VERIFICATION_FAILED]: INVALID,
  },
  [INVALID]: {
    [EDIT]: EDITING,
    [CLEAR]: DRAFT,
    [VERIFICATION_SUCCEEDED]: VALID,
    [VERIFICATION_FAILED]: INVALID,
  },
  [VALID]: {
    [EDIT]: EDITING,
    [CLEAR]: DRAFT,
    [SAVE]: SAVED,
  },
  [SAVED]: {
    [EDIT]: EDITING,
    [CLEAR]: DRAFT,
    [NEW_ORDER]: DRAFT,
  },
};

export function canTransition(status, event) {
  return Boolean(TRANSITIONS[status]?.[event]);
}

/**
 * Applies an event to a state.
 * - unknown event → programming error, so it is reported;
 * - known but forbidden from this state → the state is unchanged
 *   (an interface must never crash on a user action).
 */
export function transition(status, event) {
  if (!Object.values(EVENTS).includes(event)) {
    throw new Error(`Événement inconnu : « ${event} ».`);
  }
  return canTransition(status, event) ? TRANSITIONS[status][event] : status;
}

/** The user edited (or emptied) the form. */
export function statusAfterEdit(status, { formIsEmpty }) {
  return transition(status, formIsEmpty ? CLEAR : EDIT);
}

/**
 * The user asked for validation.
 * Nominal path: EDITING → VALID → SAVED (two successive transitions).
 * Error path:   → INVALID (the messages appear).
 */
export function statusAfterSubmit(status, { valid }) {
  if (!valid) {
    return transition(status, VERIFICATION_FAILED);
  }
  return transition(transition(status, VERIFICATION_SUCCEEDED), SAVE);
}

/** The user starts again from a blank order after a save. */
export function statusAfterNewOrder(status) {
  return transition(status, NEW_ORDER);
}

/* --- What the state allows to display (messages driven by the state) -------- */

export const showsErrors = (status) => status === INVALID;
export const showsConfirmation = (status) => status === SAVED;
