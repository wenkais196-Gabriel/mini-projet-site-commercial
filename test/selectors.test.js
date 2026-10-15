/* Tests of the BUSINESS RULES (src/store/selectors.js).
   Run with: npm test       (= node --test)  — no dependency to install. */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  computeStats,
  filterBounds,
  filterProducts,
  findProduct,
  formatPrice,
  groupByCategory,
  isLowStock,
  isOutOfStock,
  usedCategories,
  validateOrder,
} from "../src/store/selectors.js";

const CATALOGUE = [
  { id: "P01", name: "Banane", category: "Fruit", price: 2.4, quantity: 42, threshold: 15 },
  { id: "P02", name: "Pomme", category: "Fruit", price: 1.6, quantity: 8, threshold: 20 },
  { id: "P03", name: "Cerise", category: "Fruit", price: 3.4, quantity: 0, threshold: 10 },
  { id: "P05", name: "Orange", category: "Fruit", price: 2.1, quantity: 12, threshold: 12 },
  { id: "P06", name: "Carotte", category: "Légume", price: 1.2, quantity: 60, threshold: 25 },
];

describe("state of a product", () => {
  it("reports low stock when the quantity is below the threshold", () => {
    assert.equal(isLowStock({ quantity: 8, threshold: 20 }), true);
  });

  it("reports nothing when the stock is comfortable", () => {
    assert.equal(isLowStock({ quantity: 42, threshold: 15 }), false);
  });

  it("does NOT flag a quantity exactly EQUAL to the threshold (reading the assignment literally: «en dessous» = strictly below — boundary case 12/12)", () => {
    assert.equal(isLowStock({ quantity: 12, threshold: 12 }), false);
  });

  it("distinguishes out of stock (zero quantity) from a simple low stock", () => {
    assert.equal(isOutOfStock({ quantity: 0, threshold: 10 }), true);
    assert.equal(isOutOfStock({ quantity: 1, threshold: 10 }), false);
  });
});

describe("display", () => {
  it("formats prices the French way", () => {
    assert.equal(formatPrice(2.4), "2,40 €");
    assert.equal(formatPrice(0.2), "0,20 €");
  });

  it("finds a product by id and returns null otherwise", () => {
    assert.equal(findProduct(CATALOGUE, "P05")?.name, "Orange");
    assert.equal(findProduct(CATALOGUE, "P99"), null);
  });

  it("lists the categories in their order of appearance", () => {
    assert.deepEqual(usedCategories(CATALOGUE), ["Fruit", "Légume"]);
  });
});

describe("filtering (criteria cumulate with AND)", () => {
  it("filters on the name, ignoring case and spaces", () => {
    assert.deepEqual(
      filterProducts(CATALOGUE, { search: "  pom " }).map((p) => p.id),
      ["P02"],
    );
  });

  it("filters on the category", () => {
    assert.deepEqual(
      filterProducts(CATALOGUE, { category: "Légume" }).map((p) => p.id),
      ["P06"],
    );
  });

  it("filters on the maximum price (bound included)", () => {
    assert.deepEqual(
      filterProducts(CATALOGUE, { maxPrice: 2.1 }).map((p) => p.id),
      ["P02", "P05", "P06"],
    );
  });

  it("filters on the maximum quantity (bound included)", () => {
    assert.deepEqual(
      filterProducts(CATALOGUE, { maxQuantity: 12 }).map((p) => p.id),
      ["P02", "P03", "P05"], // quantites 8, 0 et 12
    );
  });

  it("filters on the maximum threshold (bound included)", () => {
    assert.deepEqual(
      filterProducts(CATALOGUE, { maxThreshold: 15 }).map((p) => p.id),
      ["P01", "P03", "P05"], // seuils 15, 10 et 12
    );
  });

  it("cumulates the three numeric criteria", () => {
    assert.deepEqual(
      filterProducts(CATALOGUE, {
        maxPrice: 2.4,
        maxQuantity: 12,
        maxThreshold: 20,
      }).map((p) => p.id),
      ["P02", "P05"], // Pomme (1,60 / 8 / 20) et Orange (2,10 / 12 / 12)
    );
  });

  it("keeps only the products below their threshold when asked", () => {
    assert.deepEqual(
      filterProducts(CATALOGUE, { onlyLowStock: true }).map((p) => p.id),
      ["P02", "P03"], // Pomme 8/20 et Cerise 0/10 — Orange 12/12 n'est PAS sous le seuil
    );
  });

  it("cumulates the threshold criterion with the attribute filters", () => {
    assert.deepEqual(
      filterProducts(CATALOGUE, { onlyLowStock: true, category: "Fruit" }).map((p) => p.id),
      ["P02", "P03"],
    );
  });

  it("cumulates two criteria (category + price)", () => {
    assert.deepEqual(
      filterProducts(CATALOGUE, { category: "Fruit", maxPrice: 2.1 }).map((p) => p.id),
      ["P02", "P05"],
    );
  });

  it("returns everything when no criterion is given", () => {
    assert.equal(filterProducts(CATALOGUE, {}).length, CATALOGUE.length);
  });
});

