# Mūlya 3D icon prompts

Copy these into **Google Flow** (or Imagen, Midjourney or Ideogram). They are written for **Mūlya**, a dark, precise should-cost workbench for truck-part engineering. They are not generic finance clipart.

The marks sit on page headers, KPI tiles, agent cards, empty states and the 3D Models gallery. The Lucide icons in the sidebar stay as they are; these are the dimensional marks for cards and empty surfaces. They share the Chronos family look, with the same orange, graphite and studio light.

**Where to put them:** save each render as a PNG at `public/images/marks/<filename>`, using the filename given in each prompt (e.g. `public/images/marks/mark-casting.png`). When they're in, the app picks them up through one `Mark` component and a route/status → mark map.

---

## Color lock (use this every time)

Mūlya orange is token `--ref-orange-500`, the same hue as the logo tile.

| Role | Hex | Token |
| --- | --- | --- |
| Hero / body | `#FF7B1C` | `--ref-orange-500` |
| Rim / highlight | `#FFB365` | `--ref-orange-300` |
| Mid shade | `#FF963D` | `--ref-orange-400` |
| Recess / core | `#C1460F` | `--ref-orange-700` |
| Deep shadow | `#9A3814` | `--ref-orange-800` |
| Ember | `#431507` | `--ref-orange-950` |
| Studio void | `#101010` | `--ref-gray-950` |
| Graphite body | `#191919` | `--ref-gray-900` |

Don't substitute coral, amber, gold or red. If a second material is needed, it is **dark graphite** or **raw machined steel**, never a second brand color.

---

## Style prefix (paste before every subject)

```
3D product icon, one object, centered, 1:1 square, 8k, studio key light from upper left, dark graphite #101010 void, no floor shadow fade, Mūlya orange #FF7B1C as the only chromatic color with #FFB365 rim light and #C1460F recesses, satin polymer and brushed graphite with a single glass specular, precise industrial-engineering feel, crisp silhouette readable at 64px, no text, no letters, no numbers, no logos, no human faces, no watermarks, no extra props
```

Then append the subject line.

---

## Hero image (optional)

Used as the social/OG card and an optional dashboard banner. Save as `public/brand/mulya-hero.jpg` (16:9).

```
Cinematic still for a manufacturing should-cost workbench, 16:9 landscape 3840x2160, 8k, photoreal 3D product cinema. A cast-iron bearing housing, a stamped steel hat bracket and a die-cast aluminium gearbox cover float in a graphite #101010 void, each partly dissolving into orange #FF7B1C wireframe on the side facing the camera, as if being measured. Thin orange measurement lines and dimension arrows trace their edges, with no numbers. A single Mūlya-orange price-tag form hangs above them, tied with a graphite cord. #FFB365 rim light from upper left, #C1460F recesses, shallow depth of field, anamorphic bokeh. No people, no factories full of workers, no UI screens with readable text, no letters, no numbers, no logos, no currency symbols, no watermarks, no Gemini sparkle. Hue locked to #FF7B1C, not red, not amber, not gold.
```

---

## Pages

Page-header marks, one per route.

1. `mark-dashboard.png`: a 3D Mūlya-orange `#FF7B1C` command console slab with three raised graphite gauges as blank dials, cost overview
2. `mark-new-estimate.png`: a 3D Mūlya-orange `#FF7B1C` precision caliper closing on a small graphite cube, starting an estimate
3. `mark-estimate.png`: a 3D Mūlya-orange `#FF7B1C` price tag with a machined steel eyelet and a graphite cord, the estimate result
4. `mark-report.png`: a 3D Mūlya-orange `#FF7B1C` engineering report folio, closed, graphite spine, blank cover
5. `mark-library.png`: a 3D Mūlya-orange `#FF7B1C` parts cabinet of five shallow drawers, one drawer slightly open showing a graphite part, part library
6. `mark-models.png`: a 3D Mūlya-orange `#FF7B1C` isometric cube split into solid and wireframe halves, 3D models
7. `mark-history.png`: a 3D Mūlya-orange `#FF7B1C` revision stack of three offset plates, the top one lifted, graphite spacers, estimate history
8. `mark-compare.png`: a 3D Mūlya-orange `#FF7B1C` balance scale with two graphite pans, one slightly lower, compare estimates
9. `mark-agents.png`: a 3D Mūlya-orange `#FF7B1C` relay baton passing between two graphite hands made of plain blocks (not human), agent crew
10. `mark-rates.png`: a 3D Mūlya-orange `#FF7B1C` set of three vertical slider faders on a graphite mixing plate, rate master
11. `mark-model.png`: a 3D Mūlya-orange `#FF7B1C` faceted crystal lattice sitting on a graphite data tray, data and model
12. `mark-guide.png`: a 3D Mūlya-orange `#FF7B1C` compass rose disc with a graphite needle, getting started guide

## Manufacturing processes

Used on process cards, the process verdict and library filters.

