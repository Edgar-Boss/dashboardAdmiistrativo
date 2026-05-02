const STATE_STYLES = {
  CONFIRMED:
    "bg-emerald-50 text-emerald-800 ring-emerald-600/20 ring-1",
  PENDING:
    "bg-amber-50 text-amber-800 ring-amber-600/20 ring-1",
  CANCELLED: "bg-rose-50 text-rose-800 ring-rose-600/20 ring-1",
};

const DEFAULT_STYLE =
  "bg-slate-100 text-slate-700 ring-slate-600/10 ring-1";

export default function AppointmentStatusBadge({ state }) {
  const normalized = typeof state === "string" ? state.toUpperCase() : "";
  const className = STATE_STYLES[normalized] ?? DEFAULT_STYLE;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      {state ?? "—"}
    </span>
  );
}
