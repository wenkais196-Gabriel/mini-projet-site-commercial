/* =============================================================================
   build-ports.cjs — genere les deux figures « ports » du compte-rendu.

   Pourquoi ce script existe : le sujet demande un diagramme de composants dans la
   notation du cours (un composant = une collection de ports, cf. « Introduction
   aux systemes interactifs », partie Composants). PlantUML ne sait pas placer un
   port sur le bord gauche ou droit d'un composant (demande de fonctionnalite
   #1766, toujours ouverte) : ses ports tombent forcement en haut ou en bas, et on
   ne peut pas colorer un port selon sa nature. Ces deux figures sont donc ecrites
   en SVG directement, ce qui permet de reproduire exactement la notation :

     - ports sur le bord GAUCHE  = Receives From (attributs, facettes)
     - ports sur le bord DROIT   = Sends To     (event sources)
     - couleur par nature de port (attribut / facette / event source)
     - cablage port a port et adaptateurs (figure 5)

   Sorties (dans docs/diagrammes/) :
     04-diagramme-ports.svg       + .png   le catalogue des ports
     05-diagramme-assemblage.svg  + .png   le cablage et les adaptateurs

   Le SVG est le format utilise par le PDF (vectoriel) ; le PNG sert a l'affichage
   direct sur GitHub, comme pour les figures 1 a 3.

       node docs/diagrammes/build-ports.cjs

   playwright-core est optionnel : sans lui, seuls les .svg sont ecrits.

   Ce fichier est analyse par SonarCloud avec le reste du depot (le « new code »
   doit rester propre) : les helpers prennent donc un objet de style plutot qu'une
   longue liste de parametres, et aucun `await` ne reste dans une boucle.
   ========================================================================== */

const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const OUT = __dirname;
const FONT = "Segoe UI, Helvetica Neue, Arial, sans-serif";
const MONO = "Consolas, 'Courier New', monospace";

const INK = "#1c1c1c";
const BOX_FILL = "#ffffff";
const BOX_STROKE = "#4a5568";
const NAME = "#123a5e";
const LABEL = "#22313f";
const NOTE = "#5b6b7c";
const CAPTION = "#42566b";
const C_ATT = ["#cfe3ff", "#3f6f9f"]; // attribut recu
const C_FAC = ["#c8e6c9", "#4f8a53"]; // facette (interface offerte)
const C_EVT = ["#ffd9a8", "#b8762b"]; // event source (evenement produit)
const C_KIND = { att: C_ATT, fac: C_FAC, evt: C_EVT };
const C_BAND = [
  ["#eff6ff", "#a8c4e0"],
  ["#f4f8f1", "#b3cba4"],
  ["#fff7ed", "#e0b283"],
  ["#f5f6f8", "#b6c0cd"],
];

const S_NAME = 14.5;
const S_NOTE = 10.5;
const S_CHIP = 10.5;
const PH = 18.0; // hauteur d'un port
const PGAP = 4.0; // espace vertical entre deux ports

/** largeur approximative du texte (Segoe UI), volontairement genereuse */
function tw(str, size) {
  let w = 0;
  for (const ch of str) {
    if ("iljI.,:;'|!".includes(ch)) w += 0.3;
    else if ("mwMW@".includes(ch)) w += 0.88;
    else if (ch === " ") w += 0.3;
    else if (ch >= "A" && ch <= "Z") w += 0.68;
    else if (ch >= "0" && ch <= "9") w += 0.57;
    else w += 0.54;
  }
  return w * size * 1.04;
}

const esc = (s) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

/** rectangle ; le style (rayon, epaisseur, ombre) est un objet */
function rect(x, y, w, h, fill, stroke, style = {}) {
  const { rx = 6, sw = 1.2, shadow = false } = style;
  const sh = shadow ? ' filter="url(#sh)"' : "";
  return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(
    1,
  )}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${sh}/>`;
}

/** texte ; tout ce qui n'est pas la position passe par l'objet de style */
function text(x, y, s, style = {}) {
  const { size = 12, fill = INK, weight = "normal", anchor = "start", italic = false, mono = false } = style;
  const it = italic ? ' font-style="italic"' : "";
  const ff = mono ? MONO : FONT;
  return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-family="${ff}" font-size="${size}" fill="${fill}" font-weight="${weight}" text-anchor="${anchor}"${it}>${esc(
    s,
  )}</text>`;
}

