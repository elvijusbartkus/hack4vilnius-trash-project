import type { ManifestLine } from "@/lib/pickups";

const STATUS: Record<ManifestLine["status"], string> = {
  planned: "Maršrute",
  skipped: "Praleista",
  extra: "Pridėta",
};

// One stop line on the truck manifest: number, address, bin, status. A skipped line is struck and stamped.
export default function ManifestLineRow({
  line,
  total,
  you = false,
  large = false,
}: {
  line: ManifestLine;
  total: number;
  you?: boolean;
  large?: boolean;
}) {
  const skipped = line.status === "skipped";
  return (
    <div
      className={`grid grid-cols-[auto_1fr_auto] items-center gap-x-4 ${large ? "py-4" : "py-2"} ${
        you ? "bg-sheet-hi" : ""
      }`}
    >
      <span className={`font-display font-semibold text-green-muted ${large ? "text-2xl" : "text-base"}`}>
        {String(line.no).padStart(3, "0")}
        {large && <span className="text-lg font-medium text-clay-deep"> / {total}</span>}
      </span>
      <span
        className={`min-w-0 truncate font-display font-semibold ${large ? "text-2xl md:text-3xl" : "text-base"} ${
          skipped ? "text-clay-deep line-through decoration-clay decoration-2" : "text-ink"
        }`}
      >
        {line.address}
        {line.binVolume && <span className="font-medium text-clay-deep"> · {line.binVolume} L</span>}
      </span>
      {skipped || line.status === "extra" ? (
        <span
          key={line.status}
          className={`stamp justify-self-end rounded-[2px] border-2 border-clay-deep px-2 font-display font-bold uppercase tracking-[0.08em] text-clay-deep ${
            large ? "py-1 text-base" : "text-xs"
          }`}
        >
          {STATUS[line.status]}
        </span>
      ) : (
        <span className={`justify-self-end text-green-muted ${large ? "text-base" : "text-sm"}`}>{STATUS[line.status]}</span>
      )}
    </div>
  );
}
