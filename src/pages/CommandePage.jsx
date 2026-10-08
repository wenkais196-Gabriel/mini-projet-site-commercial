/* =============================================================================
   CommandePage — formulaire de commande.

   Deux responsabilités, dans cet ordre :
     1. SÉLECTION : quels produits, en quelles quantités. La contrainte « respecter
        la quantité disponible » est garantie à la source par SelecteurQuantite
        (borné à [0, stock]), jamais par un message d'erreur après coup ;
     2. SAISIE DU CLIENT + VALIDATION : c'est le store qui valide
        (validerCommande), car la règle doit être la même des deux côtés du mur.

   Ce composant ne modifie jamais les produits : il DEMANDE au store d'enregistrer
   la commande. La décrémentation du stock est un effet de bord du store, pas du
   formulaire (le formulaire ne sait même pas qu'il y a un stock à décrémenter).

   TODO (responsable : __) — améliorations attendues :
     - mise en forme du formulaire (regroupement, aide à la saisie) ;
     - message de confirmation enrichi (récapitulatif de la commande passée) ;
     - éventuellement : proposer « commander à nouveau » à partir d'une commande
       existante (piste Builder pour la partie 2).
   ========================================================================== */

import { useMemo, useState } from "react";
import { LigneCommande } from "../components/commande/LigneCommande.jsx";
import { useData } from "../store/DataContext.jsx";
import { formaterPrix } from "../store/selecteurs.js";

const CLIENT_VIDE = { nom: "", prenom: "", email: "" };

export function CommandePage() {
  const { produits, validerCommande } = useData();

  const [client, setClient] = useState(CLIENT_VIDE);
  /* Les quantités vivent ICI et pas dans LigneCommande : le total et la
     validation ont besoin de la commande entière. Un état par ligne rendrait ce
     calcul impossible sans remonter chaque valeur. */
  const [quantites, setQuantites] = useState({});
  const [rapport, setRapport] = useState(null);
  const [confirmation, setConfirmation] = useState(null);

  /** Ne garder que les lignes réellement commandées : c'est l'objet « commande »
      qui sera transmis au store. */
  const lignes = useMemo(
    () =>
      Object.entries(quantites)
        .map(([idProduit, quantite]) => ({ idProduit, quantite: Number(quantite) }))
        .filter((ligne) => ligne.quantite > 0),
    [quantites],
  );

  const total = useMemo(
    () =>
      lignes.reduce((somme, ligne) => {
        const produit = produits.find((p) => p.id === ligne.idProduit);
        return produit ? somme + produit.prix * ligne.quantite : somme;
      }, 0),
    [lignes, produits],
  );

  function changerChampClient(champ, valeur) {
    setClient((precedent) => ({ ...precedent, [champ]: valeur }));
    setRapport(null);
  }

  function changerQuantite(idProduit, quantite) {
    setQuantites((precedentes) => ({ ...precedentes, [idProduit]: quantite }));
    setRapport(null);
  }

  function soumettre(evenement) {
    evenement.preventDefault();
    const resultat = validerCommande({ ...client, lignes });
    setRapport(resultat);

    if (resultat.valide) {
      setConfirmation(resultat.commande);
      setClient(CLIENT_VIDE);
      setQuantites({});
    }
  }

  const erreurs = rapport?.erreurs ?? {};
  const erreursParProduit = rapport?.erreursParProduit ?? {};

  return (
    <>
      <header className="entete-page">
        <h1>Commande</h1>
        <p className="sous-titre mb-0">
          Les quantités proposées sont limitées au stock disponible.
        </p>
      </header>

      {confirmation ? (
        <div className="alert alert-success">
          <strong>Commande {confirmation.id} enregistrée.</strong> Le stock des
          produits concernés a été mis à jour et le tableau de bord en tient compte.
        </div>
      ) : null}

      {rapport && !rapport.valide ? (
        <div className="alert alert-danger">
          <strong>La commande n'a pas été enregistrée.</strong>
          <ul className="mb-0 mt-2">
            {Object.values(erreurs).map((message) => (
              <li key={message}>{message}</li>
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
          <button type="submit" className="btn btn-primary" disabled={lignes.length === 0}>
            Valider la commande
          </button>
        </div>
      </form>
    </>
  );
}
