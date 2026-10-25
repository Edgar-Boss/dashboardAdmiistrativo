import {
  CANCELLED_INFO_MESSAGE,
  isCancelledAppointment,
  isCancelledReactivation,
} from "./appointments/appointmentStateConfirm";

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
  const cancelled = isCancelledAppointment(normalized);
  const className = STATE_STYLES[normalized] ?? DEFAULT_STYLE;
  const visibleStates = cancelled
    ? STATES.filter((s) => s === "CANCELLED")
    : STATES;

  return (
    <div className="inline-flex flex-col gap-1">
      <select
        value={normalized}
        onChange={(e) => {
          const next = e.target.value;
          if (isCancelledReactivation(normalized, next)) return;
          onChange?.(next);
        }}
        disabled={disabled || cancelled}
        className={`rounded-full px-3 py-1 text-xs font-medium ring-1 shadow-brand transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/25 ${className} ${
          disabled || cancelled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
        }`}
        aria-label="Estado de la cita"
      >
        {visibleStates.map((s) => (
          <option key={s} value={s}>
            {STATE_LABELS[s]}
          </option>
        ))}
      </select>
      {cancelled ? (
        <p className="max-w-[12rem] text-[10px] leading-snug text-brand-text-muted">
          {CANCELLED_INFO_MESSAGE}
        </p>
      ) : null}
    </div>
  );
}
