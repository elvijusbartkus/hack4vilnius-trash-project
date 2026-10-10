// The demo driver's round, built from the shared Supabase data (the same
// households and pickups the resident app writes to).
//
// Route day = DEMO_DAY (22 Oct): every house scheduled that day, minus the
// ones whose resident answered "Ne, nereikia" (pickups: scheduled/skipped),
// plus booked extra pickups for that day. Realtime on `pickups` refreshes it,
// with a 3 s poll as a fallback in case the socket never connects.
//
// Stops are ordered by real road distance (OSRM), fetched once for every
// house on the schedule, so a skip reorders without new requests. Until that
// table arrives, straight-line distance stands in.

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { DEMO_DAY } from '../../../lib/config.ts'
import { DEPOT, getFraction } from '../data/vilnius.js'
import { roadDistance } from './geo.js'
import { roadMatrix } from './osrm.js'
import { optimiseRoute } from './route.js'

const url = import.meta.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = url && anonKey ? createClient(url, anonKey) : null

export const LIVE_ROUND_ID = `live-${DEMO_DAY}`
const POLL_MS = 3000

const HOUSE_COLUMNS = 'id, address, lat, lon, bin_volume_l, next_service'

async function fetchDay() {
  const [houses, pickups] = await Promise.all([
    supabase.from('households').select(HOUSE_COLUMNS).eq('next_service', DEMO_DAY),
    supabase.from('pickups').select('household_id, kind, status').eq('date', DEMO_DAY),
  ])
  if (houses.error) throw new Error(houses.error.message)
  if (pickups.error) throw new Error(pickups.error.message)

  const scheduled = houses.data
  const skipped = new Set(
    pickups.data
      .filter((p) => p.kind === 'scheduled' && p.status === 'skipped')
      .map((p) => p.household_id),
  )
  const extraIds = [
    ...new Set(
      pickups.data
        .filter((p) => p.kind === 'extra' && p.status === 'planned')
        .map((p) => p.household_id),
    ),
  ]

  // Extra pickups can be at houses that aren't on the schedule that day.
  const known = new Map(scheduled.map((h) => [h.id, h]))
  const missing = extraIds.filter((id) => !known.has(id))
  if (missing.length) {
    const more = await supabase.from('households').select(HOUSE_COLUMNS).in('id', missing)
    if (more.error) throw new Error(more.error.message)
    more.data.forEach((h) => known.set(h.id, h))
  }

  const baseline = uniqueByAddress(scheduled.map((h) => toStop(h)))
  const today = uniqueByAddress([
    ...scheduled.filter((h) => !skipped.has(h.id)).map((h) => toStop(h)),
    ...extraIds.map((id) => known.get(id)).filter(Boolean).map((h) => toStop(h, true)),
  ])
  return { baseline, today }
}

function toStop(h, extra = false) {
  const volumeL = h.bin_volume_l ?? 240
  return {
    id: `h-${h.id}`,
    householdId: h.id,
    address: h.address,
    lat: h.lat,
    lng: h.lon,
    district: 'Pilaitė',
    volumeL,
    containerType: extra ? `${volumeL}L konteineris · papildomas` : `${volumeL}L konteineris`,
    nextService: h.next_service,
    // the route optimiser's capacity fields; one round, so only the shape matters
    looseL: volumeL,
    bodyL: volumeL,
  }
}

