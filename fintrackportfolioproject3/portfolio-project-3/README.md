# Portfolio Project 3: FinTrack — Personal Finance Dashboard

A single-page personal finance dashboard written in **vanilla JavaScript**: no framework, no
build step, no dependencies. Open `index.html` from any static server and it runs.

Where the first two portfolio projects were about the DOM, this one is about **architecture** —
a predictable state container, a router, versioned storage, a pure domain layer, and charts
drawn by hand on a canvas.

```
portfolio-project-3/
├── index.html                 app shell (skip link, sidebar, topbar, mount points)
├── assets/css/                tokens · layout · components · charts
├── src/
│   ├── main.js                entry point
│   ├── app.js                 wiring: store ↔ router ↔ views ↔ dialogs ↔ theme
│   ├── core/                  store · router · persistence · DOM helpers   (framework layer)
│   ├── domain/                analytics · query · csv · validate · categories  (pure logic)
│   ├── state/                 actions · reducer · selectors · demo seed
│   ├── ui/                    components · dialogs · toasts · icons
│   │   ├── charts/            canvas base · donut · bars · line · scale
│   │   └── views/             dashboard · transactions · budgets · settings
│   └── utils/                 date · format · id
└── tests/                     115 unit tests (node:test, no test framework installed)
```

## Features

- **Dashboard** — income / spending / net / savings-rate tiles with month-over-month change,
  a six-month cash-flow column chart, a category donut, a running-balance line chart, recent
  activity and budget pressure.
- **Transactions** — search, filter by type, category and date range, sortable columns,
  pagination, inline edit and delete. The whole query lives in the URL, so
  `#/transactions?search=rent&sort=amount&dir=asc` is shareable and survives a reload.
- **Budgets** — a monthly ceiling per category, per month, with progress, an early warning at
  80% and an over-budget flag, plus a note of what was spent in categories with no budget.
- **CSV import/export** — a real RFC-4180 parser (quotes, escaped quotes, embedded newlines,
  CRLF), header aliases so exports from other tools import unchanged, per-row error reporting,
  and formula-injection guarding on export.
- **Settings** — theme (system / light / dark), currency and locale, JSON backup, reset to demo
  data, delete everything, and what is actually taking up space in `localStorage`.
- **Keyboard** — `N` new transaction, `/` search, `Esc` close dialog, `G` then `D`/`T`/`B`/`S`
  to jump between sections.

## Running it

```bash
cd portfolio-project-3
python3 -m http.server 4173      # or: npx serve .
# open http://localhost:4173
```

A server is required — ES modules are blocked over `file://` by the browser's CORS rules.

```bash
node --test tests/*.test.js      # 115 tests, zero dependencies
```

## Concepts applied

### A predictable store (`src/core/store.js`)

The Redux pattern in about eighty lines: state is only ever replaced by a reducer, subscribers
are notified after every dispatch, and middleware wraps `dispatch` from the outside in.

```js
const store = createStore(rootReducer, preloadedState, [persistMiddleware]);
store.watch(selectTheme, applyTheme, { immediate: true });
store.dispatch(addTransaction(value));
```

Guards worth having: a reducer that dispatches throws (the update order would be undefined),
`getState()` during a reducer throws, and the subscriber list is snapshotted before
notification so unsubscribing inside a listener can't make the loop skip its neighbour.

### Money is never a float

`0.1 + 0.2 !== 0.3`. Every amount is an **integer number of minor units** (cents), and the sign
lives in `type` (`"income"` / `"expense"`) rather than in the amount, so totals, chart geometry
and budget ratios are plain integer arithmetic. Parsing (`1.234,56`, `$1,234.56`, `-8.5`)
happens once, on the way in; `Intl.NumberFormat` formats on the way out.

### Versioned storage with migrations (`src/core/persistence.js`)

Saved data outlives the code that wrote it, so every snapshot carries its schema version and
old ones are upgraded on load rather than discarded:

| version | change |
|---|---|
| v1 | amounts stored as floats, budgets as a `{ category: limit }` map |
| v2 | amounts became integer minor units |
| v3 | budgets became records, settings gained an explicit locale |

Writes are debounced through a middleware and flushed on `beforeunload`. `localStorage` is
probed rather than assumed — Safari's private mode exposes the API and then throws on write, so
the app falls back to an in-memory store and says so.

### A pure domain layer

`analytics`, `query`, `csv` and `validate` contain no DOM and no store access — they take data
and return data. That is what makes 115 unit tests possible without a browser or a mocking
library, and it is where the interesting edge cases live: a savings rate with no income, a
percentage change from zero (`null`, not `Infinity`), a stable sort, an inclusive date range,
a CSV field containing `"Doe, John"` and a newline.

### Charts on a canvas, colour from CSS

The three charts are drawn with the Canvas 2D API — device-pixel-ratio aware, redrawn on
container resize and on theme change. They read their palette from the same CSS custom
properties as the rest of the app, so there is no second palette hiding in the JavaScript.

The categorical order is fixed and colour-vision-validated, and a colour belongs to a
*category*, not to its rank: "Groceries" is the same hue in January and June, and filtering one
slice out never repaints the others. Beyond five categories the tail folds into a neutral
"Other" rather than inventing new hues. Every chart ships a legend and a `<details>` data
table, so nothing is communicated by colour alone.

### Accessibility and safety, as a rule rather than a pass

- No `innerHTML` anywhere. Everything is built through an `h()` helper backed by
  `createTextNode`, so a transaction described as `<img src=x onerror=…>` renders as text.
- Dialogs are labelled, `aria-modal`, trap Tab, close on Escape, and return focus to the opener.
- Tables carry `aria-sort`; the toast region is an `aria-live` landmark; navigation moves focus
  to the new section heading; there is a skip link and a visible focus ring everywhere.
- Views re-render wholesale on state change, and `preserveFocus` puts the caret back — a
  debounced search box survives its own re-render.

## What I would add next

Multi-currency accounts with a conversion layer, recurring-transaction detection, a Web Worker
for imports of tens of thousands of rows, and an IndexedDB adapter behind the same persistence
interface.
