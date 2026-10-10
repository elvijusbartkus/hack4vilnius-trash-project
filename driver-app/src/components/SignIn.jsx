import { drivers } from '../data/shift.js'
import { plural } from '../lib/lt.js'
import { LogoMark } from './icons.jsx'

// Shift-terminal style sign-in: the driver taps their own name to start the
// day. Mock only — the real app hands off to the fleet account system.
export default function SignIn({ onSignIn }) {
  return (
    <div className="screen screen--signin">
      <div className="signin-brand">
        <span className="signin-mark">
          <LogoMark size={56} />
        </span>
        <h1>
          <span className="wm-waste">Waste</span>
          <span className="wm-wise">Wise</span>
        </h1>
        <p>Vairuotojo maršrutai · pasirinkite save ir pradėkite pamainą</p>
      </div>

      <ul className="driver-list">
        {drivers.map((driver) => (
          <li key={driver.id}>
            <button className="driver-btn" onClick={() => onSignIn(driver.id)}>
              <span className="avatar">{initials(driver.name)}</span>
              <span className="driver-btn__body">
                <strong>{driver.name}</strong>
                <small>
                  {driver.truck} · {driver.plate}
                </small>
                <span
                  className="fraction-tag"
                  style={{ '--fraction': driver.fraction.colour }}
                >
                  <span className="fraction-dot" />
                  {driver.fraction.label}
                </span>
              </span>
              <span className="driver-btn__count">
                {plural(driver.rounds.length, 'reisas', 'reisai', 'reisų')}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <p className="demo-note">Demonstracinės paskyros — slaptažodžio nereikia.</p>
    </div>
  )
}

function initials(name) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
}
