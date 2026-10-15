import { NavLink, Outlet } from "react-router-dom";
import { useData } from "../../store/DataContext.jsx";

/**
 * Layout — common template of the three virtual pages.
 * The navigation bar is written ONCE; only the <Outlet/> area changes. That is the
 * point of the parent route: the chrome of the application is not rebuilt on every
 * navigation.
 *
 * It also carries the two global commands:
 * - "Annuler" (Command pattern) undoes the last recorded operation, therefore it
 *   gives back the stock that was taken and removes the order;
 * - "Réinitialiser" goes back to the starting data, to replay a demonstration.
 */
export function Layout() {
  const { canUndo, lastOperation, undoLastOperation, reset } = useData();

  const linkClass = ({ isActive }) =>
    isActive ? "nav-link active fw-semibold" : "nav-link";

  return (
    <>
      <nav
        className="navbar navbar-expand navbar-dark"
        style={{ backgroundColor: "var(--primary-color)" }}
      >
        <div className="container">
          <span className="navbar-brand mb-0 h1">Site commercial</span>

          <ul className="navbar-nav me-auto">
            {/* `end` on the root: otherwise « / » would be active on every page */}
            <li className="nav-item">
              <NavLink to="/" end className={linkClass}>
                Accueil
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/produits" className={linkClass}>
                Produits
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/commande" className={linkClass}>
                Commande
              </NavLink>
            </li>
          </ul>

          <div className="d-flex align-items-center gap-3">
            {canUndo ? (
              <span className="text-white-50 small text-end" data-testid="global-summary">
                dernière opération : {lastOperation.label}
              </span>
            ) : null}

            {/* Command pattern: undo the last recorded operation */}
            <button
              type="button"
              className="btn btn-sm btn-outline-light text-nowrap"
              disabled={!canUndo}
              title={
                canUndo
                  ? `Annuler la ${lastOperation.label}`
                  : "Aucune opération à annuler"
              }
              onClick={undoLastOperation}
            >
              Annuler
            </button>

            {/* Demonstration tool: makes it possible to replay the defence at will */}
            <button
              type="button"
              className="btn btn-sm btn-outline-light text-nowrap"
              onClick={reset}
              title="Rétablir les données de départ"
            >
              Réinitialiser
            </button>
          </div>
        </div>
      </nav>

      <main className="container py-4">
        <Outlet />
      </main>
    </>
  );
}
