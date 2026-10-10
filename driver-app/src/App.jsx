import { useEffect, useState } from 'react'
import { findDriver } from './data/shift.js'
import SignIn from './components/SignIn.jsx'
import ShiftList from './components/ShiftList.jsx'
import RoundView from './components/RoundView.jsx'

const SESSION_KEY = 'tr.driverId'
const PROGRESS_KEY = 'tr.progress.v2'

export default function App() {
  // Survives a reload — a driver who backgrounds the app mid-round comes
  // back to the same place rather than signing in again.
  const [driverId, setDriverId] = useState(() => load(SESSION_KEY, null))
  const [progress, setProgress] = useState(() => load(PROGRESS_KEY, {}))
  const [openRoundId, setOpenRoundId] = useState(null)

  useEffect(() => save(SESSION_KEY, driverId), [driverId])
  useEffect(() => save(PROGRESS_KEY, progress), [progress])

  const driver = driverId ? findDriver(driverId) : null

  if (!driver) {
    return <SignIn onSignIn={setDriverId} />
  }

  const openRound = driver.rounds.find((r) => r.id === openRoundId)

  if (openRound) {
    return (
      <RoundView
        round={openRound}
        done={progress[openRound.id] ?? []}
        onToggleStop={(stopId) =>
          setProgress((prev) => {
            const current = prev[openRound.id] ?? []
            return {
              ...prev,
              [openRound.id]: current.includes(stopId)
                ? current.filter((id) => id !== stopId)
                : [...current, stopId],
            }
          })
        }
        onBack={() => setOpenRoundId(null)}
      />
    )
  }

  return (
    <ShiftList
      driver={driver}
      progress={progress}
      onOpen={setOpenRoundId}
      onSignOut={() => {
        setDriverId(null)
        setOpenRoundId(null)
      }}
    />
  )
}

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function save(key, value) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Private browsing with storage blocked — progress just won't persist.
  }
}
