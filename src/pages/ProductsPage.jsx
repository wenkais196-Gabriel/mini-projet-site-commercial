/* =============================================================================
   ProductsPage — list of products + filters on every attribute.

   Role of this page: it is the ORCHESTRATOR. It is the only component of this
   screen to own a state (the filter criteria and the sort) and it makes the
   junction: ProductFilter (reports the criteria) → page (state + filtering) →
   TableProducts. ProductFilter and TableProducts do not know each other: they only
   communicate through their parent. That is the "lifting state up" of the course.

   Every derived value (categories, bounds, filtered list, sorted list) is computed
   inside a `useMemo`: it is recomputed only when its inputs change, never on every
   render (memoisation chapter of the course).
   ========================================================================== */

import { useMemo, useState } from "react";
import { ProductFilter } from "../components/products/ProductFilter.jsx";
import { TableProducts } from "../components/products/TableProducts.jsx";
import { useData } from "../store/DataContext.jsx";
import { filterBounds, filterProducts, usedCategories } from "../store/selectors.js";

/** Initial value = "no filter". `null` means "criterion not applied". */
const INITIAL_FILTERS = {
  search: "",
  category: "",
  maxPrice: null,
  maxQuantity: null,
  maxThreshold: null,
};

const SORTABLE_COLUMNS = [
  { column: "name", label: "Nom" },
  { column: "price", label: "Prix" },
  { column: "quantity", label: "Quantité" },
];

export function ProductsPage() {
  const { products } = useData();
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [sort, setSort] = useState({ column: "", direction: "asc" });

  const categories = useMemo(() => usedCategories(products), [products]);
  const bounds = useMemo(() => filterBounds(products), [products]);
  const filtered = useMemo(() => filterProducts(products, filters), [products, filters]);

  const displayed = useMemo(() => {
    if (!sort.column) return filtered;

    const sorted = [...filtered].sort((left, right) =>
      sort.column === "name"
        ? left.name.localeCompare(right.name, "fr")
        : left[sort.column] - right[sort.column],
    );
    return sort.direction === "asc" ? sorted : sorted.reverse();
  }, [filtered, sort]);

  /** Builds the handler of one criterion: the ProductFilter receives one per filter. */
  const changeFilter = (key) => (value) =>
    setFilters((previous) => ({ ...previous, [key]: value }));

  function toggleSort(column) {
    setSort((previous) => ({
      column,
      direction:
        previous.column === column && previous.direction === "asc" ? "desc" : "asc",
    }));
  }

  return (
    <>
      <header className="page-header">
        <h1>Produits</h1>
        <p className="subtitle mb-0">
          Les produits dont la quantité est inférieure au seuil de
          réapprovisionnement sont signalés
        </p>
      </header>

      <ProductFilter
        values={filters}
        bounds={bounds}
        categories={categories}
        resultCount={displayed.length}
        totalCount={products.length}
        onSearchChange={changeFilter("search")}
        onCategoryChange={changeFilter("category")}
        onMaxPriceChange={changeFilter("maxPrice")}
        onMaxQuantityChange={changeFilter("maxQuantity")}
        onMaxThresholdChange={changeFilter("maxThreshold")}
        onReset={() => setFilters(INITIAL_FILTERS)}
      />

      <div className="mb-3 d-flex flex-wrap align-items-center gap-2">
        <span className="small text-muted">Trier par :</span>

        {SORTABLE_COLUMNS.map(({ column, label }) => (
          <button
            key={column}
            type="button"
            className={`btn btn-sm ${
              sort.column === column ? "btn-primary" : "btn-outline-secondary"
            }`}
            onClick={() => toggleSort(column)}
          >
            {label}
            {sort.column === column && (sort.direction === "asc" ? " ↑" : " ↓")}
          </button>
        ))}

        {sort.column ? (
          <button
            type="button"
            className="btn btn-sm btn-link text-secondary"
            onClick={() => setSort({ column: "", direction: "asc" })}
          >
            Effacer le tri
          </button>
        ) : null}
      </div>

      <TableProducts products={displayed} />
    </>
  );
}