function poly(points, stroke = BOX_STROKE, sw = 1.6, marker = "arrow") {
  const pts = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  return `<polyline points="${pts}" fill="none" stroke="${stroke}" stroke-width="${sw}" marker-end="url(#${marker})"/>`;
}

/** un composant : son nom, ses ports d'entree (gauche) et de sortie (droite) */
class Comp {
  constructor(name, ins = [], outs = [], note = "", wide = null) {
    this.name = name;
    this.note = note;
    this.wide = wide;
    this.ins = ins.map(([label, kind]) => ({ label, kind }));
    this.outs = outs.map(([label, kind]) => ({ label, kind }));
  }

  measure() {
    const nw = Math.max(tw(this.name, S_NAME), this.note ? tw(this.note, S_NOTE) : 0);
    this.bw = this.wide || Math.max(136, nw + 30);
    this.nh = 26 + (this.note ? 15 : 0);
    const wOf = (p) => tw(p.label, S_CHIP) + 15;
    this.inw = this.ins.length ? Math.max(...this.ins.map(wOf)) : 0;
    this.outw = this.outs.length ? Math.max(...this.outs.map(wOf)) : 0;
    const stackIn = this.ins.length ? this.ins.length * (PH + PGAP) - PGAP : 0;
    const stackOut = this.outs.length ? this.outs.length * (PH + PGAP) - PGAP : 0;
    this.bh = Math.max(this.nh, stackIn, stackOut, 40);
    this.tw = this.inw + this.bw + this.outw;
    this.th = this.bh;
  }

  chipBox(side, i) {
    const ports = side === "in" ? this.ins : this.outs;
    const stack = ports.length * (PH + PGAP) - PGAP;
    const top = this.y + Math.max(0, (this.bh - stack) / 2);
    const cy = top + i * (PH + PGAP);
    const cw = tw(ports[i].label, S_CHIP) + 15;
    const cx = side === "in" ? this.x + this.inw - cw : this.x + this.inw + this.bw;
    return { cx, cy, cw };
  }

  /** point d'accroche d'un port : bord gauche (in) ou bord droit (out) */
  anchors(side) {
    const ports = side === "in" ? this.ins : this.outs;
    return ports.map((_, i) => {
      const { cx, cy, cw } = this.chipBox(side, i);
      return [side === "in" ? cx : cx + cw, cy + PH / 2];
    });
  }

  draw(x, y) {
    this.x = x;
    this.y = y;
    const out = [
      rect(x + this.inw, y, this.bw, this.bh, BOX_FILL, BOX_STROKE, { rx: 6, sw: 1.5, shadow: true }),
    ];
    const ny = y + this.bh / 2 - (this.note ? 9 : 7);
    out.push(text(x + this.inw + this.bw / 2, ny + 5, this.name, { size: S_NAME, fill: NAME, weight: "600", anchor: "middle" }));
    if (this.note) {
      out.push(text(x + this.inw + this.bw / 2, ny + 20, this.note, { size: S_NOTE, fill: NOTE, anchor: "middle" }));
    }
    for (const side of ["in", "out"]) {
      const ports = side === "in" ? this.ins : this.outs;
      ports.forEach((p, i) => {
        const { cx, cy, cw } = this.chipBox(side, i);
        const [fill, stroke] = C_KIND[p.kind];
        out.push(
          rect(cx, cy, cw, PH, fill, stroke, { rx: 3.5, sw: 1.0 }),
          text(cx + cw / 2, cy + PH - 5.0, p.label, { size: S_CHIP, fill: LABEL, anchor: "middle" }),
        );
      });
    }
    return out;
  }
}

/** une bande numerotee, qui range ses composants en lignes centrees */
function band(x, y, w, title, comps, colour, perRowW) {
  const [fill, stroke] = colour;
  const out = [];
  const pad = 18;
  const gapx = 30;
  const gapy = 30;
  const titleh = 28;
  const rows = [];
  let cur = [];
  let curw = 0;
  for (const c of comps) {
    if (cur.length && curw + c.tw > perRowW) {
      rows.push(cur);
      cur = [];
      curw = 0;
    }
    cur.push(c);
    curw += c.tw + gapx;
  }
  if (cur.length) rows.push(cur);
  let yy = y + titleh + 8;
  for (const row of rows) {
    const roww = row.reduce((s, c) => s + c.tw, 0) + gapx * (row.length - 1);
    let cx = x + pad + Math.max(0, (perRowW - roww) / 2);
    const rh = Math.max(...row.map((c) => c.th));
    for (const c of row) {
      out.push(...c.draw(cx, yy + (rh - c.th) / 2));
      cx += c.tw + gapx;
    }
    yy += rh + gapy;
  }
  const h = yy - gapy + pad - y;
  return {
    svg: [
      rect(x, y, w, h, fill, stroke, { rx: 10, sw: 1.3 }),
      text(x + pad, y + 20, title, { size: 13, fill: "#33475b", weight: "600" }),
      ...out,
    ],
    h,
  };
}

