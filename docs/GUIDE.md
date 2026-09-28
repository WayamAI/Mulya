# Mūlya · मूल्य · The end-to-end guide

*Mūlya* is Sanskrit for value, price, worth. It is a should-cost workbench for the people who design and buy truck parts. You give it a part, and it tells you what that part should cost to make, why, and what to change to bring the cost down, before a supplier quote arrives.

> **Prototype.** Every figure comes from a seeded catalogue of 50 parts and a rules-based cost model (v0.1) built on standard cost-engineering formulas. Nothing is connected to live PLM, ERP or sourcing systems, and nothing persists after you close the tab.

---

## 1. Who it is for

Mūlya has four users. They look at the same estimate and ask different questions of it. **Estimate History → Point of view** switches the table to each one's columns.

| Who | Their question | Where they live in Mūlya |
|---|---|---|
| **Design engineer** | *"What did I change, and did it help?"* | New Estimate, Estimate (what-ifs), Compare |
| **Cost engineer** | *"Where are we against target, and is the estimate holding up?"* | Dashboard, Estimate (breakdown, confidence), Rate Master, Data & Model |
| **Purchasing / sourcing** | *"What is this worth per year, and what are we committing to in tooling?"* | Estimate (price breaks, tooling), Report, the supplier RFQ pack |
| **Programme manager** | *"Which programmes are carrying cost risk?"* | Dashboard (programme filter, needs attention), Part Library |

**The primary user is the design engineer.** Most cost is committed at the drawing board. Mūlya puts a credible number in front of the engineer while the design can still change, instead of three weeks later in a quote.

---

## 2. The ideas you need

**Should-cost vs piece price.** *Should-cost* is what the part costs to make: material, process, tooling amortisation and overhead. *Piece price* adds supplier margin and logistics. The estimate page toggles between the two.

**Target and status.** Most parts carry a target price. Every status in the app shows colour, icon and label together, never colour alone:

| Badge | Meaning |
|---|---|
| ▲ **Over target** (red) | estimate is more than 5% above target |
| ● **On target** (grey) | within ±5% of target |
| ▼ **Under target** (green) | more than 5% below target |
| ○ **No target** | no target set yet |

**Confidence.** Each estimate has an accuracy band (for example *€ 43.09 to € 53.60* around *€ 48.20*). The band widens as more inputs are marked *unknown* rather than read from geometry or entered.

**Agents and the human checkpoint.** An estimate is produced by six agents working in order. **Geometry** reads the STEP file. **Process** recommends how to make the part. Then the run **stops**: costing a tool nobody agreed to would commit to a decision that isn't the agent's to make. Once a person confirms the process, **Cost**, **Tooling**, **Confidence** and **Supplier** continue.

**Tooling.** Each process has its own tool: a **pattern** for sand casting, a **die** for high-pressure die casting, and a **progressive die set** for stamping. Tool cost is amortised over the programme volume, and that is where the price breaks come from.

---

## 3. The end-to-end walkthrough (≈10 minutes)

