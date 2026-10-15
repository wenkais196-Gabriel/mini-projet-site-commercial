/* Tests des TRANSITIONS d'état (src/store/etat.js) — pattern Command.
   Aucun navigateur, aucun React : on appelle les transitions directement. */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PRODUITS_INITIAUX } from "../src/data/seed.js";
import {
  annulerDerniereOperation,
  appliquerCommande,
  creerEtatInitial,
  executerOperation,
  reducer,
} from "../src/store/etat.js";

const CLIENT = { nom: "Song", prenom: "Wenkai", email: "wenkai@exemple.fr" };
const DATE = "2026-10-08";

const stock = (etat, idProduit) =>
  etat.produits.find((produit) => produit.id === idProduit).quantite;

describe("état initial", () => {
  it("copie les données de départ au lieu de les partager", () => {
    const etat = creerEtatInitial();
    etat.produits[0].quantite = 999;
    assert.notEqual(PRODUITS_INITIAUX[0].quantite, 999);
  });

  it("démarre avec 13 produits, 3 commandes et un historique vide", () => {
    const etat = creerEtatInitial();
    assert.equal(etat.produits.length, 13);
    assert.equal(etat.commandes.length, 3);
    assert.deepEqual(etat.historique, []);
    assert.equal(etat.prochainNumero, 4);
  });
});

describe("passer une commande", () => {
  it("refuse une commande invalide sans toucher à l'état (même référence)", () => {
    const etat = creerEtatInitial();
    const { rapport, etat: apres, commande } = appliquerCommande(
      etat,
      { ...CLIENT, lignes: [] },
      DATE,
    );
    assert.equal(rapport.valide, false);
    assert.equal(commande, null);
    assert.equal(apres, etat); // l'état n'a pas été reconstruit
  });

  it("refuse une quantité supérieure au stock", () => {
    const etat = creerEtatInitial();
    const { commande } = appliquerCommande(
      etat,
      { ...CLIENT, lignes: [{ idProduit: "P13", quantite: 99 }] },
      DATE,
    );
    assert.equal(commande, null);
  });

  it("crée la commande C004, décrémente le stock et empile une opération", () => {
    const etat = creerEtatInitial();
    const stockAvant = stock(etat, "P10"); // Poivron : 22
    const { commande, etat: apres } = appliquerCommande(
      etat,
      { ...CLIENT, lignes: [{ idProduit: "P10", quantite: 12 }] },
      DATE,
    );

    assert.equal(commande.id, "C004");
    assert.equal(commande.date, DATE);
    assert.equal(commande.client.nom, "Song");
    assert.equal(apres.commandes.length, 4);
    assert.equal(stock(apres, "P10"), stockAvant - 12);
    assert.equal(apres.historique.length, 1);
    assert.equal(apres.historique[0].type, "PASSER_COMMANDE");
    assert.equal(apres.historique[0].libelle, "commande C004");
  });

  it("ne modifie jamais l'état reçu (fonction pure)", () => {
    const etat = creerEtatInitial();
    const avant = structuredClone(etat);
    appliquerCommande(etat, { ...CLIENT, lignes: [{ idProduit: "P01", quantite: 1 }] }, DATE);
    assert.deepEqual(etat, avant);
  });

  it("numérote les commandes successives sans réutiliser d'identifiant", () => {
    let etat = creerEtatInitial();
    etat = appliquerCommande(etat, { ...CLIENT, lignes: [{ idProduit: "P01", quantite: 1 }] }, DATE).etat;
    etat = appliquerCommande(etat, { ...CLIENT, lignes: [{ idProduit: "P06", quantite: 1 }] }, DATE).etat;
    assert.deepEqual(etat.commandes.map((c) => c.id).slice(-2), ["C004", "C005"]);
  });

  it("coupe les espaces autour des champs du client", () => {
    const { commande } = appliquerCommande(
      creerEtatInitial(),
      { nom: "  Song ", prenom: " Wenkai", email: " a@b.fr ", lignes: [{ idProduit: "P01", quantite: 1 }] },
      DATE,
    );
    assert.equal(commande.client.nom, "Song");
    assert.equal(commande.client.email, "a@b.fr");
  });
});

