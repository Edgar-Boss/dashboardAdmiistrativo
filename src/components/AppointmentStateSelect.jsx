const STATES = ["PENDING", "CONFIRMED", "CANCELLED"];

const STATE_LABELS = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  CANCELLED: "Cancelada",
};

const STATE_STYLES = {
  CONFIRMED:
    "bg-brand-success-soft text-brand-success ring-brand-success/25",
  PENDING: "bg-brand-warning-soft text-brand-warning ring-brand-accent/35",
  CANCELLED: "bg-brand-danger-soft text-brand-danger ring-brand-danger/25",
};

const DEFAULT_STYLE = "bg-brand-soft text-brand-text-muted ring-brand-border";

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
      className={`rounded-full px-3 py-1 text-xs font-medium ring-1 shadow-brand transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/25 ${className} ${
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
      }`}
      aria-label="Estado de la cita"
    >
      {STATES.map((s) => (
        <option key={s} value={s}>
          {STATE_LABELS[s]}
        </option>
      ))}
    </select>
  );
}
