import Modal from './Modal'

export default function StatsModal({ isOpen, onClose, stats, guesses, onShare }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Statistics">
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
    </Modal>
  )
}
