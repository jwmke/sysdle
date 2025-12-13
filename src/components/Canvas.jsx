import { ReactFlow, Background } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import MysteryNode from './nodes/MysteryNode'
import Scoreboard from './Scoreboard'
import Logo from './Logo'

const nodeTypes = {
  mystery: MysteryNode,
}

export default function Canvas({ nodes, onSubmit, guesses, gameWon, onShare, onLogoClick, dailyGameTitle }) {
  const reactFlowNodes = nodes.map(node => ({
    id: node.id,
    type: node.mystery || node.wasMystery ? 'mystery' : 'default',
    position: node.position,
    data: {
      label: node.mystery ? '???' : node.label,
      isCorrect: node.isCorrect,
      guessStatus: node.guessStatus
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
      <header className="absolute top-0 left-1/2 -translate-x-1/2 z-10 w-1/2 bg-stone-900 border-b rounded-b-2xl px-6 py-3">
        <h1 className="text-white text-lg font-medium text-left">{dailyGameTitle}</h1>
      </header>
      <ReactFlow
        nodes={reactFlowNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        proOptions={{ hideAttribution: true }}
        fitView
        fitViewOptions={{ padding: { top: 0.3, right: 0.1, bottom: 0.1, left: 0.1 } }}
      >
        <Background />
      </ReactFlow>
      <Logo onClick={onLogoClick} />
      <Scoreboard onSubmit={onSubmit} guesses={guesses} gameWon={gameWon} onShare={onShare} />
    </main>
  )
}