import { useState } from "react";
import { FiltreProduits } from "../components/produits/FiltreProduits.jsx";
import { TableProduits } from "../components/produits/TableProduits.jsx";
import { useData } from "../store/DataContext.jsx";
import {
  bornesFiltres,
  categoriesUtilisees,
  filtrerProduits,
} from "../store/selecteurs.js";

const FILTRES_INITIAUX = {
  nom: "",
  categorie: "",
  prixMax: null,
  quantiteMax: null,
  seuilMax: null,
  seulementAlertes: false,
};

export function ProduitsPage() {
  const { produits } = useData();

  const [filtres, setFiltres] = useState(FILTRES_INITIAUX);
  const [tri, setTri] = useState({ colonne: "", ordre: "asc" });

  const produitsFiltres = filtrerProduits(produits, filtres);

  const produitsAffiches = [...produitsFiltres].sort((a, b) => {
    if (!tri.colonne) return 0;

    const comparaison =
      tri.colonne === "nom"
        ? a.nom.localeCompare(b.nom, "fr")
        : a[tri.colonne] - b[tri.colonne];

    return tri.ordre === "asc" ? comparaison : -comparaison;
  });

  function changerFiltre(cle, valeur) {
    setFiltres((precedents) => ({
      ...precedents,
      [cle]: valeur,
    }));
  }

  function changerTri(colonne) {
    setTri((precedent) => ({
      colonne,
      ordre:
        precedent.colonne === colonne && precedent.ordre === "asc"
          ? "desc"
          : "asc",
    }));
  }

  return (
    <>
      <header className="entete-page">
        <h1>Produits</h1>
        <p className="sous-titre mb-0">
          Les produits dont la quantité est inférieure ou égale au seuil
          de réapprovisionnement sont signalés.
        </p>
      </header>

      <FiltreProduits
        valeurs={filtres}
        bornes={bornesFiltres(produits)}
        categories={categoriesUtilisees(produits)}
        nbResultats={produitsAffiches.length}
        nbTotal={produits.length}
        onChange={changerFiltre}
        onReinitialiser={() => setFiltres(FILTRES_INITIAUX)}
      />

      <div className="mb-3 d-flex flex-wrap align-items-center gap-2">
        <span className="small text-muted">Trier par :</span>

        {[
          { colonne: "nom", libelle: "Nom" },
          { colonne: "prix", libelle: "Prix" },
          { colonne: "quantite", libelle: "Quantité" },
        ].map(({ colonne, libelle }) => (
          <button
            key={colonne}
            type="button"
            className={`btn btn-sm ${
              tri.colonne === colonne
                ? "btn-primary"
                : "btn-outline-secondary"
            }`}
            onClick={() => changerTri(colonne)}
          >
            {libelle}
            {tri.colonne === colonne &&
              (tri.ordre === "asc" ? " ↑" : " ↓")}
          </button>
        ))}

        {tri.colonne && (
          <button
            type="button"
            className="btn btn-sm btn-link text-secondary"
            onClick={() => setTri({ colonne: "", ordre: "asc" })}
          >
            Effacer le tri
          </button>
        )}
      </div>

      <TableProduits produits={produitsAffiches} />
    </>
  );
}