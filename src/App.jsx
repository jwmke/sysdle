import { DndContext, DragOverlay } from '@dnd-kit/core'
import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import Canvas from './components/Canvas'
import Toast from './components/Toast'
import StatsModal from './components/StatsModal'
import SideDrawer from './components/SideDrawer'
import PastDaysModal from './components/PastDaysModal'
import AboutModal from './components/AboutModal'
import LoadingSpinner from './components/LoadingSpinner'

function App() {
  const [loading, setLoading] = useState(true)
  const [dailyGameTitle, setDailyGameTitle] = useState('')
  const [availableComponents, setAvailableComponents] = useState([])
  const [nodes, setNodes] = useState([])
  const [mysteryNodeIds, setMysteryNodeIds] = useState([])
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
  const [showDrawer, setShowDrawer] = useState(false)
  const [showPastDaysModal, setShowPastDaysModal] = useState(false)
  const [showAboutModal, setShowAboutModal] = useState(false)
  const [stats, setStats] = useState(() => {
    const saved = localStorage.getItem('stats')
    return saved ? JSON.parse(saved) : {
      currentStreak: 0,
      maxStreak: 0,
      totalGamesWon: 0,
      totalGuesses: 0
    }
  })

  // Fetch daily game on mount
  useEffect(() => {
    const fetchDailyGame = async () => {
      const today = new Date().toISOString().split('T')[0]
      const cacheKey = `daily-game-${today}`

      // Check localStorage first
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        const gameData = JSON.parse(cached)

        // Extract mystery node IDs from the game data
        const mysteryIds = gameData.nodes
          .filter(node => node.mystery)
          .map(node => node.id)
        setMysteryNodeIds(mysteryIds)

        setDailyGameTitle(gameData.title)
        setAvailableComponents(gameData.components)

        // Check if user has saved progress for today
        const savedNodes = localStorage.getItem('nodes')
        const savedDate = localStorage.getItem('currentGameDate')

        if (savedNodes && savedDate === today) {
          // Load saved progress from today
          const parsedNodes = JSON.parse(savedNodes)
          setNodes(parsedNodes)
        } else {
          // New game, use fresh nodes and clear old progress
          setNodes(gameData.nodes)
          localStorage.setItem('currentGameDate', today)
          localStorage.removeItem('guesses')
          localStorage.removeItem('gameWon')
          localStorage.removeItem('componentStatuses')
        }

        setLoading(false)
        return
      }

      // Fetch from API
      try {
        const response = await fetch('/api/daily-game')
        if (!response.ok) throw new Error('Failed to fetch daily game')

        const gameData = await response.json()

        // Cache the game data
        localStorage.setItem(cacheKey, JSON.stringify(gameData))
        localStorage.setItem('currentGameDate', today)

        // Extract mystery node IDs from the game data
        const mysteryIds = gameData.nodes
          .filter(node => node.mystery)
          .map(node => node.id)
        setMysteryNodeIds(mysteryIds)

        setDailyGameTitle(gameData.title)
        setAvailableComponents(gameData.components)
        setNodes(gameData.nodes)

        // Clear old progress for new game
        localStorage.removeItem('guesses')
        localStorage.removeItem('gameWon')
        localStorage.removeItem('componentStatuses')

        setLoading(false)
      } catch (error) {
        console.error('Error fetching daily game:', error)
        setToast('Failed to load daily game. Please refresh.')
        setLoading(false)
      }
    }

    fetchDailyGame()
  }, [])

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
    // Only save nodes if they exist (not empty array on initial load)
    if (nodes.length > 0) {
      localStorage.setItem('nodes', JSON.stringify(nodes))
    }
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
    const mysteryNodes = mysteryNodeIds.map(id => nodes.find(n => n.id === id))

    // Check if all mystery nodes are filled
    const allFilled = mysteryNodes.every(node => node && node.label !== '???')

    if (!allFilled) {
      setToast('All nodes must be filled to submit a guess')
      return
    }

    // Get the correct answers for mystery nodes from the initial game data
    const correctAnswers = mysteryNodeIds.map(id => {
      const savedGameData = localStorage.getItem(`daily-game-${new Date().toISOString().split('T')[0]}`)
      const gameData = JSON.parse(savedGameData)
      const correctNode = gameData.nodes.find(n => n.id === id)
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
        if (!mysteryNodeIds.includes(node.id)) return node

        const nodeIndex = mysteryNodeIds.indexOf(node.id)
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

  if (loading) {
    return (
      <div className="h-screen bg-stone-800">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col-reverse lg:flex-row h-screen bg-stone-800">
        <Sidebar
          getComponentStatus={getComponentStatus}
          onLogoClick={() => setShowDrawer(true)}
          components={availableComponents}
        />
        <Canvas
          nodes={nodes}
          onSubmit={handleSubmit}
          guesses={guesses}
          gameWon={gameWon}
          onShare={() => {
            handleShare()
            setShowStatsModal(true)
          }}
          onLogoClick={() => setShowDrawer(true)}
          dailyGameTitle={dailyGameTitle}
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
      <SideDrawer
        isOpen={showDrawer}
        onClose={() => setShowDrawer(false)}
        onPastDaysClick={() => {
          setShowDrawer(false)
          setShowPastDaysModal(true)
        }}
        onAboutClick={() => {
          setShowDrawer(false)
          setShowAboutModal(true)
        }}
      />
      <PastDaysModal
        isOpen={showPastDaysModal}
        onClose={() => setShowPastDaysModal(false)}
      />
      <AboutModal
        isOpen={showAboutModal}
        onClose={() => setShowAboutModal(false)}
      />
    </DndContext>
  )
}

export default App