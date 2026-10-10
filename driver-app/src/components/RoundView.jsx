import { useEffect, useMemo, useRef, useState } from 'react'
import RouteMap from './RouteMap.jsx'
import { formatDuration } from './ShiftList.jsx'
import { DEPOT } from '../data/shift.js'
import { stopUrl } from '../lib/maps.js'
import { osmandRouteUrl } from '../lib/osmand.js'
import { issueLabel } from '../data/issues.js'
import IssueSheet from './IssueSheet.jsx'
import { plural } from '../lib/lt.js'
import { BackIcon, CheckIcon, NavigateIcon } from './icons.jsx'

// The screen the driver actually works from: their route on the map, the
// button that hands the round to a navigation app, and the stop list to tick
// off as they collect.
//
// One tap opens OsmAnd with the whole round loaded, and it moves from stop
// to stop by itself. Each stop row keeps a Google Maps arrow for jumping to
// a single address.
export default function RoundView({
  round,
  done,
  issues,
  collectedAt,
  onToggleStop,
  onReportIssue,
  onBack,
}) {
  // A stop is dealt with once it's collected or reported as not collectable;
  // either way navigation moves on past it.
  const handled = (stop) => done.includes(stop.id) || Boolean(issues[stop.id])
  const issueIds = useMemo(() => Object.keys(issues), [issues])
  const issueCount = issueIds.length
  const nextIndex = round.stops.findIndex((s) => !handled(s))
  const complete = nextIndex === -1
  const nextStop = complete ? null : round.stops[nextIndex]
  const nextNumber = nextIndex + 1
  const remaining = round.stops.filter((s) => !handled(s))

  const [issueStopId, setIssueStopId] = useState(null)
  const issueStop = round.stops.find((s) => s.id === issueStopId) ?? null

  // With a hundred rows, nobody should have to scroll to find their place.
  // Not on first open of a fresh round, though: then the map and the
  // navigation button are what the driver needs, and scrolling hid them.
  const nextRef = useRef(null)
  // Fresh round: remember stop 1 so nothing scrolls; mid-round reopen: -1 so it scrolls once.
  const scrolledFor = useRef(done.length === 0 && issueCount === 0 ? nextIndex : -1)
  useEffect(() => {
    if (scrolledFor.current === nextIndex) return
    scrolledFor.current = nextIndex
    nextRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [nextIndex])

  return (
    <div
      className="screen screen--round"
      style={{ '--fraction': round.fraction.colour }}
    >
      <header className="appbar appbar--round">
        <button className="link-btn" onClick={onBack}>
          <BackIcon size={18} /> Šiandien
        </button>
        <div className="appbar__title">
          <strong>{round.shiftLabel}</strong>
          <small>
            Paimta {done.length}/{round.stops.length} ·{' '}
            {issueCount > 0 && <>{issueCount} nepaimta · </>}
            {round.distanceKm.toFixed(0)} km · {formatDuration(round.durationMin)}
          </small>
        </div>
      </header>

      <p className="fraction-strip">
        <span className="fraction-dot" />
        <strong>{round.fraction.label}</strong>
      </p>

      <div className="map-wrap">
        <RouteMap
          round={round}
          doneIds={done}
          issueIds={issueIds}
          activeIndex={nextIndex}
        />
      </div>

      <div className="nav-cta">
        {complete ? (
          <>
            <p className="all-done">
              {issueCount
                ? `Reisas baigtas, ${plural(issueCount, 'konteineris', 'konteineriai', 'konteinerių')} nepaimta — grįžkite į bazę.`
                : 'Visi konteineriai ištuštinti — grįžkite į bazę.'}
            </p>
            <a
              className="btn btn--primary"
              href={stopUrl(DEPOT)}
              target="_blank"
              rel="noreferrer"
            >
              Vykti į bazę
            </a>
          </>
        ) : (
          <>
            {/* Only the stops still to collect go in, so re-opening
                mid-round picks up where the driver is. */}
            <a className="btn btn--nav" href={osmandRouteUrl(remaining, DEPOT, DEPOT)}>
              <span className="btn-label">
                <NavigateIcon size={20} /> Navigacija OsmAnd
              </span>
            </a>

            <p className="next-up">
              {done.length || issueCount ? 'Dabar' : 'Pirmas sustojimas'}: {nextNumber} iš{' '}
              {round.stops.length} — <strong>{nextStop.address}</strong>
            </p>

            {/* The two answers a driver gives at every container. */}
            <div className="stop-actions">
              <button className="btn btn--primary" onClick={() => onToggleStop(nextStop.id)}>
                <span className="btn-label">
                  <CheckIcon size={20} /> Paimta
                </span>
              </button>
              <button className="issue-btn" onClick={() => setIssueStopId(nextStop.id)}>
                Nepavyko paimti
              </button>
            </div>
          </>
        )}
      </div>

      <ol className="stop-list">
        {round.stops.map((stop, i) => {
          const isDone = done.includes(stop.id)
          const issue = issues[stop.id]
          return (
            <li
              key={stop.id}
              ref={i === nextIndex ? nextRef : null}
              className={`stop-row${isDone ? ' is-done' : ''}${issue ? ' is-issue' : ''}${
                i === nextIndex ? ' is-next' : ''
              }`}
            >
              <span className={`stop-n${isDone ? ' is-done' : ''}`} aria-hidden>
                {isDone ? <CheckIcon size={18} /> : issue ? '!' : i + 1}
              </span>

              <span className="stop-body">
                <strong>{stop.address}</strong>
                <small>
                  {issue ? (
                    <em className="issue-text">Nepaimta: {issueLabel(issue)}</em>
                  ) : isDone && collectedAt[stop.id] ? (
                    <time className="collected-at" dateTime={collectedAt[stop.id]}>
                      Paimta {formatStamp(collectedAt[stop.id])}
                    </time>
                  ) : (
                    stop.containerType
                  )}
                </small>
              </span>

              {isDone ? (
                <button
                  className="stop-undo"
                  onClick={() => onToggleStop(stop.id)}
                  aria-label={`Atšaukti: ${stop.address} paimta`}
                >
                  Atšaukti
                </button>
              ) : (
                !issue && (
                  <a
                    className="stop-nav"
                    href={stopUrl(stop)}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Vykti į ${stop.address}`}
                  >
                    <NavigateIcon size={18} />
                  </a>
                )
              )}

              {/* Every stop answers the same question, so every stop gets
                  both answers — on their own line, where they fit a phone. */}
              {!isDone && (
                <span className="stop-row__actions">
                  <button
                    className="stop-collect"
                    onClick={() => onToggleStop(stop.id)}
                    aria-label={`Paimta: ${stop.address}`}
                  >
                    <CheckIcon size={18} /> Paimta
                  </button>
                  <button
                    className={`stop-issue${issue ? ' is-active' : ''}`}
                    onClick={() => setIssueStopId(stop.id)}
                    aria-label={`Nepavyko paimti: ${stop.address}`}
                  >
                    {issue ? 'Pakeisti priežastį' : 'Nepaimta'}
                  </button>
                </span>
              )}
            </li>
          )
        })}
      </ol>

      {issueStop && (
        <IssueSheet
          stop={issueStop}
          number={round.stops.indexOf(issueStop) + 1}
          current={issues[issueStop.id] ?? null}
          onPick={(reasonId) => {
            onReportIssue(issueStop.id, reasonId)
            setIssueStopId(null)
          }}
          onClose={() => setIssueStopId(null)}
        />
      )}
    </div>
  )
}

// Time to the second; the date too when it wasn't today, so an old stamp
// can't pass for this shift's.
function formatStamp(iso) {
  const d = new Date(iso)
  const time = d.toLocaleTimeString('lt-LT', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  if (d.toDateString() === new Date().toDateString()) return time
  return `${d.toLocaleDateString('lt-LT')} ${time}`
}