describe("grouping and bounds", () => {
  it("groups by category keeping the order of appearance", () => {
    const groups = groupByCategory(CATALOGUE);
    assert.deepEqual(groups.map((g) => g.category), ["Fruit", "Légume"]);
    assert.equal(groups[0].products.length, 4);
  });

  it("computes slider bounds that cover the data", () => {
    const bounds = filterBounds(CATALOGUE);
    assert.deepEqual(bounds.price, [0, 4]); // max 3,40 rounded up
    assert.deepEqual(bounds.quantity, [0, 60]);
    assert.deepEqual(bounds.threshold, [0, 25]);
  });

  it("does not crash on an empty catalogue", () => {
    const bounds = filterBounds([]);
    assert.deepEqual(bounds.price, [0, 1]);
  });
});

describe("indicators of the Home page", () => {
  it("counts the products", () => {
    const stats = computeStats(CATALOGUE, []);
    assert.equal(stats.productCount, 5);
  });

  it("details each category: number of products and average stock", () => {
    const stats = computeStats(CATALOGUE, []);
    const fruits = stats.byCategory.find((c) => c.category === "Fruit");
    assert.equal(fruits.productCount, 4);
    assert.equal(fruits.averageStock, 15.5); // (42 + 8 + 0 + 12) / 4
  });

  it("counts the orders", () => {
    const stats = computeStats([], [
      { id: "C001", lines: [{ productId: "P01", quantity: 2 }] },
      {
        id: "C002",
        lines: [
          { productId: "P06", quantity: 1 },
          { productId: "P05", quantity: 3 },
        ],
      },
    ]);
    assert.equal(stats.orderCount, 2);
  });
});

describe("order validation", () => {
  const validCustomer = { lastName: "Song", firstName: "Wenkai", email: "wenkai@exemple.fr" };

  it("accepts a compliant order and trims the spaces", () => {
    const report = validateOrder(CATALOGUE, {
      ...validCustomer,
      lines: [{ productId: "P01", quantity: " 3 " }],
    });
    assert.equal(report.valid, true);
    assert.deepEqual(report.lines, [{ productId: "P01", quantity: 3 }]);
  });

  it("requires the last name, the first name and an email address", () => {
    const report = validateOrder(CATALOGUE, {
      lastName: "  ",
      firstName: "",
      email: "",
      lines: [],
    });
    assert.equal(report.valid, false);
    assert.ok(report.errors.lastName);
    assert.ok(report.errors.firstName);
    assert.ok(report.errors.email);
  });

  it("refuses a malformed email address", () => {
    const report = validateOrder(CATALOGUE, {
      ...validCustomer,
      email: "wenkai@@exemple",
      lines: [{ productId: "P01", quantity: 1 }],
    });
    assert.equal(report.valid, false);
    assert.match(report.errors.email, /invalide/);
  });

  it("refuses an order with no ordered line", () => {
    const report = validateOrder(CATALOGUE, { ...validCustomer, lines: [] });
    assert.equal(report.valid, false);
    assert.match(report.errors.lines, /au moins un produit/);
  });

  it("ignores lines with a zero quantity", () => {
    const report = validateOrder(CATALOGUE, {
      ...validCustomer,
      lines: [{ productId: "P01", quantity: 0 }],
    });
    assert.equal(report.valid, false);
    assert.match(report.errors.lines, /au moins un produit/);
  });

  it("REFUSES a quantity above the available stock", () => {
    const report = validateOrder(CATALOGUE, {
      ...validCustomer,
      lines: [{ productId: "P02", quantity: 9 }], // 8 in stock
    });
    assert.equal(report.valid, false);
    assert.match(report.errorsByProduct.P02, /Stock insuffisant/);
  });

  it("accepts a quantity exactly equal to the stock", () => {
    const report = validateOrder(CATALOGUE, {
      ...validCustomer,
      lines: [{ productId: "P02", quantity: 8 }],
    });
    assert.equal(report.valid, true);
  });

  it("refuses a non-integer quantity", () => {
    const report = validateOrder(CATALOGUE, {
      ...validCustomer,
      lines: [{ productId: "P01", quantity: 1.5 }],
    });
    assert.equal(report.valid, false);
    assert.match(report.errorsByProduct.P01, /entier/);
  });

  it("refuses an unknown product", () => {
    const report = validateOrder(CATALOGUE, {
      ...validCustomer,
      lines: [{ productId: "P99", quantity: 1 }],
    });
    assert.equal(report.valid, false);
    assert.match(report.errorsByProduct.P99, /inconnu/);
  });
});