// Two VASA bins at one address are one stop for the truck.
function uniqueByAddress(stops) {
  const seen = new Set()
  return stops.filter((s) => {
    const key = s.address.trim().toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function makeRound(plan) {
  return {
    id: LIVE_ROUND_ID,
    shiftLabel: 'Rytinis reisas',
    startTime: '07:00',
    fraction: getFraction('mixed'),
    districts: ['Pilaitė'],
    stops: plan.stops,
    distanceKm: plan.distanceKm,
    durationMin: plan.durationMin,
    live: true,
  }
}

/** { status: 'loading' | 'ready' | 'error', round?, message? } */
export function useLiveRound() {
  const [state, setState] = useState(() =>
    supabase ? { status: 'loading' } : { status: 'error', message: 'Trūksta Supabase raktų.' },
  )

  useEffect(() => {
    if (!supabase) return
    let alive = true
    let busy = false
    let lastKey = null
    // road distances for the whole schedule: { key, km: Map | null, loading }
    let roads = { key: null, km: null }

    const dist = (a, b) => {
      const id = (p) => p.id ?? 'depot'
      return roads.km?.get(`${id(a)}>${id(b)}`) ?? roadDistance(a, b)
    }

    async function refresh() {
      if (busy) return
      busy = true
      try {
        const { baseline, today } = await fetchDay()
        const scheduleKey = baseline.map((s) => s.id).join(',')
        if (roads.key !== scheduleKey) {
          roads = { key: scheduleKey, km: null }
          // Not awaited: the round shows straight away and re-orders once roads arrive.
          roadMatrix([DEPOT, ...baseline])
            .then((km) => {
              if (roads.key !== scheduleKey) return
              roads.km = km
              lastKey = null // re-plan with road distances on the next refresh
              refresh()
            })
            .catch((e) => console.warn('OSRM table failed, using straight-line distances', e))
        }

        const key = `${roads.km ? 'road' : 'line'}|${today.map((s) => s.id).join(',')}`
        if (key === lastKey) return
        lastKey = key
        if (alive) setState({ status: 'ready', round: makeRound(optimiseRoute(DEPOT, today, dist)) })
      } catch (e) {
        console.error(e)
        if (alive) setState((s) => (s.round ? s : { status: 'error', message: e.message }))
      } finally {
        busy = false
      }
    }

    refresh()
    const channel = supabase
      .channel('driver-pickups')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pickups' }, refresh)
      .subscribe()
    const timer = setInterval(refresh, POLL_MS)
    return () => {
      alive = false
      clearInterval(timer)
      supabase.removeChannel(channel)
    }
  }, [])

  return state
}

// The other crews' rounds, also on real Pilaitė addresses from the same table
// (not generated points, which could land in a river or a park):
//   d2, d3 (mixed waste): houses scheduled on other days, split west / east
//   d4 (glass): every third address in the area; there is no glass data, so
//       the places are real but the glass round itself is decoration.
// Built once; each is ordered by road distance when OSRM answers.
async function buildOtherRounds() {
  const res = await supabase.from('households').select(HOUSE_COLUMNS).order('id')
  if (res.error) throw new Error(res.error.message)
  const all = uniqueByAddress(res.data.map((h) => toStop(h)))
  const offDay = all
    .filter((s) => s.nextService !== DEMO_DAY)
    .sort((a, b) => a.lng - b.lng)
  const half = Math.ceil(offDay.length / 2)
  const glass = getFraction('glass')
  const groups = {
    d2: { stops: offDay.slice(0, half), fraction: getFraction('mixed') },
    d3: { stops: offDay.slice(half), fraction: getFraction('mixed') },
    d4: {
      stops: all
        .filter((_, i) => i % 3 === 0)
        .map((s) => ({ ...s, volumeL: glass.volumeL, containerType: glass.containerLabel })),
      fraction: glass,
    },
  }
  return groups
}

function crewRound(driverId, group, dist) {
  const plan = optimiseRoute(DEPOT, group.stops, dist)
  return {
    id: `real-${driverId}`,
    shiftLabel: 'Rytinis reisas',
    startTime: '07:00',
    fraction: group.fraction,
    districts: ['Pilaitė'],
    stops: plan.stops,
    distanceKm: plan.distanceKm,
    durationMin: plan.durationMin,
  }
}

/** { d2: [round], d3: [round], d4: [round] } once loaded, else null. */
export function useCrewRounds() {
  const [rounds, setRounds] = useState(null)

  useEffect(() => {
    if (!supabase) return
    let alive = true
    buildOtherRounds()
      .then(async (groups) => {
        const build = (dist) =>
          Object.fromEntries(Object.entries(groups).map(([id, g]) => [id, [crewRound(id, g, dist)]]))
        if (alive) setRounds(build(roadDistance))
        // Road distances per group, one after another (the public OSRM server is shared).
        const tables = {}
        for (const [id, g] of Object.entries(groups)) {
          tables[id] = await roadMatrix([DEPOT, ...g.stops]).catch(() => null)
        }
        if (!alive) return
        setRounds(
          Object.fromEntries(
            Object.entries(groups).map(([id, g]) => {
              const km = tables[id]
              const dist = (a, b) => km?.get(`${a.id ?? 'depot'}>${b.id ?? 'depot'}`) ?? roadDistance(a, b)
              return [id, [crewRound(id, g, dist)]]
            }),
          ),
        )
      })
      .catch((e) => console.error(e))
    return () => {
      alive = false
    }
  }, [])

  return rounds
}
