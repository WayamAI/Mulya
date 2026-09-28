"use client";

import { useEffect, useState } from "react";
import { Box, ExternalLink, FileSpreadsheet, FileText, Image as ImageIcon, LoaderCircle } from "lucide-react";
import { MarkedTitle } from "@/components/estimate/marked-title";
import { Button } from "@/components/mulya/controls";
import { Section } from "@/components/mulya/page";
import { Mark } from "@/components/ui/mark";
import { useApp } from "@/lib/app-context";
import { FEATURE_FLAGS } from "@/lib/costing/agents";
import { PROCESS_NAMES } from "@/lib/costing/process-detection";
import type { PartVariant } from "@/lib/models/part-geometry";
import { CURRENCIES, cx } from "@/lib/format";
import { OrthographicViewer, type BoundingBox } from "./orthographic-viewer";
import {
  buildBreakdownCsv,
  buildRfqPdf,
  downloadDataUrl,
  downloadFile,
  downloadText,
  type PackDocument,
  type SupplierPack,
} from "./rfq-pack";
import { CAPS, ICON, LINK } from "./ui";

const PACK_CONTENTS = [
  "Part identity, programme and manufacturing intent",
  "Dimensioned orthographic drawing sheet · front, top, left, right",
  "Geometry and features read from the STEP model",
  "Manufacturing complexity index with every scored factor",
  "Tooling: type, build cost by line, specification and measurements",
  ...(FEATURE_FLAGS.thermal ? ["Process thermal window with target bands"] : []),
  "Indicative should-cost, line by line",
  "Estimate class, assumed inputs and the open items",
  "A response section for the supplier to quote back into",
];

type ViewMode = "sheet" | "model";

const VIEW_MODES: [ViewMode, string][] = [
  ["sheet", "Drawing sheet"],
  ["model", "Model views"],
];

const issuedToday = () => new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

