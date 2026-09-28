<div align="center">

<img src="public/brand/mulya-mark.svg" width="80" height="80" alt="Mūlya logo" />

# Mūlya · मूल्य

### Should-cost estimation for truck part engineering

*Mūlya* (Sanskrit): **value, price, worth**

[What it does](#what-it-does) · [Tour](#a-tour-in-screenshots) · [Getting started](#getting-started) · [How it is built](#how-it-is-built) · [Guide](docs/GUIDE.md)

![Mūlya: three sample parts measured into a price](public/brand/mulya-hero.webp)

</div>

**Mūlya tells a design engineer what a part should cost to make, why, and what to change to bring the cost down,** while the design can still change and before a supplier quote arrives.

You give it a STEP file:
1. **Read and recommend.** A crew of agents reads the geometry, scores its complexity and recommends a manufacturing process, showing its evidence.
2. **Human checkpoint.** The crew **stops** here: nothing gets costed against a tool nobody agreed to.
3. **Cost the route.** Once you confirm, it costs the part end to end. That covers material, conversion, tooling, overhead and margin, plus price breaks by volume, what-ifs, a confidence band and a supplier RFQ pack.

Mūlya is part of the [Wayam AI](https://github.com/WayamAI) family and is built on the **Chronos design system**.

> [!NOTE]
> **Prototype.** Every figure comes from a seeded catalogue of 50 parts and a rules-based cost model (v0.1) built on standard cost-engineering formulas. There are no live PLM, ERP or sourcing connections, and nothing persists beyond the browser tab.

---

## What it does

| | |
|---|---|
| **Estimate from geometry** | Six agents read a STEP file, score complexity, recommend a process and cost it, and you watch them work |
| **Keep a human in the loop** | The run stops at a checkpoint before anything is costed against a manufacturing route |
| **Explain the number** | Cost breakdown, top cost drivers, price breaks, tooling amortisation and a confidence band |
| **Ask "what if?"** | Price design changes (wall, tolerance, material, process, volume) before you make them |
| **Prove it helped** | Compare any two estimates with a cost-walk waterfall and line-by-line alignment across processes |
| **Hand it over** | A printable should-cost report and a supplier RFQ pack with a dimensioned drawing sheet |
| **See the part** | Real CAD models (STEP, STL, GLB) in an interactive 3D viewer, with the production tools that make them |

### Who it is for

The same estimate answers four questions. **Estimate History → Point of view** switches between them.

| Who | Their question |
|---|---|
| **Design engineer** (primary) | *What did I change, and did it help?* |
| **Cost engineer** | *Where are we against target, and is the estimate holding up?* |
| **Purchasing** | *What is this worth per year, and what are we committing to in tooling?* |
| **Programme manager** | *Which programmes are carrying cost risk?* |

---

## A tour in screenshots

### 1. Sign in

A demo operator, a cookie session and the same split layout as Chronos. Deep links survive sign-in.

![Sign in](docs/screenshots/login.webp)

### 2. Dashboard: where the portfolio stands

- **KPI tiles:** estimates, average variance, parts over target and annual saving, each with a sparkline and a status badge.
- **Variance trend:** average variance to target, month by month.
- **Needs attention:** the parts furthest over target.
- **Latest part:** a live 3D view of the most recent part.

Light by default, dark as a toggle.

| Light | Dark |
|---|---|
| ![Dashboard, light](docs/screenshots/dashboard.webp) | ![Dashboard, dark](docs/screenshots/dashboard-dark.webp) |

### 3. New Estimate: the agents read the part, then stop

Drop a STEP file or start from a sample part. **Geometry** reads the solid, and **Process** weighs the evidence and recommends a route. Then the crew **stops at the human checkpoint** and waits for a person to confirm.

| Start | The run at the human checkpoint |
|---|---|
| ![New Estimate drop zone](docs/screenshots/new-estimate-start.webp) | ![Agents at the human checkpoint](docs/screenshots/new-estimate.webp) |

Every recommendation carries its evidence: each measured signal, what it implies, and which process it favours or rules out.

![Process inference with evidence](docs/screenshots/new-estimate-process.webp)

After you confirm, the remaining agents cost the route. **Tooling** sizes and prices the tool in 3D and shows exactly how it lands on the piece price. **Share** assembles a supplier RFQ pack with a dimensioned, first-angle drawing sheet.

| Tooling | Supplier pack |
|---|---|
| ![Mould and tooling](docs/screenshots/new-estimate-tooling.webp) | ![Drawing sheet and RFQ pack](docs/screenshots/new-estimate-share.webp) |

### 4. Estimate: the number, and why

- **Price:** the piece price with its confidence range, its status against target, and the actual supplier quote.
- **Volume:** lot quantities to reprice by batch size.
- **Part:** the real CAD part in 3D.
- **Why:** the cost breakdown and the top cost drivers.

![Estimate result](docs/screenshots/estimate.webp)

**Price breaks** show how tooling amortises with volume. **What-ifs** price a design change before you make it, whether it saves money or costs more.

| Price breaks | What if… |
|---|---|
| ![Price breaks](docs/screenshots/estimate-price-breaks.webp) | ![What-ifs](docs/screenshots/estimate-what-if.webp) |

### 5. Compare: prove it helped

Put any two estimates side by side: two revisions, a library part, or the estimate you just made. The page opens on the verdict:
- **KPI strip:** Δ per piece, annual impact at an editable volume, each side against target, and the tooling change with its breakeven point.
- **Sharing:** copy a link (`/compare?a=…&b=…`) or download a CSV.

![Compare Estimates](docs/screenshots/compare.webp)

The **cost walk** bridges one price to the other by category. The **line-by-line** table pairs equivalent lines even when two processes name them differently, and reconciles to the cent.

| Cost walk | Line by line |
|---|---|
| ![Cost walk waterfall](docs/screenshots/compare-cost-walk.webp) | ![Line-by-line comparison](docs/screenshots/compare-lines.webp) |

### 6. 3D Models: real CAD, not placeholders

The three sample parts are real B-rep solids built with OpenCascade.

- **Viewer controls:** orbit, zoom, Iso / Front / Top / Right views, CAD edge lines, wireframe, X-ray, a section plane and fullscreen.
- **Downloads:** STEP, STL and GLB.
- **Tools:** each part's production tool opens and closes in 3D.

![3D Models](docs/screenshots/models.webp)

| Section view | Production tools |
|---|---|
| ![Section view of the bearing housing](docs/screenshots/models-section.webp) | ![Pattern, progressive die and HPDC die](docs/screenshots/models-tooling.webp) |

### 7. Everything else

| | |
|---|---|
| ![Part Library](docs/screenshots/library.webp) **Part Library:** 50 parts, filterable and sortable | ![Estimate History](docs/screenshots/history.webp) **Estimate History:** runs by day, per persona |
| ![Agents](docs/screenshots/agents.webp) **Agents:** the crew, the phases and the checkpoint | ![Rate Master](docs/screenshots/rates.webp) **Rate Master (dark):** editable rates with pending changes |
| ![Data & Model](docs/screenshots/model.webp) **Data & Model:** feature weights, systems of record, roadmap | ![Cost Report](docs/screenshots/report.webp) **Cost Report:** a print-ready should-cost sheet |

### 8. On a phone

Every page works down to 390 px wide.

![Mobile: dashboard, new estimate, compare and 3D models](docs/screenshots/mobile.webp)

---

## Getting started

Requires **Node.js 20+**.

```bash
git clone https://github.com/WayamAI/Mulya.git
cd Mulya
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Visits without a session go to sign-in.

### Demo operator

| | |
|---|---|
| Email | `operator@mulya.ai` |
| Password | `estimate` |

Click the demo link under the form to fill both in. This is a local cookie session (`mulya-session`), not an identity provider. Sign out from the avatar menu in the top bar.

> [!TIP]
> For a ten-minute demo script with talking points, read **[docs/GUIDE.md](docs/GUIDE.md)**.

### Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build (every route prerenders statically) |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run cad` | Rebuild the CAD parts with OpenCascade (about 2 min) |
| `npm run models:web` | Compress the CAD meshes and edges into the viewer's `*.web.glb` (meshopt) |
| `npm run models` | Export the production tools (pattern, progressive die, HPDC die) as GLB |
| `npm run marks:sizes` | Generate the 96 px and 192 px copies of the 3D icons |

---

## How it is built

| Layer | What |
|---|---|
| **Framework** | [Next.js 16](https://nextjs.org) (App Router), React 19, TypeScript (strict) |
| **Design system** | Tailwind CSS v4 on the Chronos semantic tokens (`src/styles/tokens.css`). Geist for UI, Michroma for titles and figures. Light and dark |
| **UI kit** | `src/components/ui`: badges (status is never colour alone), tables, fields, a custom accessible dropdown, segmented controls, KPI tiles, empty states. Browse it at **`/dev/ui`** |
| **Cost model** | `src/lib/costing`: pure, typed data and functions for the estimate, breakdowns, tooling, process detection, agents and comparison |
| **3D** | three.js on a shared stage: ACES tone mapping, environment reflections, soft shadows, orbit controls, section planes |
| **CAD** | OpenCascade (`replicad`) builds the parts in `scripts/build-cad.mjs`; `gltf-transform` + meshopt compress them for the web |
| **Charts, PDF** | recharts; jsPDF for the RFQ pack (loaded only when you download) |
| **Auth** | `src/proxy.ts` sends signed-out requests to `/login`; static files stay public |
| **Icons** | 3D icons rendered from [`prompts.md`](prompts.md) in Google Flow, with backgrounds removed and served as transparent WebP |

### The sample parts

| Part | Process · material | Envelope |
|---|---|---|
| DTV-HSG-0431 Bearing Housing Rev B | Sand cast · EN-GJL-250 (GG25) | 248 × 186 × 94 mm |
| DTV-BRK-0117 Cab Mount Bracket Rev B | Stamped · HC340LA, 2.5 mm | 186 × 64 × 92 mm |
| DTV-CVR-0288 Gearbox End Cover Rev C | HPDC · EN AC-43000 (AlSi10Mg) | 196 × 196 × 48 mm |

Each part ships as:
- **STEP AP214**, under the file names the app uses (they double as sample uploads);
- **STL** and **GLB**, plus a CAD edge-line file;
- a compressed **`*.web.glb`**, which the viewer loads.

See [`public/models`](public/models/README.md).

### Project structure

```text
src/
  app/                 one folder per route, plus login and dev/ui
  components/
    ui/                shared kit: badge, button, dropdown, field, segmented, table, primitives, mark
    layout/            app shell, sidebar, top bar with breadcrumb trail, account menu
    mulya/             3D viewers (lazy wrappers + implementations), page chrome, status chips
    <page>/            page-specific components (dashboard, estimate, new-estimate, compare, …)
  lib/
    costing/           cost model data and pure functions
    models/            part metadata, CAD loading, procedural fallbacks
    auth/              demo session
    marks.ts           3D icon registry per route, process, tool, agent and persona
  styles/tokens.css    Chronos semantic tokens (light + dark)
  proxy.ts             auth gate
public/
  brand/               logo, hero banner, social card
  images/marks/        3D icons (512 px, plus 96 and 192 px copies)
  models/              CAD parts and production tools
scripts/               CAD build, model compression, tool export, icon sizes
docs/                  GUIDE.md and screenshots
```

### Performance

Measured on a production build with Lighthouse (mobile, throttled):

| Page | Score before → after | Total blocking time |
|---|---|---|
| Estimate | 55 → **91** | 2,240 → 151 ms |
| New Estimate | 79 → **93** | 213 → 55 ms |
| Dashboard | 66 → **84** | 561 → 201 ms |
| 3D Models | 55 → **80** | 2,920 → 589 ms |

How it got there:
- **Static rendering:** every route prerenders statically. The theme is applied before paint by a tiny inline script, with no flash on reload.
- **Lazy heavy code:**
  - three.js, recharts and jsPDF are not in any page's initial bundle;
  - 3D viewers mount near the viewport, when the browser is idle, behind same-size placeholders, so layout shift is zero.
- **Smaller 3D files:** the meshopt-compressed meshes are 77 to 88% smaller.
- **Smaller icons:** icons load at 96 or 192 px with `srcSet`.
- **Caching:** HTML, JS and CSS are gzipped; hashed assets are cached immutably.

---

## Limits

- **No live connections.** Teamcenter, SAP and the other connectors are shown as they would be wired, read-only by design.
- **Rules, not learning.** Model v0.1 is cost-engineering formulas. Data & Model shows the path to a model trained on about 2,000 historical parts.
- **Three processes.** Stamping, sand casting and high-pressure die casting, with machining as a secondary operation.
- **Demo data.** The cab mount bracket's recorded mass (1.15 kg) doesn't match its own blank and sheet thickness. The CAD model weighs 0.51 kg.

## License

© Wayam AI. All rights reserved.
