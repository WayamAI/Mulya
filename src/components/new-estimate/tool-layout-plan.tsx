import type { ToolLayout } from "@/lib/costing/tooling";

const MARGIN = 46;
const DRAW_WIDTH = 420;

const MUTED = "var(--text-quaternary)";
const ACCENT = "var(--feedback-info-icon)";
const ACCENT_FILL = "var(--feedback-info-background)";
const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

function ArrowMarker({ id }: { id: string }) {
  return (
    <marker id={id} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 7 4 L 0 7 z" fill={MUTED} />
    </marker>
  );
}

/** Plan view of the tool block with the part (or progressive strip) nested inside, to one scale. */
export function ToolLayoutPlan({ layout }: { layout: ToolLayout }) {
  const { toolW, toolD, partW, partD, stations, pitch, stripWidth } = layout;
  const scale = DRAW_WIDTH / toolW;
  const w = toolW * scale;
  const d = toolD * scale;
  const pw = partW * scale;
  const pd = partD * scale;
  const sw = (stripWidth ?? 0) * scale;
  const viewW = w + MARGIN * 2;
  const viewH = d + MARGIN * 2;
  const x0 = MARGIN;
  const y0 = MARGIN;

  const progressive = Boolean(stations && pitch);
  const stripStart = (n: number, p: number) => x0 + (w - n * p * scale) / 2;

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${viewW} ${viewH}`}
        width="100%"
        style={{ minWidth: 320 }}
        role="img"
        aria-label={`Plan view: ${layout.toolLabel} with ${layout.partLabel} nested inside`}
      >
        <defs>
          <ArrowMarker id="tl-arrow" />
        </defs>
        <rect
          x={x0}
          y={y0}
          width={w}
          height={d}
          fill="var(--surface-raised-x2)"
          stroke="var(--stroke-active)"
          strokeWidth={1.5}
          rx={2}
        />
        {progressive && stations && pitch ? (
          <>
            <rect
              x={x0}
              y={y0 + d / 2 - sw / 2}
              width={w}
              height={sw}
              fill={ACCENT_FILL}
              stroke={ACCENT}
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            {Array.from({ length: stations }, (_, i) => {
              const cx = stripStart(stations, pitch) + (i + 0.5) * pitch * scale;
              return (
                <g key={i}>
                  <rect
                    x={cx - pw / 2}
                    y={y0 + d / 2 - pd / 2}
                    width={pw}
                    height={pd}
                    fill="none"
                    stroke={ACCENT}
                    strokeWidth={1.2}
                    opacity={0.35 + (i / stations) * 0.65}
                    rx={1.5}
                  />
                  <text
                    x={cx}
                    y={y0 + d + 13}
                    textAnchor="middle"
                    fill={MUTED}
                    style={{ font: `500 10px ${MONO}` }}
                  >
                    {i + 1}
                  </text>
                </g>
              );
            })}
            {(() => {
              const a = stripStart(stations, pitch) + 0.5 * pitch * scale;
              const b = a + pitch * scale;
              const y = y0 - 14;
              return (
                <g>
                  <line
                    x1={a}
                    y1={y}
                    x2={b}
                    y2={y}
                    stroke={MUTED}
                    strokeWidth={1}
                    markerStart="url(#tl-arrow)"
                    markerEnd="url(#tl-arrow)"
                  />
                  <text x={(a + b) / 2} y={y - 5} textAnchor="middle" fill={MUTED} style={{ font: `400 10px ${MONO}` }}>
                    {pitch} pitch
                  </text>
                </g>
              );
            })()}
          </>
        ) : (
          <rect
            x={x0 + (w - pw) / 2}
            y={y0 + (d - pd) / 2}
            width={pw}
            height={pd}
            fill={ACCENT_FILL}
            stroke={ACCENT}
            strokeWidth={1.5}
            rx={2}
          />
        )}
        <line
          x1={x0}
          y1={y0 + d + (stations ? 28 : 22)}
          x2={x0 + w}
          y2={y0 + d + (stations ? 28 : 22)}
          stroke={MUTED}
          strokeWidth={1}
          markerStart="url(#tl-arrow)"
          markerEnd="url(#tl-arrow)"
        />
        <text
          x={x0 + w / 2}
          y={y0 + d + (stations ? 42 : 36)}
          textAnchor="middle"
          fill={MUTED}
          style={{ font: `400 11px ${MONO}` }}
        >
          {layout.toolLabel}
        </text>
        <line
          x1={x0 - 22}
          y1={y0}
          x2={x0 - 22}
          y2={y0 + d}
          stroke={MUTED}
          strokeWidth={1}
          markerStart="url(#tl-arrow)"
          markerEnd="url(#tl-arrow)"
        />
        <text
          x={x0 - 28}
          y={y0 + d / 2}
          textAnchor="middle"
          fill={MUTED}
          transform={`rotate(-90 ${x0 - 28} ${y0 + d / 2})`}
          style={{ font: `400 11px ${MONO}` }}
        >
          {toolD} mm
        </text>
        {!stations ? (
          <>
            <line
              x1={x0 + (w - pw) / 2}
              y1={y0 - 16}
              x2={x0 + (w + pw) / 2}
              y2={y0 - 16}
              stroke={ACCENT}
              strokeWidth={1}
              markerStart="url(#tl-arrow)"
              markerEnd="url(#tl-arrow)"
            />
            <text x={x0 + w / 2} y={y0 - 22} textAnchor="middle" fill={ACCENT} style={{ font: `400 11px ${MONO}` }}>
              {layout.partLabel}
            </text>
          </>
        ) : null}
      </svg>
    </div>
  );
}
