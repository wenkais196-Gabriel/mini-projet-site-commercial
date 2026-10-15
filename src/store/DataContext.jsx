/* =============================================================================
   DataContext.jsx — the React GLUE of the shared state.

   This file no longer holds any business rule: the calculations are in
   `selectors.js`, the transitions in `state.js`, the building of an order in
   `orderBuilder.js`, the states of the form in `orderStatus.js`.
   Here we only do three things:

     1. create the single state of the application (one <DataProvider> mounted);
     2. expose the actions that make it evolve;
     3. provide the `useData()` hook that gives access to it.

   Problem to solve: the 3 pages are independent, there is no server, and yet "the
   data are linked between the virtual pages". A piece of data therefore cannot
   belong to a page: it belongs to a COMMON ANCESTOR, here the DataProvider placed
   above the router (see src/App.jsx).

   What this file brings to part 2 (design pattern analysis):
   - a single STATE whose transitions are pure functions (Command lead);
   - the subscribed components (useData) are RE-RENDERED when the state changes:
     that is exactly a publish/subscribe mechanism (Observer lead);
   - the single instance provided by the Provider is a single entry point
     (Singleton lead), with the caveat that in React we prefer "single state +
     notification" over "mutable global variable".

   Tooling note: this module exports both a component (DataProvider) and a hook
   (useData). The lint rule `react/only-export-components` targets single-component
   files and would report a false positive here: it is therefore disabled for THIS
   file only (see .oxlintrc.json).
   ========================================================================== */

import { createContext, useCallback, useContext, useMemo, useReducer } from "react";
import { computeStats } from "./selectors.js";
import {
  createInitialState,
  placeOrder,
  reducer,
  undoLastOperation as transitionUndoLastOperation,
} from "./state.js";

const DataContext = createContext(null);

/**
 * Provides the state and the actions to the whole component tree.
 * @param {{ children: React.ReactNode, today?: string }} props
 *   `today` is injectable to keep the tests deterministic
 *   (in production, the current date is used).
 */
export function DataProvider({ children, today }) {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);

  /**
   * Saves an order when it is valid, otherwise returns the error report.
   * The transition is computed BEFORE the dispatch: that is what makes it possible
   * to hand back to the caller the order actually created (a reducer returns nothing).
   */
  const saveOrder = useCallback(
    (form) => {
      const date = today ?? new Date().toISOString().slice(0, 10);
      const { report, order } = placeOrder(state, form, date);

      if (order === null) return report; // the page displays the errors

      dispatch({ type: "PLACE_ORDER", form, date });
      return { ...report, order };
    },
    [state, today],
  );

  /**
   * Undoes the last recorded operation (Command pattern).
   * @returns {{ undone: boolean, label?: string }}
   */
  const undoLastOperation = useCallback(() => {
    const { operation } = transitionUndoLastOperation(state);
    if (operation === null) return { undone: false };

    dispatch({ type: "UNDO_LAST_OPERATION" });
    return { undone: true, label: operation.label };
  }, [state]);

  /** Restores the starting data (demonstration / defence). */
  const reset = useCallback(() => dispatch({ type: "RESET" }), []);

  const value = useMemo(
    () => ({
      /** @type {import('../data/seed.js').Product[]} */
      products: state.products,
      /** @type {import('../data/seed.js').Order[]} */
      orders: state.orders,
      /** Derived indicators, recomputed on every state change. */
      stats: computeStats(state.products, state.orders),
      /** Saves an order when it is valid, otherwise returns the errors. */
      saveOrder,
      /** Undoes the last operation; returns `{ undone, label }`. */
      undoLastOperation,
      /** Last undoable operation, or `null` (used for the button label). */
      lastOperation: state.history.at(-1) ?? null,
      canUndo: state.history.length > 0,
      /** Restores the starting data. */
      reset,
    }),
    [state, saveOrder, undoLastOperation, reset],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

/**
 * Single entry point to the shared state, used by the pages and the components.
 * The thrown error is deliberately explicit: it is trap #1 in React
 * (a component used outside its provider → silent `null` context).
 */
export function useData() {
  const context = useContext(DataContext);
  if (context === null) {
    throw new Error(
      "useData() doit être appelé dans un <DataProvider> (voir src/App.jsx).",
    );
  }
  return context;
}
