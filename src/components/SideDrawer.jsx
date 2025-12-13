import logo from '../assets/sysdle.svg'

export default function SideDrawer({ isOpen, onClose, onPastDaysClick, onAboutClick }) {
  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 backdrop-blur-sm z-40"
        onClick={onClose}
      ></div>

      {/* Drawer */}
      <div className="fixed top-0 left-0 h-full w-80 bg-stone-900 z-50 shadow-xl">
        <div className="p-6">
          {/* Logo and Title */}
          <div className="flex items-center gap-4 mb-8 cursor-pointer" onClick={onClose}>
            <img src={logo} alt="Sysdle" className="h-12 brightness-0 invert" />
            <h1 className="text-white text-3xl font-bold">Sysdle.com</h1>
          </div>

          {/* Menu Items */}
          <nav className="space-y-2">
            <button
              onClick={onPastDaysClick}
              className="w-full text-left text-white text-lg px-4 py-3 rounded hover:bg-stone-800 transition-colors"
            >
              Past Days
            </button>
            <button
              onClick={onAboutClick}
              className="w-full text-left text-white text-lg px-4 py-3 rounded hover:bg-stone-800 transition-colors"
            >
              About
            </button>
          </nav>
        </div>
      </div>
    </>
  )
}
