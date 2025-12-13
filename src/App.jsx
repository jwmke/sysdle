import { DndContext, DragOverlay } from '@dnd-kit/core'
import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import Canvas from './components/Canvas'
import Toast from './components/Toast'
import StatsModal from './components/StatsModal'
import { initialNodes } from './data/initialNodes'

// Mystery node IDs in order for scoreboard
const MYSTERY_NODE_IDS = ['2', '6', '7']

function App() {
  const [nodes, setNodes] = useState(() => {
    const saved = localStorage.getItem('nodes')
    return saved ? JSON.parse(saved) : initialNodes
  })
  const [activeId, setActiveId] = useState(null)
  const [guesses, setGuesses] = useState(() => {
    const saved = localStorage.getItem('guesses')
    return saved ? JSON.parse(saved) : []
  })
  const [gameWon, setGameWon] = useState(() => {
    const saved = localStorage.getItem('gameWon')
    return saved ? JSON.parse(saved) : false
  })
  const [componentStatuses, setComponentStatuses] = useState(() => {
    const saved = localStorage.getItem('componentStatuses')
    return saved ? JSON.parse(saved) : {}
  })
  const [toast, setToast] = useState(null)
  const [showStatsModal, setShowStatsModal] = useState(false)
  const [stats, setStats] = useState(() => {
    const saved = localStorage.getItem('stats')
    return saved ? JSON.parse(saved) : {
      currentStreak: 0,
      maxStreak: 0,
      totalGamesWon: 0,
      totalGuesses: 0
    }
  })

  useEffect(() => {
    if (activeId) {
      document.body.classList.add('dragging')
    } else {
      document.body.classList.remove('dragging')
    }
  }, [activeId])

  useEffect(() => {
    localStorage.setItem('guesses', JSON.stringify(guesses))
  }, [guesses])

  useEffect(() => {
    localStorage.setItem('nodes', JSON.stringify(nodes))
  }, [nodes])

  useEffect(() => {
    localStorage.setItem('gameWon', JSON.stringify(gameWon))
  }, [gameWon])

  useEffect(() => {
    localStorage.setItem('componentStatuses', JSON.stringify(componentStatuses))
  }, [componentStatuses])

  useEffect(() => {
    localStorage.setItem('stats', JSON.stringify(stats))
  }, [stats])

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

        // Don't allow dragging empty nodes
        if (sourceNode.label === '???') return prevNodes

        // Only allow dropping on mystery or wasMystery nodes
        if (!targetNode.mystery && !targetNode.wasMystery) return prevNodes

        // Target is only considered populated if it's not a mystery node and has a label
        const isTargetPopulated = !targetNode.mystery && targetNode.label !== '???'

        return prevNodes.map(node => {
          if (node.id === sourceNodeId) {
            // If target is populated, swap; otherwise move (source becomes ???)
            return isTargetPopulated
              ? { ...node, label: targetNode.label, mystery: false, wasMystery: true, isCorrect: undefined, guessStatus: undefined }
              : { ...node, label: '???', mystery: true, wasMystery: true, isCorrect: undefined, guessStatus: undefined }
          }
          if (node.id === targetNodeId) {
            // Target always gets source's label
            return { ...node, label: sourceNode.label, mystery: false, wasMystery: true, isCorrect: undefined, guessStatus: undefined }
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
            ? { ...node, label: component, mystery: false, wasMystery: true, isCorrect: undefined, guessStatus: undefined }
            : node
        )
      )
    }
  }

  const handleSubmit = () => {
    // If game is already won, do nothing
    if (gameWon) return

    // Get the mystery nodes
    const mysteryNodes = MYSTERY_NODE_IDS.map(id => nodes.find(n => n.id === id))

    // Check if all mystery nodes are filled
    const allFilled = mysteryNodes.every(node => node && node.label !== '???')

    if (!allFilled) {
      setToast('All nodes must be filled to submit a guess')
      return
    }

    // Get the correct answers for mystery nodes
    const correctAnswers = MYSTERY_NODE_IDS.map(id => {
      const correctNode = initialNodes.find(n => n.id === id)
      return correctNode.label
    })

    // Score the guess
    const guess = mysteryNodes.map((node, index) => {
      const guessedLabel = node.label
      const correctLabel = correctAnswers[index]

      let status
      if (guessedLabel === correctLabel) {
        // Correct position
        status = 'correct'
      } else if (correctAnswers.includes(guessedLabel)) {
        // Correct component but wrong position
        status = 'wrong-position'
      } else {
        // Incorrect
        status = 'incorrect'
      }

      return { label: guessedLabel, status }
    })

    // Check if all are correct
    const allCorrect = guess.every(item => item.status === 'correct')

    // Add the guess to history
    setGuesses(prev => [...prev, guess])

    // Update component statuses (only upgrade, never downgrade)
    const statusPriority = { correct: 3, 'wrong-position': 2, incorrect: 1 }
    setComponentStatuses(prev => {
      const updated = { ...prev }
      guess.forEach(item => {
        const currentPriority = statusPriority[updated[item.label]] || 0
        const newPriority = statusPriority[item.status]
        if (newPriority > currentPriority) {
          updated[item.label] = item.status
        }
      })
      return updated
    })

    // Update nodes with status for visual feedback
    setNodes(prevNodes =>
      prevNodes.map(node => {
        if (!MYSTERY_NODE_IDS.includes(node.id)) return node

        const nodeIndex = MYSTERY_NODE_IDS.indexOf(node.id)
        const guessStatus = guess[nodeIndex].status

        return {
          ...node,
          guessStatus
        }
      })
    )

    // If all correct, mark game as won and update stats
    if (allCorrect) {
      setGameWon(true)
      setStats(prev => {
        const newTotalGamesWon = prev.totalGamesWon + 1
        const newCurrentStreak = prev.currentStreak + 1
        const newMaxStreak = Math.max(newCurrentStreak, prev.maxStreak)
        const newTotalGuesses = prev.totalGuesses + guesses.length + 1

        return {
          currentStreak: newCurrentStreak,
          maxStreak: newMaxStreak,
          totalGamesWon: newTotalGamesWon,
          totalGuesses: newTotalGuesses
        }
      })
      setShowStatsModal(true)
    }
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

  // Get component status from tracked statuses
  const getComponentStatus = (componentLabel) => {
    return componentStatuses[componentLabel] || null
  }

  const handleShare = () => {
    const today = new Date()
    const dateStr = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

    const getEmojiMatrix = () => {
      if (guesses.length === 0) return ''
      return guesses.map(guess => {
        return guess.map(item => {
          if (item.status === 'correct') return '🟩'
          if (item.status === 'wrong-position') return '🟨'
          return '🟥'
        }).join('')
      }).join('\n')
    }

    const averageGuesses = stats.totalGamesWon > 0
      ? Math.round(stats.totalGuesses / stats.totalGamesWon)
      : 0

    const shareText = `🔧 ${dateStr} 🔧
🔥 ${stats.currentStreak} | Avg. Guesses: ${averageGuesses}
${getEmojiMatrix()}

https://sysdle.com`

    navigator.clipboard.writeText(shareText)
    setToast('Share message copied to clipboard!')
  }

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col-reverse lg:flex-row h-screen bg-stone-800">
        <Sidebar getComponentStatus={getComponentStatus} />
        <Canvas
          nodes={nodes}
          onSubmit={handleSubmit}
          guesses={guesses}
          gameWon={gameWon}
          onShare={() => {
            handleShare()
            setShowStatsModal(true)
          }}
        />
      </div>
      <DragOverlay>
        {activeId && (
          <div className="bg-stone-600 p-3 rounded text-white text-sm text-center">
            {getActiveLabel()}
          </div>
        )}
      </DragOverlay>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      <StatsModal
        isOpen={showStatsModal}
        onClose={() => setShowStatsModal(false)}
        stats={{
          ...stats,
          averageGuesses: stats.totalGamesWon > 0 ? Math.round(stats.totalGuesses / stats.totalGamesWon) : 0
        }}
        guesses={guesses}
        onShare={handleShare}
      />
    </DndContext>
  )
}

export default App