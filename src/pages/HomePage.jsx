import { KpiCard } from "../components/indicators/KpiCard.jsx";
import { useData } from "../store/DataContext.jsx";

export function HomePage() {
  const { stats } = useData();

  return (
    <>
      <header className="page-header">
        <h1>Tableau de bord</h1>
        <p className="subtitle mb-0">
          Synthèse du catalogue et de l'activité commerciale
        </p>
      </header>

      {/* --- Indicators ------------------------------------------------ */}
      <div className="row g-3 mb-4">
        <div className="col-6">
          {/* Facet: the card provides the frame, the page provides the content. */}
          <KpiCard label="Produits">
            <div className="kpi-value">{stats.productCount}</div>
          </KpiCard>
        </div>
        <div className="col-6">
          <KpiCard label="Commandes">
            <div className="kpi-value">{stats.orderCount}</div>
          </KpiCard>
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
                <th scope="col" className="text-end">Nombre de produits</th>
                <th scope="col" className="text-end">Stock moyen</th>
              </tr>
            </thead>
            <tbody>
              {stats.byCategory.map((line) => (
                <tr key={line.category}>
                  <td className="fw-semibold">{line.category}</td>
                  <td className="text-end">{line.productCount}</td>
                  <td className="text-end">{line.averageStock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