function legendBlock(x, y, w) {
  const out = [
    rect(x, y, w, 104, "#fbfcfd", "#c9d3dd", { rx: 8, sw: 1 }),
    text(x + 16, y + 24, "Notation du cours (CCM) - un composant est une collection de ports", { size: 12.5, fill: NAME, weight: "600" }),
  ];
  const items = [
    ["attribut recu (props de donnees)", C_ATT],
    ["facette (interface offerte)", C_FAC],
    ["event source (evenement produit)", C_EVT],
  ];
  let cx = x + 16;
  for (const [label, [f, s]] of items) {
    out.push(
      rect(cx, y + 38, 24, 16, f, s, { rx: 3.5, sw: 1 }),
      text(cx + 32, y + 51, label, { size: 11.5, fill: INK }),
    );
    cx += 32 + tw(label, 11.5) + 46;
  }
  out.push(
    text(
      x + 16,
      y + 76,
      "Receives From = bord gauche (attributs et facette).   Sends To = bord droit (event sources).   Un port = une porte :",
      { size: 11.5, fill: CAPTION },
    ),
    text(
      x + 16,
      y + 92,
      "aucun composant n'en appelle un autre directement, la liaison passe par l'etat partage (voir figure 1 et section 3.8).",
      { size: 11.5, fill: CAPTION },
    ),
  );
  return out;
}

function svgOpen(w, h) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h.toFixed(0)}" width="${w}" height="${h.toFixed(0)}">`,
    '<defs><filter id="sh" x="-20%" y="-20%" width="140%" height="140%">' +
      '<feDropShadow dx="0" dy="1.2" stdDeviation="1.4" flood-color="#000" flood-opacity="0.18"/></filter>' +
      '<marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">' +
      '<path d="M 0 0 L 10 5 L 0 10 z" fill="#4a5568"/></marker>' +
      '<marker id="arrow2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">' +
      '<path d="M 0 0 L 10 5 L 0 10 z" fill="#b8762b"/></marker></defs>',
  ];
}

