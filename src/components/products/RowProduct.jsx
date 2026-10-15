import { isLowStock, formatPrice } from "../../store/selectors.js";

/**
 * RowProduct — one row of the products table (reused from exercise 4).
 *
 * PRESENTATION component: it only knows a single product and decides nothing. It
 * receives no event handler: the Products page is read-only. This is the reference
 * "standard" component of the assignment; the non-standard ones are ProductFilter,
 * TableProducts and KpiCard.
 *
 * It applies the single rule the assignment requires: the row is highlighted when
 * the quantity is strictly below the restocking threshold.
 *
 * @param {{ product: import('../../data/seed.js').Product }} props
 */
export function RowProduct({ product }) {
  return (
    <tr className={isLowStock(product) ? "alert-row" : undefined}>
      <td className="fw-semibold">{product.name}</td>
      <td>
        <span className="badge text-bg-light">{product.category}</span>
      </td>
      <td className="text-end font-monospace">{formatPrice(product.price)}</td>
      <td className="text-end">{product.quantity}</td>
      <td className="text-end text-muted">{product.threshold}</td>
    </tr>
  );
}
