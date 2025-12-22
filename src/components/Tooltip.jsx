import { useState, useRef } from 'react'

export default function Tooltip({ children, description, link, isDragging = false }) {
  const [isVisible, setIsVisible] = useState(false)
  const hideTimeoutRef = useRef(null)

  // Don't render tooltip if no description or if dragging
  if (!description) {
    return children
  }

  const handleMouseEnter = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = null
    }
    setIsVisible(true)
  }

  const handleMouseLeave = () => {
    // Delay hiding to allow moving to tooltip
    hideTimeoutRef.current = setTimeout(() => {
      setIsVisible(false)
    }, 100)
  }

  const handleTooltipEnter = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = null
    }
  }

  const handleTooltipLeave = () => {
    setIsVisible(false)
  }

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onPointerDownCapture={() => setIsVisible(false)}
        onFocus={handleMouseEnter}
        onBlur={handleMouseLeave}
      >
        {children}
      </div>

      {isVisible && !isDragging && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-64 pointer-events-auto"
          onMouseEnter={handleTooltipEnter}
          onMouseLeave={handleTooltipLeave}
        >
          <div className="bg-stone-900 text-white text-xs rounded-lg p-3 shadow-lg border border-stone-700">
            <p className="mb-0">{description}</p>
            {link && (
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 text-xs mt-2 inline-block"
                onClick={(e) => e.stopPropagation()}
              >
                Learn more →
              </a>
            )}
          </div>
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
            <div className="border-8 border-transparent border-t-stone-900" />
          </div>
        </div>
      )}
    </div>
  )
}
