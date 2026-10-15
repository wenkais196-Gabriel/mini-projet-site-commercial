/* =============================================================================
   CommandePage — formulaire de commande.

   Trois responsabilités, dans cet ordre :
     1. SÉLECTION : quels produits, en quelles quantités. La contrainte « respecter
        la quantité disponible » est garantie à la source par SelecteurQuantite
        (borné à [0, stock]), jamais par un message d'erreur après coup ;
     2. ASSEMBLAGE : c'est le CommandeBuilder qui construit l'objet commande et
        refuse une ligne impossible (pattern Builder) ;
     3. VALIDATION : le store revalide avant d'enregistrer — il ne fait confiance à
        personne — puis décrémente le stock (pattern Command, annulable).

   Les messages ne sont PAS déduits de conditions imbriquées : ils sont pilotés par
   la machine à états du formulaire (pattern State, `statutCommande.js`). Seul l'état
   « Invalide » affiche les erreurs, seul « Enregistree » affiche la confirmation.

   Ce composant ne modifie jamais les produits : il DEMANDE au store d'enregistrer
   la commande. La décrémentation du stock est un effet de bord du store.
   ========================================================================== */

import { useMemo, useState } from "react";
import { LigneCommande } from "../components/commande/LigneCommande.jsx";
import { useData } from "../store/DataContext.jsx";
import { CommandeBuilder } from "../store/commandeBuilder.js";
import { formaterPrix } from "../store/selecteurs.js";
import {
  STATUTS,
  afficheLaConfirmation,
  afficheLesErreurs,
  statutApresNouvelleCommande,
  statutApresSaisie,
  statutApresSoumission,
} from "../store/statutCommande.js";

const CLIENT_VIDE = { nom: "", prenom: "", email: "" };

const formulaireEstVide = (client, quantites) =>
  client.nom === "" &&
  client.prenom === "" &&
  client.email === "" &&
  Object.values(quantites).every((quantite) => Number(quantite) === 0);

