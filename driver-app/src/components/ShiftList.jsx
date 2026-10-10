import { plural } from '../lib/lt.js'

// What the driver sees after signing in: their own rounds for today,
// nothing else. One tap opens a round.
export default function ShiftList({ driver, progress, issues, onOpen, onSignOut }) {
  const totalStops = driver.rounds.reduce((s, r) => s + r.stops.length, 0)
  const totalDone = driver.rounds.reduce(
    (s, r) => s + (progress[r.id]?.length ?? 0),
    0,
  )

  return (
    <div className="screen">
      <header className="appbar">
        <div>
          <h1>Šiandien</h1>
          <p>
            {driver.name.split(' ')[0]} · {driver.plate} · {driver.fraction.label}
          </p>
        </div>
        <button className="link-btn" onClick={onSignOut}>
          Atsijungti
        </button>
      </header>

      <p className="day-summary">
        Ištuštinta {totalDone} iš {totalStops}
      </p>

      <ul className="round-list">
        {driver.rounds.map((round) => {
          const done = progress[round.id]?.length ?? 0
          const missed = Object.keys(issues[round.id] ?? {}).length
          // Reported stops count as dealt with — the round can still finish.
          const complete = done + missed === round.stops.length
          return (
            <li key={round.id}>
              <button
                className={`round-btn${complete ? ' is-complete' : ''}`}
                style={{ '--fraction': round.fraction.colour }}
                onClick={() => onOpen(round.id)}
              >
                <span className="round-btn__top">
                  <strong>{round.shiftLabel}</strong>
                  <span className="round-time">{round.startTime}</span>
                </span>

                <span className="fraction-tag">
                  <span className="fraction-dot" />
                  {round.fraction.label}
                </span>

                <span className="round-btn__districts">
                  {round.districts.join(' · ')}
                </span>

                <span className="round-btn__facts">
                  <span>
                    {plural(round.stops.length, 'konteineris', 'konteineriai', 'konteinerių')}
                  </span>
                  <span>{round.distanceKm.toFixed(0)} km</span>
                  <span>{formatDuration(round.durationMin)}</span>
                </span>

                {round.urgentCount > 0 && !complete && (
                  <span className="badge badge--urgent">
                    {plural(round.urgentCount, 'skubus', 'skubūs', 'skubių')}
                  </span>
                )}

                <span className="progress">
                  <span
                    style={{ width: `${((done + missed) / round.stops.length) * 100}%` }}
                  />
                </span>
                <span className="round-btn__progress-text">
                  {complete ? 'Baigta' : `Ištuštinta ${done}/${round.stops.length}`}
                  {missed > 0 && ` · ${missed} nepaimta`}
                </span>
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
