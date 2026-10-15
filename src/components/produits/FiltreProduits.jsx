import { InputFiltre } from "./InputFiltre.jsx";
import { CheckboxFiltre } from "./CheckboxFiltre.jsx";
import { RangeFiltre } from "./RangeFiltre.jsx";

export function FiltreProduits({
  valeurs,
  bornes,
  categories,
  nbResultats,
  nbTotal,
  onChange,
  onReinitialiser,
}) {
  const aucunFiltre =
    valeurs.nom === "" &&
    valeurs.categorie === "" &&
    valeurs.prixMax === null &&
    valeurs.quantiteMax === null &&
    valeurs.seuilMax === null &&
    !valeurs.seulementAlertes;

  return (
    <section className="card border-0 shadow-sm mb-4">
      <div className="card-body">
        <div className="row g-3">
          <div className="col-md-4">
            <InputFiltre
              id="filtre-nom"
              label="Nom du produit"
              placeholder="Rechercher un produit..."
              value={valeurs.nom}
              onChange={(valeur) => onChange("nom", valeur)}
            />
          </div>

          <div className="col-md-4">
            <label
              className="form-label small mb-1"
              htmlFor="filtre-categorie"
            >
              Catégorie
            </label>
            <select
              id="filtre-categorie"
              className="form-select form-select-sm"
              value={valeurs.categorie}
              onChange={(evenement) =>
                onChange("categorie", evenement.target.value)
              }
            >
              <option value="">Toutes les catégories</option>
              {categories.map((categorie) => (
                <option key={categorie} value={categorie}>
                  {categorie}
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-4">
            <RangeFiltre
              id="filtre-prix"
              label={`Prix maximum : ${
                valeurs.prixMax ?? bornes.prix[1]
              } €`}
              value={valeurs.prixMax ?? bornes.prix[1]}
              min={bornes.prix[0]}
              max={bornes.prix[1]}
              step={0.1}
              onChange={(valeur) =>
                onChange(
                  "prixMax",
                  valeur >= bornes.prix[1] ? null : valeur
                )
              }
            />
          </div>

          <div className="col-md-4">
            <RangeFiltre
              id="filtre-quantite"
              label={`Quantité maximum : ${
                valeurs.quantiteMax ?? bornes.quantite[1]
              }`}
              value={valeurs.quantiteMax ?? bornes.quantite[1]}
              min={bornes.quantite[0]}
              max={bornes.quantite[1]}
              onChange={(valeur) =>
                onChange(
                  "quantiteMax",
                  valeur >= bornes.quantite[1] ? null : valeur
                )
              }
            />
          </div>

          <div className="col-md-4">
            <RangeFiltre
              id="filtre-seuil"
              label={`Seuil maximum : ${
                valeurs.seuilMax ?? bornes.seuil[1]
              }`}
              value={valeurs.seuilMax ?? bornes.seuil[1]}
              min={bornes.seuil[0]}
              max={bornes.seuil[1]}
              onChange={(valeur) =>
                onChange(
                  "seuilMax",
                  valeur >= bornes.seuil[1] ? null : valeur
                )
              }
            />
          </div>

          <div className="col-md-4 d-flex align-items-end">
            <CheckboxFiltre
              id="filtre-alertes"
              label="Afficher uniquement les alertes de stock"
              checked={valeurs.seulementAlertes}
              onChange={(valeur) =>
                onChange("seulementAlertes", valeur)
              }
            />
          </div>
        </div>

        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-3">
          <span className="small text-muted">
            {nbResultats} produit(s) affiché(s) sur {nbTotal}
          </span>

          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            disabled={aucunFiltre}
            onClick={onReinitialiser}
          >
            Réinitialiser les filtres
          </button>
        </div>
      </div>
    </section>
  );
}
