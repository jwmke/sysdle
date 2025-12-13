import { useEffect } from 'react'

export default function Toast({ message, onClose, duration = 2000 }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, duration)

    return () => clearTimeout(timer)
  }, [onClose, duration])

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in">
      <div className="bg-stone-800 text-white px-6 py-3 rounded-lg shadow-lg border border-stone-600">
        {message}
      </div>
    </div>
  )
}
