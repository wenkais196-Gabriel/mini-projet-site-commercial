/* =============================================================================
   HomePage — "a summary sheet": indicators + breakdown by category.
   The assignment states "no interaction foreseen": this page therefore contains NO
   state and NO event handler. It only READS the indicators derived from the store.

   Note for the review: this page is still the reference version written during the
   interface freeze — see issue #1 (layout, sorting, last orders).
   ========================================================================== */

import { KpiCard } from "../components/indicators/KpiCard.jsx";
import { useData } from "../store/DataContext.jsx";
import { formatPrice } from "../store/selectors.js";

export function HomePage() {
  const { stats } = useData();

  return (
    <>
      <header className="page-header">
        <h1>Tableau de bord</h1>
        <p className="subtitle mb-0">
          Synthèse du catalogue et de l'activité commerciale.
        </p>
      </header>

      {/* --- Indicators ------------------------------------------------ */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-lg-3">
          <KpiCard
            label="Produits"
            value={stats.productCount}
            detail={`${stats.unitCount} unités en stock`}
          />
        </div>
        <div className="col-6 col-lg-3">
          <KpiCard
            label="Commandes"
            value={stats.orderCount}
            detail={`${stats.orderedLineCount} lignes commandées`}
          />
        </div>
        <div className="col-6 col-lg-3">
          <KpiCard
            label="À réapprovisionner"
            variant={stats.lowStockCount > 0 ? "alert" : "success"}
            value={stats.lowStockCount}
            detail={`dont ${stats.outOfStockCount} en rupture totale`}
          />
        </div>
        <div className="col-6 col-lg-3">
          <KpiCard
            label="Valeur du stock"
            variant="neutral"
            value={formatPrice(stats.stockValue)}
            detail="prix × quantité disponible"
          />
        </div>
      </div>

      {/* --- Breakdown by category ------------------------------------- */}
      <div className="card shadow-sm">
        <div className="card-header bg-white fw-semibold">Synthèse des catégories</div>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th scope="col">Catégorie</th>
                <th scope="col" className="text-end">Nb produits</th>
                <th scope="col" className="text-end">Stock moyen</th>
                <th scope="col" className="text-end">Stock total</th>
                <th scope="col" className="text-end">Prix moyen</th>
                <th scope="col" className="text-end">Alertes</th>
              </tr>
            </thead>
            <tbody>
              {stats.byCategory.map((line) => (
                <tr key={line.category}>
                  <td className="fw-semibold">{line.category}</td>
                  <td className="text-end">{line.productCount}</td>
                  <td className="text-end">{line.averageStock}</td>
                  <td className="text-end">{line.totalStock}</td>
                  <td className="text-end font-monospace">
                    {formatPrice(line.averagePrice)}
                  </td>
                  <td className="text-end">
                    {line.lowStockCount > 0 ? (
                      <span className="badge badge-alert">{line.lowStockCount}</span>
                    ) : (
                      <span className="text-muted">0</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
