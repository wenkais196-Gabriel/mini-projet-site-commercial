import { isLowStock, isOutOfStock, formatPrice } from "../../store/selectors.js";

/**
 * RowProduct — one row of the products table (reused from exercise 4).
 *
 * PRESENTATION component: it only knows a single product and decides nothing. It
 * receives no event handler: the Products page is read-only. This is the reference
 * "standard" component of the assignment; the non-standard ones are ProductFilter,
 * TableProducts and KpiCard.
 *
 * @param {{ product: import('../../data/seed.js').Product }} props
 */
export function RowProduct({ product }) {
  const outOfStock = isOutOfStock(product);
  const lowStock = isLowStock(product);

  return (
    <tr className={lowStock ? "alert-row" : undefined}>
      <td className="fw-semibold">{product.name}</td>
      <td>
        <span className="badge text-bg-light">{product.category}</span>
      </td>
      <td className="text-end font-monospace">{formatPrice(product.price)}</td>
      <td className="text-end">{product.quantity}</td>
      <td className="text-end text-muted">{product.threshold}</td>
      <td>
        {outOfStock ? (
          <span className="badge badge-out-of-stock">Rupture</span>
        ) : lowStock ? (
          <span className="badge badge-alert">À réapprovisionner</span>
        ) : (
          <span className="badge text-bg-success">Disponible</span>
        )}
      </td>
    </tr>
  );
}
