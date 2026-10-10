// The day's shift: who's driving, and which round each of them got.
//
// In production the dispatcher's planner writes this and the driver app just
// reads back the rounds assigned to the signed-in driver. Here we run the
// planner once at load with a fixed seed so every reload shows the same day.

import { DEPOT, DISTRICTS, generatePickups, getFraction } from './vilnius.js'
import { buildPlan } from '../lib/plan.js'

export { DEPOT }

const SHIFT_SEED = 42
const PICKUP_COUNT = 420 // a day's dispatch across eight mikrorajonai

// Body volume of a rear-loading compactor, in post-compaction litres.
const TRUCK_CAPACITY_L = 16000

// A cap on shift length, not a technical one. Rounds are normally bound by
// truck capacity; this just stops one becoming an impossible day. The
// Google Maps waypoint limit deliberately plays no part here — stops are
// handed to Maps one at a time.
const MAX_STOPS = 100

// Each driver hauls a single container type all day — the truck is set up
// for it — so drivers are assigned a fraction, not just a truck.
const DRIVERS = [
  { id: 'd1', name: 'Tomas Jankauskas', truck: 'Mercedes Econic', plate: 'JKL 412', fractionId: 'mixed' },
  { id: 'd2', name: 'Rasa Petrauskienė', truck: 'Volvo FE', plate: 'MPV 806', fractionId: 'mixed' },
  { id: 'd3', name: 'Mindaugas Urbonas', truck: 'Scania P280', plate: 'ZRT 155', fractionId: 'mixed' },
  { id: 'd4', name: 'Giedrė Kazlauskaitė', truck: 'DAF LF', plate: 'BNK 039', fractionId: 'glass' },
]

const SHIFT_LABELS = ['Rytinis reisas', 'Vidurdienio reisas', 'Popietinis reisas', 'Vakarinis reisas']
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

// Deal each fraction's rounds out to the drivers working that fraction, one
// at a time, so everybody gets a first round before anyone gets a second.
export const drivers = DRIVERS.map((driver) => {
  const crew = DRIVERS.filter((d) => d.fractionId === driver.fractionId)
  const slot = crew.indexOf(driver)
  const rounds = plan.routes
    .filter((route) => route.fraction.id === driver.fractionId)
    .filter((_, routeIdx) => routeIdx % crew.length === slot)
    .map((route, n) => ({
      ...route,
      shiftLabel: SHIFT_LABELS[n] ?? `${n + 1}-asis reisas`,
      startTime: SHIFT_TIMES[n] ?? '—',
    }))

  return { ...driver, fraction: getFraction(driver.fractionId), rounds }
})

export function findDriver(id) {
  return drivers.find((d) => d.id === id) ?? null
}
