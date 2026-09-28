<div align="center">

<img src="public/brand/mulya-mark.svg" width="72" height="72" alt="Mūlya" />

# Mūlya · मूल्य

**Should-cost estimation for truck part engineering.**

*Mūlya* is Sanskrit for value, price, worth.

</div>

Mūlya tells a design engineer what a part **should** cost to make, why, and what to change to bring the cost down, while the design can still change and before a supplier quote arrives. You give it a STEP file. A crew of agents reads the geometry and recommends a manufacturing process, then stops for a human checkpoint. After you confirm, it costs the part end to end: material, conversion, tooling, overhead and margin, with price breaks, what-ifs, a confidence band and a supplier RFQ pack.

It is part of the [Wayam AI](https://github.com/WayamAI) family and shares the Chronos design system.

> **Prototype.** Every figure comes from a seeded catalogue of 50 parts and a rules-based cost model (v0.1) built on standard cost-engineering formulas. There are no live PLM, ERP or sourcing connections, and nothing persists beyond the browser tab.

![Estimate result: Bearing Housing Rev B at € 48.20, € 6.20 over target, with the real CAD part in 3D](docs/screenshots/estimate.webp)

---

## Contents

- [Who it is for](#who-it-is-for)
- [What is in here](#what-is-in-here)
- [Screenshots](#screenshots)
- [Getting started](#getting-started)
- [Scripts](#scripts)
- [How it is built](#how-it-is-built)
- [3D models](#3d-models)
- [Project structure](#project-structure)
- [Performance](#performance)
- [Limits](#limits)

## Who it is for

The same estimate answers four different questions. **Estimate History → Point of view** switches between them.

| Who | Their question |
|---|---|
| **Design engineer** (primary user) | *What did I change, and did it help?* |
| **Cost engineer** | *Where are we against target, and is the estimate holding up?* |
| **Purchasing** | *What is this worth per year, and what are we committing to in tooling?* |
| **Programme manager** | *Which programmes are carrying cost risk?* |

A full walkthrough, with concepts and a ten-minute demo script, is in **[docs/GUIDE.md](docs/GUIDE.md)**.

## What is in here

| Page | Route | What it does |
|---|---|---|
| **Dashboard** | `/` | Estimates, average variance, parts over target and annual saving, with sparklines, the variance trend, parts needing attention and a live 3D part |
| **New Estimate** | `/new-estimate` | Upload or pick a STEP file. Six agents read it, recommend a process and **stop at a human checkpoint**, then cost the confirmed route |
| **Estimate** | `/estimate` | Piece price and confidence range, target status, 3D part, cost breakdown, top drivers, price breaks, tooling and what-ifs |
| **Report** | `/report` | Printable should-cost sheet |
| **Part Library** | `/library` | 50 parts: search, filter by process, material, programme, status and region, and sort |
| **3D Models** | `/models` | Real CAD parts and their production tools, with STEP / STL / GLB downloads |
| **Estimate History** | `/history` | Every run grouped by day, seen from each persona's point of view |
| **Compare Estimates** | `/compare` | Any two estimates: the verdict, a cost-walk waterfall, biggest movers, a spec diff and a line-by-line table that pairs equivalent lines across processes. Shareable via `/compare?a=…&b=…` and exportable as CSV |
| **Agents** | `/agents` | The crew, the two phases and the checkpoint between them |
| **Rate Master** | `/rates` | Editable material, machine, regional and overhead rates |
| **Data & Model** | `/model` | Feature weights, systems of record, and the roadmap to a trained model |

Across every page:
- **Currency:** switch EUR / USD / GBP from the top bar.
- **Search:** press **Ctrl/⌘ K**.
- **Theme:** light and dark, with no flash on reload.
- **Sign in:** a cookie-based demo sign-in.

## Screenshots

| | |
|---|---|
| ![Sign in](docs/screenshots/login.webp) **Sign in** | ![Dashboard](docs/screenshots/dashboard.webp) **Dashboard** |
| ![New Estimate at the human checkpoint](docs/screenshots/new-estimate.webp) **New Estimate: the agents stop at the human checkpoint** | ![Compare Estimates](docs/screenshots/compare.webp) **Compare: verdict, KPIs and the cost walk** |
| ![3D Models](docs/screenshots/models.webp) **3D Models: real CAD parts and tools** | ![Agents](docs/screenshots/agents.webp) **Agents: the crew and the checkpoint** |
| ![Rate Master in dark mode](docs/screenshots/rates.webp) **Rate Master (dark)** | ![Estimate](docs/screenshots/estimate.webp) **Estimate result** |

## Getting started

Requires **Node.js 20+**.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Visits without a session go to sign-in.

### Demo operator

| | |
|---|---|
| Email | `operator@mulya.ai` |
| Password | `estimate` |

Click the demo link under the form to fill both in. This is a local cookie session (`mulya-session`), not an identity provider. Sign out from the avatar menu in the top bar. Deep links survive sign-in: `/login?next=…` returns you to where you were headed.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build (all routes prerender statically) |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run cad` | Rebuild the real CAD parts with OpenCascade (about 2 min) |
| `npm run models:web` | Compress the CAD meshes and edges into the viewer's `*.web.glb` (meshopt) |
| `npm run models` | Export the production tools (pattern, progressive die, HPDC die) as GLB |
| `npm run marks:sizes` | Generate the 96 px and 192 px copies of the 3D marks |

## How it is built

- **[Next.js 16](https://nextjs.org) (App Router), React 19, TypeScript (strict).**
- **Tailwind CSS v4** on the **Chronos design system**:
  - semantic tokens live in `src/styles/tokens.css`;
  - Geist for UI text, Michroma for titles and hero figures;
  - light by default, dark as a toggle.
- **Shared UI kit** in `src/components/ui`:
  - badges, where every status carries an icon and a label, never colour alone;
  - tables, fields with units and edited/invalid states, and a custom accessible dropdown;
  - segmented controls, KPI tiles with sparklines, empty states and skeletons.
  - Browse them all at **`/dev/ui`**.
- **Cost logic** in `src/lib/costing`: pure, typed functions and data (the estimate subject, breakdowns, tooling, process detection, agents, comparison).
- **3D** with **three.js**:
  - a shared stage in `src/components/mulya/three-stage.ts` with ACES tone mapping, a room environment for metal reflections, soft shadows and orbit controls;
  - view presets, CAD edge lines, wireframe, X-ray, a section plane and fullscreen.
- **Charts** with **recharts**; **PDF** RFQ packs with **jsPDF**, loaded only on download.
- **Auth:** `src/proxy.ts` redirects signed-out requests to `/login`. Static files stay public.
- **3D marks:** 3D icons rendered in Google Flow from the prompts in [`prompts.md`](prompts.md), with backgrounds removed, served as transparent WebP from `public/images/marks`.

## 3D models

The three sample parts are **real B-rep solids**, modelled with OpenCascade (`replicad`) in `scripts/build-cad.mjs` to the dimensions the app shows:

| Part | Process · material | Envelope |
|---|---|---|
| DTV-HSG-0431 Bearing Housing Rev B | Sand cast · EN-GJL-250 (GG25) | 248 × 186 × 94 mm |
| DTV-BRK-0117 Cab Mount Bracket Rev B | Stamped · HC340LA, 2.5 mm | 186 × 64 × 92 mm |
| DTV-CVR-0288 Gearbox End Cover Rev C | HPDC · EN AC-43000 (AlSi10Mg) | 196 × 196 × 48 mm |

Each part ships as:
- **STEP AP214:** carries the original header, product record and design notes, under the file names the app uses (e.g. `DTV-HSG-0431_Bearing-Housing_RevB.step`).
- **STL** and **GLB**.
- **Edge lines:** a CAD feature-edge file.
- **Viewer file:** a meshopt-compressed `*.web.glb` that the viewer loads, about 80 to 90% smaller.

Everything is in [`public/models`](public/models/README.md). The STEP files double as sample uploads for New Estimate.

## Project structure

```text
src/
  app/                 routes (App Router); one folder per page, plus login and dev/ui
  components/
    ui/                shared kit: badge, button, dropdown, field, segmented, table, primitives, mark
    layout/            app shell, sidebar, top bar (breadcrumb trail), account menu
    mulya/             3D viewers (lazy wrappers + implementations), page chrome, status chips
    <page>/            page-specific components (dashboard, estimate, new-estimate, compare, …)
  lib/
    costing/           cost model data and pure functions
    models/            part metadata, CAD loading, procedural geometry fallbacks
    auth/              demo session
    marks.ts           registry of 3D marks per route, process, tool, agent and persona
  styles/tokens.css    Chronos semantic tokens (light + dark)
  proxy.ts             auth gate
public/
  brand/               logo mark, hero banner, social card
  images/marks/        3D marks (512 px, plus 96 and 192 px copies)
  models/              CAD parts and production tools
scripts/               CAD build, model compression, tool export, mark sizes
docs/                  GUIDE.md and screenshots
```

## Performance

Measured on a production build with Lighthouse (mobile, throttled):
- **Static rendering:** every route prerenders statically. The theme is applied before paint by a tiny inline script instead of reading cookies on the server.
- **Lazy heavy code:**
  - three.js, recharts and jsPDF are not in any page's initial bundle;
  - 3D viewers mount when they near the viewport and the browser is idle, behind same-size placeholders, so there is zero layout shift.
- **Smaller 3D files:** the viewer meshes are meshopt-compressed, e.g. the bearing housing is 169 KB gzipped, down from 734 KB. Two viewers of the same part share one fetch.
- **Right-sized icons:** marks load as 96 or 192 px copies with a `srcSet`. Page-header marks load at high priority.
- **Caching:** HTML, JS and CSS are gzip-compressed; hashed assets are cached immutably, and public media for a week.

## Limits

- **No live connections:** Teamcenter, SAP and the other connectors are shown as they would be wired, read-only by design.
- **Rules, not learning:** model v0.1 is cost-engineering formulas. Data & Model shows the path to a model trained on about 2,000 historical parts.
- **Three processes:** stamping, sand casting and high-pressure die casting, with machining as a secondary operation.
- **Demo data:** the cab mount bracket's recorded mass (1.15 kg) is inconsistent with its own blank and sheet thickness. The CAD model is 0.51 kg.

## License

Private. Wayam AI.
