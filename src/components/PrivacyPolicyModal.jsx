import Modal from './Modal'

export default function PrivacyPolicyModal({ isOpen, onClose }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Privacy Policy" wide={true}>
      <div className="space-y-4 text-stone-300 text-sm">
        <p className="text-stone-400 text-xs">Last updated: January 1, 2026</p>

        <section>
          <h3 className="font-semibold text-white mb-2">Information We Collect</h3>
          <p>
            Sysdle collects minimal, anonymized usage data to help us improve the game experience. This includes:
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
            <li>Game interactions (puzzle attempts, completions)</li>
            <li>Basic analytics (page views, sessions)</li>
            <li>Device and browser information</li>
          </ul>
          <p className="mt-2">
            We do not collect any personally identifiable information (PII) such as names, email addresses, or account details.
          </p>
        </section>

        <section>
          <h3 className="font-semibold text-white mb-2">How We Use Your Information</h3>
          <p>
            The data we collect is used solely to:
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
            <li>Understand how players interact with puzzles</li>
            <li>Identify which components are most challenging</li>
            <li>Improve game design and difficulty balance</li>
            <li>Monitor technical performance and errors</li>
          </ul>
        </section>

        <section>
          <h3 className="font-semibold text-white mb-2">Analytics Services</h3>
          <p>
            We use the following third-party services for analytics:
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
            <li><strong>PostHog</strong> - Product analytics and user behavior tracking</li>
            <li><strong>Vercel Analytics</strong> - Web vitals and performance monitoring</li>
          </ul>
          <p className="mt-2">
            These services may use cookies and similar technologies. All data is anonymized and not sold to third parties.
          </p>
        </section>

        <section>
          <h3 className="font-semibold text-white mb-2">Local Storage</h3>
          <p>
            Sysdle stores your game progress locally in your browser using localStorage. This data never leaves your device and includes:
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
            <li>Your current puzzle state</li>
            <li>Statistics (streaks, wins, average guesses)</li>
            <li>Completed puzzle dates</li>
            <li>Cached puzzle data</li>
          </ul>
        </section>

        <section>
          <h3 className="font-semibold text-white mb-2">Your Rights</h3>
          <p>
            You can clear all locally stored data at any time by clearing your browser's localStorage for this site.
            To opt out of analytics tracking, you can use browser extensions that block analytics scripts or enable
            Do Not Track in your browser settings.
          </p>
        </section>

        <section>
          <h3 className="font-semibold text-white mb-2">Changes to This Policy</h3>
          <p>
            We may update this privacy policy from time to time. Any changes will be posted on this page with an updated revision date.
          </p>
        </section>
      </div>
    </Modal>
  )
}
