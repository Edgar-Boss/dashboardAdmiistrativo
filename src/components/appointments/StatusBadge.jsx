const STATE_STYLES = {
  CONFIRMED: "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200/80",
  PENDING: "bg-amber-100 text-amber-900 ring-1 ring-amber-200/80",
  CANCELLED: "bg-rose-100 text-rose-900 ring-1 ring-rose-200/80",
};

const DEFAULT_STYLE = "bg-gray-100 text-gray-800 ring-1 ring-gray-200";

const LABELS = {
  CONFIRMED: "Confirmada",
  PENDING: "Pendiente",
  CANCELLED: "Cancelada",
};

function normalizeState(state) {
  const normalized = typeof state === "string" ? state.toUpperCase() : "";
  return ["PENDING", "CONFIRMED", "CANCELLED"].includes(normalized)
    ? normalized
    : "PENDING";
}

export default function StatusBadge({ state }) {
  const normalized = normalizeState(state);
  const className = STATE_STYLES[normalized] ?? DEFAULT_STYLE;
  const label = LABELS[normalized] ?? String(state ?? "—");

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold leading-tight ${className}`}
    >
      {label}
    </span>
  );
}
