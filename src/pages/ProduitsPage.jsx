/* =============================================================================
   ProduitsPage — liste des produits + filtres sur tous les attributs.

   Rôle de cette page : elle est l'ORCHESTRATEUR. Elle est le seul composant de cet
   écran à posséder un état (les critères de filtres) et elle fait la jonction :
     FiltreProduits (remonte les critères) → page (état + filtrage) → TableProduits.
   FiltreProduits et TableProduits ne se connaissent pas : ils ne communiquent que
   par l'intermédiaire de leur parent. C'est le « lifting state up » du cours.

   TODO (responsable : __) — améliorations attendues :
     - tri par colonne (nom, prix, quantité) ;
     - filtres sur les 5 attributs à vérifier/soigner, réutilisation des petits
       composants du cours (InputFiltre / CheckboxFiltre / RangeFiltre) ;
     - mise en forme du surlignage et de la légende des états.
   ========================================================================== */

import { useMemo, useState } from "react";
import { FiltreProduits } from "../components/produits/FiltreProduits.jsx";
import { TableProduits } from "../components/produits/TableProduits.jsx";
import { useData } from "../store/DataContext.jsx";
import {
  bornesFiltres,
  categoriesUtilisees,
  filtrerProduits,
} from "../store/selecteurs.js";

/** Valeur initiale = « aucun filtre ». `null` signifie « critère non appliqué ». */
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

  // Données dérivées : les catégories et les bornes des curseurs dépendent des
  // données, donc on les recalcule quand `produits` change.
  const categories = useMemo(() => categoriesUtilisees(produits), [produits]);
  const bornes = useMemo(() => bornesFiltres(produits), [produits]);
  const produitsAffiches = useMemo(
    () => filtrerProduits(produits, filtres),
    [produits, filtres],
  );

  function changerFiltre(cle, valeur) {
    setFiltres((precedents) => ({ ...precedents, [cle]: valeur }));
  }

  return (
    <>
      <header className="entete-page">
        <h1>Produits</h1>
        <p className="sous-titre mb-0">
          Les lignes surlignées signalent une quantité inférieure ou égale au seuil
          de réapprovisionnement.
        </p>
      </header>

      <FiltreProduits
        valeurs={filtres}
        bornes={bornes}
        categories={categories}
        nbResultats={produitsAffiches.length}
        nbTotal={produits.length}
        onChange={changerFiltre}
        onReinitialiser={() => setFiltres(FILTRES_INITIAUX)}
      />

      <TableProduits produits={produitsAffiches} />
    </>
  );
}
