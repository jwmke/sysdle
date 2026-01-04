import { useDraggable } from '@dnd-kit/core'
import NodeShape from './nodes/NodeShape'
import { getComponentInfo } from '../lib/supabase'

export default function DraggableComponent({ component, status, onClick, isSelected, componentInfoMap, onHoverChange }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: component,
  })

  const getBackgroundColor = () => {
    if (status === 'correct') return 'bg-green-300'
    if (status === 'wrong-position') return 'bg-yellow-300'
    if (status === 'incorrect') return 'bg-red-300'
    return 'bg-stone-600'
  }

  const getTextColor = () => {
    if (status) return 'text-black'
    return 'text-white'
  }

  const getBorderStyle = () => {
    if (status === 'correct') return '2px solid #15803d'
    if (status === 'wrong-position') return '2px solid #ca8a04'
    if (status === 'incorrect') return '2px solid #dc2626'
    return '2px solid #000'
  }

  // Get shape for this component
  const componentInfo = getComponentInfo(component, componentInfoMap || {})
  const shape = componentInfo?.shape || 'rectangle'

  const handleClick = (e) => {
    if (onClick) {
      onClick(component)
    }
  }

  const handleMouseEnter = () => {
    if (onHoverChange) {
      onHoverChange(component)
    }
  }

  return (
    <div
      ref={setNodeRef}
      onMouseEnter={handleMouseEnter}
      className={`cursor-pointer lg:cursor-grab active:cursor-grabbing ${
        isDragging ? 'opacity-50' : ''
      } ${isSelected ? 'ring-4 ring-blue-400 rounded' : ''}`}
    >
      <div {...listeners} {...attributes} onClick={handleClick}>
        <NodeShape
          shape={shape}
          bgColor={getBackgroundColor()}
          textColor={getTextColor()}
          borderStyle={getBorderStyle()}
        >
          {component}
        </NodeShape>
      </div>
    </div>
  )
}
