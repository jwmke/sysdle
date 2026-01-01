import { useState } from 'react'
import DraggableComponent from './DraggableComponent'
import logo from '../assets/sysdle.svg'
import { getComponentInfo } from '../lib/supabase'

export default function Sidebar({ getComponentStatus, onLogoClick, components = [], onComponentClick, selectedComponent, componentInfoMap }) {
  const [hoveredComponent, setHoveredComponent] = useState(null)

  // Get the description of the currently hovered component
  const hoveredComponentInfo = hoveredComponent ? getComponentInfo(hoveredComponent, componentInfoMap || {}) : null
  const showDescription = hoveredComponentInfo && hoveredComponentInfo.description

  return (
    <aside className="w-full h-auto lg:w-80 lg:h-full bg-stone-900 rounded-t-2xl lg:rounded-t-none lg:rounded-r-3xl p-4 pb-20 lg:p-6 overflow-y-auto flex flex-col">
      {/* Logo - only visible on lg screens and larger */}
      <div className="hidden lg:flex items-center gap-4 mb-8 cursor-pointer" onClick={onLogoClick}>
        <img src={logo} alt="Sysdle" className="h-12 brightness-0 invert" />
        <h1 className="text-white text-3xl font-bold">Sysdle.com</h1>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-1 gap-2 justify-items-center">
        {components.map((component) => (
          <DraggableComponent
            key={component}
            component={component}
            status={getComponentStatus(component)}
            onClick={onComponentClick}
            isSelected={selectedComponent === component}
            componentInfoMap={componentInfoMap}
            onHoverChange={setHoveredComponent}
          />
        ))}
      </div>

      {/* Description box - always rendered on lg screens to prevent layout shift */}
      <div className="hidden lg:block mt-auto p-4 bg-stone-800 rounded-lg border border-stone-700 min-h-[100px]">
        {showDescription ? (
          <>
            <h3 className="text-white font-semibold mb-2">{hoveredComponent}</h3>
            <p className="text-stone-300 text-sm">{hoveredComponentInfo.description}</p>
            {hoveredComponentInfo.link && (
              <a
                href={hoveredComponentInfo.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 text-sm mt-2 inline-block"
              >
                Learn more →
              </a>
            )}
          </>
        ) : (
          <p className="text-stone-500 text-sm italic">Hover over a node to see its description</p>
        )}
      </div>
    </aside>
  )
}