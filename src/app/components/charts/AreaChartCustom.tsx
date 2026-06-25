import { formatearSoles } from "../../utils/formatoMoneda";

const formatPEN = (v: number) =>
  v >= 1000 ? `S/ ${(v / 1000).toFixed(0)}k` : formatearSoles(v);

// ─── Gráfico de área custom (sin Recharts) ────────────────────────────────────

export function AreaChartCustom({
  data,
}: {
  data: { mes: string; ingresos: number }[];
}) {
  const W = 500,
    H = 160,
    padL = 44,
    padR = 8,
    padT = 8,
    padB = 28;
  const maxV = Math.max(...data.map((d) => d.ingresos), 1);
  const xs = data.map(
    (_, i) => padL + (i / (data.length - 1)) * (W - padL - padR),
  );
  const ys = data.map(
    (d) => padT + (1 - d.ingresos / maxV) * (H - padT - padB),
  );
  const linePath = xs
    .map((x, i) => `${i === 0 ? "M" : "L"}${x},${ys[i]}`)
    .join(" ");
  const areaPath = `${linePath} L${xs[xs.length - 1]},${H - padB} L${xs[0]},${H - padB} Z`;
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((p, idx) => ({
    v: Math.round((maxV * p) / 1000) * 1000,
    y: padT + (1 - p) * (H - padT - padB),
    idx,
  }));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 180 }}>
      <defs>
        <linearGradient id="ag1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity={0.18} />
          <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
        </linearGradient>
      </defs>
      {yTicks.map((t) => (
        <g key={`yt-${t.idx}`}>
          <line
            x1={padL}
            x2={W - padR}
            y1={t.y}
            y2={t.y}
            stroke="rgba(0,0,0,0.06)"
            strokeDasharray="4 3"
          />
          <text
            x={padL - 4}
            y={t.y + 4}
            textAnchor="end"
            fontSize={10}
            fill="#717182"
          >
            {formatPEN(t.v)}
          </text>
        </g>
      ))}
      <path d={areaPath} fill="url(#ag1)" />
      <path
        d={linePath}
        fill="none"
        stroke="#6366f1"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {data.map((d, i) => (
        <g key={`ap-${i}`}>
          <circle cx={xs[i]} cy={ys[i]} r={3.5} fill="#6366f1" />
          <text
            x={xs[i]}
            y={H - 6}
            textAnchor="middle"
            fontSize={10}
            fill="#717182"
          >
            {d.mes}
          </text>
        </g>
      ))}
    </svg>
  );
}
