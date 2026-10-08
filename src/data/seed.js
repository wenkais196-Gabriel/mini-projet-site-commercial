/* =============================================================================
   seed.js — SOURCE DE VÉRITÉ UNIQUE des données.
   Le sujet impose des données « en dur » (pas de serveur). Le reste de
   l'application ne lit JAMAIS ce fichier directement : tout passe par le store
   (src/store/DataContext.jsx). C'est ce qui permet à une commande passée page
   Commande de modifier l'affichage des pages Produits et Accueil.
   ========================================================================== */

/** @typedef {{ id: string, nom: string, categorie: string, prix: number, quantite: number, seuil: number }} Produit */
/** @typedef {{ idProduit: string, quantite: number }} Ligne */
/** @typedef {{ id: string, date: string, client: { nom: string, prenom: string, email: string }, lignes: Ligne[] }} Commande */

/** Catégories connues (sert à la liste déroulante de filtres). */
export const CATEGORIES = ["Fruit", "Légume", "Boisson"];

/* Noter les cas volontairement variés pour la démonstration :
   - P02 / P07 / P09 / P13 : quantité AU-DESSUS de 0 mais ≤ seuil → alerte
   - P03 : quantité = 0 → rupture
   - P05 : quantité EXACTEMENT égale au seuil → cas limite (voir README, choix « ≤ »)
   @type {Produit[]} */
export const PRODUITS_INITIAUX = [
  { id: "P01", nom: "Banane", categorie: "Fruit", prix: 2.4, quantite: 42, seuil: 15 },
  { id: "P02", nom: "Pomme", categorie: "Fruit", prix: 1.6, quantite: 8, seuil: 20 },
  { id: "P03", nom: "Cerise", categorie: "Fruit", prix: 3.4, quantite: 0, seuil: 10 },
  { id: "P04", nom: "Kiwi", categorie: "Fruit", prix: 4.55, quantite: 35, seuil: 12 },
  { id: "P05", nom: "Orange", categorie: "Fruit", prix: 2.1, quantite: 12, seuil: 12 },
  { id: "P06", nom: "Carotte", categorie: "Légume", prix: 1.2, quantite: 60, seuil: 25 },
  { id: "P07", nom: "Chou", categorie: "Légume", prix: 4.5, quantite: 14, seuil: 30 },
  { id: "P08", nom: "Céleri", categorie: "Légume", prix: 2.9, quantite: 45, seuil: 15 },
  { id: "P09", nom: "Courgette", categorie: "Légume", prix: 1.95, quantite: 5, seuil: 18 },
  { id: "P10", nom: "Poivron", categorie: "Légume", prix: 3.75, quantite: 22, seuil: 10 },
  { id: "P11", nom: "Limonade", categorie: "Boisson", prix: 1.8, quantite: 28, seuil: 12 },
  { id: "P12", nom: "Eau minérale", categorie: "Boisson", prix: 0.2, quantite: 90, seuil: 20 },
  { id: "P13", nom: "Jus d'orange", categorie: "Boisson", prix: 2.6, quantite: 3, seuil: 15 },
];

/* Commandes historiques : elles existent pour que la page Accueil ne démarre pas
   à zéro. Les quantités ci-dessus sont réputées DÉJÀ décrémentées de ces commandes.
   @type {Commande[]} */
export const COMMANDES_INITIALES = [
  {
    id: "C001",
    date: "2026-09-28",
    client: { nom: "Dupont", prenom: "Marie", email: "marie.dupont@exemple.fr" },
    lignes: [
      { idProduit: "P01", quantite: 2 },
      { idProduit: "P12", quantite: 6 },
    ],
  },
  {
    id: "C002",
    date: "2026-10-01",
    client: { nom: "Martin", prenom: "Louis", email: "louis.martin@exemple.fr" },
    lignes: [
      { idProduit: "P06", quantite: 3 },
      { idProduit: "P07", quantite: 1 },
    ],
  },
  {
    id: "C003",
    date: "2026-10-05",
    client: { nom: "Benali", prenom: "Amine", email: "amine.benali@exemple.fr" },
    lignes: [{ idProduit: "P11", quantite: 4 }],
  },
];
