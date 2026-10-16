import { isLowStock, isOutOfStock, formatPrice } from "../../store/selectors.js";

/**
 * RowProduct — one row of the products table (reused from exercise 4).
 *
 * PRESENTATION component: it only knows a single product and decides nothing. It
 * receives no event handler: the Products page is read-only. This is the reference
 * "standard" component of the assignment; the non-standard ones are ProductFilter,
 * TableProducts and KpiCard.
 *
 * It applies the single rule the assignment requires: the row is highlighted when the
 * quantity is strictly below the restocking threshold. Out of stock (quantity 0) is an
 * extreme case of that rule and gets its own colour.
 *
 * The category is NOT repeated on the row: the table is grouped by category and
 * TableCategory already shows it once per group (see the report, § 4.1).
 *
 * @param {{ product: import('../../data/seed.js').Product }} props
 */
function rowClassOf(product) {
  if (isOutOfStock(product)) return "out-of-stock-row";
  if (isLowStock(product)) return "alert-row";
  return undefined;
}

export function RowProduct({ product }) {
  return (
    <tr className={rowClassOf(product)}>
      <td className="fw-semibold">{product.name}</td>
      <td className="text-end font-monospace">{formatPrice(product.price)}</td>
      <td className="text-end">{product.quantity}</td>
      <td className="text-end text-muted">{product.threshold}</td>
    </tr>
  );
}
