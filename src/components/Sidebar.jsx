import { useDraggable } from '@dnd-kit/core'

const components = [
  'Load Balancer',
  'NoSQL DB',
  'SQL DB',
  'Cache',
  'Message Queue',
  'API Gateway',
  'CDN',
  'Auth Service',
  'Object Storage',
  'Search Engine'
]

function DraggableComponent({ component }) {
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

export default function Sidebar() {
  return (
    <aside className="w-full h-1/3 lg:w-[200px] lg:h-full bg-stone-900 p-4">
      <div className="grid grid-cols-2 gap-3">
        {components.map((component) => (
          <DraggableComponent key={component} component={component} />
        ))}
      </div>
    </aside>
  )
}