13. `mark-casting.png`: a 3D Mūlya-orange `#FF7B1C` foundry ladle tilting, a thin glowing pour stream into a graphite sand flask, sand casting
14. `mark-die-casting.png`: a 3D Mūlya-orange `#FF7B1C` two-half steel die block clamped shut, a small shot sleeve, graphite platens, high-pressure die casting
15. `mark-stamping.png`: a 3D Mūlya-orange `#FF7B1C` press ram over a graphite die with a bent sheet-metal hat section between them, stamping
16. `mark-machining.png`: a 3D Mūlya-orange `#FF7B1C` end-mill cutter with a curling metal chip, graphite collet, secondary machining

## Tooling

Used on the Tooling tab, the mould viewer legend and tooling KPIs.

17. `mark-pattern.png`: a 3D Mūlya-orange `#FF7B1C` split wooden-style casting pattern with a graphite core print, sand-cast pattern
18. `mark-die.png`: a 3D Mūlya-orange `#FF7B1C` die insert with a cavity and four polished guide pins, die-cast tool
19. `mark-progressive.png`: a 3D Mūlya-orange `#FF7B1C` progressive die strip showing four stations as the strip transforms step by step, graphite carrier
20. `mark-amortisation.png`: a 3D Mūlya-orange `#FF7B1C` tool block slowly dissolving into a stack of small coins, tooling amortisation

## Agents (the crew)

Used on the agent strip, agent cards on `/agents`, and the live run in New Estimate.

21. `mark-agent-supervisor.png`: a 3D Mūlya-orange `#FF7B1C` conductor's baton balanced on a graphite podium, supervisor
22. `mark-agent-geometry.png`: a 3D Mūlya-orange `#FF7B1C` wireframe solid being scanned by a graphite laser gantry, geometry agent
23. `mark-agent-process.png`: a 3D Mūlya-orange `#FF7B1C` three-way rail switch with one route lit, graphite sleepers, process agent
24. `mark-agent-cost.png`: a 3D Mūlya-orange `#FF7B1C` abacus with graphite rods and orange beads, cost agent
25. `mark-agent-tooling.png`: a 3D Mūlya-orange `#FF7B1C` tool block on a graphite surface plate with a height gauge, tooling agent
26. `mark-agent-confidence.png`: a 3D Mūlya-orange `#FF7B1C` gauge needle in the upper arc of a graphite dial, no tick labels, confidence agent
27. `mark-agent-supplier.png`: a 3D Mūlya-orange `#FF7B1C` sealed RFQ document tube with a graphite cap, supplier agent
28. `mark-agent-thermal.png`: a 3D Mūlya-orange `#FF7B1C` casting cross-section with a heat-gradient glow in its thick section, thermal agent
29. `mark-checkpoint.png`: a 3D Mūlya-orange `#FF7B1C` raised boom barrier on a graphite post, human checkpoint

## Status and variance

Used in empty states and KPI tiles only. Inline badges stay as icon, colour and label, so don't replace those.

30. `mark-over-target.png`: a 3D Mūlya-orange `#FF7B1C` upward chevron prism bursting through a graphite ceiling plate, over target
31. `mark-on-target.png`: a 3D Mūlya-orange `#FF7B1C` arrow resting in the bullseye of a graphite target disc, on target
32. `mark-under-target.png`: a 3D Mūlya-orange `#FF7B1C` downward chevron prism settling into a graphite groove, under target
33. `mark-no-target.png`: a 3D Mūlya-orange `#FF7B1C` empty target ring with no arrow, graphite stand, no target set
34. `mark-saving.png`: a 3D Mūlya-orange `#FF7B1C` coin sliding out of a machined steel slot into a graphite tray, annual saving
35. `mark-risk.png`: a 3D Mūlya-orange `#FF7B1C` warning prism (triangular volume) on a graphite base, cost risk

## Dashboard KPIs

36. `mark-kpi-estimates.png`: a 3D Mūlya-orange `#FF7B1C` stack of blank index cards squared on a graphite block, estimates count
37. `mark-kpi-variance.png`: a 3D Mūlya-orange `#FF7B1C` spirit level with the bubble just off centre, graphite body, average variance
38. `mark-kpi-over.png`: a 3D Mūlya-orange `#FF7B1C` overflowing measuring cup, graphite base, parts over target
39. `mark-kpi-trend.png`: a 3D Mūlya-orange `#FF7B1C` time-series ribbon frozen in graphite air, dipping toward the right, variance trend

## Estimate anatomy

Used on the cost breakdown, cost drivers, price breaks, what-ifs and confidence sections.

