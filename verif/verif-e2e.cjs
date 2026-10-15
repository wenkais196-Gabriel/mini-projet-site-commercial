/* =============================================================================
   verif-e2e.cjs — vérification de bout en bout dans un VRAI navigateur.

   Ce n'est pas un test unitaire : il pilote Microsoft Edge comme le ferait un
   utilisateur, et il vérifie la propriété centrale du sujet — « les données sont
   liées entre les pages virtuelles » :

       passer une commande  →  le stock baisse  →  la page Produits surligne
                                                 →  le compteur de l'Accueil change
       annuler l'opération  →  tout revient dans l'état précédent

   Lancement (voir verif/README.md) :

       npm i --no-save --no-package-lock playwright-core
       npm run dev
       node verif/verif-e2e.cjs
   ========================================================================== */

const { chromium } = require("playwright-core");

const BASE = "http://localhost:5173";
const resultats = [];

const ok = (label, condition, detail = "") => {
  resultats.push(`${condition ? "OK   " : "ECHEC"} | ${label}${detail ? "  -> " + detail : ""}`);
  return condition;
};

async function lireKpis(page) {
  return page.$$eval(".kpi", (cartes) =>
    cartes.map((carte) => ({
      libelle: (carte.querySelector(".kpi-libelle")?.textContent ?? "").trim(),
      valeur: (carte.querySelector(".kpi-valeur")?.textContent ?? "").trim(),
    })),
  );
}

const ligneProduit = (page, nom) => page.locator("tbody tr").filter({ hasText: nom }).first();

/* Les libellés sont accentués : on compare sans accents pour que la vérification
   ne dépende pas du clavier de celui qui l'écrit. */
const sansAccent = (texte) =>
  texte.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const statutAffiche = (page) => page.locator('[data-testid="statut-commande"]').innerText();

