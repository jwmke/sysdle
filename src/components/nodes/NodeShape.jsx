// NodeShape component renders different shapes for different component types
// All shapes maintain the same form factor (wide and short) to prevent layout issues

export default function NodeShape({ shape = 'rectangle', bgColor, textColor, borderStyle, children, className = '' }) {
  const baseClasses = `px-3 mx-1 py-2.5 text-center min-w-[142px] text-xs ${bgColor} ${textColor} ${className}`

  // Extract border color and style from borderStyle (e.g., "2px solid #000" -> "#000")
  const borderColor = borderStyle?.split(' ').pop() || '#000'
  const isDashedBorder = borderStyle?.includes('dashed')
  const strokeDasharray = isDashedBorder ? '4 3' : 'none'
  const bgColorHex = getBgColor(bgColor)

  // For cylinder shapes, use SVG with proper tube rendering
  if (shape === 'horizontal-cylinder') {
    return (
      <div className="relative inline-block min-w-[142px]">
        <svg width="150" height="42" viewBox="0 0 150 42" className="absolute inset-0" style={{ pointerEvents: 'none' }}>
          {/* Left cap (ellipse) */}
          <ellipse cx="12" cy="21" rx="11" ry="18" fill={bgColorHex} stroke={borderColor} strokeWidth="2" strokeDasharray={strokeDasharray} />
          {/* Tube body */}
          <rect x="12" y="3" width="126" height="36" fill={bgColorHex} stroke="none" />
          {/* Right cap (ellipse) */}
          <ellipse cx="138" cy="21" rx="11" ry="18" fill={bgColorHex} stroke={borderColor} strokeWidth="2" strokeDasharray={strokeDasharray} />
          {/* Top and bottom borders */}
          <line x1="12" y1="3" x2="138" y2="3" stroke={borderColor} strokeWidth="2" strokeDasharray={strokeDasharray} />
          <line x1="12" y1="39" x2="138" y2="39" stroke={borderColor} strokeWidth="2" strokeDasharray={strokeDasharray} />
        </svg>
        <div className={`${baseClasses} relative z-10`} style={{ background: 'transparent', border: 'none' }}>
          {children}
        </div>
      </div>
    )
  }

  if (shape === 'vertical-cylinder') {
    return (
      <div className="relative inline-block min-w-[142px]">
        <svg width="150" height="40" viewBox="0 0 150 40" className="absolute inset-0" style={{ pointerEvents: 'none' }}>
          {/* Cylinder body */}
          <rect x="10" y="4" width="130" height="29" fill={bgColorHex} stroke="none" />
          {/* Top cap (ellipse) - more prominent */}
          <ellipse cx="75" cy="4" rx="65" ry="4" fill={bgColorHex} stroke={borderColor} strokeWidth="2" strokeDasharray={strokeDasharray} />
          {/* Bottom cap - split into top (solid gray) and bottom (dashed) */}
          <ellipse cx="75" cy="33" rx="65" ry="4" fill={bgColorHex} stroke="none" />

          {/* Bottom arc of bottom cap - dashed */}
          <path d="M 140,33 A 65,4 0 0,1 10,33" fill="none" stroke={borderColor} strokeWidth="2" strokeDasharray={strokeDasharray} />
          {/* Left and right borders */}
          <line x1="10" y1="4" x2="10" y2="33" stroke={borderColor} strokeWidth="2" strokeDasharray={strokeDasharray} />
          <line x1="140" y1="4" x2="140" y2="33" stroke={borderColor} strokeWidth="2" strokeDasharray={strokeDasharray} />
        </svg>
        <div className={`${baseClasses} relative z-10`} style={{ background: 'transparent', border: 'none' }}>
          {children}
        </div>
      </div>
    )
  }

  // Trapezoid shape (for load balancers) with SVG for proper borders
  if (shape === 'triangle') {
    return (
      <div className="relative inline-block min-w-[142px]">
        <svg width="160" height="42" viewBox="0 0 160 42" className="absolute inset-0" style={{ pointerEvents: 'none' }}>
          {/* Trapezoid path with rounded corners */}
          <path
            d="M 25,3 L 125,3 L 150,35 L 0,35 Z"
            fill={bgColorHex}
            stroke={borderColor}
            strokeWidth="2"
            strokeDasharray={strokeDasharray}
            strokeLinejoin="round"
          />
        </svg>
        <div className={`${baseClasses} relative z-10`} style={{ background: 'transparent', border: 'none' }}>
          {children}
        </div>
      </div>
    )
  }

  // Hexagon shape (for API gateways) with SVG for proper borders
  if (shape === 'hexagon') {
    return (
      <div className="relative inline-block min-w-[142px]">
        <svg width="150" height="42" viewBox="0 0 150 42" className="absolute inset-0" style={{ pointerEvents: 'none' }}>
          {/* Hexagon path with rounded corners */}
          <path
            d="M 37.5,1 L 112.5,1 L 147,19 L 112.5,37 L 37.5,37 L 3,19 Z"
            fill={bgColorHex}
            stroke={borderColor}
            strokeWidth="2"
            strokeDasharray={strokeDasharray}
            strokeLinejoin="round"
          />
        </svg>
        <div className={`${baseClasses} relative z-10`} style={{ background: 'transparent', border: 'none' }}>
          {children}
        </div>
      </div>
    )
  }

  // Oval shape (for external services, users) with SVG
  if (shape === 'oval') {
    return (
      <div className="relative inline-block min-w-[142px]">
        <svg width="150" height="42" viewBox="0 0 150 42" className="absolute inset-0" style={{ pointerEvents: 'none' }}>
          {/* Oval/ellipse shape */}
          <ellipse
            cx="75"
            cy="19"
            rx="72"
            ry="18"
            fill={bgColorHex}
            stroke={borderColor}
            strokeWidth="2"
            strokeDasharray={strokeDasharray}
          />
        </svg>
        <div className={`${baseClasses} relative z-10`} style={{ background: 'transparent', border: 'none' }}>
          {children}
        </div>
      </div>
    )
  }

  // For other shapes, use CSS
  const shapeStyles = {
    'rectangle': {
      borderRadius: '4px'
    },
    'rounded-rectangle': {
      borderRadius: '16px'
    }
  }

  const shapeStyle = shapeStyles[shape] || shapeStyles['rectangle']

  return (
    <div
      className={baseClasses}
      style={{
        border: borderStyle,
        clipPath: shapeStyle.clipPath,
        borderRadius: shapeStyle.borderRadius
      }}
    >
      {children}
    </div>
  )
}

// Helper to convert Tailwind bg color to hex
function getBgColor(bgColorClass) {
  const colorMap = {
    'bg-stone-100': '#f5f5f4',
    'bg-stone-400': '#a8a29e',
    'bg-stone-600': '#57534e',
    'bg-stone-700': '#44403c',
    'bg-green-200': '#bbf7d0',
    'bg-yellow-200': '#fef08a',
    'bg-red-200': '#fecaca'
  }
  return colorMap[bgColorClass] || '#57534e'
}
