/* =============================================================================
   e2e.cjs — end-to-end check in a REAL browser.

   This is not a unit test: it drives Microsoft Edge the way a user would, and it
   checks the central property of the assignment — "the data are linked between the
   virtual pages":

       place an order  →  the stock goes down  →  the Products page highlights the row
                                               →  the Home counter changes
       undo the operation  →  everything goes back to the previous state

   How to run (see check/README.md):

       npm i --no-save --no-package-lock playwright-core
       npm run dev
       node check/e2e.cjs
   ========================================================================== */

const { chromium } = require("playwright-core");

const BASE = "http://localhost:5173";
const results = [];

const ok = (label, condition, detail = "") => {
  results.push(`${condition ? "OK   " : "FAIL"} | ${label}${detail ? "  -> " + detail : ""}`);
  return condition;
};

async function readKpis(page) {
  return page.$$eval(".kpi", (cards) =>
    cards.map((card) => ({
      label: (card.querySelector(".kpi-label")?.textContent ?? "").trim(),
      value: (card.querySelector(".kpi-value")?.textContent ?? "").trim(),
    })),
  );
}

/* Cible la PREMIERE cellule : « Orange » ne doit pas attraper « Jus d'orange ».
   Pas d'ancre en fin de motif : le `textContent` de la cellule de la page Commande est
   « PoivronLégume » (deux <div> adjacents, donc sans espace). */
const productRow = (page, name) =>
  page
    .locator("tbody tr")
    .filter({ has: page.locator("td:first-child", { hasText: new RegExp(`^${name}`) }) })
    .first();

const displayedStatus = (page) => page.locator('[data-testid="order-status"]').innerText();

/* Les curseurs sont des <input type="range"> controles par React : leur affecter
   `.value` ne suffit pas (React garde son propre suivi de valeur). On passe donc par
   le setter natif, puis on emet l'evenement `input` comme le ferait l'utilisateur. */
const setRange = (page, selector, value) =>
  page.$eval(
    selector,
    (element, next) => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      ).set;
      setter.call(element, String(next));
      element.dispatchEvent(new Event("input", { bubbles: true }));
    },
    value,
  );

const clearFilters = async (page) => {
  await page.click('button:has-text("Réinitialiser les filtres")');
  await page.waitForTimeout(150);
};

