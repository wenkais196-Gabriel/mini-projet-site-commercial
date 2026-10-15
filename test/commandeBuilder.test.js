/* Tests du BUILDER de commande (src/store/commandeBuilder.js) — pattern Builder. */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CommandeBuilder } from "../src/store/commandeBuilder.js";

const CATALOGUE = [
  { id: "P01", nom: "Banane", categorie: "Fruit", prix: 2.4, quantite: 42, seuil: 15 },
  { id: "P10", nom: "Poivron", categorie: "Légume", prix: 3.75, quantite: 22, seuil: 10 },
  { id: "P13", nom: "Jus d'orange", categorie: "Boisson", prix: 2.6, quantite: 3, seuil: 15 },
];

const CLIENT = { nom: "Song", prenom: "Wenkai", email: "wenkai@exemple.fr" };

describe("construction nominale", () => {
  it("produit une commande valide et le formulaire correspondant", () => {
    const resultat = new CommandeBuilder(CATALOGUE)
      .setClient(CLIENT)
      .ajouterLigne("P10", 12)
      .ajouterLigne("P01", 3)
      .build();

    assert.equal(resultat.valide, true);
    assert.deepEqual(resultat.lignes, [
      { idProduit: "P10", quantite: 12 },
      { idProduit: "P01", quantite: 3 },
    ]);
    assert.deepEqual(resultat.formulaire, {
      ...CLIENT,
      lignes: [
        { idProduit: "P10", quantite: 12 },
        { idProduit: "P01", quantite: 3 },
      ],
    });
  });

  it("est chaînable dans n'importe quel ordre", () => {
    const resultat = new CommandeBuilder(CATALOGUE)
      .ajouterLigne("P01", 1)
      .setClient(CLIENT)
      .build();
    assert.equal(resultat.valide, true);
  });

  it("convertit une quantité saisie en texte", () => {
    const resultat = new CommandeBuilder(CATALOGUE)
      .setClient(CLIENT)
      .ajouterLigne("P01", "4")
      .build();
    assert.deepEqual(resultat.lignes, [{ idProduit: "P01", quantite: 4 }]);
  });

  it("accepte une quantité exactement égale au stock", () => {
    const resultat = new CommandeBuilder(CATALOGUE)
      .setClient(CLIENT)
      .ajouterLigne("P13", 3)
      .build();
    assert.equal(resultat.valide, true);
  });

  it("setClient ne remplace que les champs fournis", () => {
    const resultat = new CommandeBuilder(CATALOGUE)
      .setClient({ nom: "Song" })
      .setClient({ prenom: "Wenkai", email: "wenkai@exemple.fr" })
      .ajouterLigne("P01", 1)
      .build();
    assert.equal(resultat.formulaire.nom, "Song");
    assert.equal(resultat.valide, true);
  });
});

describe("refus immédiats de ajouterLigne", () => {
  it("refuse une quantité supérieure au stock et n'ajoute pas la ligne", () => {
    const resultat = new CommandeBuilder(CATALOGUE)
      .setClient(CLIENT)
      .ajouterLigne("P13", 4) // 3 en stock
      .ajouterLigne("P01", 1)
      .build();

    assert.deepEqual(resultat.lignes, [{ idProduit: "P01", quantite: 1 }]);
    assert.match(resultat.erreursParProduit.P13, /Stock insuffisant/);
    assert.equal(resultat.valide, false, "une ligne refusée rend la commande invalide");
  });

  it("refuse un produit inconnu", () => {
    const resultat = new CommandeBuilder(CATALOGUE)
      .setClient(CLIENT)
      .ajouterLigne("P99", 1)
      .build();
    assert.match(resultat.erreursParProduit.P99, /inconnu/);
    assert.deepEqual(resultat.lignes, []);
  });

  it("refuse une quantité nulle, négative ou non entière", () => {
    for (const quantite of [0, -2, 1.5]) {
      const resultat = new CommandeBuilder(CATALOGUE)
        .setClient(CLIENT)
        .ajouterLigne("P01", quantite)
        .build();
      assert.deepEqual(resultat.lignes, [], `quantité ${quantite} refusée`);
      assert.match(resultat.erreursParProduit.P01, /entier supérieur à 0/);
    }
  });

  it("tient compte des lignes déjà ajoutées (le cumul ne dépasse pas le stock)", () => {
    const resultat = new CommandeBuilder(CATALOGUE)
      .setClient(CLIENT)
      .ajouterLigne("P13", 2)
      .ajouterLigne("P13", 2) // 2 + 2 > 3
      .build();

    assert.deepEqual(resultat.lignes, [{ idProduit: "P13", quantite: 2 }]);
    assert.match(resultat.erreursParProduit.P13, /Stock insuffisant/);
  });
});

describe("contrôle final par build()", () => {
  it("refuse une commande sans client", () => {
    const resultat = new CommandeBuilder(CATALOGUE)
      .ajouterLigne("P01", 1)
      .build();
    assert.equal(resultat.valide, false);
    assert.ok(resultat.erreurs.nom);
    assert.ok(resultat.erreurs.email);
  });

  it("refuse une commande sans ligne", () => {
    const resultat = new CommandeBuilder(CATALOGUE).setClient(CLIENT).build();
    assert.equal(resultat.valide, false);
    assert.match(resultat.erreurs.lignes, /au moins un produit/);
  });

  it("refuse une adresse mail mal formée", () => {
    const resultat = new CommandeBuilder(CATALOGUE)
      .setClient({ ...CLIENT, email: "pas-un-mail" })
      .ajouterLigne("P01", 1)
      .build();
    assert.equal(resultat.valide, false);
    assert.match(resultat.erreurs.email, /invalide/);
  });
});

describe("correction en cours de construction", () => {
  it("retirerLigne enlève la ligne et son refus", () => {
    const constructeur = new CommandeBuilder(CATALOGUE)
      .setClient(CLIENT)
      .ajouterLigne("P13", 4); // refusée
    assert.ok(constructeur.build().erreursParProduit.P13);

    constructeur.retirerLigne("P13").ajouterLigne("P01", 1);
    const resultat = constructeur.build();

    assert.equal(resultat.valide, true);
    assert.deepEqual(resultat.lignes, [{ idProduit: "P01", quantite: 1 }]);
  });

  it("les lignes renvoyées sont des copies (l'appelant ne mute pas l'objet en construction)", () => {
    const constructeur = new CommandeBuilder(CATALOGUE).setClient(CLIENT).ajouterLigne("P01", 2);
    constructeur.lignes[0].quantite = 999;
    assert.equal(constructeur.build().lignes[0].quantite, 2);
  });
});
