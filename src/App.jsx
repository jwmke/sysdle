import { DndContext, DragOverlay } from '@dnd-kit/core'
import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import Canvas from './components/Canvas'

const initialNodes = [
  { id: '1', label: 'User', position: { x: 250, y: 0 }, connectsTo: ['2'], mystery: false },
  { id: '2', label: 'CDN', position: { x: 250, y: 80 }, connectsTo: ['3'], mystery: true },
  { id: '3', label: 'Load Balancer', position: { x: 250, y: 160 }, connectsTo: ['4', '5'], mystery: false },
  { id: '4', label: 'API Server', position: { x: 150, y: 260 }, connectsTo: ['6', '7', '8'], mystery: false },
  { id: '5', label: 'API Server', position: { x: 350, y: 260 }, connectsTo: ['6', '7', '8'], mystery: false },
  { id: '6', label: 'Cache', position: { x: 100, y: 380 }, connectsTo: [], mystery: true },
  { id: '7', label: 'SQL DB', position: { x: 250, y: 380 }, connectsTo: [], mystery: true },
  { id: '8', label: 'Object Storage', position: { x: 400, y: 380 }, connectsTo: [], mystery: false },
]

function App() {
  const [nodes, setNodes] = useState(initialNodes)
  const [activeId, setActiveId] = useState(null)
  const [isSubmitted, setIsSubmitted] = useState(false)

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
          ? { ...node, label: component, mystery: false, wasMystery: true, isCorrect: undefined }
          : node
      )
    )
    setIsSubmitted(false)
  }

  const handleSubmit = () => {
    setNodes(prevNodes =>
      prevNodes.map(node => {
        if (!node.wasMystery) return node
        
        const correctAnswer = initialNodes.find(n => n.id === node.id)?.label
        return {
          ...node,
          isCorrect: node.label === correctAnswer
        }
      })
    )
    setIsSubmitted(true)
  }

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col-reverse lg:flex-row h-screen">
        <Sidebar onSubmit={handleSubmit} />
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