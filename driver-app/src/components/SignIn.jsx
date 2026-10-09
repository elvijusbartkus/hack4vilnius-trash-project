import { drivers } from '../data/shift.js'

// Shift-terminal style sign-in: the driver taps their own name to start the
// day. Mock only — the real app hands off to the fleet account system.
export default function SignIn({ onSignIn }) {
  return (
    <div className="screen screen--signin">
      <div className="signin-brand">
        <span className="signin-mark">♻</span>
        <h1>Trash Routes</h1>
        <p>Tap your name to start your shift</p>
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
              </span>
              <span className="driver-btn__count">
                {driver.rounds.length === 1
                  ? '1 round'
                  : `${driver.rounds.length} rounds`}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <p className="demo-note">Demo accounts — no password needed.</p>
    </div>
  )
}

function initials(name) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
}
