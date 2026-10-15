/* Tests de la MACHINE À ÉTATS du formulaire (src/store/statutCommande.js) — pattern State. */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  EVENEMENTS,
  STATUTS,
  TRANSITIONS,
  afficheLaConfirmation,
  afficheLesErreurs,
  peutTransitionner,
  statutApresNouvelleCommande,
  statutApresSaisie,
  statutApresSoumission,
  transitionner,
} from "../src/store/statutCommande.js";

const { BROUILLON, EN_SAISIE, INVALIDE, VALIDE, ENREGISTREE } = STATUTS;

describe("la table des transitions", () => {
  it("décrit chaque statut, et rien d'autre", () => {
    assert.deepEqual(Object.keys(TRANSITIONS).sort(), [
      "Brouillon",
      "En cours de saisie",
      "Enregistree",
      "Invalide",
      "Valide",
    ]);
  });
});

describe("parcours nominal", () => {
  it("Brouillon → En cours de saisie → Valide → Enregistree", () => {
    let statut = BROUILLON;

    statut = statutApresSaisie(statut, { formulaireVide: false });
    assert.equal(statut, EN_SAISIE);

    statut = statutApresSoumission(statut, { valide: true });
    assert.equal(statut, ENREGISTREE, "la vérification réussie enchaîne sur l'enregistrement");
  });
});

describe("parcours d'erreur", () => {
  it("En cours de saisie → Invalide quand la vérification échoue", () => {
    const statut = statutApresSoumission(EN_SAISIE, { valide: false });
    assert.equal(statut, INVALIDE);
    assert.equal(afficheLesErreurs(statut), true);
    assert.equal(afficheLaConfirmation(statut), false);
  });

  it("Invalide → En cours de saisie dès que l'utilisateur corrige (les messages disparaissent)", () => {
    const statut = statutApresSaisie(INVALIDE, { formulaireVide: false });
    assert.equal(statut, EN_SAISIE);
    assert.equal(afficheLesErreurs(statut), false);
  });

  it("Invalide → Valide si l'utilisateur resoumet correctement", () => {
    assert.equal(statutApresSoumission(INVALIDE, { valide: true }), ENREGISTREE);
  });

  it("la soumission d'un formulaire vide depuis Brouillon devient Invalide", () => {
    assert.equal(statutApresSoumission(BROUILLON, { valide: false }), INVALIDE);
  });
});

describe("retour au brouillon", () => {
  it("vider le formulaire ramène à Brouillon", () => {
    assert.equal(statutApresSaisie(EN_SAISIE, { formulaireVide: true }), BROUILLON);
    assert.equal(statutApresSaisie(ENREGISTREE, { formulaireVide: true }), BROUILLON);
  });

  it("« nouvelle commande » après enregistrement ramène à Brouillon", () => {
    assert.equal(statutApresNouvelleCommande(ENREGISTREE), BROUILLON);
  });
});

describe("transitions INTERDITES", () => {
  it("on ne peut pas enregistrer une commande jamais vérifiée", () => {
    assert.equal(peutTransitionner(BROUILLON, EVENEMENTS.ENREGISTREMENT), false);
    assert.equal(transitionner(BROUILLON, EVENEMENTS.ENREGISTREMENT), BROUILLON);
  });

  it("on ne peut pas re-vérifier une commande déjà enregistrée", () => {
    assert.equal(peutTransitionner(ENREGISTREE, EVENEMENTS.VERIFICATION_REUSSIE), false);
    assert.equal(transitionner(ENREGISTREE, EVENEMENTS.VERIFICATION_REUSSIE), ENREGISTREE);
  });

  it("une transition interdite laisse l'état inchangé au lieu de planter", () => {
    for (const statut of Object.values(STATUTS)) {
      for (const evenement of Object.values(EVENEMENTS)) {
        const resultat = transitionner(statut, evenement);
        assert.ok(
          Object.values(STATUTS).includes(resultat),
          `(${statut}, ${evenement}) doit rester un statut connu`,
        );
      }
    }
  });

  it("un événement inconnu est une erreur de programmation, donc signalée", () => {
    assert.throws(() => transitionner(EN_SAISIE, "evenement-inexistant"), /Événement inconnu/);
  });
});

describe("messages pilotés par l'état", () => {
  it("aucun message en Brouillon ni en En cours de saisie", () => {
    for (const statut of [BROUILLON, EN_SAISIE]) {
      assert.equal(afficheLesErreurs(statut), false);
      assert.equal(afficheLaConfirmation(statut), false);
    }
  });

  it("seul l'état Enregistree affiche la confirmation", () => {
    assert.equal(afficheLaConfirmation(ENREGISTREE), true);
    assert.equal(afficheLaConfirmation(VALIDE), false);
  });

  it("seul l'état Invalide affiche les erreurs", () => {
    assert.equal(afficheLesErreurs(INVALIDE), true);
    assert.equal(afficheLesErreurs(VALIDE), false);
  });
});
