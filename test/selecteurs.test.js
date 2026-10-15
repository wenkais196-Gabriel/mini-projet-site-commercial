/* Tests des RÈGLES MÉTIER (src/store/selecteurs.js).
   Lancement : npm test       (= node --test test/)  — aucune dépendance à installer. */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  bornesFiltres,
  calculerStatistiques,
  categoriesUtilisees,
  estEnAlerte,
  estEnRupture,
  filtrerProduits,
  formaterPrix,
  grouperParCategorie,
  trouverProduit,
  validerCommande,
} from "../src/store/selecteurs.js";

const CATALOGUE = [
  { id: "P01", nom: "Banane", categorie: "Fruit", prix: 2.4, quantite: 42, seuil: 15 },
  { id: "P02", nom: "Pomme", categorie: "Fruit", prix: 1.6, quantite: 8, seuil: 20 },
  { id: "P03", nom: "Cerise", categorie: "Fruit", prix: 3.4, quantite: 0, seuil: 10 },
  { id: "P05", nom: "Orange", categorie: "Fruit", prix: 2.1, quantite: 12, seuil: 12 },
  { id: "P06", nom: "Carotte", categorie: "Légume", prix: 1.2, quantite: 60, seuil: 25 },
];

describe("états d'un produit", () => {
  it("signale une alerte quand la quantité est en dessous du seuil", () => {
    assert.equal(estEnAlerte({ quantite: 8, seuil: 20 }), true);
  });

  it("ne signale rien quand le stock est confortable", () => {
    assert.equal(estEnAlerte({ quantite: 42, seuil: 15 }), false);
  });

  it("INCLUT l'égalité au seuil (choix de lecture documenté, cas limite 12/12)", () => {
    assert.equal(estEnAlerte({ quantite: 12, seuil: 12 }), true);
  });

  it("distingue la rupture (quantité nulle) de la simple alerte", () => {
    assert.equal(estEnRupture({ quantite: 0, seuil: 10 }), true);
    assert.equal(estEnRupture({ quantite: 1, seuil: 10 }), false);
  });
});

describe("affichage", () => {
  it("formate les prix à la française", () => {
    assert.equal(formaterPrix(2.4), "2,40 €");
    assert.equal(formaterPrix(0.2), "0,20 €");
  });

  it("trouve un produit par identifiant et renvoie null sinon", () => {
    assert.equal(trouverProduit(CATALOGUE, "P05")?.nom, "Orange");
    assert.equal(trouverProduit(CATALOGUE, "P99"), null);
  });

  it("liste les catégories dans leur ordre d'apparition", () => {
    assert.deepEqual(categoriesUtilisees(CATALOGUE), ["Fruit", "Légume"]);
  });
});

describe("filtrage (les critères se cumulent en ET)", () => {
  it("filtre sur le nom, sans tenir compte de la casse ni des espaces", () => {
    assert.deepEqual(
      filtrerProduits(CATALOGUE, { nom: "  pom " }).map((p) => p.id),
      ["P02"],
    );
  });

  it("filtre sur la catégorie", () => {
    assert.deepEqual(
      filtrerProduits(CATALOGUE, { categorie: "Légume" }).map((p) => p.id),
      ["P06"],
    );
  });

  it("filtre sur le prix maximum (borne incluse)", () => {
    assert.deepEqual(
      filtrerProduits(CATALOGUE, { prixMax: 2.1 }).map((p) => p.id),
      ["P02", "P05", "P06"],
    );
  });

  it("ne garde que les alertes quand on le demande", () => {
    assert.deepEqual(
      filtrerProduits(CATALOGUE, { seulementAlertes: true }).map((p) => p.id),
      ["P02", "P03", "P05"],
    );
  });

  it("cumule deux critères (catégorie + prix)", () => {
    assert.deepEqual(
      filtrerProduits(CATALOGUE, { categorie: "Fruit", prixMax: 2.1 }).map((p) => p.id),
      ["P02", "P05"],
    );
  });

  it("sans critère, renvoie tout", () => {
    assert.equal(filtrerProduits(CATALOGUE, {}).length, CATALOGUE.length);
  });
});

describe("regroupement et bornes", () => {
  it("regroupe par catégorie en conservant l'ordre d'apparition", () => {
    const groupes = grouperParCategorie(CATALOGUE);
    assert.deepEqual(groupes.map((g) => g.categorie), ["Fruit", "Légume"]);
    assert.equal(groupes[0].produits.length, 4);
  });

  it("calcule des bornes de curseurs qui couvrent les données", () => {
    const bornes = bornesFiltres(CATALOGUE);
    assert.deepEqual(bornes.prix, [0, 4]); // max 3,40 arrondi au-dessus
    assert.deepEqual(bornes.quantite, [0, 60]);
    assert.deepEqual(bornes.seuil, [0, 25]);
  });

  it("ne plante pas sur un catalogue vide", () => {
    const bornes = bornesFiltres([]);
    assert.deepEqual(bornes.prix, [0, 1]);
  });
});

