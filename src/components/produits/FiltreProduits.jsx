/**
 * FiltreProduits — composant NON STANDARD « orchestrateur » (et réutilisable).
 *
 * Il est totalement CONTRÔLÉ : il ne stocke aucune valeur. Il reçoit l'état des
 * filtres et remonte chaque modification. C'est le même schéma que la SearchBar de
 * l'exercice 4, étendu aux 5 attributs du produit.
 *
 * TODO (responsable : SUI Wenhui) — améliorations attendues :
 *   - extraire les 3 petits composants réutilisables du cours (InputFiltre,
 *     CheckboxFiltre, RangeFiltre) et les réutiliser ici ET dans la page Commande ;
 *   - ajouter un bouton « Effacer les filtres » et un compteur de résultats ;
 *   - mémoïser si besoin (voir chapitre memoisation).
 *
 * @param {{
 *   valeurs: { nom: string, categorie: string, prixMax: number|null,
 *              quantiteMax: number|null, seuilMax: number|null, seulementAlertes: boolean },
 *   bornes: { prix: [number, number], quantite: [number, number], seuil: [number, number] },
 *   categories: string[],
 *   nbResultats: number,
 *   nbTotal: number,
 *   onChange: (cle: string, valeur: string|number|boolean|null) => void,
 *   onReinitialiser: () => void
 * }} props
 */
export function FiltreProduits({
  valeurs,
  bornes,
  categories,
  nbResultats,
  nbTotal,
  onChange,
  onReinitialiser,
}) {
  /* Un Range ne sait pas représenter « pas de filtre » : 0 signifie « aucun
     prix négatif », on l'affiche donc en nombre. Voir le choix dans le README. */
  const aucunFiltre =
    valeurs.nom === "" &&
    valeurs.categorie === "" &&
    valeurs.prixMax === null &&
    valeurs.quantiteMax === null &&
    valeurs.seuilMax === null &&
    !valeurs.seulementAlertes;

  return (
    <div className="card mb-3">
      <div className="card-body">
        <div className="row g-3 align-items-end">
          <div className="col-12 col-md-4 col-lg-3">
            <label className="form-label small mb-1" htmlFor="filtre-nom">
              Nom du produit
            </label>
            <input
              id="filtre-nom"
              type="text"
              className="form-control form-control-sm"
              placeholder="Rechercher…"
              value={valeurs.nom}
              onChange={(evenement) => onChange("nom", evenement.target.value)}
            />
          </div>

          <div className="col-6 col-md-3 col-lg-2">
            <label className="form-label small mb-1" htmlFor="filtre-categorie">
              Catégorie
            </label>
            <select
              id="filtre-categorie"
              className="form-select form-select-sm"
              value={valeurs.categorie}
              onChange={(evenement) => onChange("categorie", evenement.target.value)}
            >
              <option value="">Toutes</option>
              {categories.map((categorie) => (
                <option key={categorie} value={categorie}>
                  {categorie}
                </option>
              ))}
            </select>
          </div>

          <div className="col-6 col-md-3 col-lg-2">
            <label className="form-label small mb-1" htmlFor="filtre-prix">
              Prix max : {valeurs.prixMax === null ? "aucun" : `${valeurs.prixMax.toFixed(2).replace(".", ",")} €`}
            </label>
            <input
              id="filtre-prix"
              type="range"
              className="form-range"
              min={bornes.prix[0]}
              max={bornes.prix[1]}
              step={0.1}
              value={valeurs.prixMax ?? bornes.prix[1]}
              onChange={(evenement) => {
                const valeur = Number(evenement.target.value);
                // Ramener le curseur à fond = supprimer le filtre
                onChange("prixMax", valeur >= bornes.prix[1] ? null : valeur);
              }}
            />
          </div>

          <div className="col-6 col-md-3 col-lg-2">
            <label className="form-label small mb-1" htmlFor="filtre-quantite">
              Quantité max : {valeurs.quantiteMax ?? "aucune"}
            </label>
            <input
              id="filtre-quantite"
              type="range"
              className="form-range"
              min={bornes.quantite[0]}
              max={bornes.quantite[1]}
              step={1}
              value={valeurs.quantiteMax ?? bornes.quantite[1]}
              onChange={(evenement) => {
                const valeur = Number(evenement.target.value);
                onChange("quantiteMax", valeur >= bornes.quantite[1] ? null : valeur);
              }}
            />
          </div>

          <div className="col-6 col-md-3 col-lg-2">
            <label className="form-label small mb-1" htmlFor="filtre-seuil">
              Seuil max : {valeurs.seuilMax ?? "aucun"}
            </label>
            <input
              id="filtre-seuil"
              type="range"
              className="form-range"
              min={bornes.seuil[0]}
              max={bornes.seuil[1]}
              step={1}
              value={valeurs.seuilMax ?? bornes.seuil[1]}
              onChange={(evenement) => {
                const valeur = Number(evenement.target.value);
                onChange("seuilMax", valeur >= bornes.seuil[1] ? null : valeur);
              }}
            />
          </div>

          <div className="col-6 col-md-3 col-lg-1 d-flex align-items-center">
            <div className="form-check">
              <input
                id="filtre-alertes"
                type="checkbox"
                className="form-check-input"
                checked={valeurs.seulementAlertes}
                onChange={(evenement) => onChange("seulementAlertes", evenement.target.checked)}
              />
              <label className="form-check-label small" htmlFor="filtre-alertes">
                Alertes
              </label>
            </div>
          </div>
        </div>

        <div className="d-flex justify-content-between align-items-center mt-3 pt-2 border-top">
          <span className="small text-muted">
            {nbResultats} produit{nbResultats > 1 ? "s" : ""} affiché{nbResultats > 1 ? "s" : ""} sur {nbTotal}
          </span>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            disabled={aucunFiltre}
            onClick={onReinitialiser}
          >
            Effacer les filtres
          </button>
        </div>
      </div>
    </div>
  );
}
