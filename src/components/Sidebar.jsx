import DraggableComponent from './DraggableComponent'
import logo from '../assets/sysdle.svg'

export default function Sidebar({ getComponentStatus, onLogoClick, components = [] }) {
  return (
    <aside className="w-full h-auto lg:w-80 lg:h-full bg-stone-900 border-t lg:border-t-0 rounded-t-2xl lg:rounded-none p-4 lg:p-6 overflow-y-auto">
      {/* Logo - only visible on lg screens and larger */}
      <div className="hidden lg:flex items-center gap-4 mb-8 cursor-pointer" onClick={onLogoClick}>
        <img src={logo} alt="Sysdle" className="h-12 brightness-0 invert" />
        <h1 className="text-white text-3xl font-bold">Sysdle.com</h1>
      </div>
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