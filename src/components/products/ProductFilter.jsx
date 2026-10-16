import { Input } from "../form/Input.jsx";
import { Checkbox } from "../form/Checkbox.jsx";
import { Range } from "../form/Range.jsx";
import { Select } from "../form/Select.jsx";

/**
 * ProductFilter — NON-STANDARD "orchestrator" component.
 *
 * Equivalence with the course: this is the SearchBar of exercise 4 — Input + Checkbox +
 * Range — extended to the five attributes of a product. It is fully CONTROLLED (it
 * stores no value) and it composes the four reusable atom components.
 *
 * ONE CALLBACK PER FILTER, exactly like the course's component model (which gives
 * one output port per filter). The naming follows the React convention
 * (`onXxxChange`) rather than the course's `xxxChanged`.
 *
 * A Range cannot express "no filter": the maximum position means "no filter" and is
 * translated to `null` here, in the container, not in the atom.
 *
 * @param {{
 *   values: { search: string, category: string, maxPrice: number|null,
 *             maxQuantity: number|null, maxThreshold: number|null,
 *             onlyLowStock: boolean, onlyOutOfStock: boolean },
 *   bounds: { price: [number, number], quantity: [number, number], threshold: [number, number] },
 *   categories: string[],
 *   resultCount: number,
 *   totalCount: number,
 *   onSearchChange: (value: string) => void,
 *   onCategoryChange: (value: string) => void,
 *   onMaxPriceChange: (value: number|null) => void,
 *   onMaxQuantityChange: (value: number|null) => void,
 *   onMaxThresholdChange: (value: number|null) => void,
 *   onOnlyLowStockChange: (value: boolean) => void,
 *   onOnlyOutOfStockChange: (value: boolean) => void,
 *   onReset: () => void
 * }} props
 */
export function ProductFilter({
  values,
  bounds,
  categories,
  resultCount,
  totalCount,
  onSearchChange,
  onCategoryChange,
  onMaxPriceChange,
  onMaxQuantityChange,
  onMaxThresholdChange,
  onOnlyLowStockChange,
  onOnlyOutOfStockChange,
  onReset,
}) {
  const noFilter =
    values.search === "" &&
    values.category === "" &&
    values.maxPrice === null &&
    values.maxQuantity === null &&
    values.maxThreshold === null &&
    !values.onlyLowStock &&
    !values.onlyOutOfStock;

  /** Reaching the maximum of a slider removes the filter. */
  const asFilter = (value, maximum) => (value >= maximum ? null : value);

  return (
    <section className="card border-0 shadow-sm mb-4">
      <div className="card-body">
        <div className="row g-3">
          <div className="col-md-4">
            <Input
              id="filter-search"
              label="Nom du produit"
              placeholder="Rechercher un produit..."
              value={values.search}
              onChange={onSearchChange}
            />
          </div>

          <div className="col-md-4">
            <Select
              id="filter-category"
              label="Catégorie"
              value={values.category}
              options={categories.map((category) => ({ value: category, label: category }))}
              placeholder="Toutes les catégories"
              onChange={onCategoryChange}
            />
          </div>

          <div className="col-md-4">
            <Range
              id="filter-max-price"
              label={`Prix maximum : ${values.maxPrice ?? bounds.price[1]} €`}
              value={values.maxPrice ?? bounds.price[1]}
              min={bounds.price[0]}
              max={bounds.price[1]}
              step={0.1}
              onChange={(value) => onMaxPriceChange(asFilter(value, bounds.price[1]))}
            />
          </div>

          <div className="col-md-4">
            <Range
              id="filter-max-quantity"
              label={`Quantité maximum : ${values.maxQuantity ?? bounds.quantity[1]}`}
              value={values.maxQuantity ?? bounds.quantity[1]}
              min={bounds.quantity[0]}
              max={bounds.quantity[1]}
              onChange={(value) => onMaxQuantityChange(asFilter(value, bounds.quantity[1]))}
            />
          </div>

          <div className="col-md-4">
            <Range
              id="filter-max-threshold"
              label={`Seuil maximum : ${values.maxThreshold ?? bounds.threshold[1]}`}
              value={values.maxThreshold ?? bounds.threshold[1]}
              min={bounds.threshold[0]}
              max={bounds.threshold[1]}
              onChange={(value) => onMaxThresholdChange(asFilter(value, bounds.threshold[1]))}
            />
          </div>

          {/* Les deux criteres derives partagent une seule cellule : la grille reste
              alignee sur 3 colonnes et les deux cases se lisent ensemble. */}
          <div className="col-md-4 d-flex flex-column justify-content-end gap-2">
            <Checkbox
              id="filter-low-stock"
              label="Uniquement les produits sous le seuil"
              checked={values.onlyLowStock}
              onChange={onOnlyLowStockChange}
            />
            <Checkbox
              id="filter-out-of-stock"
              label="Uniquement les produits en rupture"
              checked={values.onlyOutOfStock}
              onChange={onOnlyOutOfStockChange}
            />
          </div>
        </div>

        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-3">
          <span className="small text-muted">
            {resultCount} produit(s) affiché(s) sur {totalCount}
          </span>

          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            disabled={noFilter}
            onClick={onReset}
          >
            Réinitialiser les filtres
          </button>
        </div>
      </div>
    </section>
  );
}
