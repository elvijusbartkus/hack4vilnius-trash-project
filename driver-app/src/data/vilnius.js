// Mock pickup data standing in for the feed from the resident app.
// Replace `generatePickups` with a fetch once the real source is wired up —
// the rest of the app only cares about the shape returned here.

import { mulberry32 } from '../lib/geo.js'

// Garage / transfer station the trucks start and end their shift at.
export const DEPOT = {
  id: 'depot',
  name: 'Garažas — Jočionių g. 13',
  lat: 54.6508,
  lng: 25.2731,
}

// The three household bins in Vilnius. A truck collects one fraction at a
// time — glass can't ride along with mixed waste — so this is what rounds
// get split by, not just a label on a stop.
//
// `compaction` is what a bin's loose litres shrink to in the truck body.
// Without it the capacity maths is nonsense: a 16 m³ truck looks like it
// holds 15 bins, when a real one swallows several hundred. Cardboard and
// plastic crush hardest; glass is never compacted, only settles, which is
// why glass rounds are genuinely short.
export const FRACTIONS = [
  {
    id: 'mixed',
    label: 'Mišrios komunalinės',
    en: 'Non-recyclable',
    colour: '#475569',
    share: 5,
    compaction: 4,
  },
  {
    id: 'packaging',
    label: 'Pakuotės',
    en: 'Recyclables',
    colour: '#ca8a04',
    share: 3,
    compaction: 5,
  },
  {
    id: 'glass',
    label: 'Stiklas',
    en: 'Glass',
    colour: '#15803d',
    share: 2,
    compaction: 2,
  },
]

export function getFraction(id) {
  return FRACTIONS.find((f) => f.id === id) ?? FRACTIONS[0]
}

// Container sizes actually used for each fraction. Glass goes in shared
// communal containers rather than per-household bins, so it skews large.
const CONTAINERS = {
  mixed: [
    { type: 'Bin 240 L', volumeL: 240, weight: 5 },
    { type: 'Bin 360 L', volumeL: 360, weight: 3 },
    { type: 'Container 1100 L', volumeL: 1100, weight: 3 },
  ],
  packaging: [
    { type: 'Bin 240 L', volumeL: 240, weight: 3 },
    { type: 'Container 1100 L', volumeL: 1100, weight: 5 },
    { type: 'Container 2500 L', volumeL: 2500, weight: 1 },
  ],
  glass: [
    { type: 'Container 1100 L', volumeL: 1100, weight: 4 },
    { type: 'Container 2500 L', volumeL: 2500, weight: 3 },
  ],
}

// Rough centres of Vilnius mikrorajonai, with a spread (in km) that keeps
// generated points inside something resembling the real neighbourhood.
export const DISTRICTS = [
  { id: 'zirmunai', name: 'Žirmūnai', lat: 54.7122, lng: 25.2958, spread: 1.4, streets: ['Žirmūnų g.', 'Minties g.', 'Tuskulėnų g.', 'Rinktinės g.', 'Kareivių g.'] },
  { id: 'fabijoniskes', name: 'Fabijoniškės', lat: 54.734, lng: 25.229, spread: 1.1, streets: ['S. Stanevičiaus g.', 'Ukmergės g.', 'Salomėjos Nėries g.', 'Fabijoniškių g.'] },
  { id: 'pilaite', name: 'Pilaitė', lat: 54.706, lng: 25.176, spread: 1.3, streets: ['Pilaitės pr.', 'Vydūno g.', 'I. Šimulionio g.', 'Karaliaučiaus g.'] },
  { id: 'lazdynai', name: 'Lazdynai', lat: 54.676, lng: 25.203, spread: 1.2, streets: ['Architektų g.', 'Erfurto g.', 'Žėručio g.', 'Lazdynų g.'] },
  { id: 'justiniskes', name: 'Justiniškės', lat: 54.724, lng: 25.215, spread: 1.0, streets: ['Justiniškių g.', 'Taikos g.', 'Rygos g.'] },
  { id: 'antakalnis', name: 'Antakalnis', lat: 54.702, lng: 25.32, spread: 1.6, streets: ['Antakalnio g.', 'Šilo g.', 'Nemenčinės pl.', 'Valeikos g.'] },
  { id: 'snipiskes', name: 'Šnipiškės', lat: 54.7, lng: 25.276, spread: 0.9, streets: ['Konstitucijos pr.', 'Lvovo g.', 'Krokuvos g.', 'Giedraičių g.'] },
  { id: 'naujamiestis', name: 'Naujamiestis', lat: 54.678, lng: 25.26, spread: 1.1, streets: ['Savanorių pr.', 'Naugarduko g.', 'Švitrigailos g.', 'Vytenio g.'] },
]

/**
 * Build a batch of pending pickups spread across the chosen districts.
 *
 * @param {object} opts
 * @param {string[]} opts.districtIds  which mikrorajonai to include
 * @param {number}   opts.count        how many pickup points to generate
 * @param {number}   opts.seed         same seed → same city, for repeatable demos
 * @returns {Array} pickup objects
 */
export function generatePickups({ districtIds, count, seed }) {
  const rand = mulberry32(seed)
  const districts = DISTRICTS.filter((d) => districtIds.includes(d.id))
  if (!districts.length) return []

  const pickups = []
  for (let i = 0; i < count; i++) {
    const district = districts[i % districts.length]
    const { lat, lng } = jitter(district, rand)
    const fraction = pickWeighted(FRACTIONS, rand, (f) => f.share)
    const container = pickWeighted(CONTAINERS[fraction.id], rand, (c) => c.weight)
    const street = district.streets[Math.floor(rand() * district.streets.length)]
    const houseNo = 1 + Math.floor(rand() * 80)

    pickups.push({
      id: `p-${i + 1}`,
      address: `${street} ${houseNo}`,
      district: district.name,
      districtId: district.id,
      lat,
      lng,
      fractionId: fraction.id,
      containerType: container.type,
      volumeL: container.volumeL,
      // Bins are rarely brim-full, and planning as if they were would size
      // rounds far too short.
      fillLevel: +(0.45 + rand() * 0.55).toFixed(2),
      // A few stops are urgent — overflowing bins reported by residents.
      urgent: rand() < 0.12,
    })
  }
  return pickups
}

// Scatter a point around the district centre. Uses sqrt on the radius so
// points spread evenly over the disc instead of bunching in the middle.
function jitter(district, rand) {
  const angle = rand() * Math.PI * 2
  const dist = Math.sqrt(rand()) * district.spread
  const dLat = (dist / 111) * Math.sin(angle)
  const dLng = (dist / (111 * Math.cos((district.lat * Math.PI) / 180))) * Math.cos(angle)
  return {
    lat: +(district.lat + dLat).toFixed(5),
    lng: +(district.lng + dLng).toFixed(5),
  }
}

function pickWeighted(items, rand, weightOf) {
  const total = items.reduce((s, i) => s + weightOf(i), 0)
  let r = rand() * total
  for (const item of items) {
    r -= weightOf(item)
    if (r <= 0) return item
  }
  return items[items.length - 1]
}
