import type { SVGProps } from "react";

// Authored icons: 24px grid, 2px stroke, square caps to match the manifest's ruled lines.
function Icon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={20}
      height={20}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="square"
      aria-hidden="true"
      {...props}
    />
  );
}

export function CloseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Icon>
  );
}

export function ChevronDownIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M6 9l6 6 6-6" />
    </Icon>
  );
}

export function CheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M5 12.5l4.5 4.5L19 7" />
    </Icon>
  );
}

export function SearchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <circle cx="11" cy="11" r="6" />
      <path d="M16 16l4 4" />
    </Icon>
  );
}

export function BellIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 21h4" />
    </Icon>
  );
}

// WasteWise mark: the "W route" app icon. Green tile with the map grid, an orange W road with a
// dashed centre line, a start dot and a bin at the end.
export const W_ROUTE = "M7.9 16.8 L15.5 37.8 L23.8 21.6 L32.3 37.8 L39.8 16.8";

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true" className="shrink-0">
      <rect width="48" height="48" rx="11" className="fill-green" />
      <g className="stroke-grid" strokeWidth="2">
        <path d="M11.8 0v48M36 0v48M0 12h48M0 26.5h48M0 40.8h48" />
      </g>
      <path d={W_ROUTE} fill="none" className="stroke-orange-bright" strokeWidth="4.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d={W_ROUTE} fill="none" className="stroke-green" strokeWidth="0.9" strokeDasharray="1.6 1.6" />
      <circle cx="7.9" cy="16.8" r="4.2" className="fill-orange-bright" />
      <circle cx="7.9" cy="16.8" r="1.8" fill="#fff" />
      <circle cx="39.8" cy="16.8" r="4.2" className="fill-orange-bright" />
      <path d="M37.6 14.6h4.4M38 15.6h3.6l-0.5 3.4h-2.6z" fill="#fff" stroke="#fff" strokeWidth="0.7" strokeLinejoin="round" />
    </svg>
  );
}

export type MarkerKind = "scheduled" | "skipped" | "extra" | "bookable" | "none";

// Ledger markers: shape carries the meaning, colour only reinforces it.
// scheduled = green square, booked extra = orange circle, not coming = orange crossed square, bookable = orange plus.
export function Marker({ kind, inverted = false }: { kind: MarkerKind; inverted?: boolean }) {
  if (kind === "none") return <span className="block h-3.5 w-3.5" aria-hidden="true" />;
  const fill = inverted ? "fill-sheet" : "fill-green";
  const stroke = inverted ? "stroke-sheet" : "stroke-orange-deep";
  return (
    <svg viewBox="0 0 14 14" width={14} height={14} aria-hidden="true" className="block">
      {kind === "scheduled" && <rect x="1" y="1" width="12" height="12" className={fill} />}
      {kind === "extra" && <circle cx="7" cy="7" r="6" className={inverted ? "fill-sheet" : "fill-orange"} />}
      {kind === "skipped" && (
        <g className={stroke} strokeWidth="1.6" fill="none">
          <rect x="1.5" y="1.5" width="11" height="11" />
          <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" />
        </g>
      )}
      {kind === "bookable" && (
        <path d="M7 2v10M2 7h10" className={inverted ? "stroke-sheet" : "stroke-orange"} strokeWidth="1.8" strokeLinecap="square" />
      )}
    </svg>
  );
}
