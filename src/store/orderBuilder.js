/* =============================================================================
   orderBuilder.js — building an order step by step (Builder pattern).

   An order is not an object you fill in randomly: it obeys rules (customer filled
   in, at least one line, integer quantities within the available stock). The
   Builder gathers those rules in one place and refuses to go further as long as
   they are not met:

     const result = new OrderBuilder(products)
       .setCustomer({ lastName, firstName, email })
       .addLine("P10", 12)
       .addLine("P01", 3)
       .build();          // → { valid, form, lines, errors, errorsByProduct }

   Two levels of control, deliberately:
   - `addLine` refuses an impossible line IMMEDIATELY (fail fast);
   - `build` delegates the final judgement to `validateOrder`: the Builder
     assembles, the validator judges. One single definition of the rules, never two.
   ========================================================================== */

import { findProduct, validateOrder } from "./selectors.js";

export class OrderBuilder {
  /** @type {import('../data/seed.js').Product[]} */
  #products;
  #customer = { lastName: "", firstName: "", email: "" };
  #lines = [];
  #refusals = {};

  /** @param {import('../data/seed.js').Product[]} products the catalogue, source of the stock check */
  constructor(products) {
    this.#products = products;
  }

  /** @param {{ lastName?: string, firstName?: string, email?: string }} customer */
  setCustomer(customer) {
    this.#customer = { ...this.#customer, ...customer };
    return this;
  }

  /**
   * Adds a line to the order being built.
   * The line is refused (and recorded in `errorsByProduct`) when the product is
   * unknown, when the quantity is not a strictly positive integer, or when the
   * available stock is not enough — taking the lines already added into account.
   */
  addLine(productId, quantity) {
    const product = findProduct(this.#products, productId);
    const requested = Number(quantity);

    if (product === null) {
      this.#refuse(productId, "Produit inconnu.");
      return this;
    }
    if (!Number.isInteger(requested) || requested <= 0) {
      this.#refuse(productId, "La quantité doit être un nombre entier supérieur à 0.");
      return this;
    }

    const alreadyRequested = this.#lines
      .filter((line) => line.productId === productId)
      .reduce((sum, line) => sum + line.quantity, 0);

    if (alreadyRequested + requested > product.quantity) {
      this.#refuse(
        productId,
        `Stock insuffisant : ${product.quantity} disponible(s) pour « ${product.name} ».`,
      );
      return this;
    }

    this.#lines.push({ productId, quantity: requested });
    return this;
  }

  /** Removes an already added line (the Builder is also there to fix things along the way). */
  removeLine(productId) {
    this.#lines = this.#lines.filter((line) => line.productId !== productId);
    delete this.#refusals[productId];
    return this;
  }

  /** The kept lines, as copies (the caller cannot mutate the object being built). */
  get lines() {
    return this.#lines.map((line) => ({ ...line }));
  }

  /** The assembled form, ready to be handed to the store. */
  get form() {
    return { ...this.#customer, lines: this.lines };
  }

  /**
   * Produces the order.
   * `valid` requires TWO conditions: the general rules pass (validator) AND no
   * line was refused while building. Otherwise we would produce an order silently
   * different from the one that was requested.
   * @returns {{ valid: boolean, form: object, lines: object[],
   *             errors: Record<string,string>, errorsByProduct: Record<string,string> }}
   */
  build() {
    const report = validateOrder(this.#products, this.form);
    const errorsByProduct = { ...report.errorsByProduct, ...this.#refusals };

    return {
      ...report,
      valid: report.valid && Object.keys(this.#refusals).length === 0,
      form: this.form,
      errorsByProduct,
    };
  }

  #refuse(productId, message) {
    this.#refusals[productId] = message;
  }
}