40. `mark-material.png`: a 3D Mūlya-orange `#FF7B1C` raw ingot with a graphite billet beside it, raw material
41. `mark-labour.png`: a 3D Mūlya-orange `#FF7B1C` spinning work gear caught mid-rotation, graphite teeth, machine and labour
42. `mark-overhead.png`: a 3D Mūlya-orange `#FF7B1C` factory roof truss section, graphite beams, overhead
43. `mark-driver.png`: a 3D Mūlya-orange `#FF7B1C` torque wrench with a graphite handle, top cost driver
44. `mark-price-breaks.png`: a 3D Mūlya-orange `#FF7B1C` descending staircase of four blocks, graphite risers, price breaks by volume
45. `mark-what-if.png`: a 3D Mūlya-orange `#FF7B1C` two-way lever switch mid-throw on a graphite plate, what-if scenario
46. `mark-confidence-band.png`: a 3D Mūlya-orange `#FF7B1C` bracket-shaped calliper jaws around a small glowing bead, accuracy range
47. `mark-unknown-input.png`: a 3D Mūlya-orange `#FF7B1C` sealed crate with one open corner showing darkness, graphite straps, unknown input

## Hand-off and data

48. `mark-rfq-pack.png`: a 3D Mūlya-orange `#FF7B1C` bundled supplier pack of a drawing roll, a folder and a small part tied with a graphite band, RFQ pack
49. `mark-drawing.png`: a 3D Mūlya-orange `#FF7B1C` rolled engineering drawing, partly unrolled, blank sheet, graphite end caps
50. `mark-step-file.png`: a 3D Mūlya-orange `#FF7B1C` folded file tile with a small wireframe solid rising out of it, STEP upload
51. `mark-plm.png`: a 3D Mūlya-orange `#FF7B1C` vault cylinder of stacked revision discs, graphite core, PLM connection
52. `mark-erp.png`: a 3D Mūlya-orange `#FF7B1C` ledger block with graphite tabs, ERP rates and prices
53. `mark-sourcing.png`: a 3D Mūlya-orange `#FF7B1C` handshake bridge made of two interlocking blocks (not hands), sourcing and quotes
54. `mark-connector.png`: a 3D Mūlya-orange `#FF7B1C` industrial plug seated in a graphite socket, connected system
55. `mark-catalogue.png`: a 3D Mūlya-orange `#FF7B1C` spreadsheet slab of blank cells rising into a lattice, historical catalogue upload

## Personas

Used on the History point-of-view switcher and the guide. Objects only, never people.

56. `mark-persona-design.png`: a 3D Mūlya-orange `#FF7B1C` drafting compass standing on a graphite sheet, design engineer
57. `mark-persona-cost.png`: a 3D Mūlya-orange `#FF7B1C` slide rule with graphite cursor, cost engineer
58. `mark-persona-purchasing.png`: a 3D Mūlya-orange `#FF7B1C` sealed purchase-order envelope with a graphite wax bead, no writing, purchasing
59. `mark-persona-programme.png`: a 3D Mūlya-orange `#FF7B1C` truck chassis ladder frame in miniature, graphite axles, programme manager

## Empty states

Displayed at 88 to 120px.

60. `mark-empty-search.png`: a 3D Mūlya-orange `#FF7B1C` magnifier over an empty graphite tray, no results
61. `mark-empty-compare.png`: a 3D Mūlya-orange `#FF7B1C` empty second pan on a balance scale waiting for a weight, nothing to compare yet
62. `mark-empty-upload.png`: a 3D Mūlya-orange `#FF7B1C` open drop tray with a faint glowing outline where a part should sit, drop a STEP file
63. `mark-not-found.png`: a 3D Mūlya-orange `#FF7B1C` missing puzzle-piece gap in a graphite plate, page not found

---

## How to generate

- **One subject per image.** Don't collage several prompts into one render.
- **Export a square PNG.** Use a transparent background if Flow allows it; otherwise `#101010`, so it sits on `bg-container` in dark mode. In light mode they'll sit inside a graphite puck, so dark backgrounds are fine.
- **Size:** target **1024 × 1024**. The UI shows them at about 32 to 48px in headers and cards, 56px on KPI tiles, and 88 to 120px on empty states.
- **Consistency:** in Flow, keep the style prefix identical and reuse the first good render as the style reference image for the rest of the batch.
- **If it adds text:** rerun with `no text, no letters, no numbers, no currency symbols` at the end.
- **If the orange drifts** toward red or gold, append `hue locked to #FF7B1C, not red, not amber`.
- **No real brands:** no Siemens, SAP, CATIA or truck-maker logos. Prompts 51 to 55 stay abstract.

## Checklist: filename → where it appears

| Group | Files | Used on |
|---|---|---|
| Pages | `mark-dashboard` … `mark-guide` (1 to 12) | Page headers, top-bar search results |
| Processes | 13 to 16 | Process verdict, process comparison cards, library filter chips |
| Tooling | 17 to 20 | Tooling tab, mould viewer, tooling KPIs |
| Agents | 21 to 29 | Agent strip, `/agents` cards, run console, checkpoint banner |
| Status | 30 to 35 | KPI tiles, "needs attention", empty states |
| KPIs | 36 to 39 | Dashboard tiles |
| Estimate | 40 to 47 | Breakdown rows, drivers, price breaks, what-ifs, confidence |
| Hand-off / data | 48 to 55 | Share tab, report, Data & Model connectors |
| Personas | 56 to 59 | History point of view, guide |
| Empty states | 60 to 63 | Library, compare, upload, 404 |
