/**
 * Supplier pack exports: the RFQ PDF (jsPDF + autotable, loaded on demand),
 * the cost-breakdown CSV and browser download helpers. The PDF is paper, so its
 * colours are literal RGB.
 */

import type { CellHookData, HAlignType, Styles } from "jspdf-autotable";
import type { ComplexityProfile, StepFile, ThermalProfile } from "@/lib/costing/agents";
import type { CostLine } from "@/lib/costing/estimate";
import type { ConfidenceProfile } from "@/lib/costing/estimate-subject";
import { PROCESS_NAMES, type ProcessInference } from "@/lib/costing/process-detection";
import type { ToolSpec } from "@/lib/costing/tooling";
import type { Currency } from "@/lib/format";

/** Everything the Share tab assembles for a supplier. */
export interface SupplierPack {
  inference: ProcessInference;
  process: string;
  cad: StepFile;
  complexity: ComplexityProfile;
  confidence: ConfidenceProfile;
  tool: ToolSpec;
  thermal?: ThermalProfile;
  lines: CostLine[];
  grade: string;
}

export interface PackDocument extends SupplierPack {
  currency: Currency;
  symbol: string;
  issued: string;
  /** PNG data URL of the drawing sheet, when it rendered. */
  drawingSheet: string | null;
}

// --- CSV --------------------------------------------------------------------

/** Cost breakdown and tool build lines as CRLF CSV. */
export function buildBreakdownCsv(pack: PackDocument): string {
  const total = pack.lines.reduce((sum, line) => sum + line.value, 0);
  const q = (value: string) => `"${value.replace(/"/g, '""')}"`;
  return [
    ["Part", "Part number", "Process", "Material", "Annual volume", "Currency"].map(q).join(","),
    [
      pack.inference.partName,
      pack.inference.partNumber,
      PROCESS_NAMES[pack.process],
      pack.grade,
      String(pack.tool.annualVolume),
      pack.currency,
    ]
      .map(q)
      .join(","),
    "",
    ["Cost line", `Value per piece (${pack.currency})`].map(q).join(","),
    ...pack.lines.map((line) => [q(line.label), line.value.toFixed(2)].join(",")),
    [q("Total"), total.toFixed(2)].join(","),
    "",
    ["Tool build line", "Basis", `Cost (${pack.currency})`].map(q).join(","),
    ...pack.tool.lines.map((line) => [q(line.label), q(line.basis ?? ""), line.value.toFixed(0)].join(",")),
    [q("Tool build cost"), q(""), pack.tool.cost.toFixed(0)].join(","),
  ].join("\r\n");
}

// --- downloads ----------------------------------------------------------------

