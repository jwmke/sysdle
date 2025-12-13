import { DndContext, DragOverlay } from '@dnd-kit/core'
import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import Canvas from './components/Canvas'
import { initialNodes } from './data/initialNodes'

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

    const activeId = active.id
    const targetNodeId = over.id

    // Check if dragging from a node (node-to-node drag)
    const isNodeDrag = activeId.startsWith('node-')

    if (isNodeDrag) {
      const sourceNodeId = activeId.replace('node-', '')

      // Don't allow dragging to the same node
      if (sourceNodeId === targetNodeId) return

      setNodes(prevNodes => {
        const sourceNode = prevNodes.find(n => n.id === sourceNodeId)
        const targetNode = prevNodes.find(n => n.id === targetNodeId)

        if (!sourceNode || !targetNode) return prevNodes

        // Only allow dropping on mystery or wasMystery nodes
        if (!targetNode.mystery && !targetNode.wasMystery) return prevNodes

        const isTargetPopulated = targetNode.label !== '???'

        return prevNodes.map(node => {
          if (node.id === sourceNodeId) {
            // If target is populated, swap; otherwise clear the source
            return isTargetPopulated
              ? { ...node, label: targetNode.label, mystery: false, wasMystery: true, isCorrect: undefined }
              : { ...node, label: '???', mystery: true, wasMystery: true, isCorrect: undefined }
          }
          // Update the target node
          if (node.id === targetNodeId) {
            return { ...node, label: sourceNode.label, mystery: false, wasMystery: true, isCorrect: undefined }
          }
          return node
        })
      })
    } else {
      // Dragging from sidebar
      const component = activeId

      setNodes(prevNodes =>
        prevNodes.map(node =>
          node.id === targetNodeId && (node.mystery || node.wasMystery)
            ? { ...node, label: component, mystery: false, wasMystery: true, isCorrect: undefined }
            : node
        )
      )
    }

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

  const getActiveLabel = () => {
    if (!activeId) return null

    // If dragging a node, find its label
    if (activeId.startsWith('node-')) {
      const nodeId = activeId.replace('node-', '')
      const node = nodes.find(n => n.id === nodeId)
      return node?.label
    }

    // Otherwise it's a sidebar component
    return activeId
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
            {getActiveLabel()}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}

export default App