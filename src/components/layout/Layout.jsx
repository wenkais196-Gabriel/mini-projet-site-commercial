import { NavLink, Outlet } from "react-router-dom";
import { useData } from "../../store/DataContext.jsx";

/**
 * Layout — gabarit commun aux 3 pages virtuelles.
 * La barre de navigation est écrite UNE fois ; seule la zone <Outlet/> change.
 * C'est l'intérêt de la route parente : le chrome de l'application ne se
 * reconstruit pas à chaque navigation.
 */
export function Layout() {
  const { statistiques, reinitialiser } = useData();

  const classeLien = ({ isActive }) =>
    isActive ? "nav-link active fw-semibold" : "nav-link";

  return (
    <>
      <nav
        className="navbar navbar-expand navbar-dark"
        style={{ backgroundColor: "var(--couleur-primaire)" }}
      >
        <div className="container">
          <span className="navbar-brand mb-0 h1">Site commercial</span>

          <ul className="navbar-nav me-auto">
            {/* `end` sur la racine : sinon « / » serait actif sur toutes les pages */}
            <li className="nav-item">
              <NavLink to="/" end className={classeLien}>
                Accueil
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/produits" className={classeLien}>
                Produits
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/commande" className={classeLien}>
                Commande
              </NavLink>
            </li>
          </ul>

          <div className="d-flex align-items-center gap-3">
            <span className="text-white-50 small">
              {statistiques.nbCommandes} commande{statistiques.nbCommandes > 1 ? "s" : ""}
              {statistiques.nbAlertes > 0 ? ` · ${statistiques.nbAlertes} alerte${statistiques.nbAlertes > 1 ? "s" : ""}` : ""}
            </span>
            {/* Outil de démonstration : permet de rejouer la soutenance à volonté */}
            <button
              type="button"
              className="btn btn-sm btn-outline-light"
              onClick={reinitialiser}
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
