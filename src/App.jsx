import { DndContext, DragOverlay } from '@dnd-kit/core'
import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import Canvas from './components/Canvas'

const initialNodes = [
  { id: '1', label: 'Client', position: { x: 250, y: 0 }, connectsTo: ['2'], mystery: false },
  { id: '2', label: 'Load Balancer', position: { x: 250, y: 100 }, connectsTo: ['3', '4', '5'], mystery: true },
  { id: '3', label: 'Server A', position: { x: 100, y: 200 }, connectsTo: ['6'], mystery: false },
  { id: '4', label: 'Server B', position: { x: 250, y: 200 }, connectsTo: ['6'], mystery: false },
  { id: '5', label: 'Server C', position: { x: 400, y: 200 }, connectsTo: ['6'], mystery: false },
  { id: '6', label: 'Database', position: { x: 250, y: 300 }, connectsTo: [], mystery: false },
]

function App() {
  const [nodes, setNodes] = useState(initialNodes)
  const [activeId, setActiveId] = useState(null)

  useEffect(() => {
    if (activeId) {
      document.body.classList.add('dragging')
    } else {
      document.body.classList.remove('dragging')
    }
  }, [activeId])

  const handleDragStart = (event) => {
    setActiveId(event.active.id)
  }

  const handleDragEnd = (event) => {
    const { active, over } = event
    setActiveId(null)
    
    if (!over) return
    
    const component = active.id
    const nodeId = over.id
    
    setNodes(prevNodes =>
      prevNodes.map(node =>
        node.id === nodeId && (node.mystery || node.wasMystery)
          ? { ...node, label: component, mystery: false, wasMystery: true }
          : node
      )
    )
  }

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col-reverse lg:flex-row h-screen">
        <Sidebar />
        <Canvas nodes={nodes} />
      </div>
      <DragOverlay>
        {activeId && (
          <div className="bg-stone-600 p-3 rounded text-white text-sm text-center">
            {activeId}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}

export default App