/** Supplier agent's panel: the drawing sheet / model views and the RFQ pack downloads. */
export function SupplierPackPanel({
  pack,
  variant,
  bbox,
}: {
  pack: SupplierPack;
  variant: PartVariant;
  bbox: BoundingBox;
}) {
  const { currency } = useApp();
  const [mode, setMode] = useState<ViewMode>("sheet");
  const [building, setBuilding] = useState(false);
  const [issued] = useState(issuedToday);
  const revision = pack.cad.product.find((row) => row.label === "Revision")?.value ?? "n/a";

  // The sheet is keyed by what it depicts, so a stale render never shows for a new route.
  const sheetKey = [variant, pack.process, pack.grade, bbox.x, bbox.y, bbox.z].join("|");
  const [rendered, setRendered] = useState<{ key: string; url: string | null } | null>(null);
  const sheet = rendered?.key === sheetKey ? rendered.url : null;

  const { partName, partNumber } = pack.inference;
  useEffect(() => {
    let cancelled = false;
    let frame = 0;
    // The sheet renderer uses three.js; load it on demand so it stays out of the page bundle.
    void import("./drawing-sheet").then(({ renderDrawingSheet }) => {
      if (cancelled) return;
      frame = requestAnimationFrame(() =>
        setRendered({
          key: sheetKey,
          url: renderDrawingSheet(variant, {
            partName,
            partNumber,
            revision,
            material: pack.grade,
            process: PROCESS_NAMES[pack.process],
            bbox: [bbox.x, bbox.y, bbox.z],
            issued,
          }),
        }),
      );
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [sheetKey, variant, partName, partNumber, revision, pack.grade, pack.process, bbox.x, bbox.y, bbox.z, issued]);

  const packDocument = (): PackDocument => ({
    ...pack,
    currency,
    symbol: CURRENCIES[currency].symbol,
    issued,
    drawingSheet: sheet,
  });
  const baseName = `${partNumber}_RFQ`;

  const downloadPdf = async () => {
    setBuilding(true);
    try {
      downloadFile(`${baseName}.pdf`, await buildRfqPdf(packDocument()));
    } finally {
      setBuilding(false);
    }
  };

  const openFullSize = () => {
    if (!sheet) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(
      `<title>${partNumber} · drawing sheet</title><body style="margin:0;background:#525252;display:grid;place-items:center"><img src="${sheet}" style="max-width:100%;height:auto">`,
    );
    win.document.close();
  };

  return (
    <Section
      title={<MarkedTitle mark="mark-rfq-pack">Drawing views &amp; supplier pack</MarkedTitle>}
      action={
        <div className="inline-flex rounded-full border border-muted bg-action p-0.5">
          {VIEW_MODES.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setMode(key)}
              aria-pressed={mode === key}
              className={cx(
                "rounded-full px-3 py-1 text-label-sm transition-colors duration-[150ms]",
                mode === key ? "bg-container text-primary shadow-sm" : "text-tertiary hover:text-primary",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      }
    >
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div>
          {mode === "model" ? (
            <>
              <OrthographicViewer variant={variant} bbox={bbox} height={340} />
              <p className="mt-3 text-body-sm leading-relaxed text-quaternary">
                Shaded model views, on screen only. The drawing sheet is what gets sent.
              </p>
            </>
          ) : (
            <>
              <div className="doc-sheet overflow-hidden rounded-lg border">
                {sheet ? (
                  <button type="button" onClick={openFullSize} title="Open full size" className="block w-full cursor-zoom-in">
                    {/* Data URL rendered client-side; next/image adds nothing here. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={sheet}
                      alt={`Dimensioned orthographic views of ${partName} · front, top, left and right`}
                      className="block h-auto w-full"
                    />
                  </button>
                ) : (
                  <div className="doc-muted flex items-center justify-center text-body-md" style={{ height: 340 }}>
                    Generating drawing sheet…
                  </div>
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                <Mark id="mark-drawing" size={28} />
                <p className="min-w-[200px] flex-1 text-body-sm leading-relaxed text-quaternary">
                  This exact sheet is embedded in the downloaded pack: front, top, left and right to one scale,
                  first-angle, dimensioned in millimetres.
                </p>
                <button type="button" onClick={openFullSize} disabled={!sheet} className={LINK}>
                  <ExternalLink size={14} strokeWidth={1.75} aria-hidden /> Full size
                </button>
              </div>
            </>
          )}
        </div>
        <div>
          <p className="text-body-md leading-relaxed text-tertiary">
            Everything on these tabs, assembled into one document a supplier can read, print and quote against.
            Self-contained: no fonts to fetch, nothing that breaks in an inbox.
          </p>
          <span className={cx(CAPS, "mt-5 block")}>The pack contains</span>
          <ul className="mt-2 space-y-1.5">
            {PACK_CONTENTS.map((item) => (
              <li key={item} className="flex gap-2 text-body-md leading-relaxed text-tertiary">
                <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-info-icon" />
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button disabled={building} onClick={downloadPdf}>
              {building ? (
                <LoaderCircle {...ICON} aria-hidden className="animate-spin" />
              ) : (
                <FileText {...ICON} aria-hidden />
              )}
              {building ? "Building PDF…" : "Download RFQ pack (PDF)"}
            </Button>
            <Button
              variant="secondary"
              disabled={!sheet}
              onClick={() => sheet && downloadDataUrl(`${baseName}_drawing.png`, sheet)}
            >
              <ImageIcon {...ICON} aria-hidden /> Drawing sheet (PNG)
            </Button>
            <Button
              variant="secondary"
              onClick={() => downloadText(`${baseName}_breakdown.csv`, buildBreakdownCsv(packDocument()), "text/csv")}
            >
              <FileSpreadsheet {...ICON} aria-hidden /> Cost breakdown (CSV)
            </Button>
          </div>
          <p className="mt-2 text-caption font-normal text-quaternary tabular">
            A4 portrait · selectable text · drawing sheet embedded
          </p>
          <p className="mt-3 flex items-start gap-2 text-body-sm leading-relaxed text-quaternary">
            <Box size={14} strokeWidth={1.75} aria-hidden className="mt-0.5 shrink-0" />
            The pack states the estimate class and lists what is assumed and what is unknown, so the supplier can
            price the gaps rather than pad the whole number.
          </p>
        </div>
      </div>
    </Section>
  );
}
