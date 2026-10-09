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

export function TruckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M2 6h11v10H2zM13 10h4l3 3v3h-7" />
      <circle cx="6" cy="17.5" r="1.8" />
      <circle cx="17" cy="17.5" r="1.8" />
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

// Brand mark: a bin seen from the side, its lid lifted by a check, the one decision the product asks for.
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true" className="shrink-0">
      <rect width="32" height="32" rx="4" className="fill-green" />
      <path d="M9 12h14l-1.6 13H10.6z" className="fill-sheet" />
      <path d="M8 9.5h16" className="stroke-sheet" strokeWidth="2.2" strokeLinecap="square" />
      <path d="M12.5 17.8l2.6 2.6 4.8-5" fill="none" className="stroke-green" strokeWidth="2.4" strokeLinecap="square" />
    </svg>
  );
}

export type MarkerKind = "scheduled" | "skipped" | "extra" | "bookable" | "none";

// Ledger markers: shape carries the meaning, colour only reinforces it.
// scheduled = filled square, booked extra = filled circle, skipped = crossed square, bookable = plus.
export function Marker({ kind, inverted = false }: { kind: MarkerKind; inverted?: boolean }) {
  if (kind === "none") return <span className="block h-3.5 w-3.5" aria-hidden="true" />;
  const fill = inverted ? "fill-sheet" : "fill-green";
  const stroke = inverted ? "stroke-sheet" : "stroke-clay-deep";
  return (
    <svg viewBox="0 0 14 14" width={14} height={14} aria-hidden="true" className="block">
      {kind === "scheduled" && <rect x="1" y="1" width="12" height="12" className={fill} />}
      {kind === "extra" && <circle cx="7" cy="7" r="6" className={fill} />}
      {kind === "skipped" && (
        <g className={stroke} strokeWidth="1.6" fill="none">
          <rect x="1.5" y="1.5" width="11" height="11" />
          <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" />
        </g>
      )}
      {kind === "bookable" && (
        <path d="M7 2v10M2 7h10" className={inverted ? "stroke-sheet" : "stroke-green-muted"} strokeWidth="1.8" strokeLinecap="square" />
      )}
    </svg>
  );
}
