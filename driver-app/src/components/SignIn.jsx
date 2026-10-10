import { DEMO_DAY } from '../../../lib/config.ts'
import { plural } from '../lib/lt.js'
import { LogoMark } from './icons.jsx'

// Shift-terminal style sign-in: the driver taps their own row on the day's
// roster to start. Mock only — the real app hands off to the fleet account system.
export default function SignIn({ drivers, onSignIn }) {
  return (
    <div className="screen screen--signin">
      <header className="roster-bar">
        <span className="roster-brand">
          <LogoMark size={30} />
          <span className="roster-wordmark">
            <span className="wm-waste">Waste</span>
            <span className="wm-wise">Wise</span>
          </span>
        </span>
        <span className="roster-date">{today()}</span>
      </header>

      <div className="roster-head">
        <h1>Pradėkite pamainą</h1>
        <p>Pasirinkite save sąraše.</p>
      </div>

      <ul className="roster" aria-label="Šios dienos pamaina">
        {drivers.map((driver) => {
          const stops = driver.rounds.reduce((s, r) => s + r.stops.length, 0)
          const km = driver.rounds.reduce((s, r) => s + r.distanceKm, 0)
          return (
            <li key={driver.id}>
              <button className="roster-row" onClick={() => onSignIn(driver.id)}>
                <span className="roster-row__fraction">
                  <span className="fraction-swatch" style={{ '--fraction': driver.fraction.colour }} aria-hidden="true" />
                  {driver.fraction.label}
                </span>
                <strong className="roster-row__name">{driver.name}</strong>
                <span className="roster-row__truck">{driver.truck}</span>
                <span className="roster-row__load">
                  {driver.rounds.length === 0 && driver.liveStatus ? (
                    driver.liveStatus.status === 'error' ? 'Maršruto įkelti nepavyko' : 'Kraunamas maršrutas…'
                  ) : (
                    <>
                      {plural(driver.rounds.length, 'reisas', 'reisai', 'reisų')} ·{' '}
                      {plural(stops, 'konteineris', 'konteineriai', 'konteinerių')} · {Math.round(km)} km
                    </>
                  )}
                </span>
                <svg className="roster-row__go" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                  <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square" />
                </svg>
              </button>
            </li>
          )
        })}
      </ul>

      <p className="demo-note">Demonstracinės paskyros — slaptažodžio nereikia.</p>
    </div>
  )
}

// The demo's route day (DEMO_TODAY + 1), not the real date.
function today() {
  const s = new Date(`${DEMO_DAY}T12:00:00`).toLocaleDateString('lt-LT', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
  return s.charAt(0).toUpperCase() + s.slice(1)
}
