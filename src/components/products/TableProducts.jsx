import { Fragment } from "react";
import { groupByCategory } from "../../store/selectors.js";
import { RowProduct } from "./RowProduct.jsx";
import { TableCategory } from "./TableCategory.jsx";

/**
 * TableProducts — NON-STANDARD "composite" component.
 *
 * It receives NO filter criteria: filtering is the responsibility of the page (see
 * ProductsPage). Here it only does two things:
 *   1. group the received products by category (derived data, no state);
 *   2. build the rows of the table, delegating each piece to a child component.
 *
 * Separating "filtering" from "displaying" prevents this component from being both
 * a controller and a view — that is the point to defend during the defence.
 *
 * @param {{ products: import('../../data/seed.js').Product[] }} props
 */
export function TableProducts({ products }) {
  // Derived data: computed during rendering, NEVER stored in a useState.
  const groups = groupByCategory(products);

  if (products.length === 0) {
    return (
      <div className="alert alert-secondary mb-0">
        Aucun produit ne correspond aux filtres sélectionnés.
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <table className="table table-hover align-middle bg-white mb-0">
        <thead className="table-light">
          <tr>
            <th scope="col">Nom</th>
            <th scope="col" className="text-end">Prix</th>
            <th scope="col" className="text-end">Quantité</th>
            <th scope="col" className="text-end">Seuil</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <Fragment key={group.category}>
              <TableCategory category={group.category} count={group.products.length} />
              {group.products.map((product) => (
                <RowProduct key={product.id} product={product} />
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
