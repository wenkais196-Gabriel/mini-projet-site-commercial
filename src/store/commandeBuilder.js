/* =============================================================================
   commandeBuilder.js — construire une commande étape par étape (pattern Builder).

   Une commande n'est pas un objet qu'on remplit au hasard : elle obéit à des
   règles (client renseigné, au moins une ligne, quantités entières dans la limite
   du stock disponible). Le Builder rassemble ces règles au même endroit et refuse
   d'avancer tant qu'elles ne sont pas respectées :

     const resultat = new CommandeBuilder(produits)
       .setClient({ nom, prenom, email })
       .ajouterLigne("P10", 12)
       .ajouterLigne("P01", 3)
       .build();          // → { valide, formulaire, lignes, erreurs, erreursParProduit }

   Deux niveaux de contrôle, volontairement :
   - `ajouterLigne` refuse TOUT DE SUITE une ligne impossible (échec rapide) ;
   - `build` délègue le jugement final à `validerCommande` : le Builder assemble,
     le validateur juge. Une seule définition des règles, jamais deux.
   ========================================================================== */

import { trouverProduit, validerCommande } from "./selecteurs.js";

export class CommandeBuilder {
  /** @type {import('../data/seed.js').Produit[]} */
  #produits;
  #client = { nom: "", prenom: "", email: "" };
  #lignes = [];
  #refus = {};

  /** @param {import('../data/seed.js').Produit[]} produits le catalogue, source du contrôle de stock */
  constructor(produits) {
    this.#produits = produits;
  }

  /** @param {{ nom?: string, prenom?: string, email?: string }} client */
  setClient(client) {
    this.#client = { ...this.#client, ...client };
    return this;
  }

  /**
   * Ajoute une ligne à la commande en construction.
   * Refuse la ligne (et l'enregistre dans `erreursParProduit`) si le produit est
   * inconnu, si la quantité n'est pas un entier strictement positif, ou si le
   * stock disponible est insuffisant — en tenant compte des lignes déjà ajoutées.
   */
  ajouterLigne(idProduit, quantite) {
    const produit = trouverProduit(this.#produits, idProduit);
    const demandee = Number(quantite);

    if (produit === null) {
      this.#refuser(idProduit, "Produit inconnu.");
      return this;
    }
    if (!Number.isInteger(demandee) || demandee <= 0) {
      this.#refuser(idProduit, "La quantité doit être un nombre entier supérieur à 0.");
      return this;
    }

    const dejaDemandee = this.#lignes
      .filter((ligne) => ligne.idProduit === idProduit)
      .reduce((somme, ligne) => somme + ligne.quantite, 0);

    if (dejaDemandee + demandee > produit.quantite) {
      this.#refuser(
        idProduit,
        `Stock insuffisant : ${produit.quantite} disponible(s) pour « ${produit.nom} ».`,
      );
      return this;
    }

    this.#lignes.push({ idProduit, quantite: demandee });
    return this;
  }

  /** Retire une ligne déjà ajoutée (le Builder sert aussi à corriger en cours de route). */
  retirerLigne(idProduit) {
    this.#lignes = this.#lignes.filter((ligne) => ligne.idProduit !== idProduit);
    delete this.#refus[idProduit];
    return this;
  }

  /** Les lignes retenues, en copie (l'appelant ne peut pas muter l'objet en construction). */
  get lignes() {
    return this.#lignes.map((ligne) => ({ ...ligne }));
  }

  /** Le formulaire assemblé, prêt à être présenté au store. */
  get formulaire() {
    return { ...this.#client, lignes: this.lignes };
  }

  /**
   * Produit la commande.
   * `valide` exige DEUX conditions : les règles générales passent (validateur) ET
   * aucune ligne n'a été refusée en cours de construction. Sinon on produirait une
   * commande silencieusement différente de celle demandée.
   * @returns {{ valide: boolean, formulaire: object, lignes: object[],
   *             erreurs: Record<string,string>, erreursParProduit: Record<string,string> }}
   */
  build() {
    const rapport = validerCommande(this.#produits, this.formulaire);
    const erreursParProduit = { ...rapport.erreursParProduit, ...this.#refus };

    return {
      ...rapport,
      valide: rapport.valide && Object.keys(this.#refus).length === 0,
      formulaire: this.formulaire,
      erreursParProduit,
    };
  }

  #refuser(idProduit, message) {
    this.#refus[idProduit] = message;
  }
}
