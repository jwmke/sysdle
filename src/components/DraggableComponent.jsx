import { useDraggable } from '@dnd-kit/core'

export default function DraggableComponent({ component }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: component,
  })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`bg-stone-600 p-3 rounded text-white text-sm text-center cursor-grab active:cursor-grabbing ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      {component}
    </div>
  )
}
