/* =============================================================================
   AccueilPage — « une feuille de synthèse » : indicateurs + synthèse par catégorie.
   Le sujet précise « aucune interaction envisagée » : cette page ne contient donc
   AUCUN état ni gestionnaire d'événement. Elle ne fait que LIRE les indicateurs
   dérivés du store.

   TODO (responsable : SUI Wenhui) — améliorations attendues :
     - mettre en forme la synthèse par catégorie (barres de proportion, tri) ;
     - ajouter la liste des dernières commandes (données déjà disponibles
       dans useData().commandes) ;
     - soigner la mise en page et la hiérarchie visuelle.
   ========================================================================== */

import { CarteKPI } from "../components/indicateurs/CarteKPI.jsx";
import { useData } from "../store/DataContext.jsx";
import { formaterPrix } from "../store/selecteurs.js";

export function AccueilPage() {
  const { statistiques } = useData();

  return (
    <>
      <header className="entete-page">
        <h1>Tableau de bord</h1>
        <p className="sous-titre mb-0">
          Synthèse du catalogue et de l'activité commerciale.
        </p>
      </header>

      {/* --- Indicateurs ------------------------------------------------- */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-lg-3">
          <CarteKPI
            libelle="Produits"
            valeur={statistiques.nbProduits}
            detail={`${statistiques.nbUnites} unités en stock`}
          />
        </div>
        <div className="col-6 col-lg-3">
          <CarteKPI
            libelle="Commandes"
            valeur={statistiques.nbCommandes}
            detail={`${statistiques.nbLignesCommandees} lignes commandées`}
          />
        </div>
        <div className="col-6 col-lg-3">
          <CarteKPI
            libelle="À réapprovisionner"
            variante={statistiques.nbAlertes > 0 ? "alerte" : "succes"}
            valeur={statistiques.nbAlertes}
            detail={`dont ${statistiques.nbRuptures} en rupture totale`}
          />
        </div>
        <div className="col-6 col-lg-3">
          <CarteKPI
            libelle="Valeur du stock"
            variante="neutre"
            valeur={formaterPrix(statistiques.valeurStock)}
            detail="prix × quantité disponible"
          />
        </div>
      </div>

      {/* --- Synthèse par catégorie -------------------------------------- */}
      <div className="card shadow-sm">
        <div className="card-header bg-white fw-semibold">
          Synthèse des catégories
        </div>
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
              {statistiques.parCategorie.map((ligne) => (
                <tr key={ligne.categorie}>
                  <td className="fw-semibold">{ligne.categorie}</td>
                  <td className="text-end">{ligne.nbProduits}</td>
                  <td className="text-end">{ligne.stockMoyen}</td>
                  <td className="text-end">{ligne.stockTotal}</td>
                  <td className="text-end font-monospace">{formaterPrix(ligne.prixMoyen)}</td>
                  <td className="text-end">
                    {ligne.nbAlertes > 0 ? (
                      <span className="badge badge-alerte">{ligne.nbAlertes}</span>
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
