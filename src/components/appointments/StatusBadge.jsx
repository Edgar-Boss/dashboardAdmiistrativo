import {
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_STATUS_STYLES,
  DEFAULT_STATUS_STYLE,
  normalizeAppointmentState,
} from "../ui/statusStyles";

export default function StatusBadge({ state }) {
  const normalized = normalizeAppointmentState(state);
  const className = APPOINTMENT_STATUS_STYLES[normalized] ?? DEFAULT_STATUS_STYLE;
  const label = APPOINTMENT_STATUS_LABELS[normalized] ?? String(state ?? "—");

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold leading-tight ${className}`}
    >
      {label}
    </span>
  );
}
