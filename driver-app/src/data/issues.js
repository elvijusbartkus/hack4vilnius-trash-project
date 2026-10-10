// Why a container couldn't be collected. When the driver app is wired to the
// resident app's Supabase, each of these becomes a `pickups` row with
// status 'blocked' and the reason alongside — the resident sees why, and the
// dispatcher knows the stop needs another visit.
export const ISSUE_REASONS = [
  { id: 'not-out', label: 'Konteineris neišstumtas' },
  { id: 'no-access', label: 'Nepavyko privažiuoti' },
  { id: 'blocked', label: 'Užstatytas arba užrakintas' },
  { id: 'wrong-waste', label: 'Netinkamos atliekos' },
  { id: 'damaged', label: 'Konteineris sugadintas' },
  { id: 'other', label: 'Kita priežastis' },
]

export function issueLabel(id) {
  return ISSUE_REASONS.find((r) => r.id === id)?.label ?? 'Nepaimta'
}
