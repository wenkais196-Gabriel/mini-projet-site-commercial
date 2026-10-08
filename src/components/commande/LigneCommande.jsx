import { estEnAlerte, estEnRupture, formaterPrix } from "../../store/selecteurs.js";
import { SelecteurQuantite } from "./SelecteurQuantite.jsx";

/**
 * LigneCommande — une ligne du tableau de saisie de la commande.
 *
 * Comme RowProduct, il ne connaît qu'un produit. Mais contrairement à lui, il est
 * INTERACTIF : il reçoit un gestionnaire et remonte les changements. Il ne stocke
 * toujours RIEN (pas de useState) : la quantité appartient à la page Commande,
 * sinon le total et la validation ne pourraient pas être calculés en un seul endroit.
 *
 * @param {{ produit: import('../../data/seed.js').Produit,
 *           quantite: number,
 *           onQuantiteChange: (idProduit: string, quantite: number) => void,
 *           erreur?: string|null }} props
 */
export function LigneCommande({ produit, quantite, onQuantiteChange, erreur }) {
  const enRupture = estEnRupture(produit);
  const enAlerte = estEnAlerte(produit);
  const sousTotal = produit.prix * quantite;

  return (
    <tr className={erreur ? "table-danger" : quantite > 0 ? "ligne-alerte" : undefined}>
      <td>
        <div className="fw-semibold">{produit.nom}</div>
        <div className="text-muted small">{produit.categorie}</div>
      </td>

      <td className="text-end font-monospace">{formaterPrix(produit.prix)}</td>

      <td className="text-end">
        {produit.quantite}
        {enRupture ? (
          <span className="badge badge-rupture ms-2">Rupture</span>
        ) : enAlerte ? (
          <span className="badge badge-alerte ms-2">Stock faible</span>
        ) : null}
      </td>

      <td style={{ width: "11rem" }}>
        <SelecteurQuantite
          valeur={quantite}
          max={produit.quantite}
          disabled={enRupture}
          onChange={(nouvelleQuantite) => onQuantiteChange(produit.id, nouvelleQuantite)}
        />
        {erreur ? <div className="text-danger small mt-1">{erreur}</div> : null}
      </td>

      <td className="text-end font-monospace">
        {quantite > 0 ? formaterPrix(sousTotal) : <span className="text-muted">—</span>}
      </td>
    </tr>
  );
}