describe("annuler la dernière opération (pattern Command)", () => {
  it("ne fait rien quand l'historique est vide", () => {
    const etat = creerEtatInitial();
    const { operation, etat: apres } = annulerDerniereOperation(etat);
    assert.equal(operation, null);
    assert.equal(apres, etat);
  });

  it("rend le stock et retire la commande", () => {
    const etat0 = creerEtatInitial();
    const stockAvant = stock(etat0, "P10");

    const { etat: etat1 } = appliquerCommande(
      etat0,
      { ...CLIENT, lignes: [{ idProduit: "P10", quantite: 12 }] },
      DATE,
    );
    assert.equal(stock(etat1, "P10"), stockAvant - 12);

    const { operation, etat: etat2 } = annulerDerniereOperation(etat1);
    assert.equal(operation.libelle, "commande C004");
    assert.equal(stock(etat2, "P10"), stockAvant); // stock rendu
    assert.equal(etat2.commandes.length, 3); // commande retirée
    assert.deepEqual(etat2.historique, []);
  });

  it("annule les opérations dans l'ordre inverse (dernier arrivé, premier annulé)", () => {
    let etat = creerEtatInitial();
    etat = appliquerCommande(etat, { ...CLIENT, lignes: [{ idProduit: "P01", quantite: 2 }] }, DATE).etat;
    etat = appliquerCommande(etat, { ...CLIENT, lignes: [{ idProduit: "P06", quantite: 3 }] }, DATE).etat;

    const apresPremiereAnnulation = annulerDerniereOperation(etat).etat;
    assert.deepEqual(
      apresPremiereAnnulation.commandes.map((c) => c.id),
      ["C001", "C002", "C003", "C004"],
    );

    const apresSecondeAnnulation = annulerDerniereOperation(apresPremiereAnnulation).etat;
    assert.deepEqual(
      apresSecondeAnnulation.commandes.map((c) => c.id),
      ["C001", "C002", "C003"],
    );
    assert.deepEqual(apresSecondeAnnulation.historique, []);
  });

  it("rend le stock même pour une ligne multiple (deux produits)", () => {
    const etat0 = creerEtatInitial();
    const banane = stock(etat0, "P01");
    const eau = stock(etat0, "P12");

    const { etat: etat1 } = appliquerCommande(
      etat0,
      {
        ...CLIENT,
        lignes: [
          { idProduit: "P01", quantite: 5 },
          { idProduit: "P12", quantite: 7 },
        ],
      },
      DATE,
    );
    const { etat: etat2 } = annulerDerniereOperation(etat1);

    assert.equal(stock(etat2, "P01"), banane);
    assert.equal(stock(etat2, "P12"), eau);
  });
});

describe("exécuter une opération inconnue", () => {
  it("laisse l'état inchangé plutôt que de planter", () => {
    const etat = creerEtatInitial();
    assert.equal(executerOperation(etat, { type: "OPERATION_INCONNUE" }), etat);
  });
});

describe("reducer", () => {
  it("applique VALIDER_COMMANDE", () => {
    const etat = reducer(creerEtatInitial(), {
      type: "VALIDER_COMMANDE",
      formulaire: { ...CLIENT, lignes: [{ idProduit: "P01", quantite: 1 }] },
      date: DATE,
    });
    assert.equal(etat.commandes.length, 4);
  });

  it("applique ANNULER_DERNIERE_OPERATION", () => {
    const avecCommande = reducer(creerEtatInitial(), {
      type: "VALIDER_COMMANDE",
      formulaire: { ...CLIENT, lignes: [{ idProduit: "P01", quantite: 1 }] },
      date: DATE,
    });
    const apres = reducer(avecCommande, { type: "ANNULER_DERNIERE_OPERATION" });
    assert.equal(apres.commandes.length, 3);
  });

  it("REINITIALISER repart des données de départ", () => {
    const avecCommande = reducer(creerEtatInitial(), {
      type: "VALIDER_COMMANDE",
      formulaire: { ...CLIENT, lignes: [{ idProduit: "P01", quantite: 1 }] },
      date: DATE,
    });
    const apres = reducer(avecCommande, { type: "REINITIALISER" });
    assert.equal(apres.commandes.length, 3);
    assert.equal(apres.produits.length, 13);
    assert.deepEqual(apres.historique, []);
  });

  it("ignore une action inconnue", () => {
    const etat = creerEtatInitial();
    assert.equal(reducer(etat, { type: "N_IMPORTE_QUOI" }), etat);
  });
});
