import { useEffect, useState } from 'react'
import { findDriver } from './data/shift.js'
import SignIn from './components/SignIn.jsx'
import ShiftList from './components/ShiftList.jsx'
import RoundView from './components/RoundView.jsx'

const SESSION_KEY = 'tr.driverId'
const PROGRESS_KEY = 'tr.progress.v2'
const ISSUES_KEY = 'tr.issues'

// Stable empties, so a round with nothing ticked yet doesn't hand the map a
// new array on every render (which would make it re-fit each time).
const NO_STOPS = []
const NO_ISSUES = {}

export default function App() {
  // Survives a reload — a driver who backgrounds the app mid-round comes
  // back to the same place rather than signing in again.
  const [driverId, setDriverId] = useState(() => load(SESSION_KEY, null))
  const [progress, setProgress] = useState(() => load(PROGRESS_KEY, {}))
  // Stops the driver couldn't collect, with why: { roundId: { stopId: reasonId } }.
  // A stop is either collected or has a problem, never both.
  const [issues, setIssues] = useState(() => load(ISSUES_KEY, {}))
  const [openRoundId, setOpenRoundId] = useState(null)

  useEffect(() => save(SESSION_KEY, driverId), [driverId])
  useEffect(() => save(PROGRESS_KEY, progress), [progress])
  useEffect(() => save(ISSUES_KEY, issues), [issues])

  const driver = driverId ? findDriver(driverId) : null

  if (!driver) {
    return <SignIn onSignIn={setDriverId} />
  }

  const openRound = driver.rounds.find((r) => r.id === openRoundId)

  if (openRound) {
    const roundId = openRound.id
    const setIssue = (stopId, reasonId) =>
      setIssues((prev) => {
        const { [stopId]: _, ...rest } = prev[roundId] ?? {}
        return { ...prev, [roundId]: reasonId ? { ...rest, [stopId]: reasonId } : rest }
      })

    return (
      <RoundView
        round={openRound}
        done={progress[roundId] ?? NO_STOPS}
        issues={issues[roundId] ?? NO_ISSUES}
        onToggleStop={(stopId) => {
          setIssue(stopId, null)
          setProgress((prev) => {
            const current = prev[roundId] ?? []
            return {
              ...prev,
              [roundId]: current.includes(stopId)
                ? current.filter((id) => id !== stopId)
                : [...current, stopId],
            }
          })
        }}
        onReportIssue={(stopId, reasonId) => {
          setIssue(stopId, reasonId)
          if (reasonId) {
            setProgress((prev) => ({
              ...prev,
              [roundId]: (prev[roundId] ?? []).filter((id) => id !== stopId),
            }))
          }
        }}
        onBack={() => setOpenRoundId(null)}
      />
    )
  }

  return (
    <ShiftList
      driver={driver}
      progress={progress}
      issues={issues}
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
