import Modal from './Modal'

export default function AboutModal({ isOpen, onClose }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="About">
      <div className="space-y-4 text-stone-300">
        <p>
          <span className="font-semibold text-white">Sysdle</span> is a daily system design game where you identify missing components in distributed systems architectures. Each day presents a new challenge to test your knowledge of databases, caches, load balancers, and more.
        </p>

        <p>
          In the era of LLMs, understanding high-level system architecture is more crucial than ever. While AI can generate code, the ability to design scalable, resilient systems requires deep architectural thinking that only comes from experience and practice.
        </p>

        <div className="pt-4 border-t border-stone-700">
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
        </div>
      </div>
    </Modal>
  )
}
