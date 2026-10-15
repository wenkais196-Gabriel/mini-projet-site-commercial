/* =============================================================================
   selectors.js — ALL the calculation and validation rules of the application.

   These are PURE functions: they know nothing about React, the DOM or the store.
   They receive data and return a result.

   Why this file exists (reusable as-is in the report):
   - one single definition of each rule → the three pages cannot diverge;
   - testable without a browser (see test/selectors.test.js);
   - a page can DISPLAY an error by calling the very function that BLOCKS the
     data in the model: the rule is therefore written only once.
   ========================================================================== */

/* Modelling choice to justify in the report:
   "the quantity is below the threshold" — we INCLUDE equality (quantity ≤
   threshold). The other possible reading is strictly lower. The boundary case is
   deliberately present in the seed data (Orange, 12/12). */
export const THRESHOLD_INCLUSIVE = true;

/** A product whose stock is exactly 0 is out of stock (a special case of the above). */
export function isOutOfStock(product) {
  return product.quantity === 0;
}

/** The product must be reordered: its quantity has reached (or passed) the threshold. */
export function isLowStock(product) {
  return THRESHOLD_INCLUSIVE
    ? product.quantity <= product.threshold
    : product.quantity < product.threshold;
}

/** French display of a price: 2.4 → « 2,40 € ». */
export function formatPrice(price) {
  return `${price.toFixed(2).replace(".", ",")} €`;
}

export function findProduct(products, id) {
  return products.find((product) => product.id === id) ?? null;
}

/** Categories actually present, in their order of appearance. */
export function usedCategories(products) {
  return [...new Set(products.map((product) => product.category))];
}

/**
 * Filtering of the product list (Products page).
 * Every criterion is optional and they CUMULATE (logical AND).
 * @param {import('../data/seed.js').Product[]} products
 * @param {{ search?: string, category?: string, maxPrice?: number|null,
 *           maxQuantity?: number|null, maxThreshold?: number|null,
 *           onlyLowStock?: boolean }} filters
 */
export function filterProducts(products, filters = {}) {
  const {
    search = "",
    category = "",
    maxPrice = null,
    maxQuantity = null,
    maxThreshold = null,
    onlyLowStock = false,
  } = filters;

  const needle = search.trim().toLowerCase();

  return products.filter((product) => {
    const matchesSearch = needle === "" || product.name.toLowerCase().includes(needle);
    const matchesCategory = category === "" || product.category === category;
    const matchesPrice = maxPrice === null || product.price <= maxPrice;
    const matchesQuantity = maxQuantity === null || product.quantity <= maxQuantity;
    const matchesThreshold = maxThreshold === null || product.threshold <= maxThreshold;
    const matchesLowStock = !onlyLowStock || isLowStock(product);
    return (
      matchesSearch &&
      matchesCategory &&
      matchesPrice &&
      matchesQuantity &&
      matchesThreshold &&
      matchesLowStock
    );
  });
}

/**
 * Grouping by category, keeping the order of appearance.
 * @returns {{ category: string, products: import('../data/seed.js').Product[] }[]}
 */
export function groupByCategory(products) {
  const groups = [];
  for (const product of products) {
    let group = groups.find((candidate) => candidate.category === product.category);
    if (!group) {
      group = { category: product.category, products: [] };
      groups.push(group);
    }
    group.products.push(product);
  }
  return groups;
}

/**
 * Bounds of the filter sliders, computed from the real data
 * (never hard-coded in the component).
 * @param {import('../data/seed.js').Product[]} products
 * @returns {{ price: [number, number], quantity: [number, number], threshold: [number, number] }}
 */
export function filterBounds(products) {
  const maximumOf = (field) =>
    Math.max(1, Math.ceil(Math.max(...products.map((product) => product[field]))));

  return {
    price: [0, maximumOf("price")],
    quantity: [0, maximumOf("quantity")],
    threshold: [0, maximumOf("threshold")],
  };
}

function round(value, decimals = 1) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * Indicators of the Home page — DERIVED DATA, never stored in a state.
 * @param {import('../data/seed.js').Product[]} products
 * @param {import('../data/seed.js').Order[]} orders
 */
export function computeStats(products, orders) {
  const byCategory = groupByCategory(products).map((group) => {
    const totalStock = group.products.reduce((sum, product) => sum + product.quantity, 0);
    return {
      category: group.category,
      productCount: group.products.length,
      totalStock,
      averageStock: round(totalStock / group.products.length),
      lowStockCount: group.products.filter(isLowStock).length,
      averagePrice: round(
        group.products.reduce((sum, product) => sum + product.price, 0) /
          group.products.length,
        2,
      ),
    };
  });

  return {
    productCount: products.length,
    unitCount: products.reduce((sum, product) => sum + product.quantity, 0),
    orderCount: orders.length,
    orderedLineCount: orders.reduce((sum, order) => sum + order.lines.length, 0),
    lowStockCount: products.filter(isLowStock).length,
    outOfStockCount: products.filter(isOutOfStock).length,
    stockValue: round(
      products.reduce((sum, product) => sum + product.price * product.quantity, 0),
      2,
    ),
    byCategory,
  };
}

/* --- Order validation ------------------------------------------------------ */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Validates an order form AND its compliance with the available stock.
 * Single rule, called twice: by the page (to display) and by the store (to refuse
 * an invalid order).
 *
 * @param {import('../data/seed.js').Product[]} products
 * @param {{ firstName?: string, lastName?: string, email?: string,
 *           lines?: { productId: string, quantity: number }[] }} form
 * @returns {{ valid: boolean, errors: Record<string, string>,
 *             errorsByProduct: Record<string, string>,
 *             lines: { productId: string, quantity: number }[] }}
 */
export function validateOrder(products, form) {
  const firstName = form?.firstName ?? "";
  const lastName = form?.lastName ?? "";
  const email = form?.email ?? "";
  const lines = form?.lines ?? [];

  const errors = {};
  const errorsByProduct = {};

  if (lastName.trim() === "") errors.lastName = "Le nom est obligatoire.";
  if (firstName.trim() === "") errors.firstName = "Le prénom est obligatoire.";
  if (email.trim() === "") {
    errors.email = "L'adresse mail est obligatoire.";
  } else if (!EMAIL_PATTERN.test(email.trim())) {
    errors.email = "Format d'adresse mail invalide (attendu : nom@domaine.fr).";
  }

  // Only keep the lines that are actually ordered.
  const keptLines = lines.filter((line) => Number(line.quantity) > 0);
  if (keptLines.length === 0) {
    errors.lines = "Sélectionnez au moins un produit avec une quantité supérieure à 0.";
  }

  for (const line of keptLines) {
    const product = findProduct(products, line.productId);
    const quantity = Number(line.quantity);

    if (!product) {
      errorsByProduct[line.productId] = "Produit inconnu.";
      continue;
    }
    if (!Number.isInteger(quantity)) {
      errorsByProduct[line.productId] = "La quantité doit être un nombre entier.";
      continue;
    }
    if (quantity > product.quantity) {
      errorsByProduct[line.productId] =
        `Stock insuffisant : ${product.quantity} disponible(s) pour « ${product.name} ».`;
    }
  }

  const valid = Object.keys(errors).length === 0 && Object.keys(errorsByProduct).length === 0;

  return {
    valid,
    errors,
    errorsByProduct,
    lines: valid
      ? keptLines.map((line) => ({
          productId: line.productId,
          quantity: Number(line.quantity),
        }))
      : [],
  };
}
