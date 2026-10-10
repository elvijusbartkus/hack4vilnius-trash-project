import { plural } from '../lib/lt.js'
import { BackIcon, CheckIcon } from './icons.jsx'

// What the driver sees after signing in: their own rounds for today,
// nothing else. One tap opens a round. Rows share the roster's ruled sheet.
export default function ShiftList({ driver, progress, issues, onOpen, onSignOut }) {
  const totalStops = driver.rounds.reduce((s, r) => s + r.stops.length, 0)
  const totalDone = driver.rounds.reduce(
    (s, r) => s + (progress[r.id]?.length ?? 0),
    0,
  )

  return (
    <div className="screen">
      <header className="appbar appbar--round">
        <button className="link-btn" onClick={onSignOut}>
          <BackIcon size={18} /> Vairuotojai
        </button>
        <div className="appbar__title">
          <strong>{driver.name}</strong>
          <small>
            {driver.truck}
          </small>
        </div>
      </header>

      <div className="roster-head roster-head--shift">
        <h1>Šiandien</h1>
        <p className="shift-meta">
          <span className="fraction-swatch" style={{ '--fraction': driver.fraction.colour }} aria-hidden="true" />
          {driver.fraction.label} · paimta {totalDone} iš {totalStops}
        </p>
      </div>

      {driver.rounds.length === 0 && driver.liveStatus && (
        <p className="roster-empty" role={driver.liveStatus.status === 'error' ? 'alert' : undefined}>
          {driver.liveStatus.status === 'error'
            ? `Nepavyko įkelti maršruto: ${driver.liveStatus.message}`
            : 'Kraunamas maršrutas…'}
        </p>
      )}

      <ul className="roster" aria-label="Šiandienos reisai">
        {driver.rounds.map((round) => {
          const done = progress[round.id]?.length ?? 0
          const missed = Object.keys(issues[round.id] ?? {}).length
          // Reported stops count as dealt with — the round can still finish.
          const complete = done + missed === round.stops.length
          return (
            <li key={round.id}>
              <button
                className={`roster-row round-row${complete ? ' is-complete' : ''}`}
                style={{ '--fraction': round.fraction.colour }}
                onClick={() => onOpen(round.id)}
              >
                <span className="roster-row__top">
                  <strong className="roster-row__name">{round.shiftLabel}</strong>
                  <span className="round-row__time">{round.startTime}</span>
                </span>
                <span className="roster-row__truck">{round.districts.join(' · ')}</span>
                <span className="roster-row__load">
                  {plural(round.stops.length, 'konteineris', 'konteineriai', 'konteinerių')} ·{' '}
                  {round.distanceKm.toFixed(0)} km · {formatDuration(round.durationMin)}
                </span>
                <span className="progress">
                  {/* scaleX instead of width: no layout work while progress changes */}
                  <span
                    style={{ transform: `scaleX(${(done + missed) / round.stops.length})` }}
                  />
                </span>
                <span className="round-row__status">
                  {complete ? (
                    <>
                      <CheckIcon size={16} /> Baigta
                    </>
                  ) : (
                    `Paimta ${done}/${round.stops.length}`
                  )}
                  {missed > 0 && ` · ${missed} nepaimta`}
                </span>
                <svg className="roster-row__go" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                  <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square" />
                </svg>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function formatDuration(min) {
  const h = Math.floor(min / 60)
  const m = min % 60
  return h ? `${h} val. ${m} min.` : `${m} min.`
}