This is the path to follow in a demo, or on your first day. Start the app (`npm run dev`, then open http://localhost:3000).

### Step 0: Sign in (`/login`)
- **Do** click the demo operator link under the form to fill in `operator@mulya.ai` / `estimate`, then **Enter the workbench**.
- **Notice** a deep link survives sign-in: open `/compare?a=…&b=…` while signed out and you land back on it after signing in.
- **Sign out** from the avatar menu in the top bar.

### Step 1: See where the portfolio stands (Dashboard, `/`)
- **Look at** the four tiles: *Estimates 47*, *Avg variance −2.4%*, *Over target 14*, *Annual saving € 182,400*.
- **Do** filter by programme or process. The tiles, chart and lists recalculate for the parts in view.
- **Notice** *Needs attention*, the three parts furthest over target. Clicking one opens its estimate.
- **Say:** *"This is the cost engineer's morning view: how the portfolio sits against target, and which parts to chase."*

### Step 2: Start an estimate from a STEP file (New Estimate, `/new-estimate`)
- **Do** click **Bearing Housing** under *Or start from a sample part*. You can also download a sample STEP from the links under the drop zone and drop it back in, or choose *Skip upload* to enter a part by hand.
- **Watch** the Supervisor strip. **Geometry** streams what it reads: volume 1,722 cm³, net mass 12.4 kg, ⌀120 bore, 6 × M12 on PCD 168, 8 mm minimum wall. It then scores complexity (68, *Complex*).
- **Watch** **Process** weigh the evidence (wall variation, mass, cored features) and recommend **Sand casting at 92%**.
- **Stop at** the red **Human checkpoint** banner. Nothing after this point runs until a person agrees.
- **Say:** *"The agents read and recommend. They don't commit us to a tool. That's the engineer's call."*

### Step 3: Confirm the route
- **Do** open the **Process** tab and read the evidence table. Optionally **Compare all three processes** to see why stamping is ruled out and die casting needs a redesign.
- **Do** click **Confirm: Sand cast**. The remaining four agents run.
- **Look at** the unlocked tabs:
  - **Inputs:** material grade, geometry and commercial fields, each marked *read*, *assumed* or *unknown*.
  - **Tooling:** the pattern in 3D (open and close it with the slider), plan view, build cost and amortisation chart.
  - **Confidence:** the estimate class and how the accuracy band moves as you mark inputs unknown.
  - **Share:** the supplier RFQ pack, with drawing sheet, breakdown CSV and PDF.
- **Try** marking an input *unknown* and watch the confidence band widen.

### Step 4: Read the estimate (Estimate, `/estimate`)
- **Do** click **Calculate Estimate**.
- **Look at** the headline: **€ 48.20** per piece (range € 43.09 to € 53.60), **▲ € 6.20 over target** of € 42.00 (+14.8%). The supplier's actual quote was € 51.40, so the estimate lands 6.2% below it.
- **Do** rotate the part in the 3D viewer. Switch Iso / Front / Top / Right and turn on edges.
- **Do** change the **lot quantity** (1 → 10,000) and watch the lot total and the price-break chart move as tooling amortises.
- **Read** the **Cost breakdown** (raw material, melting and pouring, moulding and cores, fettling, machining, overhead) and the **Top cost drivers**, for example *Wall thickness 8 mm (+€ 5.20 vs 6 mm)*.

### Step 5: Ask "what if?"
- **Do** apply a **what-if** from the list, such as reducing the wall or relaxing a tolerance. The price, the variance to target and the status badge update together.
- **Do** save the scenario as a new revision (Rev B → Rev C).
- **Say:** *"This is the design engineer's loop: change the design, see the cost, and stay inside one tool."*

### Step 6: Prove it helped (Compare, `/compare`)
- **Notice** it opens ready to read. Your new estimate is already the **Candidate (B)** and the latest Bearing Housing revision on file is the **Baseline (A)**. With no session estimate it opens on Rev A vs Rev C, so there's never an empty page.
- **Do** use **Change** on either slot to pick any revision, library part or session estimate, and **⇄** to swap sides. The **Suggested** chips jump straight to useful pairs.
- **Look at** the verdict line, the four KPI tiles and the **Cost walk**:
  - **Verdict:** e.g. "Candidate is € 6.10 cheaper per piece".
  - **KPI tiles:** Δ per piece, annual impact (edit the volume), each side vs target, and the tooling change with its breakeven.
  - **Cost walk:** a waterfall from A's price to B's that shows which category moved the money.
- **Read** **Biggest movers**, **What changed** (process, material, wall and tool, old → new) and the **line-by-line** table.
  - The table is grouped into Material, Conversion, Tooling and Overhead & margin.
  - Equivalent lines are paired even when a process calls them something different ("Moulding / machine → Die casting machine").
  - Use **Changed only** to cut the noise.
- **Share** the exact comparison with **Copy link** (`/compare?a=…&b=…`) or **Download CSV**.

### Step 7: Hand it over (Report, `/report`, and the Share tab)
- **Do** open **Cost Report**, a print-ready should-cost sheet (use the browser's print dialog to save it as PDF).
- **Do** download the **RFQ pack** from the Share tab, and the part itself as **STEP / STL / GLB** from **3D Models**.
- **Say:** *"Purchasing walks into the supplier negotiation knowing what the part should cost, and why."*

### Step 8: Where the numbers come from
- **Rate Master (`/rates`):** material €/kg and scrap return, machine hourly rates, regional labour factors, and overhead and margin. Edit a value and a dot marks the changed row; *Save (n)* shows how many edits are pending.
- **Data & Model (`/model`):** what drives the estimate (feature weights), the systems of record it reads from, and the roadmap from rules-based v0.1 to a model trained on about 2,000 historical parts (typically ±8 to 12% error against quoted price).
- **Agents (`/agents`):** what each agent takes, produces, waits for and reads from, and exactly where it stops.

---

## 4. Page reference

| Page | Route | What it is for |
|---|---|---|
| Dashboard | `/` | Portfolio KPIs, variance trend, parts needing attention, recent estimates |
| New Estimate | `/new-estimate` | Upload or pick a part, watch the agents, confirm the process, fill inputs |
| Estimate | `/estimate` | Price, range, target status, 3D part, breakdown, drivers, price breaks, tooling, what-ifs |
| Report | `/report` | Printable should-cost sheet |
| Part Library | `/library` | All 50 parts: search, filter by process, material, programme, status and region, sort, open |
| 3D Models | `/models` | Every part and tool in 3D, with STEP / STL / GLB downloads |
| Estimate History | `/history` | Every run grouped by day, seen from each persona's point of view |
| Compare Estimates | `/compare` | An existing estimate against a new one, line by line |
| Agents | `/agents` | The crew, the two phases and the checkpoint |
| Rate Master | `/rates` | Editable material, machine, regional and overhead rates |
| Data & Model | `/model` | Model facts, feature weights, connectors, roadmap |

**Everywhere:**
- The top-bar **currency** switch (EUR / USD / GBP) re-prices the whole app.
- **Ctrl/⌘ K** jumps to search.
- The sidebar toggles light and dark themes.

---

## 5. Sample files

The three sample parts ship as STEP AP214 files, with STL and GLB exports, in `public/models/parts/`. The app serves them from `/models/parts/`, and you can download them from **3D Models** or the New Estimate drop zone:

| File | Part | Process · material |
|---|---|---|
| `DTV-HSG-0431_Bearing-Housing_RevB.step` | Bearing housing, 248 × 186 × 94 mm, 12.4 kg | Sand cast · EN-GJL-250 (GG25) |
| `DTV-BRK-0117_Cab-Mount-Bracket_RevB.step` | Cab mount bracket, 2.5 mm sheet, 4 bends, 1.15 kg | Stamped · HC340LA |
| `DTV-CVR-0288_Gearbox-End-Cover_RevC.step` | Gearbox end cover, 196 × 196 × 48 mm, 2.8 kg | High-pressure die cast · AlSi10Mg |

---

## 6. What it is not (yet)

- **No live connections.** Teamcenter, SAP and the other connectors are shown as they would be wired, and all are read-only by design.
- **No persistence.** Estimates you create live in this tab's session only.
- **Rules, not learning.** Model v0.1 is cost-engineering formulas, and its figures are illustrative. The roadmap on Data & Model shows the path to a trained model.
- **Three processes.** Stamping, sand casting and high-pressure die casting, with machining as a secondary operation on castings.
