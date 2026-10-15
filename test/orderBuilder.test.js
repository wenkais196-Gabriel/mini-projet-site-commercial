/* Tests of the order BUILDER (src/store/orderBuilder.js) — Builder pattern. */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { OrderBuilder } from "../src/store/orderBuilder.js";

const CATALOGUE = [
  { id: "P01", name: "Banane", category: "Fruit", price: 2.4, quantity: 42, threshold: 15 },
  { id: "P10", name: "Poivron", category: "Légume", price: 3.75, quantity: 22, threshold: 10 },
  { id: "P13", name: "Jus d'orange", category: "Boisson", price: 2.6, quantity: 3, threshold: 15 },
];

const CUSTOMER = { lastName: "Song", firstName: "Wenkai", email: "wenkai@exemple.fr" };

describe("nominal construction", () => {
  it("produces a valid order and the matching form", () => {
    const result = new OrderBuilder(CATALOGUE)
      .setCustomer(CUSTOMER)
      .addLine("P10", 12)
      .addLine("P01", 3)
      .build();

    assert.equal(result.valid, true);
    assert.deepEqual(result.lines, [
      { productId: "P10", quantity: 12 },
      { productId: "P01", quantity: 3 },
    ]);
    assert.deepEqual(result.form, {
      ...CUSTOMER,
      lines: [
        { productId: "P10", quantity: 12 },
        { productId: "P01", quantity: 3 },
      ],
    });
  });

  it("is chainable in any order", () => {
    const result = new OrderBuilder(CATALOGUE)
      .addLine("P01", 1)
      .setCustomer(CUSTOMER)
      .build();
    assert.equal(result.valid, true);
  });

  it("converts a quantity typed as text", () => {
    const result = new OrderBuilder(CATALOGUE)
      .setCustomer(CUSTOMER)
      .addLine("P01", "4")
      .build();
    assert.deepEqual(result.lines, [{ productId: "P01", quantity: 4 }]);
  });

  it("accepts a quantity exactly equal to the stock", () => {
    const result = new OrderBuilder(CATALOGUE)
      .setCustomer(CUSTOMER)
      .addLine("P13", 3)
      .build();
    assert.equal(result.valid, true);
  });

  it("setCustomer only replaces the fields it is given", () => {
    const result = new OrderBuilder(CATALOGUE)
      .setCustomer({ lastName: "Song" })
      .setCustomer({ firstName: "Wenkai", email: "wenkai@exemple.fr" })
      .addLine("P01", 1)
      .build();
    assert.equal(result.form.lastName, "Song");
    assert.equal(result.valid, true);
  });
});

describe("immediate refusals by addLine", () => {
  it("refuses a quantity above the stock and does not add the line", () => {
    const result = new OrderBuilder(CATALOGUE)
      .setCustomer(CUSTOMER)
      .addLine("P13", 4) // 3 in stock
      .addLine("P01", 1)
      .build();

    assert.deepEqual(result.lines, [{ productId: "P01", quantity: 1 }]);
    assert.match(result.errorsByProduct.P13, /Stock insuffisant/);
    assert.equal(result.valid, false, "a refused line makes the order invalid");
  });

  it("refuses an unknown product", () => {
    const result = new OrderBuilder(CATALOGUE)
      .setCustomer(CUSTOMER)
      .addLine("P99", 1)
      .build();
    assert.match(result.errorsByProduct.P99, /inconnu/);
    assert.deepEqual(result.lines, []);
  });

  it("refuses a zero, negative or non-integer quantity", () => {
    for (const quantity of [0, -2, 1.5]) {
      const result = new OrderBuilder(CATALOGUE)
        .setCustomer(CUSTOMER)
        .addLine("P01", quantity)
        .build();
      assert.deepEqual(result.lines, [], `quantity ${quantity} refused`);
      assert.match(result.errorsByProduct.P01, /entier supérieur à 0/);
    }
  });

  it("takes the lines already added into account (the total cannot exceed the stock)", () => {
    const result = new OrderBuilder(CATALOGUE)
      .setCustomer(CUSTOMER)
      .addLine("P13", 2)
      .addLine("P13", 2) // 2 + 2 > 3
      .build();

    assert.deepEqual(result.lines, [{ productId: "P13", quantity: 2 }]);
    assert.match(result.errorsByProduct.P13, /Stock insuffisant/);
  });
});

describe("final check by build()", () => {
  it("refuses an order without a customer", () => {
    const result = new OrderBuilder(CATALOGUE).addLine("P01", 1).build();
    assert.equal(result.valid, false);
    assert.ok(result.errors.lastName);
    assert.ok(result.errors.email);
  });

  it("refuses an order without a line", () => {
    const result = new OrderBuilder(CATALOGUE).setCustomer(CUSTOMER).build();
    assert.equal(result.valid, false);
    assert.match(result.errors.lines, /au moins un produit/);
  });

  it("refuses a malformed email address", () => {
    const result = new OrderBuilder(CATALOGUE)
      .setCustomer({ ...CUSTOMER, email: "pas-un-mail" })
      .addLine("P01", 1)
      .build();
    assert.equal(result.valid, false);
    assert.match(result.errors.email, /invalide/);
  });
});

describe("fixing things while building", () => {
  it("removeLine removes the line and its refusal", () => {
    const builder = new OrderBuilder(CATALOGUE)
      .setCustomer(CUSTOMER)
      .addLine("P13", 4); // refused
    assert.ok(builder.build().errorsByProduct.P13);

    builder.removeLine("P13").addLine("P01", 1);
    const result = builder.build();

    assert.equal(result.valid, true);
    assert.deepEqual(result.lines, [{ productId: "P01", quantity: 1 }]);
  });

  it("the returned lines are copies (the caller cannot mutate the object being built)", () => {
    const builder = new OrderBuilder(CATALOGUE).setCustomer(CUSTOMER).addLine("P01", 2);
    builder.lines[0].quantity = 999;
    assert.equal(builder.build().lines[0].quantity, 2);
  });
});
