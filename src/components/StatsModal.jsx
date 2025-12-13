export default function StatsModal({ isOpen, onClose, stats, guesses, onShare }) {
  if (!isOpen) return null

  const getEmojiPattern = () => {
    if (guesses.length === 0) return ''
    const lastGuess = guesses[guesses.length - 1]
    return lastGuess.map(item => {
      if (item.status === 'correct') return '🟩'
      if (item.status === 'wrong-position') return '🟨'
      return '🟥'
    }).join('')
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-stone-900 rounded-lg p-8 max-w-md w-full mx-4 border border-stone-600">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-white text-2xl font-bold">Statistics</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-white text-2xl">
            ×
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-stone-800 rounded p-4 text-center">
            <div className="text-3xl font-bold text-white">{guesses.length}</div>
            <div className="text-sm text-stone-400">Today's Guesses</div>
          </div>
          <div className="bg-stone-800 rounded p-4 text-center">
            <div className="text-3xl font-bold text-white">{stats.currentStreak}</div>
            <div className="text-sm text-stone-400">Current Streak</div>
          </div>
          <div className="bg-stone-800 rounded p-4 text-center">
            <div className="text-3xl font-bold text-white">{stats.totalGamesWon}</div>
            <div className="text-sm text-stone-400">Total Games Won</div>
          </div>
          <div className="bg-stone-800 rounded p-4 text-center">
            <div className="text-3xl font-bold text-white">{stats.maxStreak}</div>
            <div className="text-sm text-stone-400">Max Streak</div>
          </div>
        </div>

        <div className="bg-stone-800 rounded p-4 text-center mb-6">
          <div className="text-3xl font-bold text-white">{stats.averageGuesses}</div>
          <div className="text-sm text-stone-400">Average Guesses</div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => {}}
            className="flex-1 bg-stone-700 hover:bg-stone-600 text-white py-3 rounded font-semibold transition-colors"
          >
            Past Days
          </button>
          <button
            onClick={onShare}
            className="flex-1 bg-green-600 hover:bg-green-500 text-white py-3 rounded font-semibold transition-colors"
          >
            Share
          </button>
        </div>
      </div>
    </div>
  )
}