/* ------------------------------------------------ figure 4 : catalogue des ports */
function figureCatalogue() {
  const bands = [
    [
      "1. atomes (form/) - chaque port de sortie normalise une valeur",
      [
        new Comp("form/Input", [["id, label, value", "att"]], [["onChange : string", "evt"]]),
        new Comp("form/Range", [["id, label, min, max, value", "att"]], [["onChange : number", "evt"]]),
        new Comp("form/Checkbox", [["id, label, checked", "att"]], [["onChange : boolean", "evt"]]),
        new Comp("form/Select", [["id, label, options[]", "att"]], [["onChange : string", "evt"]]),
      ],
    ],
    [
      "2. controles composes, lignes de tableau, carte",
      [
        new Comp("QuantitySelector", [["value, max, disabled", "att"]], [["onChange : number", "evt"]], "invariant : valeur bornee [0, max]"),
        new Comp("OrderRow", [["product, quantity, error", "att"]], [["onQuantityChange(id, qty)", "evt"]]),
        new Comp("RowProduct", [["product", "att"]], [], "aucun port de sortie"),
        new Comp("TableCategory", [["category, count", "att"]], [], "aucun port de sortie"),
        new Comp("KpiCard", [["label", "att"], ["<children> - facette", "fac"]], []),
      ],
    ],
    [
      "3. composes et orchestrateurs",
      [
        new Comp("TableProducts", [["products", "att"]], []),
        new Comp(
          "ProductFilter",
          [["values, bounds, categories", "att"]],
          [
            ["onSearchChange", "evt"],
            ["onCategoryChange", "evt"],
            ["onMaxPriceChange", "evt"],
            ["onMaxQuantityChange", "evt"],
            ["onMaxThresholdChange", "evt"],
            ["onOnlyLowStockChange", "evt"],
            ["onOnlyOutOfStockChange", "evt"],
            ["onReset", "evt"],
          ],
          "un port de sortie par filtre",
        ),
      ],
    ],
    [
      "4. pages (assembleurs), gabarit et etat partage",
      [
        new Comp("HomePage", [], [], "etat local : aucun"),
        new Comp("ProductsPage", [], [], "etat local : filters, sort"),
        new Comp("OrderPage", [], [], "customer, quantities, report..."),
        new Comp("Layout", [["stats, canUndo, lastOperation", "att"]], [["undoLastOperation, reset", "evt"]]),
        new Comp("DataProvider", [["useData() - facette", "fac"], ["today", "att"]], [], "composant non visuel : facette unique"),
      ],
    ],
  ];

  const W = 1280;
  const PADX = 24;
  const perRowW = W - 2 * PADX - 36;
  const body = [];
  let y = 92;
  for (let i = 0; i < bands.length; i += 1) {
    const [title, comps] = bands[i];
    comps.forEach((c) => c.measure());
    const { svg, h } = band(PADX, y, W - 2 * PADX, title, comps, C_BAND[i], perRowW);
    body.push(...svg);
    y += h + 22;
  }
  const H = y + 128;
  const out = [
    ...svgOpen(W, H),
    rect(0, 0, W, H, "#ffffff", "#ffffff", { rx: 0, sw: 0 }),
    text(PADX, 36, "Les ports des composants - notation du cours (CCM)", { size: 21, fill: NAME, weight: "700" }),
    text(PADX, 58, "Ce que chaque composant recoit (bord gauche) et ce qu'il produit (bord droit).", { size: 12.5, fill: NOTE }),
    ...body,
    ...legendBlock(PADX, H - 120, W - 2 * PADX),
    "</svg>",
  ];
  fs.writeFileSync(path.join(OUT, "04-diagramme-ports.svg"), out.join("\n"));
  return { file: "04-diagramme-ports.svg", w: W, h: Math.round(H) };
}

