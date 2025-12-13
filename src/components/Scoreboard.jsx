export default function Scoreboard() {
  // Create an array of 18 boxes (3 cols x 6 rows)
  const boxes = Array.from({ length: 18 }, (_, i) => i)

  return (
    <div className="absolute top-4 right-4 z-10">
      <div className="grid grid-cols-3 gap-1">
        {boxes.map((box) => (
          <div
            key={box}
            className="w-6 h-6 border border-white rounded-sm"
          />
        ))}
      </div>
    </div>
  )
}
