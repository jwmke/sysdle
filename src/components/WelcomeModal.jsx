import { useState, useMemo, useCallback, useEffect } from 'react'
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, useDraggable } from '@dnd-kit/core'
import { ReactFlow, Background } from '@xyflow/react'
import MysteryNode from './nodes/MysteryNode'

function DraggableComponent({ component, onClick, isSelected }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: component,
    data: { component }
  })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={`bg-stone-600 text-white px-4 py-2 rounded font-medium text-sm cursor-pointer hover:bg-stone-500 transition-colors whitespace-nowrap ${
        isSelected ? 'ring-2 ring-blue-400' : ''
      } ${isDragging ? 'opacity-50' : ''}`}
    >
      {component}
    </div>
  )
}

const nodeTypes = {
  mystery: MysteryNode,
}

export default function WelcomeModal({ isOpen, onClose }) {
  const [tutorialNodes, setTutorialNodes] = useState([
    {
      id: '1',
      label: 'Load Balancer',
      mystery: true,
      position: { x: 150, y: 0 },
      connectsTo: ['2', '3']
    },
    {
      id: '2',
      label: 'API Server',
      mystery: false,
      position: { x: 50, y: 120 },
      connectsTo: []
    },
    {
      id: '3',
      label: 'Database',
      mystery: false,
      position: { x: 250, y: 120 },
      connectsTo: []
    }
  ])

  const [availableComponent] = useState('Load Balancer')
  const [selectedComponent, setSelectedComponent] = useState(null)
  const [activeId, setActiveId] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const handleComponentClick = () => {
    setSelectedComponent(availableComponent)
  }

  const handleNodeClick = useCallback((nodeId) => {
    if (selectedComponent && nodeId === '1') {
      // Place component on mystery node with animation
      setTutorialNodes(prev =>
        prev.map(node =>
          node.id === nodeId
            ? { ...node, label: selectedComponent, mystery: false, wasMystery: true, guessStatus: 'correct', justRevealed: true }
            : node
        )
      )
      setSelectedComponent(null)

      // Clear animation flag after animation completes
      setTimeout(() => {
        setTutorialNodes(prev =>
          prev.map(node =>
            node.id === nodeId ? { ...node, justRevealed: false } : node
          )
        )
      }, 500)
    }
  }, [selectedComponent])

  const reactFlowNodes = useMemo(() => tutorialNodes.map(node => ({
    id: node.id,
    type: 'mystery',
    position: node.position,
    data: {
      label: node.mystery ? '???' : node.label,
      isCorrect: node.isCorrect,
      guessStatus: node.guessStatus,
      onNodeClick: (nodeId) => handleNodeClick(nodeId),
      isSelected: false,
      componentInfo: {},
      isMysteryNode: node.mystery || node.wasMystery,
      justRevealed: node.justRevealed
    }
  })), [tutorialNodes, handleNodeClick])

  const edges = useMemo(() => {
    return tutorialNodes.flatMap(node =>
      node.connectsTo.map(targetId => ({
        id: `e${node.id}-${targetId}`,
        source: node.id,
        target: targetId,
        markerEnd: { type: 'arrowclosed', width: 20, height: 20 }
      }))
    )
  }, [tutorialNodes])

  const handleDragStart = (event) => {
    setActiveId(event.active.id)
  }

  const handleDragEnd = (event) => {
    const { active, over } = event
    setActiveId(null)

    if (!over || over.id !== '1') return

    // Place component on mystery node with animation
    setTutorialNodes(prev =>
      prev.map(node =>
        node.id === '1'
          ? { ...node, label: availableComponent, mystery: false, wasMystery: true, guessStatus: 'correct', justRevealed: true }
          : node
      )
    )

    // Clear animation flag after animation completes
    setTimeout(() => {
      setTutorialNodes(prev =>
        prev.map(node =>
          node.id === '1' ? { ...node, justRevealed: false } : node
        )
      )
    }, 500)
  }

  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscKey)
    return () => document.removeEventListener('keydown', handleEscKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const isCompleted = tutorialNodes[0].guessStatus === 'correct'

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-stone-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-2 border-stone-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 pb-4 border-b border-stone-700 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-stone-400 hover:text-white transition-colors text-2xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
          <h1 className="text-white text-2xl lg:text-3xl font-bold mb-2">Welcome to Sysdle!</h1>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Interactive Demo */}
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            autoScroll={false}
          >
            <div className="bg-stone-800 rounded-lg p-4 border border-stone-700">
              {/* Mini ReactFlow */}
              <div className="h-48 mb-4 rounded bg-stone-700/50">
                <ReactFlow
                  nodes={reactFlowNodes}
                  edges={edges}
                  nodeTypes={nodeTypes}
                  proOptions={{ hideAttribution: true }}
                  nodesConnectable={false}
                  nodesDraggable={false}
                  panOnDrag={false}
                  zoomOnScroll={false}
                  panOnScroll={false}
                  preventScrolling={false}
                  fitView
                  fitViewOptions={{ padding: 0.3 }}
                >
                  <Background />
                </ReactFlow>
              </div>

              {/* Available Component Bank */}
              {!isCompleted ? (
                <div className="flex items-center gap-3 justify-center">
                  <DraggableComponent
                    component={availableComponent}
                    onClick={handleComponentClick}
                    isSelected={selectedComponent !== null}
                  />
                  <p className="text-stone-300 text-sm">
                    <span className="hidden lg:inline">Drag to the ??? node above</span>
                    <span className="lg:hidden">Tap to select, then tap the ??? node</span>
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-2 justify-center text-green-400">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {/* <p className="font-medium">Great job! You've got the hang of it.</p> */}
                </div>
              )}
            </div>

            <DragOverlay>
              {activeId && (
                <div className="bg-stone-600 text-white px-4 py-2 rounded font-medium text-sm whitespace-nowrap">
                  {availableComponent}
                </div>
              )}
            </DragOverlay>
          </DndContext>

          {/* Color Legend */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-green-200 border-2 border-green-700 rounded"></div>
              <p className="text-stone-300 text-sm">Component is in system and in the right spot.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-yellow-200 border-2 border-yellow-700 rounded"></div>
              <p className="text-stone-300 text-sm">Component is in system but in the wrong spot.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-red-200 border-2 border-red-700 rounded"></div>
              <p className="text-stone-300 text-sm">Component is not in the system.</p>
            </div>
          </div>

          {/* Daily Release Info */}
          <div className="text-center">
            <p className="text-stone-400 text-sm">New puzzle released every day at midnight.</p>
          </div>

          {/* Get Started Button */}
          <button
            onClick={onClose}
            className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded-lg transition-colors text-lg"
          >
            Get Started
          </button>
        </div>
      </div>
    </div>
  )
}
