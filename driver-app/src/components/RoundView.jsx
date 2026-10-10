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
            Ištuštinta {done.length}/{round.stops.length} ·{' '}
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
          depot={DEPOT}
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
            <div className="next-row">
              <p className="next-up">
                {done.length || issueCount ? 'Dabar' : 'Pirmas sustojimas'}: {nextNumber} iš{' '}
                {round.stops.length} — <strong>{nextStop.address}</strong>
              </p>
              <button className="issue-btn" onClick={() => setIssueStopId(nextStop.id)}>
                Nepavyko paimti
              </button>
            </div>

            {/* Only the stops still to collect go in, so re-opening
                mid-round picks up where the driver is. */}
            <a className="btn btn--primary" href={osmandRouteUrl(remaining, DEPOT)}>
              Navigacija OsmAnd
            </a>
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
              <button
                className={`stop-n${isDone ? ' is-done' : ''}`}
                onClick={() => onToggleStop(stop.id)}
                aria-pressed={isDone}
                aria-label={
                  isDone
                    ? `Pažymėti ${stop.address} kaip neištuštintą`
                    : `Pažymėti ${stop.address} kaip ištuštintą`
                }
              >
                {isDone ? <CheckIcon size={18} /> : issue ? '!' : i + 1}
              </button>

              <span className="stop-body">
                <strong>{stop.address}</strong>
                <small>
                  {issue ? (
                    <em className="issue-text">Nepaimta: {issueLabel(issue)}</em>
                  ) : (
                    stop.containerType
                  )}
                </small>
              </span>

              {!isDone && (
                <button
                  className={`stop-issue${issue ? ' is-active' : ''}`}
                  onClick={() => setIssueStopId(stop.id)}
                  aria-label={`Nepavyko paimti: ${stop.address}`}
                >
                  {issue ? 'Pakeisti' : 'Nepaimta'}
                </button>
              )}

              {!isDone && !issue && (
                <a
                  className="stop-nav"
                  href={stopUrl(stop)}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Vykti į ${stop.address}`}
                >
                  <NavigateIcon size={18} />
                </a>
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

