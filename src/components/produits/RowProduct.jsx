import { estEnAlerte, estEnRupture, formaterPrix } from "../../store/selecteurs.js";

/**
 * RowProduct — ligne du tableau des produits (réutilisé de l'exercice 4).
 *
 * Composant de PRÉSENTATION : il ne connaît qu'un seul produit et ne décide de
 * rien. Il ne reçoit aucun gestionnaire d'événement : la page Produits est en
 * lecture seule. C'est le composant « standard » de référence du sujet ; les
 * composants non standards sont FiltreProduits, TableProduits et CarteKPI.
 *
 * @param {{ produit: import('../../data/seed.js').Produit }} props
 */
export function RowProduct({ produit }) {
  const enRupture = estEnRupture(produit);
  const enAlerte = estEnAlerte(produit);

  return (
    <tr className={enAlerte ? "ligne-alerte" : undefined}>
      <td className="fw-semibold">{produit.nom}</td>
      <td>
        <span className="badge text-bg-light">{produit.categorie}</span>
      </td>
      <td className="text-end font-monospace">{formaterPrix(produit.prix)}</td>
      <td className="text-end">{produit.quantite}</td>
      <td className="text-end text-muted">{produit.seuil}</td>
      <td>
        {enRupture ? (
          <span className="badge badge-rupture">Rupture</span>
        ) : enAlerte ? (
          <span className="badge badge-alerte">À réapprovisionner</span>
        ) : (
          <span className="badge text-bg-success">Disponible</span>
        )}
      </td>
    </tr>
  );
}
