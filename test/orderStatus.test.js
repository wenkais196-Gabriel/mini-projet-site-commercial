/* Tests of the ORDER FORM STATE MACHINE (src/store/orderStatus.js) — State pattern. */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  EVENTS,
  STATUSES,
  TRANSITIONS,
  canTransition,
  showsConfirmation,
  showsErrors,
  statusAfterEdit,
  statusAfterNewOrder,
  statusAfterSubmit,
  transition,
} from "../src/store/orderStatus.js";

const { DRAFT, EDITING, INVALID, VALID, SAVED } = STATUSES;

describe("the transition table", () => {
  it("describes every status, and nothing else", () => {
    assert.deepEqual(Object.keys(TRANSITIONS).sort(), [
      "Brouillon",
      "En cours de saisie",
      "Enregistrée",
      "Invalide",
      "Valide",
    ]);
  });
});

describe("nominal path", () => {
  it("Draft → Editing → Valid → Saved", () => {
    let status = DRAFT;

    status = statusAfterEdit(status, { formIsEmpty: false });
    assert.equal(status, EDITING);

    status = statusAfterSubmit(status, { valid: true });
    assert.equal(status, SAVED, "a successful verification chains into the save");
  });
});

describe("error path", () => {
  it("Editing → Invalid when the verification fails", () => {
    const status = statusAfterSubmit(EDITING, { valid: false });
    assert.equal(status, INVALID);
    assert.equal(showsErrors(status), true);
    assert.equal(showsConfirmation(status), false);
  });

  it("Invalid → Editing as soon as the user corrects (the messages disappear)", () => {
    const status = statusAfterEdit(INVALID, { formIsEmpty: false });
    assert.equal(status, EDITING);
    assert.equal(showsErrors(status), false);
  });

  it("Invalid → Valid when the user submits correctly again", () => {
    assert.equal(statusAfterSubmit(INVALID, { valid: true }), SAVED);
  });

  it("submitting an empty form from Draft becomes Invalid", () => {
    assert.equal(statusAfterSubmit(DRAFT, { valid: false }), INVALID);
  });
});

describe("going back to the draft", () => {
  it("emptying the form goes back to Draft", () => {
    assert.equal(statusAfterEdit(EDITING, { formIsEmpty: true }), DRAFT);
    assert.equal(statusAfterEdit(SAVED, { formIsEmpty: true }), DRAFT);
  });

  it("« nouvelle commande » after a save goes back to Draft", () => {
    assert.equal(statusAfterNewOrder(SAVED), DRAFT);
  });
});

describe("FORBIDDEN transitions", () => {
  it("an order that was never checked cannot be saved", () => {
    assert.equal(canTransition(DRAFT, EVENTS.SAVE), false);
    assert.equal(transition(DRAFT, EVENTS.SAVE), DRAFT);
  });

  it("an already saved order cannot be checked again", () => {
    assert.equal(canTransition(SAVED, EVENTS.VERIFICATION_SUCCEEDED), false);
    assert.equal(transition(SAVED, EVENTS.VERIFICATION_SUCCEEDED), SAVED);
  });

  it("a forbidden transition leaves the state unchanged instead of crashing", () => {
    for (const status of Object.values(STATUSES)) {
      for (const event of Object.values(EVENTS)) {
        const result = transition(status, event);
        assert.ok(
          Object.values(STATUSES).includes(result),
          `(${status}, ${event}) must remain a known status`,
        );
      }
    }
  });

  it("an unknown event is a programming error, therefore reported", () => {
    assert.throws(() => transition(EDITING, "unknown-event"), /Événement inconnu/);
  });
});

describe("messages driven by the state", () => {
  it("no message in Draft or Editing", () => {
    for (const status of [DRAFT, EDITING]) {
      assert.equal(showsErrors(status), false);
      assert.equal(showsConfirmation(status), false);
    }
  });

  it("only the Saved state displays the confirmation", () => {
    assert.equal(showsConfirmation(SAVED), true);
    assert.equal(showsConfirmation(VALID), false);
  });

  it("only the Invalid state displays the errors", () => {
    assert.equal(showsErrors(INVALID), true);
    assert.equal(showsErrors(VALID), false);
  });
});
