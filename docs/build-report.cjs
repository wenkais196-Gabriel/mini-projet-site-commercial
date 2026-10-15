/* =============================================================================
   build-report.cjs — exporte le compte-rendu en PDF pret a rendre.

   Pourquoi ce script existe : le sujet demande un DOCUMENT (analyse des design
   patterns + diagrammes de composants), pas seulement du markdown. Ce script
   produit `docs/SONG-Wenkai_SUI-Wenhui.pdf` a partir de
   `docs/analyse-design-patterns.md`, avec les figures en VECTORIEL (nettes a
   n'importe quel zoom et a l'impression).

   Il n'y a rien a installer en dehors de npm (pas de LaTeX, pas de pandoc) : le
   rendu A4 est fait par le navigateur deja present sur la machine.

       npm i --no-save --no-package-lock marked playwright-core
       node docs/build-report.cjs

   Les deux paquets sont installes SANS etre enregistres dans package.json : ce sont
   des outils de livraison, pas des dependances de l'application.
   ========================================================================== */

const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

let marked;
let chromium;
try {
  ({ marked } = require("marked"));
  ({ chromium } = require("playwright-core"));
} catch {
  console.error(
    "Dependances manquantes. Lancez d'abord :\n" +
      "  npm i --no-save --no-package-lock marked playwright-core",
  );
  process.exit(1);
}

const DOCS = __dirname;
const md = fs.readFileSync(path.join(DOCS, "analyse-design-patterns.md"), "utf8");

const body = marked
  .parse(md, { gfm: true })
  // Le PDF utilise les SVG (vectoriel) ; le markdown reference les PNG, qui
  // s'affichent directement sur GitHub. Les deux restent dans le depot.
  .replace(/diagrammes\/([\w-]+)\.png/g, "diagrammes/$1.svg")
  // Garde le libelle « Figure N » colle a son image (sinon la pagination les separe).
  .replace(
    /<p><strong>(Figure \d+[\s\S]*?)<\/strong><\/p>\s*<p>(<img[^>]*>)<\/p>/g,
    "<figure>$2<figcaption>$1</figcaption></figure>",
  );

const CSS = `
  @page { size: A4; }
  * { box-sizing: border-box; }
  body { font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
         font-size: 10.5pt; line-height: 1.55; color: #1c1c1c; margin: 0; }
  h1 { font-size: 20pt; line-height: 1.25; color: #123a5e; margin: 0 0 4pt;
       border-bottom: 2.5pt solid #123a5e; padding-bottom: 6pt; }
  h2 { font-size: 14pt; color: #123a5e; margin: 20pt 0 8pt;
       border-bottom: 0.75pt solid #b9c6d4; padding-bottom: 3pt;
       break-after: avoid; }
  h3 { font-size: 11.5pt; color: #1f4e79; margin: 14pt 0 5pt; break-after: avoid; }
  p, ul, ol { margin: 5pt 0; }
  li { margin: 2pt 0; }
  strong { color: #0f2f4a; }
  table { width: 100%; border-collapse: collapse; margin: 8pt 0; font-size: 9.5pt;
          break-inside: avoid; }
  th { background: #eef3f8; text-align: left; }
  th, td { border: 0.5pt solid #c3ced9; padding: 4pt 6pt; vertical-align: top; }
  code { font-family: Consolas, "Courier New", monospace; font-size: 9pt;
         background: #f4f6f8; padding: 0.5pt 2.5pt; border-radius: 2pt; }
  pre { background: #f7f9fb; border: 0.5pt solid #d8e0e8; border-left: 2.5pt solid #1f4e79;
        padding: 6pt 8pt; overflow-wrap: break-word; white-space: pre-wrap;
        font-size: 9pt; break-inside: avoid; }
  pre code { background: none; padding: 0; }
  blockquote { margin: 8pt 0; padding: 5pt 10pt; background: #f7f9fb;
               border-left: 2.5pt solid #b9c6d4; color: #3a4a58; break-inside: avoid; }
  img { display: block; max-width: 100%; margin: 8pt auto 2pt;
        border: 0.5pt solid #d8e0e8; }
  figure { margin: 10pt 0; break-inside: avoid; }
  figcaption { text-align: center; font-size: 9pt; color: #3a4a58; margin-top: 3pt; }
  hr { border: none; border-top: 0.5pt solid #d8e0e8; margin: 16pt 0; }
  h1 + h2 { margin-top: 14pt; }
`;

const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<title>Mini projet — Site commercial — Analyse des design patterns</title>
<style>${CSS}</style></head>
<body>${body}</body></html>`;

const htmlPath = path.join(DOCS, "_report.build.html");
fs.writeFileSync(htmlPath, html, "utf8");

const pdfPath = path.join(DOCS, "SONG-Wenkai_SUI-Wenhui.pdf");

(async () => {
  const browser = await chromium.launch({ channel: "msedge" });
  const page = await browser.newPage();
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "load" });
  await page.waitForTimeout(700); // laisse les images se charger
  await page.pdf({
    path: pdfPath,
    format: "A4",
    printBackground: true,
    margin: { top: "16mm", bottom: "16mm", left: "15mm", right: "15mm" },
    displayHeaderFooter: true,
    headerTemplate: "<span></span>",
    footerTemplate:
      '<div style="font-size:7.5pt;width:100%;text-align:center;color:#6b7a88;font-family:Segoe UI,Arial">' +
      "Mini projet React — Site commercial — SONG Wenkai &amp; SUI Wenhui — page " +
      '<span class="pageNumber"></span> / <span class="totalPages"></span></div>',
  });
  await browser.close();
  fs.rmSync(htmlPath, { force: true }); // fichier intermediaire, non livre
  console.log("PDF ecrit :", pdfPath);
})();
