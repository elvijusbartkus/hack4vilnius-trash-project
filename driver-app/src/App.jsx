import { useEffect, useMemo, useState } from 'react'
import { drivers as plannedDrivers } from './data/shift.js'
import { useLiveRound } from './lib/live.js'
import SignIn from './components/SignIn.jsx'
import ShiftList from './components/ShiftList.jsx'
import RoundView from './components/RoundView.jsx'

const SESSION_KEY = 'tr.driverId'
const PROGRESS_KEY = 'tr.progress.v2'
const ISSUES_KEY = 'tr.issues'
const COLLECTED_AT_KEY = 'tr.collectedAt'

// Stable empties, so a round with nothing ticked yet doesn't hand the map a
// new array on every render (which would make it re-fit each time).
const NO_STOPS = []
const NO_ISSUES = {}
const NO_TIMES = {}

export default function App() {
  // Survives a reload — a driver who backgrounds the app mid-round comes
  // back to the same place rather than signing in again.
  const [driverId, setDriverId] = useState(() => load(SESSION_KEY, null))
  const [progress, setProgress] = useState(() => load(PROGRESS_KEY, {}))
  // Stops the driver couldn't collect, with why: { roundId: { stopId: reasonId } }.
  // A stop is either collected or has a problem, never both.
  const [issues, setIssues] = useState(() => load(ISSUES_KEY, {}))
  // When each stop was marked collected, as an ISO timestamp:
  // { roundId: { stopId: '2026-10-10T07:42:13.512Z' } }.
  const [collectedAt, setCollectedAt] = useState(() => load(COLLECTED_AT_KEY, {}))
  const [openRoundId, setOpenRoundId] = useState(null)

  useEffect(() => save(SESSION_KEY, driverId), [driverId])
  useEffect(() => save(PROGRESS_KEY, progress), [progress])
  useEffect(() => save(ISSUES_KEY, issues), [issues])
  useEffect(() => save(COLLECTED_AT_KEY, collectedAt), [collectedAt])

  // The first driver works the real route day from Supabase (Pilaitė, live);
  // the other crews keep their planned rounds as decoration.
  const live = useLiveRound()
  const drivers = useMemo(
    () =>
      plannedDrivers.map((d, i) =>
        i === 0 ? { ...d, rounds: live.round ? [live.round] : [], liveStatus: live } : d,
      ),
    [live],
  )
  const driver = driverId ? drivers.find((d) => d.id === driverId) ?? null : null

  // Each screen is a history entry (roster 0, rounds 1, open round 2), so the
  // phone's back gesture steps out one level instead of leaving the app.
  const depth = driver ? (openRoundId ? 2 : 1) : 0
  useEffect(() => {
    if ((window.history.state?.depth ?? 0) < depth) window.history.pushState({ depth }, '')
  }, [depth])
  useEffect(() => {
    const onPop = (e) => {
      const d = e.state?.depth ?? 0
      if (d < 2) setOpenRoundId(null)
      if (d < 1) setDriverId(null)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  // In-app back buttons go through history too, so both stay in sync.
  const stepBack = (fallback) =>
    (window.history.state?.depth ?? 0) > 0 ? window.history.back() : fallback()

  if (!driver) {
    return <SignIn drivers={drivers} onSignIn={setDriverId} />
  }

  const openRound = driver.rounds.find((r) => r.id === openRoundId)

  if (openRound) {
    const roundId = openRound.id
    const setIssue = (stopId, reasonId) =>
      setIssues((prev) => {
        const { [stopId]: _, ...rest } = prev[roundId] ?? {}
        return { ...prev, [roundId]: reasonId ? { ...rest, [stopId]: reasonId } : rest }
      })
    // Stamped at the tap itself; undoing or reporting a problem clears it.
    const setCollectedTime = (stopId, iso) =>
      setCollectedAt((prev) => {
        const { [stopId]: _, ...rest } = prev[roundId] ?? {}
        return { ...prev, [roundId]: iso ? { ...rest, [stopId]: iso } : rest }
      })

    return (
      <RoundView
        round={openRound}
        done={progress[roundId] ?? NO_STOPS}
        issues={issues[roundId] ?? NO_ISSUES}
        collectedAt={collectedAt[roundId] ?? NO_TIMES}
        onToggleStop={(stopId) => {
          const wasDone = (progress[roundId] ?? []).includes(stopId)
          setCollectedTime(stopId, wasDone ? null : new Date().toISOString())
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
            setCollectedTime(stopId, null)
            setProgress((prev) => ({
              ...prev,
              [roundId]: (prev[roundId] ?? []).filter((id) => id !== stopId),
            }))
          }
        }}
        onBack={() => stepBack(() => setOpenRoundId(null))}
      />
    )
  }

  return (
    <ShiftList
      driver={driver}
      progress={progress}
      issues={issues}
      onOpen={setOpenRoundId}
      onSignOut={() =>
        stepBack(() => {
          setDriverId(null)
          setOpenRoundId(null)
        })
      }
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
