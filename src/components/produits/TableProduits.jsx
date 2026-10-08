import { Fragment } from "react";
import { grouperParCategorie } from "../../store/selecteurs.js";
import { RowProduct } from "./RowProduct.jsx";

/**
 * TableProduits — composant NON STANDARD « composite ».
 *
 * Il ne reçoit AUCUN critère de filtre : le filtrage est une responsabilité de la
 * page (voir ProduitsPage). Ici il ne fait que deux choses :
 *   1. regrouper les produits reçus par catégorie (donnée dérivée, pas d'état) ;
 *   2. fabriquer les lignes du tableau.
 *
 * Séparer « filtrer » de « afficher » évite que ce composant serve à la fois de
 * contrôleur et de vue — c'est le point à défendre en soutenance.
 *
 * @param {{ produits: import('../../data/seed.js').Produit[] }} props
 */
export function TableProduits({ produits }) {
  // Donnée dérivée : calculée pendant le rendu, JAMAIS stockée dans un useState.
  const groupes = grouperParCategorie(produits);

  if (produits.length === 0) {
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
            <th scope="col">Catégorie</th>
            <th scope="col" className="text-end">Prix</th>
            <th scope="col" className="text-end">Quantité</th>
            <th scope="col" className="text-end">Seuil</th>
            <th scope="col">État</th>
          </tr>
        </thead>
        <tbody>
          {groupes.map((groupe) => (
            <Fragment key={groupe.categorie}>
              {/* Ligne de regroupement : le seul endroit où la catégorie est mise en avant */}
              <tr className="table-secondary">
                <td colSpan={6} className="fw-semibold">
                  {groupe.categorie}
                  <span className="text-muted fw-normal ms-2">
                    {groupe.produits.length} produit{groupe.produits.length > 1 ? "s" : ""}
                  </span>
                </td>
              </tr>
              {groupe.produits.map((produit) => (
                <RowProduct key={produit.id} produit={produit} />
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
