export default function Scoreboard({ onSubmit, guesses, gameWon }) {
  const MAX_GUESSES = 6

  const getBoxColor = (rowIndex, colIndex) => {
    if (rowIndex >= guesses.length) {
      // Empty box
      return 'border border-white'
    }

    const guess = guesses[rowIndex]
    const item = guess[colIndex]

    if (item.status === 'correct') {
      return 'bg-green-500 border border-green-600'
    } else if (item.status === 'wrong-position') {
      return 'bg-yellow-500 border border-yellow-600'
    } else {
      return 'bg-red-500 border border-red-600'
    }
  }

  return (
    <div className="absolute top-4 right-4 z-10 flex flex-col gap-1">
      <div className="grid grid-cols-3 gap-1">
        {Array.from({ length: MAX_GUESSES * 3 }, (_, i) => {
          const rowIndex = Math.floor(i / 3)
          const colIndex = i % 3

          return (
            <div
              key={i}
              className={`w-6 h-6 rounded-sm ${getBoxColor(rowIndex, colIndex)}`}
            />
          )
        })}
      </div>
      <button
        onClick={gameWon ? undefined : onSubmit}
        className={`h-6 font-semibold text-xs rounded-sm transition-colors ${
          gameWon
            ? 'bg-green-500 text-white cursor-default'
            : 'bg-stone-100 hover:bg-stone-200 hover:cursor-pointer'
        }`}
      >
        {gameWon ? 'Share' : 'Submit'}
      </button>
    </div>
  )
}
