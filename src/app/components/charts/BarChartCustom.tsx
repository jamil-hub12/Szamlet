// ─── Gráfico de barras custom (sin Recharts) ──────────────────────────────────

export function BarChartCustom({
  data,
}: {
  data: { id: string; estado: string; cantidad: number; color: string }[];
}) {
  const W = 280,
    H = 160,
    padL = 28,
    padR = 8,
    padT = 8,
    padB = 28;
  const maxV = Math.max(...data.map((d) => d.cantidad), 1);
  const barW = (W - padL - padR) / data.length;
  const gap = barW * 0.25;
  const yTicks = [0, 0.5, 1].map((p, idx) => ({
    v: Math.round(maxV * p),
    y: padT + (1 - p) * (H - padT - padB),
    idx,
  }));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 180 }}>
      {yTicks.map((t) => (
        <g key={`bt-${t.idx}`}>
          <line
            x1={padL}
            x2={W - padR}
            y1={t.y}
            y2={t.y}
            stroke="rgba(0,0,0,0.06)"
            strokeDasharray="4 3"
          />
          <text
            x={padL - 3}
            y={t.y + 4}
            textAnchor="end"
            fontSize={10}
            fill="#717182"
          >
            {t.v}
          </text>
        </g>
      ))}
      {data.map((d, i) => {
        const barH = maxV > 0 ? (d.cantidad / maxV) * (H - padT - padB) : 0;
        const x = padL + i * barW + gap / 2;
        const y = H - padB - barH;
        const cx = x + (barW - gap) / 2;
        return (
          <g key={d.id}>
            <rect
              x={x}
              y={y}
              width={barW - gap}
              height={barH}
              fill={d.color}
              rx={3}
              opacity={0.85}
            />
            <text
              x={cx}
              y={H - 6}
              textAnchor="middle"
              fontSize={9}
              fill="#717182"
            >
              {d.estado}
            </text>
            <text
              x={cx}
              y={y - 3}
              textAnchor="middle"
              fontSize={10}
              fill={d.color}
            >
              {d.cantidad}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
