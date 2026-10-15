import { isLowStock, isOutOfStock, formatPrice } from "../../store/selectors.js";
import { QuantitySelector } from "./QuantitySelector.jsx";

/**
 * OrderRow — one row of the order entry table.
 *
 * Like RowProduct, it only knows a single product. Unlike it, it is INTERACTIVE:
 * it receives a handler and reports changes. It still stores NOTHING (no useState):
 * the quantity belongs to the Order page, otherwise the total and the validation
 * could not be computed in a single place.
 *
 * @param {{ product: import('../../data/seed.js').Product,
 *           quantity: number,
 *           onQuantityChange: (productId: string, quantity: number) => void,
 *           error?: string|null }} props
 */
export function OrderRow({ product, quantity, onQuantityChange, error }) {
  const outOfStock = isOutOfStock(product);
  const lowStock = isLowStock(product);
  const subtotal = product.price * quantity;

  return (
    <tr className={error ? "table-danger" : quantity > 0 ? "alert-row" : undefined}>
      <td>
        <div className="fw-semibold">{product.name}</div>
        <div className="text-muted small">{product.category}</div>
      </td>

      <td className="text-end font-monospace">{formatPrice(product.price)}</td>

      <td className="text-end">
        {product.quantity}
        {outOfStock ? (
          <span className="badge badge-out-of-stock ms-2">Rupture</span>
        ) : lowStock ? (
          <span className="badge badge-alert ms-2">Stock faible</span>
        ) : null}
      </td>

      <td style={{ width: "11rem" }}>
        <QuantitySelector
          value={quantity}
          max={product.quantity}
          disabled={outOfStock}
          onChange={(nextQuantity) => onQuantityChange(product.id, nextQuantity)}
        />
        {error ? <div className="text-danger small mt-1">{error}</div> : null}
      </td>

      <td className="text-end font-monospace">
        {quantity > 0 ? formatPrice(subtotal) : <span className="text-muted">—</span>}
      </td>
    </tr>
  );
}
