import { useDraggable } from '@dnd-kit/core'
import { useRef, useEffect } from 'react'

export default function DraggableComponent({ component, status, onClick, isSelected }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: component,
  })

  const clickTimeoutRef = useRef(null)
  const draggedRef = useRef(false)

  // Track when dragging starts/ends
  useEffect(() => {
    if (isDragging) {
      draggedRef.current = true
      // Cancel any pending click
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current)
        clickTimeoutRef.current = null
      }
    }
  }, [isDragging])

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

  const handleClick = (e) => {
    // Set a timer for the click - if drag starts within 200ms, cancel it
    draggedRef.current = false

    clickTimeoutRef.current = setTimeout(() => {
      if (!draggedRef.current && onClick) {
        onClick(component)
      }
      clickTimeoutRef.current = null
    }, 200)
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={handleClick}
      className={`${getBackgroundColor()} ${getTextColor()} px-3 mx-1 py-2.5 rounded text-center min-w-[142px] text-xs cursor-pointer lg:cursor-grab active:cursor-grabbing ${
        isDragging ? 'opacity-50' : ''
      } ${isSelected ? 'ring-4 ring-blue-400' : ''}`}
    >
      {component}
    </div>
  )
}
