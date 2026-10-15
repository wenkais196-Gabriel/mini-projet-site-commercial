/* =============================================================================
   seed.js — SOURCE OF TRUTH for the data.

   The assignment requires hard-coded data (no server). The rest of the
   application NEVER reads this file directly: everything goes through the store
   (src/store/DataContext.jsx). That is what allows an order placed on the Order
   page to change what the Products and Home pages display.

   Note: field NAMES are English (code rule), but the data VALUES stay French —
   they are what the user reads on screen.
   ========================================================================== */

/** @typedef {{ id: string, name: string, category: string, price: number, quantity: number, threshold: number }} Product */
/** @typedef {{ productId: string, quantity: number }} OrderLine */
/** @typedef {{ id: string, date: string, customer: { firstName: string, lastName: string, email: string }, lines: OrderLine[] }} Order */

/** Known categories (used by the filter drop-down). */
export const CATEGORIES = ["Fruit", "Légume", "Boisson"];

/* The cases below are deliberately varied so the UI can be demonstrated:
   - P02 / P03 / P07 / P09 / P13 : quantity STRICTLY below the threshold → highlighted
   - P03                        : quantity = 0                      → out of stock
   - P05                        : quantity EXACTLY equal to threshold → boundary case,
                                  deliberately NOT highlighted (the assignment says
                                  "en dessous du seuil")
   @type {Product[]} */
export const INITIAL_PRODUCTS = [
  { id: "P01", name: "Banane", category: "Fruit", price: 2.4, quantity: 42, threshold: 15 },
  { id: "P02", name: "Pomme", category: "Fruit", price: 1.6, quantity: 8, threshold: 20 },
  { id: "P03", name: "Cerise", category: "Fruit", price: 3.4, quantity: 0, threshold: 10 },
  { id: "P04", name: "Kiwi", category: "Fruit", price: 4.55, quantity: 35, threshold: 12 },
  { id: "P05", name: "Orange", category: "Fruit", price: 2.1, quantity: 12, threshold: 12 },
  { id: "P06", name: "Carotte", category: "Légume", price: 1.2, quantity: 60, threshold: 25 },
  { id: "P07", name: "Chou", category: "Légume", price: 4.5, quantity: 14, threshold: 30 },
  { id: "P08", name: "Céleri", category: "Légume", price: 2.9, quantity: 45, threshold: 15 },
  { id: "P09", name: "Courgette", category: "Légume", price: 1.95, quantity: 5, threshold: 18 },
  { id: "P10", name: "Poivron", category: "Légume", price: 3.75, quantity: 22, threshold: 10 },
  { id: "P11", name: "Limonade", category: "Boisson", price: 1.8, quantity: 28, threshold: 12 },
  { id: "P12", name: "Eau minérale", category: "Boisson", price: 0.2, quantity: 90, threshold: 20 },
  { id: "P13", name: "Jus d'orange", category: "Boisson", price: 2.6, quantity: 3, threshold: 15 },
];

/* Past orders: they exist so the Home page does not start at zero.
   The quantities above are considered ALREADY decremented by these orders.
   @type {Order[]} */
export const INITIAL_ORDERS = [
  {
    id: "C001",
    date: "2026-09-28",
    customer: { firstName: "Marie", lastName: "Dupont", email: "marie.dupont@exemple.fr" },
    lines: [
      { productId: "P01", quantity: 2 },
      { productId: "P12", quantity: 6 },
    ],
  },
  {
    id: "C002",
    date: "2026-10-01",
    customer: { firstName: "Louis", lastName: "Martin", email: "louis.martin@exemple.fr" },
    lines: [
      { productId: "P06", quantity: 3 },
      { productId: "P07", quantity: 1 },
    ],
  },
  {
    id: "C003",
    date: "2026-10-05",
    customer: { firstName: "Amine", lastName: "Benali", email: "amine.benali@exemple.fr" },
    lines: [{ productId: "P11", quantity: 4 }],
  },
];
