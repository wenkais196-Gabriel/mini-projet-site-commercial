# check/ — end-to-end verification

This folder is not part of the application: it is a **working tool**.
It can be deleted before the submission without breaking anything.

## What it checks

`e2e.cjs` drives a **real browser** (Microsoft Edge, the one already installed on the
machine) and replays the central property of the assignment — "the data are linked
between the virtual pages":

| Step | What must happen |
|---|---|
| Home | 4 indicators, 3 orders, 3 categories |
| Products | filters name / category / low stock, "reset the filters" |
| Products | sorts by name, price, quantity |
| Order | empty form refused → **state `Invalide`**, messages displayed |
| Order | correcting → the messages disappear (**state `En cours de saisie`**) |
| Order | typing 999 in a quantity → clamped to the available stock |
| Order | submit → **state `Enregistrée`**, confirmation + recap |
| Products | the stock went down **and** the row becomes highlighted |
| Home | the number of orders went up |
| Navigation bar | the summary announces the last undoable operation |
| Undo | the stock is given back, the highlight disappears, the counter goes back |
| Console | no error **and no warning** |

## How to run

```bash
npm i --no-save --no-package-lock playwright-core   # verification tool, NOT declared
npm run dev                                         # in another terminal
node check/e2e.cjs
```

- `--no-save --no-package-lock` : the project stays clean, `package.json` and
  `package-lock.json` do not move. That is also why `playwright-core` is not a
  dependency of the project (see `AGENTS.md`, rule "no dependency without agreement").
- **Careful**: any later `npm install` removes it again (it is not declared). Just
  re-run the install command above before checking.
- `channel: "msedge"` : we drive the browser already installed, nothing to download.
- The screenshots produced during the check are written in this folder — they are
  **not** versioned (see `.gitignore`).

## Difference with `npm test`

| | `npm test` | `node check/e2e.cjs` |
|---|---|---|
| Scope | rules, transitions, builder, state machine | the whole application in a browser |
| Dependencies | none (Node is enough) | `playwright-core` (not declared) |
| Speed | ~0.2 s | ~20 s |
| When to run | on every commit | before merging a branch |
