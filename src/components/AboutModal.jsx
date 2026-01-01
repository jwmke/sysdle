import Modal from './Modal'

export default function AboutModal({ isOpen, onClose, onPrivacyClick }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="About">
      <div className="space-y-4 text-stone-300">
        <p>
          <span className="font-semibold text-white">Sysdle</span> is a daily puzzle game for aspiring system design nerds.
        </p>

        <p>
          Guess the missing components in architecture diagrams. Databases, caches, load balancers, API gateways - you know the drill.
        </p>

        <p>
          New puzzle every day at midnight.
        </p>

        <div className="pt-4 border-t border-stone-700 space-y-2 flex justify-between">
          <p className="text-sm text-stone-400">
            Vibecoded with love, by{' '}
            <a
              href="https://github.com/jwmke"
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-400 hover:text-green-300 underline"
            >
              @jwmke
            </a>
          </p>
          <p className="text-xs text-stone-500 pt-0.5">
            <button
              onClick={onPrivacyClick}
              className="text-stone-500 hover:cursor-pointer hover:text-green-300 underline"
            >
              Privacy Policy
            </button>
          </p>
        </div>
      </div>
    </Modal>
  )
}
