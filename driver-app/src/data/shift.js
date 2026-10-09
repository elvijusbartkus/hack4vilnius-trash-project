// The day's shift: who's driving, and which round each of them got.
//
// In production the dispatcher's planner writes this and the driver app just
// reads back the rounds assigned to the signed-in driver. Here we run the
// planner once at load with a fixed seed so every reload shows the same day.

import { DEPOT, DISTRICTS, generatePickups } from './vilnius.js'
import { buildPlan } from '../lib/plan.js'

export { DEPOT }

const SHIFT_SEED = 42
const PICKUP_COUNT = 420 // a day's dispatch across eight mikrorajonai

// Body volume of a rear-loading compactor, in post-compaction litres.
const TRUCK_CAPACITY_L = 16000

// A cap on shift length, not a technical one. Rounds are normally bound by
// truck capacity; this just stops one becoming an impossible day. The
// Google Maps waypoint limit deliberately plays no part here — that's a
// handoff problem, solved by splitting the round into legs.
const MAX_STOPS = 100

const DRIVERS = [
  { id: 'd1', name: 'Tomas Jankauskas', truck: 'Mercedes Econic', plate: 'JKL 412' },
  { id: 'd2', name: 'Rasa Petrauskienė', truck: 'Volvo FE', plate: 'MPV 806' },
  { id: 'd3', name: 'Mindaugas Urbonas', truck: 'Scania P280', plate: 'ZRT 155' },
  { id: 'd4', name: 'Giedrė Kazlauskaitė', truck: 'DAF LF', plate: 'BNK 039' },
]

// A truck empties at the depot between rounds, so a driver can take a
// different fraction each time.
const SHIFT_LABELS = ['Morning round', 'Midday round', 'Afternoon round', 'Evening round']
const SHIFT_TIMES = ['07:00', '10:30', '13:30', '16:30']

const plan = buildPlan({
  pickups: generatePickups({
    districtIds: DISTRICTS.map((d) => d.id),
    count: PICKUP_COUNT,
    seed: SHIFT_SEED,
  }),
  depot: DEPOT,
  capacityL: TRUCK_CAPACITY_L,
  maxStops: MAX_STOPS,
})

// Deal the rounds out to drivers one at a time, so everybody gets a first
// round before anyone gets a second.
export const drivers = DRIVERS.map((driver, i) => {
  const rounds = plan.routes
    .filter((_, routeIdx) => routeIdx % DRIVERS.length === i)
    .map((route, n) => ({
      ...route,
      shiftLabel: SHIFT_LABELS[n] ?? `Round ${n + 1}`,
      startTime: SHIFT_TIMES[n] ?? '—',
    }))

  return { ...driver, rounds }
})

export function findDriver(id) {
  return drivers.find((d) => d.id === id) ?? null
}
