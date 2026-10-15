/* =============================================================================
   state.js — the application STATE and its TRANSITIONS, as PURE functions.

   Why this file is separate from DataContext.jsx: everything that touches the
   state lives here with not a single line of React, so it is directly testable:

       npm test          (= node --test)

   DataContext.jsx only keeps the React glue (useReducer, context, hook).

   The vocabulary is the one of the Command pattern: every operation applied to
   the state is a DATA OBJECT kept in `history`. `executeOperation` and
   `undoOperation` are its two interpreters — that is what makes undo possible
   without any operation-specific code.
   ========================================================================== */

import { INITIAL_ORDERS, INITIAL_PRODUCTS } from "../data/seed.js";
import { validateOrder } from "./selectors.js";

/**
 * Explicit deep copy of the starting data.
 * Without it, the state would share its arrays/objects with the constants of the
 * module: the first order would mutate `INITIAL_PRODUCTS` and the "Reset" button
 * would become ineffective.
 */
export function createInitialState() {
  return {
    products: INITIAL_PRODUCTS.map((product) => ({ ...product })),
    orders: INITIAL_ORDERS.map((order) => ({
      ...order,
      customer: { ...order.customer },
      lines: order.lines.map((line) => ({ ...line })),
    })),
    /* The orders shipped with the application are not in the history: they belong
       to the starting data, they are not "undoable". */
    history: [],
    nextOrderNumber: INITIAL_ORDERS.length + 1,
  };
}

export function formatOrderId(number) {
  return `C${String(number).padStart(3, "0")}`;
}

/**
 * Builds the OPERATION OBJECT matching a placed order.
 * It is pure data (no method): it can be stored in the state, compared, and undone
 * by a single interpreter.
 */
export function placeOrderOperation(order) {
  return {
    type: "PLACE_ORDER",
    orderId: order.id,
    label: `commande ${order.id}`,
    lines: order.lines.map((line) => ({ ...line })),
    order: {
      ...order,
      customer: { ...order.customer },
      lines: order.lines.map((line) => ({ ...line })),
    },
  };
}

/** Shifts the stock of the listed products (direction = +1 to give back, -1 to take). */
function shiftStock(products, lines, direction) {
  return products.map((product) => {
    const line = lines.find((candidate) => candidate.productId === product.id);
    return line
      ? { ...product, quantity: product.quantity + direction * line.quantity }
      : product;
  });
}

/**
 * Executes an operation on the state. Pure function: it returns a NEW state and
 * never mutates the one it receives.
 */
export function executeOperation(state, operation) {
  switch (operation.type) {
    case "PLACE_ORDER":
      return {
        ...state,
        products: shiftStock(state.products, operation.lines, -1),
        orders: [...state.orders, operation.order],
        history: [...state.history, operation],
      };

    default:
      return state;
  }
}

/**
 * Undoes an already executed operation. It is the INVERSE operation: it gives back
 * the stock that was taken and removes the order from the history and the list.
 */
export function undoOperation(state, operation) {
  switch (operation.type) {
    case "PLACE_ORDER":
      return {
        ...state,
        products: shiftStock(state.products, operation.lines, +1),
        orders: state.orders.filter((order) => order.id !== operation.orderId),
        history: state.history.filter((candidate) => candidate !== operation),
      };

    default:
      return state;
  }
}

/**
 * PURE TRANSITION: place an order.
 *
 * It is deliberately kept out of the reducer and exported, for three reasons:
 *  - a single implementation of the rules (no duplicated validation);
 *  - the reducer becomes a one-liner → its cases stay readable;
 *  - it can be called directly from the tests, without React.
 *
 * @param {ReturnType<typeof createInitialState>} state
 * @param {{ firstName: string, lastName: string, email: string,
 *           lines: {productId: string, quantity: number}[] }} form
 * @param {string} date  Date in AAAA-MM-JJ format (injected → deterministic in tests)
 * @returns {{ report: object, state: ReturnType<typeof createInitialState>,
 *             order: import('../data/seed.js').Order | null }}
 */
export function placeOrder(state, form, date) {
  // The state is the last line of defence: it trusts no form.
  const report = validateOrder(state.products, form);
  if (!report.valid) {
    return { report, state, order: null };
  }

  const order = {
    id: formatOrderId(state.nextOrderNumber),
    date,
    customer: {
      lastName: form.lastName.trim(),
      firstName: form.firstName.trim(),
      email: form.email.trim(),
    },
    lines: report.lines,
  };

  const operation = placeOrderOperation(order);
  const nextState = executeOperation(
    { ...state, nextOrderNumber: state.nextOrderNumber + 1 },
    operation,
  );

  return { report, state: nextState, order };
}

/**
 * PURE TRANSITION: undo the last operation of the history.
 * Does nothing when the history is empty (and reports it through `operation === null`).
 */
export function undoLastOperation(state) {
  const operation = state.history.at(-1);
  if (operation === undefined) {
    return { state, operation: null };
  }
  return { state: undoOperation(state, operation), operation };
}

/** The reducer: a pure function (state, action) → new state. */
export function reducer(state, action) {
  switch (action.type) {
    case "PLACE_ORDER":
      return placeOrder(state, action.form, action.date).state;

    case "UNDO_LAST_OPERATION":
      return undoLastOperation(state).state;

    case "RESET":
      return createInitialState();

    default:
      return state;
  }
}
