const STATES = ["PENDING", "CONFIRMED", "CANCELLED"];

const STATE_STYLES = {
  CONFIRMED:
    "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  PENDING: "bg-amber-50 text-amber-800 ring-amber-600/20",
  CANCELLED: "bg-rose-50 text-rose-800 ring-rose-600/20",
};

const DEFAULT_STYLE = "bg-slate-100 text-slate-700 ring-slate-600/10";

function normalizeState(state) {
  const normalized = typeof state === "string" ? state.toUpperCase() : "";
  return STATES.includes(normalized) ? normalized : "PENDING";
}

export default function AppointmentStateSelect({ value, onChange, disabled }) {
  const normalized = normalizeState(value);
  const className = STATE_STYLES[normalized] ?? DEFAULT_STYLE;

  return (
    <select
      value={normalized}
      onChange={(e) => onChange?.(e.target.value)}
      disabled={disabled}
      className={`rounded-full px-3 py-1 text-xs font-medium ring-1 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-slate-400/30 ${className} ${
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
      }`}
      aria-label="Appointment state"
    >
      {STATES.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}

