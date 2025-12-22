import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { useState, useEffect, useRef } from 'react'
import Sidebar from './components/Sidebar'
import Canvas from './components/Canvas'
import Toast from './components/Toast'
import StatsModal from './components/StatsModal'
import SideDrawer from './components/SideDrawer'
import PastDaysModal from './components/PastDaysModal'
import AboutModal from './components/AboutModal'
import LoadingSpinner from './components/LoadingSpinner'
import { fetchComponentInfo } from './lib/supabase'

// Helper function to get today's date in YYYY-MM-DD format using local timezone
const getLocalDateString = () => {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Helper function to get yesterday's date in YYYY-MM-DD format
const getYesterdayDateString = () => {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const year = yesterday.getFullYear()
  const month = String(yesterday.getMonth() + 1).padStart(2, '0')
  const day = String(yesterday.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function App() {
  const intervalRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [dailyGameTitle, setDailyGameTitle] = useState('')
  const [availableComponents, setAvailableComponents] = useState([])
  const [nodes, setNodes] = useState([])
  const [mysteryNodeIds, setMysteryNodeIds] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [selectedComponent, setSelectedComponent] = useState(null)
  const [selectedNodeId, setSelectedNodeId] = useState(null)
  const [componentInfoMap, setComponentInfoMap] = useState({})

  // Configure DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor)
  )
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
    if (saved) {
      const parsed = JSON.parse(saved)
      // Add lastCompletedDate if it doesn't exist (backward compatibility)
      if (!parsed.hasOwnProperty('lastCompletedDate')) {
        parsed.lastCompletedDate = null
      }
      return parsed
    }
    return {
      currentStreak: 0,
      maxStreak: 0,
      totalGamesWon: 0,
      totalGuesses: 0,
      lastCompletedDate: null
    }
  })

  // Fetch daily game on mount
  useEffect(() => {
    const fetchDailyGame = async () => {
      const today = getLocalDateString()
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
        const response = await fetch(`/api/daily-game?date=${today}`)
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

  // Fetch component info on mount
  useEffect(() => {
    const loadComponentInfo = async () => {
      const info = await fetchComponentInfo()
      setComponentInfoMap(info)
    }
    loadComponentInfo()
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

  // Check for date changes every 60 seconds (midnight reset)
  useEffect(() => {
    // Clear any existing interval first to prevent duplicates during HMR
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    intervalRef.current = setInterval(() => {
      const savedDate = localStorage.getItem('currentGameDate')
      const currentDate = getLocalDateString()

      if (savedDate && savedDate !== currentDate) {
        // Date has changed - trigger reset
        handleDateChange()
      }
    }, 60000) // Check every 60 seconds

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  const handleComponentClick = (component) => {
    setSelectedComponent(component)
    setSelectedNodeId(null) // Clear node selection when selecting a component
  }

  const handleNodeClick = (nodeId, nodeLabel) => {
    // If a component is selected from sidebar, place it on the node
    if (selectedComponent) {
      setNodes(prevNodes =>
        prevNodes.map(node =>
          node.id === nodeId && (node.mystery || node.wasMystery)
            ? { ...node, label: selectedComponent, mystery: false, wasMystery: true, isCorrect: undefined, guessStatus: undefined }
            : node
        )
      )
      setSelectedComponent(null)
      return
    }

    // If a node is already selected, swap with it
    if (selectedNodeId) {
      const sourceNodeId = selectedNodeId

      // Don't swap with itself
      if (sourceNodeId === nodeId) {
        setSelectedNodeId(null)
        return
      }

      setNodes(prevNodes => {
        const sourceNode = prevNodes.find(n => n.id === sourceNodeId)
        const targetNode = prevNodes.find(n => n.id === nodeId)

        if (!sourceNode || !targetNode) return prevNodes

        // Only allow swapping on mystery or wasMystery nodes
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
          if (node.id === nodeId) {
            // Target always gets source's label
            return { ...node, label: sourceNode.label, mystery: false, wasMystery: true, isCorrect: undefined, guessStatus: undefined }
          }
          return node
        })
      })

      setSelectedNodeId(null)
      return
    }

    // Otherwise, select this node if it's filled
    if (nodeLabel !== '???') {
      setSelectedNodeId(nodeId)
      setSelectedComponent(null) // Clear component selection when selecting a node
    }
  }

  const handleSubmit = () => {
    // If game is already won, do nothing
    if (gameWon) return

    // Get the mystery nodes
    const mysteryNodes = mysteryNodeIds.map(id => nodes.find(n => n.id === id))

    // Check if all mystery nodes are filled (mystery: false means user placed a component)
    const allFilled = mysteryNodes.every(node => node && !node.mystery)

    if (!allFilled) {
      setToast('All nodes must be filled to submit a guess')
      return
    }

    // Get the correct answers for mystery nodes from the initial game data
    const correctAnswers = mysteryNodeIds.map(id => {
      const savedGameData = localStorage.getItem(`daily-game-${getLocalDateString()}`)
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
        const today = getLocalDateString()
        const yesterday = getYesterdayDateString()
        const lastCompleted = prev.lastCompletedDate

        // Determine if streak continues or resets
        let newCurrentStreak
        if (lastCompleted === yesterday) {
          // Streak continues - completed yesterday
          newCurrentStreak = prev.currentStreak + 1
        } else if (lastCompleted === today) {
          // Already completed today (shouldn't happen, but handle it)
          newCurrentStreak = prev.currentStreak
        } else {
          // Streak broken - reset to 1
          newCurrentStreak = 1
        }

        const newTotalGamesWon = prev.totalGamesWon + 1
        const newMaxStreak = Math.max(newCurrentStreak, prev.maxStreak)
        const newTotalGuesses = prev.totalGuesses + guesses.length + 1

        return {
          currentStreak: newCurrentStreak,
          maxStreak: newMaxStreak,
          totalGamesWon: newTotalGamesWon,
          totalGuesses: newTotalGuesses,
          lastCompletedDate: today
        }
      })
      setShowStatsModal(true)
    }
  }

  const handleDateChange = async () => {
    const today = getLocalDateString()

    // Clear localStorage
    localStorage.removeItem('guesses')
    localStorage.removeItem('gameWon')
    localStorage.removeItem('componentStatuses')
    localStorage.removeItem('nodes')
    localStorage.setItem('currentGameDate', today)

    // Reset state
    setGuesses([])
    setGameWon(false)
    setComponentStatuses({})

    // Fetch new game
    try {
      const cacheKey = `daily-game-${today}`
      const cached = localStorage.getItem(cacheKey)

      if (cached) {
        const gameData = JSON.parse(cached)
        // Load the new game data
        setNodes(gameData.nodes)
        setDailyGameTitle(gameData.title)
        setAvailableComponents(gameData.components)

        const mysteryIds = gameData.nodes
          .filter(node => node.mystery)
          .map(node => node.id)
        setMysteryNodeIds(mysteryIds)
      } else {
        // Fetch from API
        const response = await fetch(`/api/daily-game?date=${today}`)
        const gameData = await response.json()

        localStorage.setItem(cacheKey, JSON.stringify(gameData))
        setNodes(gameData.nodes)
        setDailyGameTitle(gameData.title)
        setAvailableComponents(gameData.components)

        const mysteryIds = gameData.nodes
          .filter(node => node.mystery)
          .map(node => node.id)
        setMysteryNodeIds(mysteryIds)
      }

      // Show notification
      setToast('New daily puzzle available!')
    } catch (error) {
      console.error('Error loading new daily game:', error)
      setToast('Failed to load new puzzle. Please refresh.')
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
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      autoScroll={false}
    >
      <div className="flex flex-col-reverse lg:flex-row h-screen bg-stone-800">
        <Sidebar
          getComponentStatus={getComponentStatus}
          onLogoClick={() => setShowDrawer(true)}
          components={availableComponents}
          onComponentClick={handleComponentClick}
          selectedComponent={selectedComponent}
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
          onNodeClick={handleNodeClick}
          selectedNodeId={selectedNodeId}
          componentInfoMap={componentInfoMap}
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