export function downloadFile(fileName: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function downloadDataUrl(fileName: string, dataUrl: string) {
  const [header, body] = dataUrl.split(",");
  const type = header.match(/data:([^;]+)/)?.[1] ?? "application/octet-stream";
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  downloadFile(fileName, new Blob([bytes], { type }));
}

export function downloadText(fileName: string, text: string, mime: string) {
  downloadFile(fileName, new Blob([text], { type: `${mime};charset=utf-8` }));
}

// --- PDF ------------------------------------------------------------------------

type Rgb = [number, number, number];

const PAGE_MARGIN = 15;
const INK: Rgb = [31, 31, 31];
const MUTED: Rgb = [100, 100, 100];
const HAIRLINE: Rgb = [212, 212, 212];
const ALERT: Rgb = [185, 37, 52];

/** Plain money for the PDF (standard fonts only, ASCII minus). */
const money = (value: number, symbol: string, digits = 2) =>
  `${value < 0 ? "-" : ""}${symbol} ${Math.abs(value).toLocaleString("en-GB", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;

/** Builds the A4 RFQ pack. */
export async function buildRfqPdf(pack: PackDocument): Promise<Blob> {
  const [{ jsPDF }, autoTableModule] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const autoTable = autoTableModule.default;
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const contentW = pageW - PAGE_MARGIN * 2;
  const total = pack.lines.reduce((sum, line) => sum + line.value, 0);
  const lifetime = pack.tool.annualVolume * pack.tool.productionLife;
  const reference = `RFQ-${pack.inference.partNumber.replace(/[^A-Z0-9]/gi, "")}-${pack.issued.replace(/\D/g, "").slice(0, 8)}`;
  const lastY = () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  let y = PAGE_MARGIN;
  const ensure = (needed: number) => {
    if (y + needed > pageH - PAGE_MARGIN - 12) {
      doc.addPage();
      y = PAGE_MARGIN;
    }
  };
  const heading = (number: string, title: string) => {
    ensure(16);
    y += 4;
    doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(...INK);
    doc.text(`${number}  ${title.toUpperCase()}`, PAGE_MARGIN, y);
    y += 1.5;
    doc.setDrawColor(...INK).setLineWidth(0.5);
    doc.line(PAGE_MARGIN, y, pageW - PAGE_MARGIN, y);
    y += 5;
  };
  const paragraph = (text: string, muted = true) => {
    doc.setFont("helvetica", "normal").setFontSize(8);
    doc.setTextColor(...(muted ? MUTED : INK));
    const lines: string[] = doc.splitTextToSize(text, contentW);
    ensure(lines.length * 3.6 + 2);
    doc.text(lines, PAGE_MARGIN, y);
    y += lines.length * 3.6 + 2;
  };
  /** Label/value pairs laid out in `columns` column pairs, filled top to bottom. */
  const pairs = (rows: [string, string][], columns = 1) => {
    const perColumn = Math.ceil(rows.length / columns);
    const body: string[][] = [];
    for (let r = 0; r < perColumn; r++) {
      const row: string[] = [];
      for (let c = 0; c < columns; c++) {
        const item = rows[c * perColumn + r];
        row.push(item?.[0] ?? "", item?.[1] ?? "");
      }
      body.push(row);
    }
    const columnStyles: Record<number, Partial<Styles>> = {};
    for (let c = 0; c < columns; c++) {
      columnStyles[c * 2] = { textColor: MUTED, cellWidth: (contentW / columns) * 0.46 };
      columnStyles[c * 2 + 1] = { textColor: INK, font: "courier" };
    }
    autoTable(doc, {
      startY: y,
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
      body,
      theme: "plain",
      styles: { fontSize: 8, cellPadding: { top: 1, bottom: 1, left: 0, right: 2 } },
      columnStyles,
    });
    y = lastY() + 3;
  };
  const grid = (head: string[], body: string[][], options: { align?: HAlignType[]; lastBold?: boolean } = {}) => {
    const columnStyles: Record<number, Partial<Styles>> = {};
    (options.align ?? []).forEach((align, index) => {
      columnStyles[index] = { halign: align, ...(align === "right" ? { font: "courier" } : {}) };
    });
    autoTable(doc, {
      startY: y,
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
      head: [head],
      body,
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 1.6, lineColor: HAIRLINE, lineWidth: 0.1 },
      headStyles: { fillColor: [245, 245, 245], textColor: INK, fontStyle: "bold" },
      columnStyles,
      didParseCell: (data: CellHookData) => {
        if (options.lastBold && data.section === "body" && data.row.index === body.length - 1) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [250, 250, 250];
        }
      },
    });
    y = lastY() + 3;
  };

  // Masthead.
  doc.setFont("helvetica", "bold").setFontSize(17).setTextColor(...INK);
  doc.text(pack.inference.partName, PAGE_MARGIN, y + 6);
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(...MUTED);
  doc.text(pack.inference.partNumber, PAGE_MARGIN, y + 11.5);
  doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(...INK);
  doc.text("REQUEST FOR QUOTATION", pageW - PAGE_MARGIN, y + 4, { align: "right" });
  doc.setFont("courier", "normal").setFontSize(8).setTextColor(...MUTED);
  doc.text(reference, pageW - PAGE_MARGIN, y + 8.5, { align: "right" });
  doc.text(`Issued ${pack.issued}`, pageW - PAGE_MARGIN, y + 12, { align: "right" });
  doc.text(`Currency ${pack.currency}`, pageW - PAGE_MARGIN, y + 15.5, { align: "right" });
  y += 18;
  doc.setDrawColor(...INK).setLineWidth(0.8);
  doc.line(PAGE_MARGIN, y, pageW - PAGE_MARGIN, y);
  y += 6;

  heading("1", "Part and manufacturing intent");
  pairs(
    [
      ...pack.cad.product.map((row): [string, string] => [row.label, row.value]),
      ["Process", PROCESS_NAMES[pack.process]],
      ["Material grade", pack.grade],
      ["Annual volume", `${pack.tool.annualVolume.toLocaleString("en-GB")} pcs/yr`],
      ["Production life", `${pack.tool.productionLife} years`],
      ["Lifetime volume", `${lifetime.toLocaleString("en-GB")} pcs`],
      ["Region", "EU"],
      ...pack.cad.notes.map((row): [string, string] => [row.label, row.value]),
    ],
    2,
  );

  if (pack.drawingSheet) {
    heading("2", "Drawing · orthographic views");
    const sheetH = (contentW * 1240) / 1600;
    ensure(sheetH + 6);
    doc.addImage(pack.drawingSheet, "PNG", PAGE_MARGIN, y, contentW, sheetH, undefined, "FAST");
    doc.setDrawColor(...HAIRLINE).setLineWidth(0.2);
    doc.rect(PAGE_MARGIN, y, contentW, sheetH);
    y += sheetH + 3;
    paragraph(
      "Front, top, left and right elevations, first-angle projection, all views to one scale. Envelope dimensions in millimetres. Reference views generated from the supplied model: request the native STEP file for tooling design.",
    );
  }

  const withSheet = Boolean(pack.drawingSheet);
  heading(withSheet ? "3" : "2", "Geometry, as read from the model");
  paragraph(`Extracted from ${pack.cad.fileName}: ${pack.cad.meta}`);
  pairs(
    [
      ...pack.cad.geometry.map((row): [string, string] => [row.label, row.value]),
      ...pack.cad.features.map((row): [string, string] => [row.label, row.value]),
    ],
    2,
  );

  heading(withSheet ? "4" : "3", "Manufacturing complexity");
  const band =
    pack.complexity.band === "very"
      ? "Very complex"
      : pack.complexity.band[0].toUpperCase() + pack.complexity.band.slice(1);
  paragraph(`Index ${pack.complexity.index} / 100: ${band}. ${pack.complexity.headline}`, false);
  grid(
    ["Factor", "Measured", "Score"],
    pack.complexity.factors.map((factor) => [factor.factor, factor.value, `${factor.score} / ${factor.max}`]),
    { align: ["left", "left", "right"] },
  );

  heading(withSheet ? "5" : "4", "Tooling");
  pairs(
    [
      ["Tool type", pack.tool.toolType],
      ["Build cost", money(pack.tool.cost, pack.symbol, 0)],
      ["Lead time", `${pack.tool.leadWeeks} weeks`],
      ["Tool life", `${pack.tool.life.toLocaleString("en-GB")} ${pack.tool.lifeUnit}`],
      ["Cavities", String(pack.tool.cavities)],
      [pack.tool.amortLineLabel, `${money(pack.tool.perPiece, pack.symbol)} / pc`],
      ...pack.tool.spec.map((row): [string, string] => [row.label, row.value]),
    ],
    2,
  );
  grid(
    ["Tool build line", "Basis", `Cost ${pack.currency}`],
    [
      ...pack.tool.lines.map((line) => [line.label, line.basis ?? "", money(line.value, pack.symbol, 0)]),
      ["Tool build cost", "", money(pack.tool.cost, pack.symbol, 0)],
    ],
    { align: ["left", "left", "right"], lastBold: true },
  );
  pack.tool.measurements.forEach((group) => {
    ensure(12);
    doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(...MUTED);
    doc.text(group.title.toUpperCase(), PAGE_MARGIN, y);
    y += 3.5;
    pairs(
      group.rows.map((row): [string, string] => [row.label, row.value]),
      2,
    );
  });

  if (pack.thermal) {
    heading(withSheet ? "6" : "5", "Process thermal window");
    grid(
      ["Stage", "Target band", "Estimated", "Status"],
      pack.thermal.stages.map((stage) => [
        stage.stage,
        `${stage.min} - ${stage.max} ${stage.unit}`,
        `${stage.actual} ${stage.unit}`,
        stage.status === "in-band" ? "In band" : stage.status === "high" ? "ABOVE BAND" : "BELOW BAND",
      ]),
      { align: ["left", "right", "right", "left"] },
    );
    paragraph(
      `Bands are standard practice for ${pack.thermal.material} and are stated for alignment, not as a specification. Confirm against your own process windows.`,
    );
  }

  const costSection = withSheet ? (pack.thermal ? "7" : "6") : pack.thermal ? "6" : "5";
  heading(costSection, "Indicative should-cost");
  grid(
    ["Cost line", `${pack.currency} / pc`],
    [...pack.lines.map((line) => [line.label, money(line.value, pack.symbol)]), ["Total", money(total, pack.symbol)]],
    { align: ["left", "right"], lastBold: true },
  );
  paragraph(
    "This is a should-cost estimate produced from geometry and standard rates. It is not a target price and not an award. It is shared so that any difference between it and your quotation can be discussed line by line.",
  );

  const basisSection = String(Number(costSection) + 1);
  heading(basisSection, "Basis and open items");
  const { confidence } = pack;
  paragraph(
    `Estimate class ${confidence.estimateClass}: ${confidence.className}. Expected accuracy ${confidence.low.toFixed(1)}% / +${confidence.high.toFixed(1)}% (${money(total * (1 + confidence.low / 100), pack.symbol)} to ${money(total * (1 + confidence.high / 100), pack.symbol)}).`,
    false,
  );
  const assumed = confidence.inputs.filter((input) => input.state === "assumed");
  const unknown = confidence.inputs.filter((input) => input.state === "unknown");
  ensure(10);
  doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(...INK);
  doc.text("ASSUMED · PLEASE CONFIRM OR CORRECT", PAGE_MARGIN, y);
  y += 4;
  grid(
    ["Input", "Assumed", "Basis"],
    assumed.map((input) => [input.label, input.value ?? "-", input.source]),
    { align: ["left", "right", "left"] },
  );
  ensure(10);
  doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(...ALERT);
  doc.text("NOT KNOWN · YOUR QUOTATION SHOULD STATE THESE", PAGE_MARGIN, y);
  y += 4;
  grid(
    ["Open item", "Why it is open"],
    unknown.map((input) => [input.label, input.source]),
  );

  heading(String(Number(basisSection) + 1), "Supplier response");
  grid(
    ["Item", "Your response"],
    [
      [`Piece price at ${pack.tool.annualVolume.toLocaleString("en-GB")} pcs/yr`, `${pack.currency}`],
      ["Tooling · one-off", `${pack.currency}`],
      ["Tooling commercial basis", "[ ] Invoiced separately    [ ] Amortised into piece price"],
      ["Tooling lead time", "weeks"],
      ["Quoted process", ""],
      ["Quoted material grade", ""],
      ["Packaging", "[ ] Returnable racks    [ ] One-way    [ ] To be agreed"],
      ["Incoterms / plant", ""],
      ["Price validity", ""],
      ["Deviations from this specification", ""],
    ],
  );

  ensure(26);
  y += 8;
  doc.setDrawColor(...INK).setLineWidth(0.3);
  const signW = contentW / 2 - 6;
  doc.line(PAGE_MARGIN, y, PAGE_MARGIN + signW, y);
  doc.line(pageW - PAGE_MARGIN - signW, y, pageW - PAGE_MARGIN, y);
  doc.setFont("helvetica", "normal").setFontSize(7).setTextColor(...MUTED);
  doc.text("Supplier · name, date", PAGE_MARGIN, y + 4);
  doc.text("Purchasing · name, date", pageW - PAGE_MARGIN - signW, y + 4);

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setDrawColor(...HAIRLINE).setLineWidth(0.2);
    doc.line(PAGE_MARGIN, pageH - PAGE_MARGIN - 6, pageW - PAGE_MARGIN, pageH - PAGE_MARGIN - 6);
    doc.setFont("helvetica", "normal").setFontSize(7).setTextColor(...MUTED);
    doc.text(
      `${reference}  ·  ${pack.inference.partName}  ·  Model v0.1 · illustrative estimate, not a quotation`,
      PAGE_MARGIN,
      pageH - PAGE_MARGIN - 2,
    );
    doc.text(`Page ${page} of ${pages}`, pageW - PAGE_MARGIN, pageH - PAGE_MARGIN - 2, { align: "right" });
  }

  doc.setProperties({
    title: `${reference}: ${pack.inference.partName}`,
    subject: `Request for quotation · ${pack.inference.partNumber}`,
    creator: "Mūlya",
    author: "Mūlya",
    keywords: [pack.inference.partNumber, PROCESS_NAMES[pack.process], pack.grade].join(", "),
  });
  return doc.output("blob");
}
