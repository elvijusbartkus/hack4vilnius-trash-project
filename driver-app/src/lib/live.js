// The demo driver's round, built from the shared Supabase data (the same
// households and pickups the resident app writes to).
//
// Route day = DEMO_DAY (22 Oct): every house scheduled that day, minus the
// ones whose resident answered "Ne, nereikia" (pickups: scheduled/skipped),
// plus booked extra pickups for that day. Realtime on `pickups` refreshes it,
// with a 3 s poll as a fallback in case the socket never connects.

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  CO2_KG_PER_L_DIESEL,
  DEMO_DAY,
  FUEL_L_PER_100KM,
  HAVERSINE_ROAD_FACTOR,
  OSRM_URL,
} from '../../../lib/config.ts'
import { DEPOT, getFraction } from '../data/vilnius.js'
import { haversine } from './geo.js'
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

  // Counted in households (every bin on the schedule), routed in stops (one per address).
  const counts = {
    baseline: scheduled.length,
    today: new Set([...scheduled.filter((h) => !skipped.has(h.id)).map((h) => h.id), ...extraIds]).size,
  }
  const baseline = uniqueByAddress(scheduled.map((h) => toStop(h)))
  const today = uniqueByAddress([
    ...scheduled.filter((h) => !skipped.has(h.id)).map((h) => toStop(h)),
    ...extraIds.map((id) => known.get(id)).filter(Boolean).map((h) => toStop(h, true)),
  ])
  return { baseline, today, counts }
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

// Depot → stops → depot, straight lines times the road factor.
function approxKm(stops) {
  const path = [DEPOT, ...stops, DEPOT]
  let km = 0
  for (let i = 0; i < path.length - 1; i++) km += haversine(path[i], path[i + 1])
  return km * HAVERSINE_ROAD_FACTOR
}

// Road distance of the ordered round from OSRM; null if it can't be had.
const osrmCache = new Map()
async function osrmKm(stops) {
  const key = stops.map((s) => s.id).join(',')
  if (osrmCache.has(key)) return osrmCache.get(key)
  const coords = [DEPOT, ...stops, DEPOT].map((p) => `${p.lng.toFixed(5)},${p.lat.toFixed(5)}`).join(';')
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 8000)
  try {
    const res = await fetch(`${OSRM_URL}/route/v1/driving/${coords}?overview=false`, { signal: ctrl.signal })
    const json = await res.json()
    const km = json.code === 'Ok' ? json.routes[0].distance / 1000 : null
    osrmCache.set(key, km)
    return km
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

function plan(stops) {
  return optimiseRoute(DEPOT, stops)
}

function makeRound(todayPlan, counts, km) {
  const savedKm = km.baseline - km.today
  return {
    id: LIVE_ROUND_ID,
    shiftLabel: 'Pilaitė',
    startTime: '07:00',
    fraction: getFraction('mixed'),
    districts: ['Pilaitė'],
    stops: todayPlan.stops,
    distanceKm: km.today,
    durationMin: todayPlan.durationMin,
    live: true,
    savings: {
      baselineStops: counts.baseline,
      stops: counts.today,
      savedKm,
      savedCo2Kg: (savedKm * FUEL_L_PER_100KM * CO2_KG_PER_L_DIESEL) / 100,
      source: km.source,
    },
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
    let baselineCache = { key: null, plan: null }

    async function refresh() {
      if (busy) return
      busy = true
      try {
        const { baseline, today, counts } = await fetchDay()
        const key = `${counts.baseline}|${counts.today}|${today.map((s) => s.id).join(',')}`
        if (key === lastKey) return
        lastKey = key

        const baselineKey = baseline.map((s) => s.id).join(',')
        if (baselineCache.key !== baselineKey) {
          baselineCache = { key: baselineKey, plan: plan(baseline) }
        }
        const basePlan = baselineCache.plan
        const todayPlan = plan(today)

        // Show the change straight away with the approximate distance,
        // then swap in OSRM road distances once they arrive.
        const approx = { baseline: approxKm(basePlan.stops), today: approxKm(todayPlan.stops), source: 'approx' }
        if (alive) setState({ status: 'ready', round: makeRound(todayPlan, counts, approx) })

        // Not awaited: polling must not wait on OSRM.
        Promise.all([osrmKm(basePlan.stops), osrmKm(todayPlan.stops)]).then(([b, t]) => {
          if (alive && b != null && t != null && lastKey === key) {
            setState({
              status: 'ready',
              round: makeRound(todayPlan, counts, { baseline: b, today: t, source: 'osrm' }),
            })
          }
        })
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
