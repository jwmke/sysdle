import { useDraggable } from '@dnd-kit/core'

export default function DraggableComponent({ component, status }) {
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

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`${getBackgroundColor()} ${getTextColor()} px-3 mx-1 py-2.5 rounded text-center min-w-[142px] text-xs cursor-grab active:cursor-grabbing ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      {component}
    </div>
  )
}
