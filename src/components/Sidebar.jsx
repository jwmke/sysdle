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

export default function Sidebar({ onSubmit }) {
  return (
    <aside className="w-full h-1/3 lg:w-[200px] lg:h-full bg-stone-900 p-4 flex flex-col lg:justify-between overflow-y-auto">
      <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
        {components.map((component) => (
          <DraggableComponent key={component} component={component} />
        ))}
      </div>
      <button
        onClick={onSubmit}
        className="mt-4 bg-stone-100 hover:bg-stone-200 hover:cursor-pointer font-semibold py-3 px-4 rounded transition-colors"
      >
        Submit
      </button>
    </aside>
  )
}