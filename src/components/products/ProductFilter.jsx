import { Input } from "../form/Input.jsx";
import { Range } from "../form/Range.jsx";

/**
 * ProductFilter — NON-STANDARD "orchestrator" component.
 *
 * Equivalence with the course: this is the SearchBar of exercise 4, extended to the
 * five attributes of a product. It is fully CONTROLLED — it stores no value — and
 * it composes the reusable atom components (Input, Range).
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
 *             maxQuantity: number|null, maxThreshold: number|null },
 *   bounds: { price: [number, number], quantity: [number, number], threshold: [number, number] },
 *   categories: string[],
 *   resultCount: number,
 *   totalCount: number,
 *   onSearchChange: (value: string) => void,
 *   onCategoryChange: (value: string) => void,
 *   onMaxPriceChange: (value: number|null) => void,
 *   onMaxQuantityChange: (value: number|null) => void,
 *   onMaxThresholdChange: (value: number|null) => void,
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
  onReset,
}) {
  const noFilter =
    values.search === "" &&
    values.category === "" &&
    values.maxPrice === null &&
    values.maxQuantity === null &&
    values.maxThreshold === null;

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
            <label className="form-label small mb-1" htmlFor="filter-category">
              Catégorie
            </label>
            <select
              id="filter-category"
              className="form-select form-select-sm"
              value={values.category}
              onChange={(event) => onCategoryChange(event.target.value)}
            >
              <option value="">Toutes les catégories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
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
