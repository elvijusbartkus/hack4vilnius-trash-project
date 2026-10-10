import { useEffect, useMemo, useRef, useState } from 'react'
import RouteMap from './RouteMap.jsx'
import { formatDuration } from './ShiftList.jsx'
import { DEPOT } from '../data/shift.js'
import { stopUrl } from '../lib/maps.js'
import { osmandRouteUrl } from '../lib/osmand.js'
import { issueLabel } from '../data/issues.js'
import IssueSheet from './IssueSheet.jsx'
import { plural } from '../lib/lt.js'

// The screen the driver actually works from: their route on the map, the
// button that hands the round to a navigation app, and the stop list to tick
// off as they collect.
//
// OsmAnd is the main route: one tap opens it with the whole round loaded,
// and it moves from stop to stop by itself. Google Maps stays as a fallback, but it can't
// be fed a new stop while navigating, so it goes one stop at a time: at each
// container the driver comes back here, taps once, and Maps is already
// navigating to the next one.
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
  // Stops can be ticked out of order from the list, so "the one after" is
  // the next one still to collect, not simply the next in the array.
  const afterNext = complete
    ? null
    : round.stops.find((s, i) => i > nextIndex && !handled(s)) ?? null
  const afterNextNumber = afterNext ? round.stops.indexOf(afterNext) + 1 : null
  const remaining = round.stops.filter((s) => !handled(s))

  const [issueStopId, setIssueStopId] = useState(null)
  const issueStop = round.stops.find((s) => s.id === issueStopId) ?? null

  // Until the driver has set off, the first tap is just "go to stop 1" —
  // there's nothing to mark collected yet.
  const [startedFlag, setStarted] = useStoredFlag(`tr.started.${round.id}`)
  const started = startedFlag || done.length > 0
  const [useGoogle, setUseGoogle] = useStoredFlag('tr.useGoogle')

  // With a hundred rows, nobody should have to scroll to find their place.
  const nextRef = useRef(null)
  useEffect(() => {
    nextRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [nextIndex])

  return (
    <div
      className="screen screen--round"
      style={{ '--fraction': round.fraction.colour }}
    >
      <header className="appbar appbar--round">
        <button className="link-btn" onClick={onBack}>
          ‹ Šiandien
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
            <a
              className="btn btn--primary btn--collect"
              href={osmandRouteUrl(remaining, DEPOT)}
            >
              Navigacija OsmAnd
              <small>
                {plural(remaining.length, 'sustojimas', 'sustojimai', 'sustojimų')} —
                veda nuo vieno prie kito pats
              </small>
            </a>
            <p className="hint">
              OsmAnd atsidarys su visu maršrutu — paspauskite „Pradėti“.
              Ištuštintus konteinerius pažymėkite sąraše žemiau.
            </p>

            <details
              className="google-fallback"
              open={useGoogle}
              onToggle={(e) => setUseGoogle(e.currentTarget.open)}
            >
              <summary>Naudoti Google Maps (po vieną sustojimą)</summary>

              {!started ? (
                <a
                  className="btn btn--ghost"
                  href={stopUrl(nextStop)}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setStarted(true)}
                >
                  Pradėti — vykti į {nextNumber}.
                </a>
              ) : (
                <>
                  {/* The one tap a driver makes at every stop: mark this
                      container done and hand the next destination straight
                      to Google Maps, which starts navigating without another
                      tap. */}
                  <a
                    className="btn btn--ghost btn--collect"
                    href={stopUrl(afterNext ?? DEPOT)}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => onToggleStop(nextStop.id)}
                  >
                    ✓ Ištuštinta
                    <small>
                      {afterNext
                        ? `Vykti į ${afterNextNumber}. ${afterNext.address}`
                        : 'Paskutinis — vykti į bazę'}
                    </small>
                  </a>

                  <a
                    className="btn btn--ghost"
                    href={stopUrl(nextStop)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Vėl atidaryti navigaciją į {nextNumber}.
                  </a>
                </>
              )}
            </details>
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
                {isDone ? '✓' : issue ? '!' : i + 1}
              </button>

              <span className="stop-body">
                <strong>{stop.address}</strong>
                <small>
                  {issue ? (
                    <em className="issue-text">Nepaimta: {issueLabel(issue)}</em>
                  ) : (
                    <>
                      {stop.containerType}
                      {stop.urgent && !isDone && <em> · skubu</em>}
                    </>
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
                  ➤
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

function useStoredFlag(key) {
  const [value, setValue] = useState(() => {
    try {
      return localStorage.getItem(key) === '1'
    } catch {
      return false
    }
  })
  const set = (next) => {
    setValue(next)
    try {
      localStorage.setItem(key, next ? '1' : '0')
    } catch {
      // Storage blocked — the flag just won't survive a reload.
    }
  }
  return [value, set]
}
