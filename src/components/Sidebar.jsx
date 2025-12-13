import DraggableComponent from './DraggableComponent'
import { components } from '../data/components'

export default function Sidebar({ getComponentStatus }) {
  return (
    <aside className="w-full h-auto lg:w-[200px] lg:h-full bg-stone-900 p-4 overflow-y-auto">
      <div className="grid grid-cols-2 lg:grid-cols-1 gap-1">
        {components.map((component) => (
          <DraggableComponent
            key={component}
            component={component}
            status={getComponentStatus(component)}
          />
        ))}
      </div>
    </aside>
  )
}