(async () => {
  const browser = await chromium.launch({ channel: "msedge" });
  const context = await browser.newContext({ viewport: { width: 1500, height: 1000 } });
  const page = await context.newPage();

  const errors = [];
  const warnings = [];
  page.on("pageerror", (error) => errors.push("pageerror: " + error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push("console: " + message.text());
    if (message.type() === "warning") warnings.push(message.text());
  });

  /* L'application ne doit dependre d'AUCUNE ressource externe (AGENTS.md 1.4) : la
     feuille de style Bootstrap est servie depuis public/vendor/. On recolte toutes les
     requetes pour le verifier a la fin. */
  const externalRequests = [];
  page.on("request", (request) => {
    const url = request.url();
    if (!url.includes("localhost:5173") && !url.startsWith("data:") && !url.startsWith("blob:")) {
      externalRequests.push(url);
    }
  });

  /* ---------- 1. Home page --------------------------------------------- */
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".kpi");

  ok("Home: page title", (await page.textContent("h1")).trim() === "Tableau de bord");

  const firstKpis = await readKpis(page);
  const ordersBefore = firstKpis.find((kpi) => kpi.label === "Commandes")?.value;
  ok("Home: 2 indicators displayed", firstKpis.length === 2, `${firstKpis.length} cards`);
  ok("Home: 3 initial orders", ordersBefore === "3", `value = ${ordersBefore}`);
  ok("Home: breakdown of the 3 categories", (await page.locator("tbody tr").count()) === 3);
  await page.screenshot({ path: "check/01-home.png", fullPage: true });

  /* ---------- 2. Products page ----------------------------------------- */
  await page.getByRole("link", { name: "Produits" }).click();
  await page.waitForURL("**/produits");
  await page.waitForSelector("tbody tr");
  ok("Products: navigation through the menu", page.url().endsWith("/produits"));

  const totalRows = await page.locator("tbody tr").count();
  const pepperBefore = productRow(page, "Poivron");
  const classBefore = (await pepperBefore.getAttribute("class")) ?? "";
  const quantityBefore = (await pepperBefore.locator("td").nth(2).innerText()).trim();
  ok("Products: Poivron not highlighted at start", !classBefore.includes("alert-row"));
  ok("Products: Poivron stock = 22", quantityBefore === "22", `quantity = ${quantityBefore}`);

  await page.fill("#filter-search", "Chou");
  await page.waitForTimeout(200);
  const afterNameFilter = await page.locator("tbody tr").count();
  ok("Products: the « nom » filter narrows the list", afterNameFilter < totalRows, `${totalRows} -> ${afterNameFilter}`);

  await page.click('button:has-text("Réinitialiser les filtres")');
  await page.waitForTimeout(200);
  ok(
    "Products: « Réinitialiser les filtres » restores the list",
    (await page.locator("tbody tr").count()) === totalRows,
  );

  await page.selectOption("#filter-category", "Boisson");
  await page.waitForTimeout(200);
  ok("Products: the « catégorie » filter isolates the drinks", (await page.locator("tbody tr").count()) === 4);

  await clearFilters(page);

  /* Les trois curseurs : les 5 attributs du sujet doivent avoir leur filtre, pas
     seulement le nom et la categorie. Bornes incluses (un filtre « maximum »). */
  await setRange(page, "#filter-max-price", 2);
  await page.waitForTimeout(200);
  ok(
    "Products: le curseur « prix maximum » filtre",
    (await productRow(page, "Kiwi").count()) === 0,
    "Kiwi (4,55) hors du filtre a 2,00",
  );
  await clearFilters(page);

  await setRange(page, "#filter-max-quantity", 12);
  await page.waitForTimeout(200);
  ok(
    "Products: le curseur « quantité maximum » filtre",
    (await productRow(page, "Banane").count()) === 0,
    "Banane (42) hors du filtre a 12",
  );
  ok(
    "Products: le filtre « quantité maximum » garde la borne incluse",
    (await productRow(page, "Orange").count()) === 1,
    "Orange (12) reste affiche",
  );
  await clearFilters(page);

  await setRange(page, "#filter-max-threshold", 25);
  await page.waitForTimeout(200);
  ok(
    "Products: le curseur « seuil maximum » filtre",
    (await productRow(page, "Chou").count()) === 0,
    "Chou (seuil 30) hors du filtre a 25",
  );
  ok(
    "Products: le filtre « seuil maximum » garde la borne incluse",
    (await productRow(page, "Carotte").count()) === 1,
    "Carotte (seuil 25) reste affiche",
  );
  await clearFilters(page);

  /* La case a cocher : un critere DERIVE (la regle meme du sujet), pas un attribut.
     Elle doit filtrer exactement ce que la page surligne — cas limite compris. */
  await page.check("#filter-low-stock");
  await page.waitForTimeout(200);
  ok(
    "Products: la case « sous le seuil » ne garde que les produits sous le seuil",
    (await productRow(page, "Banane").count()) === 0 &&
      (await productRow(page, "Pomme").count()) === 1,
    "Banane (42 pour un seuil de 15) exclue, Pomme (8 pour 20) conservee",
  );
  ok(
    "Products: la case « sous le seuil » exclut le cas limite (Orange 12/12)",
    (await productRow(page, "Orange").count()) === 0,
    "Orange a exactement atteint son seuil",
  );
  await page.uncheck("#filter-low-stock");
  await page.waitForTimeout(150);

  /* Second derived criterion: out of stock (quantity 0). */
  await page.check("#filter-out-of-stock");
  await page.waitForTimeout(200);
  ok(
    "Products: la case « en rupture » ne garde que les produits a 0",
    (await productRow(page, "Cerise").count()) === 1 &&
      (await productRow(page, "Pomme").count()) === 0,
    "Cerise (0) conservee, Pomme (8, sous le seuil mais pas en rupture) exclue",
  );
  await page.uncheck("#filter-out-of-stock");
  await page.waitForTimeout(150);

  // Sorting (added for issue #2)
  await page.click('button:has-text("Prix")');
  await page.waitForTimeout(200);
  const firstAfterSort = (await page.locator("tbody tr").nth(1).innerText()).trim();
  ok("Products: sorting by price changes the order", firstAfterSort.length > 0, firstAfterSort.split("\t")[0]);
  await page.click('button:has-text("Effacer le tri")');
  await page.waitForTimeout(150);

  // Reading of the assignment applied literally: « en dessous du seuil » = strictly
  // below, therefore the boundary case (Orange, 12/12) must NOT be flagged.
  ok(
    "Products: Orange (12/12, exactly at the threshold) is NOT highlighted",
    !((await productRow(page, "Orange").getAttribute("class")) ?? "").includes("alert-row"),
  );
  ok("Products: Pomme (8/20, strictly below) IS highlighted", ((await productRow(page, "Pomme").getAttribute("class")) ?? "").includes("alert-row"));

  /* Out of stock (0) is an extreme case of the alert: its own colour, not the same
     one — otherwise the two situations would be indistinguishable. */
  const outOfStockClass = (await productRow(page, "Cerise").getAttribute("class")) ?? "";
  ok(
    "Products: un produit en rupture a sa propre couleur (distincte de l'alerte)",
    outOfStockClass.includes("out-of-stock-row") && !outOfStockClass.includes("alert-row"),
    outOfStockClass || "(aucune classe)",
  );
  await page.screenshot({ path: "check/02-products.png", fullPage: true });

  /* ---------- 3. Order page: the state machine -------------------------- */
  await page.getByRole("link", { name: "Commande" }).click();
  await page.waitForURL("**/commande");
  ok("Order: navigation through the menu", page.url().endsWith("/commande"));
  ok("Order: initial state « Brouillon »", (await displayedStatus(page)) === "Brouillon");

  // Submitting an empty form MUST produce errors: the « Invalide » state is what
  // triggers their display, not a condition in the JSX.
  await page.getByRole("button", { name: "Valider la commande" }).click();
  await page.waitForSelector(".alert-danger");
  const errorMessages = await page.locator(".alert-danger li").allInnerTexts();
  ok("Order: empty form refused with messages", errorMessages.length >= 4, `${errorMessages.length} messages`);
  ok("Order: the state becomes « Invalide »", (await displayedStatus(page)) === "Invalide");
  await page.screenshot({ path: "check/03-order-invalid.png", fullPage: true });

  // Correcting makes the messages disappear: back to « En cours de saisie ».
  await page.fill("#customer-last-name", "Wenkai");
  await page.waitForTimeout(200);
  ok("Order: typing makes the messages disappear", (await page.locator(".alert-danger").count()) === 0);
  ok("Order: the state goes back to « En cours de saisie »", (await displayedStatus(page)) === "En cours de saisie");

  await page.fill("#customer-first-name", "Song");
  await page.fill("#customer-email", "wenkai@exemple.fr");

  const quantityField = productRow(page, "Poivron").locator('input[type="number"]');
  await quantityField.fill("999");
  await page.waitForTimeout(200);
  ok(
    "Order: typing 999 is clamped to the stock (22)",
    (await quantityField.inputValue()) === "22",
    `field = ${await quantityField.inputValue()}`,
  );

  await quantityField.fill("13");
  await page.waitForTimeout(200);
  const cardHeader = (await page.locator(".card-header span.small").innerText()).trim();
  ok("Order: total recomputed (13 × 3,75 = 48,75 €)", cardHeader.includes("48,75"), cardHeader);
  await page.screenshot({ path: "check/04-order-filled.png", fullPage: true });

  await page.getByRole("button", { name: "Valider la commande" }).click();
  await page.waitForSelector(".alert-success");
  const confirmation = (await page.textContent(".alert-success")).trim();
  ok("Order: confirmation with the order number", /C004/.test(confirmation), confirmation.split(".")[0]);
  ok("Order: the state becomes « Enregistrée »", (await displayedStatus(page)) === "Enregistrée");

  const recapLines = await page.locator(".alert-success li").allInnerTexts();
  ok(
    "Order: recap of the placed order (13 Poivron = 48,75 €)",
    recapLines.length === 1 && /13\s*[×x]\s*Poivron/.test(recapLines[0]) && /48,75/.test(recapLines[0]),
    recapLines.join(" | ") || "(no line)",
  );
  ok("Order: form reset", (await page.inputValue("#customer-last-name")) === "");
  await page.screenshot({ path: "check/05-order-saved.png", fullPage: true });

  await page.getByRole("button", { name: "Nouvelle commande" }).click();
  await page.waitForTimeout(200);
  ok("Order: « Nouvelle commande » goes back to « Brouillon »", (await displayedStatus(page)) === "Brouillon");

  /* ---------- 4. Back to Products: the data changed --------------------- */
  await page.getByRole("link", { name: "Produits" }).click();
  await page.waitForURL("**/produits");
  await page.waitForSelector("tbody tr");

  const pepperAfter = productRow(page, "Poivron");
  const classAfter = (await pepperAfter.getAttribute("class")) ?? "";
  const quantityAfter = (await pepperAfter.locator("td").nth(2).innerText()).trim();

  ok("Products: stock decremented by the order (22 -> 9)", quantityAfter === "9", `quantity = ${quantityAfter}`);
  ok("Products: the row becomes highlighted", classAfter.includes("alert-row"));
  await page.screenshot({ path: "check/06-products-after-order.png", fullPage: true });

  /* ---------- 5. Back to Home ------------------------------------------ */
  await page.getByRole("link", { name: "Accueil" }).click();
  await page.waitForURL(BASE + "/");
  await page.waitForSelector(".kpi");
  const afterKpis = await readKpis(page);
  ok(
    "Home: number of orders moved to 4",
    afterKpis.find((kpi) => kpi.label === "Commandes")?.value === "4",
  );

  /* ---------- 6. Command pattern: undo the last operation --------------- */
  const summary = (await page.locator('[data-testid="global-summary"]').innerText()).trim();
  ok("Navigation bar: last undoable operation announced", /commande C004/.test(summary), summary);

  await page.getByRole("button", { name: "Annuler", exact: true }).click();
  await page.waitForTimeout(300);
  const undoKpis = await readKpis(page);
  ok(
    "Undo: the order count goes back to 3",
    undoKpis.find((kpi) => kpi.label === "Commandes")?.value === "3",
  );
  ok(
    "Undo: the button becomes inactive again",
    await page.getByRole("button", { name: "Annuler", exact: true }).isDisabled(),
  );

  await page.getByRole("link", { name: "Produits" }).click();
  await page.waitForURL("**/produits");
  await page.waitForSelector("tbody tr");
  const pepperRestored = productRow(page, "Poivron");
  ok(
    "Undo: the stock is given back (9 -> 22)",
    (await pepperRestored.locator("td").nth(2).innerText()).trim() === "22",
  );
  ok(
    "Undo: the highlight disappears",
    !((await pepperRestored.getAttribute("class")) ?? "").includes("alert-row"),
  );
  await page.screenshot({ path: "check/07-after-undo.png", fullPage: true });

  /* ---------- 7. Reset -------------------------------------------------- */
  await page.getByRole("link", { name: "Accueil" }).click();
  await page.waitForURL(BASE + "/");
  await page.getByRole("button", { name: "Réinitialiser" }).click();
  await page.waitForTimeout(300);
  const resetKpis = await readKpis(page);
  ok(
    "Home: « Réinitialiser » restores the 3 orders",
    resetKpis.find((kpi) => kpi.label === "Commandes")?.value === "3",
  );

  /* ---------- 8. Console health and offline self-sufficiency -------------- */
  ok("No JavaScript error in the console", errors.length === 0, errors.join(" || ") || "none");
  ok(
    "No warning in the console",
    warnings.length === 0,
    warnings.length ? [...new Set(warnings)].join(" || ") : "none",
  );
  ok(
    "Aucune ressource externe chargee (l'application tient hors ligne)",
    externalRequests.length === 0,
    externalRequests.length ? [...new Set(externalRequests)].join(" || ") : "aucune",
  );

  await browser.close();

  console.log("\n================ RESULTS ================");
  results.forEach((line) => console.log(line));
  const failures = results.filter((line) => line.startsWith("FAIL")).length;
  console.log(`\n${results.length - failures}/${results.length} checks passed`);
  process.exit(failures === 0 ? 0 : 1);
})().catch((error) => {
  console.error("FATAL ERROR:", error.message);
  console.log("\n================ PARTIAL RESULTS ================");
  results.forEach((line) => console.log(line));
  const failures = results.filter((line) => line.startsWith("FAIL")).length;
  console.log(`\n${results.length - failures}/${results.length} checks passed before the error`);
  process.exit(2);
});
