/* Tests of the STATE TRANSITIONS (src/store/state.js) — Command pattern.
   No browser, no React: the transitions are called directly. */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { INITIAL_PRODUCTS } from "../src/data/seed.js";
import {
  createInitialState,
  executeOperation,
  placeOrder,
  reducer,
  undoLastOperation,
} from "../src/store/state.js";

const CUSTOMER = { lastName: "Song", firstName: "Wenkai", email: "wenkai@exemple.fr" };
const DATE = "2026-10-08";

const stock = (state, productId) =>
  state.products.find((product) => product.id === productId).quantity;

describe("initial state", () => {
  it("copies the starting data instead of sharing it", () => {
    const state = createInitialState();
    state.products[0].quantity = 999;
    assert.notEqual(INITIAL_PRODUCTS[0].quantity, 999);
  });

  it("starts with 13 products, 3 orders and an empty history", () => {
    const state = createInitialState();
    assert.equal(state.products.length, 13);
    assert.equal(state.orders.length, 3);
    assert.deepEqual(state.history, []);
    assert.equal(state.nextOrderNumber, 4);
  });
});

describe("placing an order", () => {
  it("refuses an invalid order without touching the state (same reference)", () => {
    const state = createInitialState();
    const { report, state: after, order } = placeOrder(
      state,
      { ...CUSTOMER, lines: [] },
      DATE,
    );
    assert.equal(report.valid, false);
    assert.equal(order, null);
    assert.equal(after, state); // the state was not rebuilt
  });

  it("refuses a quantity above the stock", () => {
    const state = createInitialState();
    const { order } = placeOrder(
      state,
      { ...CUSTOMER, lines: [{ productId: "P13", quantity: 99 }] },
      DATE,
    );
    assert.equal(order, null);
  });

  it("creates order C004, decrements the stock and pushes an operation", () => {
    const state = createInitialState();
    const stockBefore = stock(state, "P10"); // Poivron: 22
    const { order, state: after } = placeOrder(
      state,
      { ...CUSTOMER, lines: [{ productId: "P10", quantity: 12 }] },
      DATE,
    );

    assert.equal(order.id, "C004");
    assert.equal(order.date, DATE);
    assert.equal(order.customer.lastName, "Song");
    assert.equal(after.orders.length, 4);
    assert.equal(stock(after, "P10"), stockBefore - 12);
    assert.equal(after.history.length, 1);
    assert.equal(after.history[0].type, "PLACE_ORDER");
    assert.equal(after.history[0].label, "commande C004");
  });

  it("never mutates the state it receives (pure function)", () => {
    const state = createInitialState();
    const before = structuredClone(state);
    placeOrder(state, { ...CUSTOMER, lines: [{ productId: "P01", quantity: 1 }] }, DATE);
    assert.deepEqual(state, before);
  });

  it("numbers successive orders without reusing an id", () => {
    let state = createInitialState();
    state = placeOrder(state, { ...CUSTOMER, lines: [{ productId: "P01", quantity: 1 }] }, DATE).state;
    state = placeOrder(state, { ...CUSTOMER, lines: [{ productId: "P06", quantity: 1 }] }, DATE).state;
    assert.deepEqual(state.orders.map((order) => order.id).slice(-2), ["C004", "C005"]);
  });

  it("trims the spaces around the customer fields", () => {
    const { order } = placeOrder(
      createInitialState(),
      {
        lastName: "  Song ",
        firstName: " Wenkai",
        email: " a@b.fr ",
        lines: [{ productId: "P01", quantity: 1 }],
      },
      DATE,
    );
    assert.equal(order.customer.lastName, "Song");
    assert.equal(order.customer.email, "a@b.fr");
  });
});

describe("undoing the last operation (Command pattern)", () => {
  it("does nothing when the history is empty", () => {
    const state = createInitialState();
    const { operation, state: after } = undoLastOperation(state);
    assert.equal(operation, null);
    assert.equal(after, state);
  });

  it("gives the stock back and removes the order", () => {
    const state0 = createInitialState();
    const stockBefore = stock(state0, "P10");

    const { state: state1 } = placeOrder(
      state0,
      { ...CUSTOMER, lines: [{ productId: "P10", quantity: 12 }] },
      DATE,
    );
    assert.equal(stock(state1, "P10"), stockBefore - 12);

    const { operation, state: state2 } = undoLastOperation(state1);
    assert.equal(operation.label, "commande C004");
    assert.equal(stock(state2, "P10"), stockBefore); // stock given back
    assert.equal(state2.orders.length, 3); // order removed
    assert.deepEqual(state2.history, []);
  });

  it("undoes the operations in reverse order (last in, first undone)", () => {
    let state = createInitialState();
    state = placeOrder(state, { ...CUSTOMER, lines: [{ productId: "P01", quantity: 2 }] }, DATE).state;
    state = placeOrder(state, { ...CUSTOMER, lines: [{ productId: "P06", quantity: 3 }] }, DATE).state;

    const afterFirstUndo = undoLastOperation(state).state;
    assert.deepEqual(
      afterFirstUndo.orders.map((order) => order.id),
      ["C001", "C002", "C003", "C004"],
    );

    const afterSecondUndo = undoLastOperation(afterFirstUndo).state;
    assert.deepEqual(
      afterSecondUndo.orders.map((order) => order.id),
      ["C001", "C002", "C003"],
    );
    assert.deepEqual(afterSecondUndo.history, []);
  });

  it("gives the stock back for a multi-line order (two products)", () => {
    const state0 = createInitialState();
    const banana = stock(state0, "P01");
    const water = stock(state0, "P12");

    const { state: state1 } = placeOrder(
      state0,
      {
        ...CUSTOMER,
        lines: [
          { productId: "P01", quantity: 5 },
          { productId: "P12", quantity: 7 },
        ],
      },
      DATE,
    );
    const { state: state2 } = undoLastOperation(state1);

    assert.equal(stock(state2, "P01"), banana);
    assert.equal(stock(state2, "P12"), water);
  });
});

describe("executing an unknown operation", () => {
  it("leaves the state unchanged instead of crashing", () => {
    const state = createInitialState();
    assert.equal(executeOperation(state, { type: "UNKNOWN_OPERATION" }), state);
  });
});

describe("reducer", () => {
  it("applies PLACE_ORDER", () => {
    const state = reducer(createInitialState(), {
      type: "PLACE_ORDER",
      form: { ...CUSTOMER, lines: [{ productId: "P01", quantity: 1 }] },
      date: DATE,
    });
    assert.equal(state.orders.length, 4);
  });

  it("applies UNDO_LAST_OPERATION", () => {
    const withOrder = reducer(createInitialState(), {
      type: "PLACE_ORDER",
      form: { ...CUSTOMER, lines: [{ productId: "P01", quantity: 1 }] },
      date: DATE,
    });
    const after = reducer(withOrder, { type: "UNDO_LAST_OPERATION" });
    assert.equal(after.orders.length, 3);
  });

  it("RESET goes back to the starting data", () => {
    const withOrder = reducer(createInitialState(), {
      type: "PLACE_ORDER",
      form: { ...CUSTOMER, lines: [{ productId: "P01", quantity: 1 }] },
      date: DATE,
    });
    const after = reducer(withOrder, { type: "RESET" });
    assert.equal(after.orders.length, 3);
    assert.equal(after.products.length, 13);
    assert.deepEqual(after.history, []);
  });

  it("ignores an unknown action", () => {
    const state = createInitialState();
    assert.equal(reducer(state, { type: "WHATEVER" }), state);
  });
});