(async () => {
  const navigateur = await chromium.launch({ channel: "msedge" });
  const contexte = await navigateur.newContext({ viewport: { width: 1500, height: 1000 } });
  const page = await contexte.newPage();

  const erreurs = [];
  const avertissements = [];
  page.on("pageerror", (e) => erreurs.push("pageerror: " + e.message));
  page.on("console", (m) => {
    if (m.type() === "error") erreurs.push("console: " + m.text());
    if (m.type() === "warning") avertissements.push(m.text());
  });

  /* ---------- 1. Page Accueil ------------------------------------------- */
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".kpi");

  ok("Accueil : titre de la page", (await page.textContent("h1")).trim() === "Tableau de bord");

  const kpiAvant = await lireKpis(page);
  const commandesAvant = kpiAvant.find((k) => k.libelle === "Commandes")?.valeur;
  ok("Accueil : 4 indicateurs affichés", kpiAvant.length === 4, `${kpiAvant.length} cartes`);
  ok("Accueil : 3 commandes initiales", commandesAvant === "3", `valeur = ${commandesAvant}`);
  ok(
    "Accueil : synthèse des 3 catégories",
    (await page.locator("tbody tr").count()) === 3,
  );
  await page.screenshot({ path: "verif/01-accueil.png", fullPage: true });

  /* ---------- 2. Page Produits ------------------------------------------ */
  await page.getByRole("link", { name: "Produits" }).click();
  await page.waitForURL("**/produits");
  await page.waitForSelector("tbody tr");
  ok("Produits : navigation par le menu", page.url().endsWith("/produits"));

  const totalLignes = await page.locator("tbody tr").count();
  const poivronAvant = ligneProduit(page, "Poivron");
  const classeAvant = (await poivronAvant.getAttribute("class")) ?? "";
  const qteAvant = (await poivronAvant.locator("td").nth(3).innerText()).trim();
  ok("Produits : Poivron non surligné au départ", !classeAvant.includes("ligne-alerte"));
  ok("Produits : stock Poivron = 22", qteAvant === "22", `quantité = ${qteAvant}`);

  await page.fill("#filtre-nom", "Chou");
  await page.waitForTimeout(200);
  const apresFiltre = await page.locator("tbody tr").count();
  ok("Produits : le filtre « nom » réduit la liste", apresFiltre < totalLignes, `${totalLignes} -> ${apresFiltre}`);

  await page.click('button:has-text("Effacer les filtres")');
  await page.waitForTimeout(200);
  ok(
    "Produits : « Effacer les filtres » rétablit la liste",
    (await page.locator("tbody tr").count()) === totalLignes,
  );

  await page.selectOption("#filtre-categorie", "Boisson");
  await page.waitForTimeout(200);
  ok(
    "Produits : le filtre « catégorie » isole les boissons",
    (await page.locator("tbody tr").count()) === 4,
  );

  await page.click('button:has-text("Effacer les filtres")');
  await page.waitForTimeout(150);
  await page.check("#filtre-alertes");
  await page.waitForTimeout(200);
  ok(
    "Produits : le filtre « alertes » ne garde que les produits sous seuil",
    (await page.locator("tbody tr").count()) < totalLignes,
  );
  await page.uncheck("#filtre-alertes");
  await page.waitForTimeout(150);
  await page.screenshot({ path: "verif/02-produits.png", fullPage: true });

  /* ---------- 3. Page Commande : la machine à états --------------------- */
  await page.getByRole("link", { name: "Commande" }).click();
  await page.waitForURL("**/commande");
  ok("Commande : navigation par le menu", page.url().endsWith("/commande"));
  ok("Commande : état initial « Brouillon »", (await statutAffiche(page)) === "Brouillon");

  // Soumettre un formulaire vide DOIT produire des erreurs : c'est l'état
  // « Invalide » qui déclenche leur affichage, pas une condition dans le JSX.
  await page.getByRole("button", { name: "Valider la commande" }).click();
  await page.waitForSelector(".alert-danger");
  const messagesErreur = await page.locator(".alert-danger li").allInnerTexts();
  ok("Commande : formulaire vide refusé avec messages", messagesErreur.length >= 4, `${messagesErreur.length} messages`);
  ok("Commande : l'état devient « Invalide »", (await statutAffiche(page)) === "Invalide");
  await page.screenshot({ path: "verif/03-commande-invalide.png", fullPage: true });

  // Corriger fait disparaître les messages : retour à « En cours de saisie ».
  await page.fill("#client-nom", "Wenkai");
  await page.waitForTimeout(200);
  ok("Commande : la saisie fait disparaître les messages", (await page.locator(".alert-danger").count()) === 0);
  ok("Commande : l'état repasse à « En cours de saisie »", (await statutAffiche(page)) === "En cours de saisie");

  await page.fill("#client-prenom", "Song");
  await page.fill("#client-email", "wenkai@exemple.fr");

  const champQte = ligneProduit(page, "Poivron").locator('input[type="number"]');
  await champQte.fill("999");
  await page.waitForTimeout(200);
  ok(
    "Commande : saisie de 999 bornée au stock (22)",
    (await champQte.inputValue()) === "22",
    `champ = ${await champQte.inputValue()}`,
  );

  await champQte.fill("12");
  await page.waitForTimeout(200);
  const entete = (await page.locator(".card-header span.small").innerText()).trim();
  ok("Commande : total recalculé (12 × 3,75 = 45,00 €)", entete.includes("45,00"), entete);
  await page.screenshot({ path: "verif/04-commande-saisie.png", fullPage: true });

  await page.getByRole("button", { name: "Valider la commande" }).click();
  await page.waitForSelector(".alert-success");
  const confirmation = (await page.textContent(".alert-success")).trim();
  ok("Commande : confirmation avec numéro", /C004/.test(confirmation), confirmation.split(".")[0]);
  ok("Commande : l'état devient « Enregistree »", (await statutAffiche(page)) === "Enregistree");
  const lignesRecap = await page.locator(".alert-success li").allInnerTexts();
  ok(
    "Commande : récapitulatif de la commande passée (12 Poivron = 45,00 €)",
    lignesRecap.length === 1 &&
      /12\s*[×x]\s*Poivron/.test(lignesRecap[0]) &&
      /45,00/.test(lignesRecap[0]),
    lignesRecap.join(" | ") || "(aucune ligne)",
  );
  ok("Commande : formulaire réinitialisé", (await page.inputValue("#client-nom")) === "");
  await page.screenshot({ path: "verif/05-commande-enregistree.png", fullPage: true });

  await page.getByRole("button", { name: "Nouvelle commande" }).click();
  await page.waitForTimeout(200);
  ok("Commande : « Nouvelle commande » ramène à « Brouillon »", (await statutAffiche(page)) === "Brouillon");

  /* ---------- 4. Retour sur Produits : la donnée a changé --------------- */
  await page.getByRole("link", { name: "Produits" }).click();
  await page.waitForURL("**/produits");
  await page.waitForSelector("tbody tr");

  const poivronApres = ligneProduit(page, "Poivron");
  const classeApres = (await poivronApres.getAttribute("class")) ?? "";
  const qteApres = (await poivronApres.locator("td").nth(3).innerText()).trim();
  const badgeApres = (await poivronApres.locator("td").nth(5).innerText()).trim();

  ok("Produits : stock décrémenté par la commande (22 -> 10)", qteApres === "10", `quantité = ${qteApres}`);
  ok("Produits : la ligne passe en surlignage", classeApres.includes("ligne-alerte"));
  ok(
    "Produits : badge d'état mis à jour",
    sansAccent(badgeApres).includes("reapprovisionner"),
    badgeApres,
  );
  await page.screenshot({ path: "verif/06-produits-apres-commande.png", fullPage: true });

  /* ---------- 5. Retour sur Accueil ------------------------------------- */
  await page.getByRole("link", { name: "Accueil" }).click();
  await page.waitForURL(BASE + "/");
  await page.waitForSelector(".kpi");
  const kpiApres = await lireKpis(page);
  ok(
    "Accueil : nombre de commandes passé à 4",
    kpiApres.find((k) => k.libelle === "Commandes")?.valeur === "4",
  );

  /* ---------- 6. Pattern Command : annuler la dernière opération --------- */
  const resume = (await page.locator('[data-testid="resume-global"]').innerText()).trim();
  ok("Barre de navigation : dernière opération annonçable", /commande C004/.test(resume), resume);

  await page.getByRole("button", { name: "Annuler", exact: true }).click();
  await page.waitForTimeout(300);
  const kpiAnnule = await lireKpis(page);
  ok(
    "Annuler : le nombre de commandes revient à 3",
    kpiAnnule.find((k) => k.libelle === "Commandes")?.valeur === "3",
  );
  ok(
    "Annuler : le bouton redevient inactif",
    await page.getByRole("button", { name: "Annuler", exact: true }).isDisabled(),
  );

  await page.getByRole("link", { name: "Produits" }).click();
  await page.waitForURL("**/produits");
  await page.waitForSelector("tbody tr");
  const poivronRendu = ligneProduit(page, "Poivron");
  ok(
    "Annuler : le stock est rendu (10 -> 22)",
    (await poivronRendu.locator("td").nth(3).innerText()).trim() === "22",
  );
  ok(
    "Annuler : le surlignage disparaît",
    !((await poivronRendu.getAttribute("class")) ?? "").includes("ligne-alerte"),
  );
  await page.screenshot({ path: "verif/07-apres-annulation.png", fullPage: true });

  /* ---------- 7. Réinitialisation --------------------------------------- */
  await page.getByRole("link", { name: "Accueil" }).click();
  await page.waitForURL(BASE + "/");
  await page.getByRole("button", { name: "Réinitialiser" }).click();
  await page.waitForTimeout(300);
  const kpiReset = await lireKpis(page);
  ok(
    "Accueil : « Réinitialiser » rétablit les 3 commandes",
    kpiReset.find((k) => k.libelle === "Commandes")?.valeur === "3",
  );

  /* ---------- 8. Santé de la console ------------------------------------ */
  ok("Aucune erreur JavaScript en console", erreurs.length === 0, erreurs.join(" || ") || "aucune");
  ok(
    "Aucun avertissement en console",
    avertissements.length === 0,
    avertissements.length ? [...new Set(avertissements)].join(" || ") : "aucun",
  );

  await navigateur.close();

  console.log("\n================ RESULTATS ================");
  resultats.forEach((r) => console.log(r));
  const echecs = resultats.filter((r) => r.startsWith("ECHEC")).length;
  console.log(`\n${resultats.length - echecs}/${resultats.length} vérifications réussies`);
  process.exit(echecs === 0 ? 0 : 1);
})().catch((e) => {
  console.error("ERREUR FATALE:", e.message);
  console.log("\n================ RESULTATS PARTIELS ================");
  resultats.forEach((r) => console.log(r));
  const echecs = resultats.filter((r) => r.startsWith("ECHEC")).length;
  console.log(`\n${resultats.length - echecs}/${resultats.length} vérifications réussies avant l'erreur`);
  process.exit(2);
});
