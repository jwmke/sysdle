import { useDraggable } from '@dnd-kit/core'

export default function DraggableComponent({ component, status, onClick, isSelected }) {
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

  const handleClick = (e) => {
    // Only trigger click on touch devices or when not dragging
    if (onClick) {
      onClick(component)
    }
  }

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
