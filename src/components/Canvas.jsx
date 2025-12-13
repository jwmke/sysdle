import { ReactFlow, Background, Handle, Position } from '@xyflow/react'
import { useDroppable } from '@dnd-kit/core'
import '@xyflow/react/dist/style.css'

function MysteryNode({ id, data }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  const isEmpty = data.label === '???'
  const isCorrect = data.isCorrect
  
  let bgColor = 'bg-stone-600'
  let textColor = 'text-white'
  let borderStyle = '2px dashed #000'
  
  if (isCorrect === true) {
    bgColor = 'bg-green-200'
    textColor = 'text-black'
    borderStyle = '2px solid #15803d'
  } else if (isCorrect === false) {
    bgColor = 'bg-red-200'
    textColor = 'text-black'
    borderStyle = '2px dashed #dc2626'
  } else if (!isEmpty) {
    bgColor = 'bg-stone-400'
    textColor = 'text-black'
  }

  return (
    <>
      <Handle type="target" position={Position.Top} />
      <div
        ref={setNodeRef}
        className={`px-4 py-2 rounded text-center min-w-[150px] text-xs ${bgColor} ${textColor} ${isOver ? 'opacity-70' : ''}`}
        style={{ border: borderStyle }}
      >
        {data.label}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </>
  )
}

const nodeTypes = {
  mystery: MysteryNode,
}

export default function Canvas({ nodes }) {
  const reactFlowNodes = nodes.map(node => ({
    id: node.id,
    type: node.mystery || node.wasMystery ? 'mystery' : 'default',
    position: node.position,
    data: { 
      label: node.mystery ? '???' : node.label,
      isCorrect: node.isCorrect
    }
  }))

  const edges = nodes.flatMap(node =>
    node.connectsTo.map(targetId => ({
      id: `e${node.id}-${targetId}`,
      source: node.id,
      target: targetId
    }))
  )

  return (
    <main className="flex-1 bg-stone-800">
      <ReactFlow 
        nodes={reactFlowNodes} 
        edges={edges}
        nodeTypes={nodeTypes}
        proOptions={{ hideAttribution: true }}
        fitView
        fitViewOptions={{ padding: 0.2 }}
      >
        <Background />
      </ReactFlow>
    </main>
  )
}