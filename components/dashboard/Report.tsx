"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { formatDayCap } from "@/lib/dates";
import { getNextPickup, type Household } from "@/lib/pickups";
import {
  REPORT_CATEGORIES,
  REPORT_STATUS,
  compressPhoto,
  createReport,
  listReports,
  type Report,
  type ReportCategory,
} from "@/lib/reports";
import { Panel } from "./Cards";
import Header from "./Header";
import { CloseIcon } from "./Icons";
import Toast, { type ToastData } from "./Toast";

// /pranesti: photograph a problem (overflowing bin, rubbish dumped next to it, broken bin…),
// mark the place and send it for review so a unit can be dispatched.
export function ReportScreen({
  householdId,
  name,
  onSwitch,
}: {
  householdId: number;
  name: string;
  onSwitch: (h: Household) => void;
}) {
  const [household, setHousehold] = useState<Household | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [toast, setToast] = useState<ToastData | null>(null);
  const toastSeq = useRef(0);

  const load = useCallback(
    () =>
      listReports(householdId)
        .then(setReports)
        .catch((e) => console.error(e)),
    [householdId],
  );

  useEffect(() => {
    getNextPickup(householdId)
      .then((s) => setHousehold(s.household))
      .catch((e) => console.error(e));
    load();
  }, [householdId, load]);

  return (
    <div className="min-h-dvh bg-ground">
      <Header address={household?.address ?? null} name={name} onSwitch={onSwitch} current="report" />

      <main className="mx-auto max-w-[1200px] px-3 pb-32 pt-5 md:px-8 md:pt-8">
        <h1 className="font-display text-3xl font-semibold md:text-4xl">Pranešti apie problemą</h1>
        <p className="mb-4 mt-1 text-stone-deep md:mb-6">
          Nufotografuokite, pažymėkite vietą ir išsiųskite. Pranešimą peržiūrėsime ir, jei reikia, išsiųsime komandą.
        </p>

        <div className="flex flex-col gap-4 md:grid md:grid-cols-12 md:items-start md:gap-6">
          <div className="md:col-span-8">
            {household && (
              <ReportForm
                key={household.id}
                household={household}
                onSent={(r) => {
                  setReports((prev) => [r, ...prev]);
                  setToast({ id: ++toastSeq.current, message: "Pranešimas išsiųstas peržiūrai" });
                }}
              />
            )}
          </div>

          <Panel title="Mano pranešimai" className="md:col-span-4">
            {reports.length === 0 ? (
              <p className="mt-2 text-stone-deep">Pranešimų dar nėra.</p>
            ) : (
              <ul className="mt-2 divide-y divide-rule/60">
                {reports.map((r) => (
                  <li key={r.id} className="flex items-start gap-3 py-3">
                    {r.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.photo} alt="" className="h-16 w-16 shrink-0 rounded-[3px] object-cover" />
                    ) : (
                      <span className="h-16 w-16 shrink-0 rounded-[3px] bg-sheet-lo" aria-hidden="true" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold leading-tight">{REPORT_CATEGORIES[r.category]}</span>
                      <span className="block truncate text-sm text-stone-deep">{r.place}</span>
                      <span className="block text-sm text-stone-deep">{formatDayCap(r.created_at.slice(0, 10))}</span>
                    </span>
                    <span className="shrink-0 rounded-[2px] border border-orange bg-orange/10 px-2 py-0.5 text-sm font-semibold text-orange-deep">
                      {REPORT_STATUS[r.status]}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </main>

      {toast && <Toast key={toast.id} toast={toast} onDone={() => setToast(null)} />}
    </div>
  );
}

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`min-h-11 rounded-[3px] px-3.5 font-semibold ${
        selected ? "bg-green text-sheet" : "border border-rule bg-sheet-hi text-ink hover:border-green-muted"
      }`}
    >
      {children}
    </button>
  );
}

function ReportForm({ household, onSent }: { household: Household; onSent: (r: Report) => void }) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [category, setCategory] = useState<ReportCategory | null>(null);
  const [place, setPlace] = useState(household.address);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const ids = { photo: useId(), what: useId(), place: useId(), comment: useId() };

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      setPhoto(await compressPhoto(file));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function locate() {
    if (!("geolocation" in navigator)) return setError("Šis įrenginys negali nustatyti vietos. Įrašykite adresą.");
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        setCoords({ lat, lon });
        // Fill "Vieta" with the street address at that point; the coordinates go along regardless.
        const address = await addressAt(lat, lon);
        if (address) setPlace(address);
        setLocating(false);
      },
      () => {
        setLocating(false);
        setError("Nepavyko nustatyti vietos. Įrašykite adresą ranka.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  const ready = !!photo && !!category && place.trim().length > 2;

  async function submit() {
    if (!ready || sending) return;
    setSending(true);
    setError(null);
    try {
      const r = await createReport({
        household_id: household.id,
        category: category!,
        place: place.trim(),
        lat: coords?.lat ?? null,
        lon: coords?.lon ?? null,
        comment: comment.trim() || null,
        photo,
      });
      onSent(r);
      setPhoto(null);
      setCategory(null);
      setComment("");
      setCoords(null);
      setPlace(household.address);
    } catch (e) {
      console.error(e);
      setError("Nepavyko išsiųsti. Patikrinkite ryšį ir bandykite dar kartą.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section aria-label="Naujas pranešimas" className="rounded-[4px] border border-rule/70 bg-sheet px-5 py-5 md:px-8 md:py-7">
      {/* 1. photo */}
      <h2 id={ids.photo} className="font-display text-xl font-semibold">
        Nuotrauka
      </h2>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        aria-labelledby={ids.photo}
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      {photo ? (
        <div className="relative mt-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} alt="Pasirinkta nuotrauka" className="max-h-80 w-full rounded-[4px] object-cover" />
          <button
            type="button"
            onClick={() => setPhoto(null)}
            aria-label="Pašalinti nuotrauką"
            className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full bg-ink/70 text-white hover:bg-ink"
          >
            <CloseIcon />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="mt-3 flex min-h-40 w-full flex-col items-center justify-center gap-2 rounded-[4px] border-2 border-dashed border-green-muted bg-sheet-hi px-4 text-center hover:border-green"
        >
          <CameraIcon />
          <span className="font-display text-xl font-semibold text-green">Fotografuoti arba įkelti</span>
          <span className="text-sm text-stone-deep">Telefone atsidarys kamera</span>
        </button>
      )}

      {/* 2. what happened */}
      <h2 id={ids.what} className="mt-6 font-display text-xl font-semibold">
        Kas atsitiko?
      </h2>
      <div role="group" aria-labelledby={ids.what} className="mt-3 flex flex-wrap gap-2">
        {(Object.keys(REPORT_CATEGORIES) as ReportCategory[]).map((c) => (
          <Chip key={c} selected={category === c} onClick={() => setCategory(c)}>
            {REPORT_CATEGORIES[c]}
          </Chip>
        ))}
      </div>

      {/* 3. place */}
      <label htmlFor={ids.place} className="mt-6 block font-display text-xl font-semibold">
        Vieta
      </label>
      <input
        id={ids.place}
        value={place}
        onChange={(e) => setPlace(e.target.value)}
        placeholder="Gatvė, namo numeris arba orientyras"
        className="mt-3 min-h-12 w-full rounded-[4px] border border-rule bg-sheet-hi px-4 text-lg outline-none focus:border-green"
      />
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={locate}
          disabled={locating}
          className="min-h-11 rounded-[3px] border-2 border-green px-4 font-semibold text-green hover:bg-sheet-hi disabled:opacity-50"
        >
          {locating ? "Ieškomas adresas…" : "Naudoti mano buvimo vietą"}
        </button>
        {coords && (
          <span className="text-sm text-green" aria-live="polite">
            Vieta pažymėta: {coords.lat.toFixed(5)}, {coords.lon.toFixed(5)}
          </span>
        )}
      </div>

      {/* 4. comment */}
      <label htmlFor={ids.comment} className="mt-6 block font-display text-xl font-semibold">
        Komentaras <span className="font-sans text-base font-normal text-stone-deep">(nebūtina)</span>
      </label>
      <textarea
        id={ids.comment}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        placeholder="Pvz. maišai prie konteinerio jau kelias dienas"
        className="mt-3 w-full rounded-[4px] border border-rule bg-sheet-hi px-4 py-3 text-lg outline-none focus:border-green"
      />

      {error && (
        <p role="alert" className="mt-4 rounded-[4px] border-2 border-orange bg-sheet-hi px-4 py-3 font-semibold text-orange-deep">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={!ready || sending}
        className="mt-6 min-h-14 w-full rounded-[4px] bg-green px-6 font-display text-xl font-semibold text-sheet hover:bg-green-deep disabled:opacity-50 sm:w-auto"
      >
        {sending ? "Siunčiama…" : "Siųsti peržiūrai"}
      </button>
      {!ready && !sending && (
        <p className="mt-2 text-sm text-stone-deep">Reikia nuotraukos, ką pastebėjote, ir vietos.</p>
      )}
    </section>
  );
}

// Reverse geocoding with OpenStreetMap Nominatim: "Darkiemio g. 13", or the nearest named place.
// Returns null if the lookup fails, so the typed address stays.
async function addressAt(lat: number, lon: number): Promise<string | null> {
  try {
    const q = new URLSearchParams({ format: "jsonv2", lat: String(lat), lon: String(lon), "accept-language": "lt", zoom: "18" });
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${q}`);
    if (!res.ok) return null;
    const json = await res.json();
    const a = json.address ?? {};
    const street = a.road ?? a.pedestrian ?? a.footway ?? a.square;
    if (street) return a.house_number ? `${street} ${a.house_number}` : street;
    return json.name || (json.display_name ? String(json.display_name).split(",").slice(0, 2).join(",").trim() : null);
  } catch {
    return null;
  }
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" width={36} height={36} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="square" aria-hidden="true" className="text-green">
      <path d="M3 7h4l2-3h6l2 3h4v13H3z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}
