export default function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-stone-900 rounded-lg p-8 max-w-md w-full mx-4 border border-stone-600">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-white text-2xl font-bold">{title}</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-white text-2xl">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