export function CommandePage() {
  // L'action du store valide une dernière fois puis enregistre : on la nomme
  // d'après ce qu'elle fait réellement dans cette page.
  const { produits, validerCommande: enregistrerCommande } = useData();

  const [client, setClient] = useState(CLIENT_VIDE);
  /* Les quantités vivent ICI et pas dans LigneCommande : le total et la
     construction de la commande ont besoin de la commande entière. Un état par
     ligne rendrait ce calcul impossible sans remonter chaque valeur. */
  const [quantites, setQuantites] = useState({});
  const [rapport, setRapport] = useState(null);
  const [commandeEnregistree, setCommandeEnregistree] = useState(null);
  const [statut, setStatut] = useState(STATUTS.BROUILLON);

  /* La commande en construction est recalculée à chaque frappe : c'est une donnée
     DÉRIVÉE, elle n'a donc pas de useState. Le Builder est l'unique façon
     d'assembler une commande dans cette page. */
  const construction = useMemo(() => {
    const constructeur = new CommandeBuilder(produits).setClient(client);
    for (const [idProduit, quantite] of Object.entries(quantites)) {
      // On n'ajoute pas les lignes à 0 : ce ne sont pas des commandes, seulement
      // des curseurs revenus à zéro.
      if (Number(quantite) > 0) constructeur.ajouterLigne(idProduit, Number(quantite));
    }
    return constructeur.build();
  }, [produits, client, quantites]);

  const lignes = construction.lignes;

  const total = useMemo(
    () =>
      lignes.reduce((somme, ligne) => {
        const produit = produits.find((p) => p.id === ligne.idProduit);
        return produit ? somme + produit.prix * ligne.quantite : somme;
      }, 0),
    [lignes, produits],
  );

  const recapitulatif = useMemo(
    () =>
      (commandeEnregistree?.lignes ?? []).map((ligne) => ({
        ...ligne,
        produit: produits.find((p) => p.id === ligne.idProduit),
      })),
    [commandeEnregistree, produits],
  );

  const erreurs = rapport?.erreurs ?? {};
  const erreursParProduit = rapport?.erreursParProduit ?? {};

  /** Toute modification ramène le formulaire à « en cours de saisie », donc sans message. */
  function apresModification(nouveauClient, nouvellesQuantites) {
    setRapport(null);
    setCommandeEnregistree(null);
    setStatut((precedent) =>
      statutApresSaisie(precedent, {
        formulaireVide: formulaireEstVide(nouveauClient, nouvellesQuantites),
      }),
    );
  }

  function changerChampClient(champ, valeur) {
    const suivant = { ...client, [champ]: valeur };
    setClient(suivant);
    apresModification(suivant, quantites);
  }

  function changerQuantite(idProduit, quantite) {
    const suivantes = { ...quantites, [idProduit]: quantite };
    setQuantites(suivantes);
    apresModification(client, suivantes);
  }

  function soumettre(evenement) {
    evenement.preventDefault();

    // 1. Le Builder juge l'objet qu'il a assemblé. S'il est incomplet, la machine à
    //    états passe en « Invalide » : c'est cet état qui fait apparaître les messages.
    if (!construction.valide) {
      setRapport(construction);
      setStatut((precedent) => statutApresSoumission(precedent, { valide: false }));
      return;
    }

    // 2. Le store revalide (dernier rempart) et enregistre la commande.
    const resultat = enregistrerCommande(construction.formulaire);
    if (!resultat.valide) {
      setRapport(resultat);
      setStatut((precedent) => statutApresSoumission(precedent, { valide: false }));
      return;
    }

    // 3. Chemin nominal : le stock a changé, les deux autres pages suivront.
    setRapport(null);
    setCommandeEnregistree(resultat.commande);
    setStatut((precedent) => statutApresSoumission(precedent, { valide: true }));
    setClient(CLIENT_VIDE);
    setQuantites({});
  }

  function repartirDeZero() {
    setCommandeEnregistree(null);
    setStatut((precedent) => statutApresNouvelleCommande(precedent));
  }

  return (
    <>
      <header className="entete-page d-flex justify-content-between align-items-start">
        <div>
          <h1>Commande</h1>
          <p className="sous-titre mb-0">
            Les quantités proposées sont limitées au stock disponible.
          </p>
        </div>
        {/* La machine à états est visible : c'est elle qui décide de ce qui s'affiche */}
        <span className="badge text-bg-light border" data-testid="statut-commande">
          {statut}
        </span>
      </header>

      {afficheLaConfirmation(statut) && commandeEnregistree ? (
        <div className="alert alert-success">
          <div className="d-flex justify-content-between align-items-start gap-3">
            <div>
              <strong>Commande {commandeEnregistree.id} enregistrée.</strong> Le stock
              des produits concernés a été mis à jour, et le tableau de bord en tient
              compte.
              <ul className="mb-0 mt-2">
                {recapitulatif.map((ligne) => (
                  <li key={ligne.idProduit}>
                    {ligne.quantite} × {ligne.produit?.nom ?? ligne.idProduit} —{" "}
                    {formaterPrix((ligne.produit?.prix ?? 0) * ligne.quantite)}
                  </li>
                ))}
              </ul>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-outline-success text-nowrap"
              onClick={repartirDeZero}
            >
              Nouvelle commande
            </button>
          </div>
        </div>
      ) : null}

      {afficheLesErreurs(statut) && rapport ? (
        <div className="alert alert-danger">
          <strong>La commande n'a pas été enregistrée.</strong>
          <ul className="mb-0 mt-2">
            {Object.entries(erreurs).map(([champ, message]) => (
              <li key={champ}>{message}</li>
            ))}
            {Object.entries(erreursParProduit).map(([idProduit, message]) => (
              <li key={idProduit}>{message}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <form onSubmit={soumettre} noValidate>
        {/* --- 1. Le client ---------------------------------------------- */}
        <div className="card mb-3">
          <div className="card-header bg-white fw-semibold">Client</div>
          <div className="card-body">
            <div className="row g-3">
              <div className="col-12 col-md-4">
                <label className="form-label" htmlFor="client-nom">
                  Nom
                </label>
                <input
                  id="client-nom"
                  type="text"
                  className={`form-control ${erreurs.nom ? "is-invalid" : ""}`}
                  value={client.nom}
                  onChange={(evenement) => changerChampClient("nom", evenement.target.value)}
                />
                {erreurs.nom ? <div className="invalid-feedback">{erreurs.nom}</div> : null}
              </div>

              <div className="col-12 col-md-4">
                <label className="form-label" htmlFor="client-prenom">
                  Prénom
                </label>
                <input
                  id="client-prenom"
                  type="text"
                  className={`form-control ${erreurs.prenom ? "is-invalid" : ""}`}
                  value={client.prenom}
                  onChange={(evenement) => changerChampClient("prenom", evenement.target.value)}
                />
                {erreurs.prenom ? (
                  <div className="invalid-feedback">{erreurs.prenom}</div>
                ) : null}
              </div>

              <div className="col-12 col-md-4">
                <label className="form-label" htmlFor="client-email">
                  Adresse mail
                </label>
                <input
                  id="client-email"
                  type="email"
                  className={`form-control ${erreurs.email ? "is-invalid" : ""}`}
                  value={client.email}
                  onChange={(evenement) => changerChampClient("email", evenement.target.value)}
                />
                {erreurs.email ? <div className="invalid-feedback">{erreurs.email}</div> : null}
              </div>
            </div>
          </div>
        </div>

        {/* --- 2. Les produits ------------------------------------------- */}
        <div className="card mb-3">
          <div className="card-header bg-white d-flex justify-content-between align-items-center">
            <span className="fw-semibold">Produits</span>
            <span className="small text-muted">
              {lignes.length} ligne{lignes.length > 1 ? "s" : ""} · total {formaterPrix(total)}
            </span>
          </div>

          {erreurs.lignes ? (
            <div className="alert alert-warning m-3 mb-0">{erreurs.lignes}</div>
          ) : null}

          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th scope="col">Produit</th>
                  <th scope="col" className="text-end">Prix</th>
                  <th scope="col" className="text-end">Stock</th>
                  <th scope="col">Quantité</th>
                  <th scope="col" className="text-end">Sous-total</th>
                </tr>
              </thead>
              <tbody>
                {produits.map((produit) => (
                  <LigneCommande
                    key={produit.id}
                    produit={produit}
                    quantite={quantites[produit.id] ?? 0}
                    onQuantiteChange={changerQuantite}
                    erreur={erreursParProduit[produit.id] ?? null}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="d-flex justify-content-end align-items-center gap-3">
          <span className="fw-semibold">Total : {formaterPrix(total)}</span>
          <button type="submit" className="btn btn-primary">
            Valider la commande
          </button>
        </div>
      </form>
    </>
  );
}