/* -------------------------------------------- figure 5 : assemblage et adaptateurs */
function figureAssemblage() {
  const W = 1280;
  const H = 760;
  const atoms = [
    new Comp("form/Input", [["value", "att"]], [["onChange : string", "evt"]]),
    new Comp("form/Range", [["value", "att"]], [["onChange : number", "evt"]]),
    new Comp("form/Checkbox", [["checked", "att"]], [["onChange : boolean", "evt"]]),
    new Comp("form/Select", [["value", "att"]], [["onChange : string", "evt"]]),
  ];
  const pf = new Comp(
    "ProductFilter",
    [["values, bounds, categories", "att"]],
    [
      ["onSearchChange", "evt"],
      ["onCategoryChange", "evt"],
      ["onMaxPriceChange", "evt"],
      ["onMaxQuantityChange", "evt"],
      ["onMaxThresholdChange", "evt"],
      ["onOnlyLowStockChange", "evt"],
      ["onOnlyOutOfStockChange", "evt"],
      ["onReset", "evt"],
    ],
    "orchestrateur",
  );
  const page = new Comp("ProductsPage", [], [], "porte l'etat : filters, sort", 180);
  const qs = new Comp("QuantitySelector", [["value, max", "att"]], [["onChange : number", "evt"]], "[0, max]");
  const orow = new Comp("OrderRow", [["product, quantity", "att"]], [["onQuantityChange(id, qty)", "evt"]]);
  const opage = new Comp("OrderPage", [], [], "porte l'etat : quantities", 180);
  [atoms, [pf, page, qs, orow, opage]].flat().forEach((c) => c.measure());

  const out = [
    ...svgOpen(W, H),
    rect(0, 0, W, H, "#ffffff", "#ffffff", { rx: 0, sw: 0 }),
    text(24, 36, "Assemblage : cablage des ports et adaptateurs", { size: 21, fill: NAME, weight: "700" }),
    text(24, 58, "Le parent fournit les attributs et ecrit l'adaptateur ; l'enfant remonte son evenement par son port de sortie.", { size: 12.5, fill: NOTE }),
    rect(24, 76, W - 48, 324, "#eff6ff", "#a8c4e0", { rx: 10, sw: 1.3 }),
    text(42, 100, "Chaine de la page Produits", { size: 13, fill: "#33475b", weight: "600" }),
    rect(24, 416, W - 48, 268, "#f4f8f1", "#b3cba4", { rx: 10, sw: 1.3 }),
    text(42, 440, "Chaine de la page Commande", { size: 13, fill: "#33475b", weight: "600" }),
  ];

  atoms.forEach((a, i) => out.push(...a.draw(70, 128 + i * 62)));
  out.push(...pf.draw(560, 168), ...page.draw(1080, 236));

  const [ex, ey] = pf.anchors("in")[0];
  for (const a of atoms) {
    const [sx, sy] = a.anchors("out")[0];
    out.push(poly([[sx + 4, sy], [sx + 30, sy], [sx + 30, ey], [ex - 7, ey]], BOX_STROKE, 1.5));
  }
  out.push(
    text(560, 150, "4 ports de sortie -> 1 port d'entree", { size: 11, fill: "#b8762b", weight: "600" }),
    text(560, 358, "l'adaptateur est ecrit par la page (ProductsPage.jsx:86) :", { size: 10.5, fill: NOTE }),
    text(560, 374, 'onSearchChange={changeFilter("search")}', { size: 10.5, fill: LABEL, mono: true }),
    text(560, 388, "changeFilter = (key) => (value) => setFilters((prev) => ({ ...prev, [key]: value }))", { size: 10.5, fill: NOTE, mono: true }),
  );

  const [fx, fy] = pf.anchors("out")[3];
  const py = page.y + page.bh / 2;
  out.push(
    poly([[fx + 4, fy], [fx + 36, fy], [fx + 36, py], [page.x + page.inw - 7, py]], BOX_STROKE, 1.7, "arrow2"),
    text(page.x + page.bw, page.y - 12, "remontee : 8 ports, un par filtre", { size: 11, fill: "#b8762b", weight: "600", anchor: "end" }),
  );

  out.push(...qs.draw(70, 500), ...orow.draw(600, 500), ...opage.draw(1080, 500));
  const [qx, qy] = qs.anchors("out")[0];
  const [ox, oy] = orow.anchors("in")[0];
  const [rx, ry] = orow.anchors("out")[0];
  const ey2 = opage.y + opage.bh / 2;
  out.push(
    poly([[qx + 4, qy], [qx + 44, qy], [qx + 44, oy], [ox - 7, oy]], BOX_STROKE, 1.5),
    text(455, 470, "adaptateur ecrit par OrderRow (OrderRow.jsx:45) :", { size: 10.5, fill: NOTE }),
    text(455, 486, "(nextQuantity) => onQuantityChange(product.id, nextQuantity)", { size: 10.5, fill: LABEL, mono: true }),
    poly([[rx + 4, ry], [rx + 34, ry], [rx + 34, ey2], [opage.x + opage.inw - 7, ey2]], BOX_STROKE, 1.7, "arrow2"),
    text(24, 716, "Fleches grises : les attributs descendent.  Fleches oranges : les evenements remontent ; les deux sens passent par les memes ports.", { size: 11, fill: CAPTION }),
    text(24, 732, "Les deux pages ne se parlent pas : chacune lit le meme etat partage (DataProvider, figure 1) et c'est l'etat qui rend les donnees solidaires.", { size: 11, fill: CAPTION }),
    "</svg>",
  );
  fs.writeFileSync(path.join(OUT, "05-diagramme-assemblage.svg"), out.join("\n"));
  return { file: "05-diagramme-assemblage.svg", w: W, h: H };
}

/** capture une figure en PNG (apercu GitHub) */
async function capture(browser, { file, w, h }) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  await page.goto(pathToFileURL(path.join(OUT, file)).href, { waitUntil: "load" });
  await page.waitForTimeout(250);
  const el = await page.$("svg");
  await (el || page).screenshot({ path: path.join(OUT, file.replace(/\.svg$/, ".png")) });
  await page.close();
}

/** rendu PNG (affichage GitHub), si playwright-core est disponible */
async function rasterize(svgs) {
  let chromium;
  try {
    ({ chromium } = require("playwright-core"));
  } catch {
    console.log("playwright-core absent : seuls les .svg ont ete ecrits.");
    return;
  }
  const browser = await chromium.launch({ channel: "msedge" });
  await Promise.all(svgs.map((svg) => capture(browser, svg)));
  await browser.close();
}

async function main() {
  const svgs = [figureCatalogue(), figureAssemblage()];
  svgs.forEach((s) => console.log(`${s.file}  ${s.w} x ${s.h}`));
  await rasterize(svgs);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