describe("indicateurs de la page Accueil", () => {
  it("compte produits, alertes, ruptures et valeur du stock", () => {
    const stats = calculerStatistiques(CATALOGUE, []);
    assert.equal(stats.nbProduits, 5);
    assert.equal(stats.nbAlertes, 3); // Pomme, Cerise, Orange
    assert.equal(stats.nbRuptures, 1); // Cerise
    assert.equal(stats.nbUnites, 122);
    assert.equal(stats.valeurStock, 210.8); // 42x2,4 + 8x1,6 + 0x3,4 + 12x2,1 + 60x1,2
  });

  it("détaille chaque catégorie", () => {
    const stats = calculerStatistiques(CATALOGUE, []);
    const fruits = stats.parCategorie.find((c) => c.categorie === "Fruit");
    assert.equal(fruits.nbProduits, 4);
    assert.equal(fruits.stockTotal, 62);
    assert.equal(fruits.stockMoyen, 15.5);
    assert.equal(fruits.nbAlertes, 3);
  });

  it("compte les commandes et leurs lignes", () => {
    const stats = calculerStatistiques([], [
      { id: "C001", lignes: [{ idProduit: "P01", quantite: 2 }] },
      { id: "C002", lignes: [{ idProduit: "P06", quantite: 1 }, { idProduit: "P05", quantite: 3 }] },
    ]);
    assert.equal(stats.nbCommandes, 2);
    assert.equal(stats.nbLignesCommandees, 3);
  });
});

describe("validation d'une commande", () => {
  const clientValide = { nom: "Song", prenom: "Wenkai", email: "wenkai@exemple.fr" };

  it("accepte une commande conforme et nettoie les espaces", () => {
    const rapport = validerCommande(CATALOGUE, {
      ...clientValide,
      lignes: [{ idProduit: "P01", quantite: " 3 " }],
    });
    assert.equal(rapport.valide, true);
    assert.deepEqual(rapport.lignes, [{ idProduit: "P01", quantite: 3 }]);
  });

  it("exige le nom, le prénom et une adresse mail", () => {
    const rapport = validerCommande(CATALOGUE, { nom: "  ", prenom: "", email: "", lignes: [] });
    assert.equal(rapport.valide, false);
    assert.ok(rapport.erreurs.nom);
    assert.ok(rapport.erreurs.prenom);
    assert.ok(rapport.erreurs.email);
  });

  it("refuse une adresse mail mal formée", () => {
    const rapport = validerCommande(CATALOGUE, {
      ...clientValide,
      email: "wenkai@@exemple",
      lignes: [{ idProduit: "P01", quantite: 1 }],
    });
    assert.equal(rapport.valide, false);
    assert.match(rapport.erreurs.email, /invalide/);
  });

  it("refuse une commande sans aucune ligne commandée", () => {
    const rapport = validerCommande(CATALOGUE, { ...clientValide, lignes: [] });
    assert.equal(rapport.valide, false);
    assert.match(rapport.erreurs.lignes, /au moins un produit/);
  });

  it("ignore les lignes à quantité nulle", () => {
    const rapport = validerCommande(CATALOGUE, {
      ...clientValide,
      lignes: [{ idProduit: "P01", quantite: 0 }],
    });
    assert.equal(rapport.valide, false);
    assert.match(rapport.erreurs.lignes, /au moins un produit/);
  });

  it("REFUSE une quantité supérieure au stock disponible", () => {
    const rapport = validerCommande(CATALOGUE, {
      ...clientValide,
      lignes: [{ idProduit: "P02", quantite: 9 }], // 8 en stock
    });
    assert.equal(rapport.valide, false);
    assert.match(rapport.erreursParProduit.P02, /Stock insuffisant/);
  });

  it("accepte une quantité exactement égale au stock", () => {
    const rapport = validerCommande(CATALOGUE, {
      ...clientValide,
      lignes: [{ idProduit: "P02", quantite: 8 }],
    });
    assert.equal(rapport.valide, true);
  });

  it("refuse une quantité non entière", () => {
    const rapport = validerCommande(CATALOGUE, {
      ...clientValide,
      lignes: [{ idProduit: "P01", quantite: 1.5 }],
    });
    assert.equal(rapport.valide, false);
    assert.match(rapport.erreursParProduit.P01, /entier/);
  });

  it("refuse un produit inconnu", () => {
    const rapport = validerCommande(CATALOGUE, {
      ...clientValide,
      lignes: [{ idProduit: "P99", quantite: 1 }],
    });
    assert.equal(rapport.valide, false);
    assert.match(rapport.erreursParProduit.P99, /inconnu/);
  });
});
