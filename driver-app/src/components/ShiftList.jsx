// What the driver sees after signing in: their own rounds for today,
// nothing else. One tap opens a round.
export default function ShiftList({ driver, progress, onOpen, onSignOut }) {
  const totalStops = driver.rounds.reduce((s, r) => s + r.stops.length, 0)
  const totalDone = driver.rounds.reduce(
    (s, r) => s + (progress[r.id]?.length ?? 0),
    0,
  )

  return (
    <div className="screen">
      <header className="appbar">
        <div>
          <h1>Today</h1>
          <p>{driver.name.split(' ')[0]} · {driver.plate}</p>
        </div>
        <button className="link-btn" onClick={onSignOut}>
          Sign out
        </button>
      </header>

      <p className="day-summary">
        {totalDone} of {totalStops} stops done
      </p>

      <ul className="round-list">
        {driver.rounds.map((round) => {
          const done = progress[round.id]?.length ?? 0
          const complete = done === round.stops.length
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
                  <span>{round.stops.length} stops</span>
                  <span>{round.distanceKm.toFixed(0)} km</span>
                  <span>{formatDuration(round.durationMin)}</span>
                </span>

                {round.urgentCount > 0 && !complete && (
                  <span className="badge badge--urgent">
                    {round.urgentCount} urgent
                  </span>
                )}

                <span className="progress">
                  <span
                    style={{ width: `${(done / round.stops.length) * 100}%` }}
                  />
                </span>
                <span className="round-btn__progress-text">
                  {complete ? 'Completed' : `${done}/${round.stops.length} collected`}
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
  return h ? `${h} h ${m} min` : `${m} min`
}
