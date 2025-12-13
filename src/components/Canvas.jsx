import { ReactFlow, Background } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import MysteryNode from './nodes/MysteryNode'
import Scoreboard from './Scoreboard'

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
    <main className="flex-1 bg-stone-800 relative">
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
      <Scoreboard />
    </main>
  )
}