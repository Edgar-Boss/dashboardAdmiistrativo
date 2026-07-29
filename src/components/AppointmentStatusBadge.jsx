import {
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_STATUS_STYLES,
  DEFAULT_STATUS_STYLE,
  normalizeAppointmentState,
} from "./ui/statusStyles";

export default function AppointmentStatusBadge({ state }) {
  const normalized =
    typeof state === "string" && state.toUpperCase() === "COMPLETED"
      ? "COMPLETED"
      : normalizeAppointmentState(state);
  const className = APPOINTMENT_STATUS_STYLES[normalized] ?? DEFAULT_STATUS_STYLE;
  const label =
    APPOINTMENT_STATUS_LABELS[normalized] ??
    (typeof state === "string" ? state : "—");

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}
