export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-stone-600 border-t-white rounded-full animate-spin"></div>
        <p className="text-white text-lg">Loading today's puzzle...</p>
      </div>
    </div>
  )
}
