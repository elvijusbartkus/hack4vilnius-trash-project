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

const HOUSE_COLUMNS = 'id, address, lat, lon, bin_volume_l'

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
