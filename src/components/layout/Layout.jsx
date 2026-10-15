import { NavLink, Outlet } from "react-router-dom";
import { useData } from "../../store/DataContext.jsx";

/**
 * Layout — gabarit commun aux 3 pages virtuelles.
 * La barre de navigation est écrite UNE fois ; seule la zone <Outlet/> change.
 * C'est l'intérêt de la route parente : le chrome de l'application ne se
 * reconstruit pas à chaque navigation.
 *
 * Elle porte aussi les deux commandes globales :
 * - « Annuler » (pattern Command) défait la dernière opération enregistrée, donc
 *   rend le stock prélevé et retire la commande ;
 * - « Réinitialiser » revient aux données de départ, pour rejouer une démonstration.
 */
export function Layout() {
  const {
    statistiques,
    peutAnnuler,
    derniereOperation,
    annulerDerniereOperation,
    reinitialiser,
  } = useData();

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
            <span className="text-white-50 small text-end" data-testid="resume-global">
              {statistiques.nbCommandes} commande{statistiques.nbCommandes > 1 ? "s" : ""}
              {statistiques.nbAlertes > 0
                ? ` · ${statistiques.nbAlertes} alerte${statistiques.nbAlertes > 1 ? "s" : ""}`
                : ""}
              {peutAnnuler ? ` · dernière opération : ${derniereOperation.libelle}` : ""}
            </span>

            {/* Pattern Command : annuler la dernière opération enregistrée */}
            <button
              type="button"
              className="btn btn-sm btn-outline-light text-nowrap"
              disabled={!peutAnnuler}
              title={
                peutAnnuler
                  ? `Annuler la ${derniereOperation.libelle}`
                  : "Aucune opération à annuler"
              }
              onClick={annulerDerniereOperation}
            >
              Annuler
            </button>

            {/* Outil de démonstration : permet de rejouer la soutenance à volonté */}
            <button
              type="button"
              className="btn btn-sm btn-outline-light text-nowrap"
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
