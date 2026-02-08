interface AreaChartProps {
  data: number[]
  height?: number
  color?: string
}

export function AreaChart({ data, height = 64, color }: AreaChartProps) {
  if (data.length < 2) return null

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const padding = 2

  const isUp = data[data.length - 1] >= data[0]
  const strokeColor = color ?? (isUp ? '#059669' : '#e11d48')
  const fillColor = isUp ? '#059669' : '#e11d48'

  // Use a viewBox width of 100 for responsive scaling
  const vw = 100
  const vh = height

  const points = data.map((v, i) => {
    const x = padding + (i / (data.length - 1)) * (vw - padding * 2)
    const y = padding + (1 - (v - min) / range) * (vh - padding * 2)
    return { x, y }
  })

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')

  // Area: close the path along the bottom
  const areaPath = `${linePath} L${points[points.length - 1].x},${vh} L${points[0].x},${vh} Z`

  const gradientId = `area-grad-${Math.random().toString(36).slice(2, 8)}`

  return (
    <div className="w-full">
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${vw} ${vh}`}
        preserveAspectRatio="none"
        className="block"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fillColor} stopOpacity={0.15} />
            <stop offset="100%" stopColor={fillColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#${gradientId})`} />
        <path
          d={linePath}
          fill="none"
          stroke={strokeColor}
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  )
}
