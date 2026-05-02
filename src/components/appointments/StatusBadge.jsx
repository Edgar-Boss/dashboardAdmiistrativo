const STATE_STYLES = {
  CONFIRMED: "bg-emerald-100 text-emerald-800",
  PENDING: "bg-amber-100 text-amber-800",
  CANCELLED: "bg-red-100 text-red-800",
};

const DEFAULT_STYLE = "bg-slate-100 text-slate-700";

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
      className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${className}`}
    >
      {label}
    </span>
  );
}
