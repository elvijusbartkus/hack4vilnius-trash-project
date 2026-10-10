import { useEffect } from 'react'
import { ISSUE_REASONS } from '../data/issues.js'

// "Couldn't collect this one": a bottom sheet of reasons, one tap each, so a
// driver standing at the kerb can report it without typing.
export default function IssueSheet({ stop, number, current, onPick, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="issue-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="issue-title">Nepavyko paimti</h2>
        <p className="sheet__sub">
          {number}. {stop.address}
        </p>

        <div className="sheet__options">
          {ISSUE_REASONS.map((reason) => (
            <button
              key={reason.id}
              className={`sheet__option${current === reason.id ? ' is-selected' : ''}`}
              onClick={() => onPick(reason.id)}
            >
              {reason.label}
            </button>
          ))}
        </div>

        {current && (
          <button className="btn btn--ghost" onClick={() => onPick(null)}>
            Atšaukti pranešimą
          </button>
        )}
        <button className="link-btn sheet__close" onClick={onClose}>
          Uždaryti
        </button>
      </div>
    </div>
  )
}
