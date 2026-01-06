import { ReactFlow, Background } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useMemo, useState, useEffect } from 'react'
import MysteryNode from './nodes/MysteryNode'
import Scoreboard from './Scoreboard'
import Logo from './Logo'
import { getComponentInfo } from '../lib/supabase'

const nodeTypes = {
  mystery: MysteryNode,
}

export default function Canvas({ nodes, onSubmit, guesses, gameWon, onShare, onLogoClick, dailyGameTitle, onNodeClick, selectedNodeId, componentInfoMap, currentDate, onReturnToToday, onOtherPastDays, onHelpClick }) {
  // Memoize nodes to prevent unnecessary recalculations
  const reactFlowNodes = useMemo(() => nodes.map(node => {
    const componentInfo = getComponentInfo(node.label, componentInfoMap || {})

    return {
      id: node.id,
      type: 'mystery',
      position: node.position,
      data: {
        label: node.mystery ? '???' : node.label,
        isCorrect: node.isCorrect,
        guessStatus: node.guessStatus,
        onNodeClick: onNodeClick,
        isSelected: selectedNodeId === node.id,
        componentInfo,
        isMysteryNode: node.mystery || node.wasMystery
      }
    }
  }), [nodes, componentInfoMap, onNodeClick, selectedNodeId])

  // Memoize edges to prevent unnecessary recalculations
  const edges = useMemo(() => {
    // Build a set of all connections for bidirectional detection
    const connectionSet = new Set()
    nodes.forEach(node => {
      node.connectsTo.forEach(targetId => {
        connectionSet.add(`${node.id}-${targetId}`)
      })
    })

    // Helper to check if connection is bidirectional
    const isBidirectional = (sourceId, targetId) => {
      return connectionSet.has(`${sourceId}-${targetId}`) &&
             connectionSet.has(`${targetId}-${sourceId}`)
    }

    // Track which bidirectional edges we've already created to avoid duplicates
    const processedBidirectional = new Set()

    return nodes.flatMap(node =>
      node.connectsTo.map(targetId => {
        const edgeId = `e${node.id}-${targetId}`
        const reverseEdgeId = `e${targetId}-${node.id}`

        // Check if this is bidirectional
        const bidirectional = isBidirectional(node.id, targetId)

        // Skip if we already created this bidirectional edge from the reverse direction
        if (bidirectional && processedBidirectional.has(reverseEdgeId)) {
          return null
        }

        // Mark this edge as processed if bidirectional
        if (bidirectional) {
          processedBidirectional.add(edgeId)
        }

        return {
          id: edgeId,
          source: node.id,
          target: targetId,
          markerEnd: { type: 'arrowclosed', width: 20, height: 20 },
          markerStart: bidirectional ? { type: 'arrowclosed', width: 20, height: 20 } : undefined
        }
      })
    ).filter(edge => edge !== null)
  }, [nodes])

  return (
    <main className="flex-1 bg-stone-800 relative">
      <header className="absolute top-0 left-1/2 -translate-x-1/2 z-10 w-1/2 bg-stone-900 border-b rounded-b-2xl px-2 lg:px-6 py-1.5 lg:py-3">
        <h1 className="text-white text-xs lg:text-lg font-medium text-left leading-tight">{dailyGameTitle}</h1>
        {currentDate && (
          <div className="flex flex-col lg:flex-row lg:items-center gap-1 lg:gap-3 mt-1 lg:mt-2">
            <span className="text-stone-400 text-[10px] lg:text-sm">Past Day: {currentDate}</span>
            <div className="flex gap-1 lg:gap-2">
              <button
                onClick={onReturnToToday}
                className="flex-1 lg:flex-none bg-green-600 hover:bg-green-500 text-white text-[10px] lg:text-xs px-2 py-1 lg:px-3 rounded font-semibold transition-colors"
              >
                Return to Today
              </button>
              <button
                onClick={onOtherPastDays}
                className="flex-1 lg:flex-none bg-stone-700 hover:bg-stone-600 text-white text-[10px] lg:text-xs px-2 py-1 lg:px-3 rounded font-semibold transition-colors"
              >
                Other Past Days
              </button>
            </div>
          </div>
        )}
      </header>
      <ReactFlow
        nodes={reactFlowNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        proOptions={{ hideAttribution: true }}
        nodesConnectable={false}
        nodesDraggable={false}
        panOnDrag={true}
        zoomOnScroll={false}
        fitView
        fitViewOptions={{ padding: { top: 0.4, right: 0.1, bottom: 0.2, left: 0.1 } }}
        // translateExtent={[[-150, -100], [1000, 800]]}
        minZoom={0.5}
        maxZoom={2}
      >
        <Background />
      </ReactFlow>
      <Logo onClick={onLogoClick} />
      <Scoreboard onSubmit={onSubmit} guesses={guesses} gameWon={gameWon} onShare={onShare} />

      {/* Help Button */}
      <button
        onClick={onHelpClick}
        className="absolute bottom-4 right-4 z-10 w-5 h-5 lg:w-10 lg:h-10 border-2 border-white text-white rounded-full flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer"
        aria-label="Help"
      >
        <span className="text-base lg:text-xl font-bold">?</span>
      </button>
    </main>
  )
}