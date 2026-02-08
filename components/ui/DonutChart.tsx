interface DonutSegment {
  label: string
  value: number
  color: string
}

interface DonutChartProps {
  segments: DonutSegment[]
  size?: number
}

const PALETTE = [
  '#0d9488', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#14b8a6',
]

export function DonutChart({ segments, size = 140 }: DonutChartProps) {
  const total = segments.reduce((s, seg) => s + seg.value, 0)
  if (total === 0 || segments.length === 0) return null

  const cx = size / 2
  const cy = size / 2
  const outerR = size / 2 - 2
  const innerR = outerR * 0.6

  let cumAngle = -Math.PI / 2 // start at top

  const arcs = segments.map((seg, i) => {
    const fraction = seg.value / total
    const angle = fraction * Math.PI * 2
    const startAngle = cumAngle
    const endAngle = cumAngle + angle
    cumAngle = endAngle

    const largeArc = angle > Math.PI ? 1 : 0

    const x1 = cx + outerR * Math.cos(startAngle)
    const y1 = cy + outerR * Math.sin(startAngle)
    const x2 = cx + outerR * Math.cos(endAngle)
    const y2 = cy + outerR * Math.sin(endAngle)

    const ix1 = cx + innerR * Math.cos(endAngle)
    const iy1 = cy + innerR * Math.sin(endAngle)
    const ix2 = cx + innerR * Math.cos(startAngle)
    const iy2 = cy + innerR * Math.sin(startAngle)

    const path = [
      `M${x1},${y1}`,
      `A${outerR},${outerR} 0 ${largeArc} 1 ${x2},${y2}`,
      `L${ix1},${iy1}`,
      `A${innerR},${innerR} 0 ${largeArc} 0 ${ix2},${iy2}`,
      'Z',
    ].join(' ')

    return (
      <path
        key={i}
        d={path}
        fill={seg.color || PALETTE[i % PALETTE.length]}
      />
    )
  })

  const formattedTotal = total >= 1000
    ? `${(total / 1000).toFixed(1)}k`
    : total.toFixed(0)

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {arcs}
        <text
          x={cx}
          y={cy - 6}
          textAnchor="middle"
          className="fill-slate-400"
          fontSize={9}
          fontFamily="ui-monospace, monospace"
        >
          Total
        </text>
        <text
          x={cx}
          y={cy + 10}
          textAnchor="middle"
          className="fill-slate-900"
          fontSize={14}
          fontWeight={600}
          fontFamily="ui-monospace, monospace"
        >
          &euro;{formattedTotal}
        </text>
      </svg>
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs text-slate-600">
            <span
              className="inline-block w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: seg.color || PALETTE[i % PALETTE.length] }}
            />
            <span className="font-mono">{seg.label}</span>
            <span className="text-slate-400">
              {((seg.value / total) * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
