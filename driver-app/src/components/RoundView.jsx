import { useEffect, useRef } from 'react'
import RouteMap from './RouteMap.jsx'
import { formatDuration } from './ShiftList.jsx'
import { DEPOT } from '../data/shift.js'
import { stopUrl, MAX_WAYPOINTS } from '../lib/maps.js'

// The screen the driver actually works from: their route on the map, the
// button that throws the whole round to Google Maps, and the stop list to
// tick off as they collect.
export default function RoundView({ round, done, onToggleStop, onBack }) {
  const nextIndex = round.stops.findIndex((s) => !done.includes(s.id))
  const complete = nextIndex === -1
  const nextStop = complete ? null : round.stops[nextIndex]

  // A round is bigger than one Maps link, so follow the driver's progress
  // and offer the leg they're actually on.
  const nextNumber = nextIndex + 1
  const legIndex = complete
    ? -1
    : round.legs.findIndex(
        (l) => nextNumber >= l.startIndex && nextNumber <= l.endIndex,
      )
  const currentLeg = legIndex === -1 ? null : round.legs[legIndex]

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
          activeIndex={nextIndex}
        />
      </div>

      <div className="nav-cta">
        {complete ? (
          <>
            <p className="all-done">
              Visi konteineriai ištuštinti — grįžkite į bazę.
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
            <p className="next-up">
              Kitas sustojimas {nextNumber} iš {round.stops.length}:{' '}
              <strong>{nextStop.address}</strong>
            </p>

            <a
              className="btn btn--primary"
              href={currentLeg.url}
              target="_blank"
              rel="noreferrer"
            >
              {round.legs.length > 1
                ? `Google Maps: sustojimai ${currentLeg.startIndex}–${currentLeg.endIndex}`
                : 'Pradėti maršrutą Google Maps'}
            </a>

            {round.legs.length > 1 && (
              <>
                <p className="leg-note">
                  Atkarpa {legIndex + 1} iš {round.legs.length}. Į vieną Google
                  Maps nuorodą telpa {MAX_WAYPOINTS + 1} sustojimų, todėl
                  maršrutas atidaromas dalimis. Pažymėkite ištuštintus
                  konteinerius ir mygtukas persijungs į kitą atkarpą.
                </p>

                <details className="full-route">
                  <summary>Visos atkarpos ({round.legs.length})</summary>
                  {round.legs.map((leg, i) => (
                    <a
                      key={i}
                      className={`btn btn--ghost${i === legIndex ? ' is-current' : ''}`}
                      href={leg.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Atkarpa {i + 1} · sustojimai {leg.startIndex}–{leg.endIndex}
                    </a>
                  ))}
                </details>
              </>
            )}
          </>
        )}
      </div>

      <ol className="stop-list">
        {round.stops.map((stop, i) => {
          const isDone = done.includes(stop.id)
          return (
            <li
              key={stop.id}
              ref={i === nextIndex ? nextRef : null}
              className={`stop-row${isDone ? ' is-done' : ''}${
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
                {isDone ? '✓' : i + 1}
              </button>

              <span className="stop-body">
                <strong>{stop.address}</strong>
                <small>
                  {stop.containerType}
                  {stop.urgent && !isDone && <em> · skubu</em>}
                </small>
              </span>

              {!isDone && (
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
    </div>
  )
}
