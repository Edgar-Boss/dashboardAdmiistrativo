/** Shared status badge styles aligned with Nails Boutique Puebla brand */

export const APPOINTMENT_STATUS_STYLES = {
  PENDING:
    "bg-brand-warning-soft text-brand-warning ring-1 ring-brand-accent/35",
  CONFIRMED:
    "bg-brand-success-soft text-brand-success ring-1 ring-brand-success/25",
  CANCELLED:
    "bg-brand-danger-soft text-brand-danger ring-1 ring-brand-danger/25",
  COMPLETED:
    "bg-brand-soft text-brand-primary ring-1 ring-brand-primary/20",
};

export const APPOINTMENT_STATUS_LABELS = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  CANCELLED: "Cancelada",
  COMPLETED: "Completada",
};

export const DEFAULT_STATUS_STYLE =
  "bg-brand-soft text-brand-text-muted ring-1 ring-brand-border";

export const DOCTOR_STATUS_STYLES = {
  active:
    "border border-brand-success/30 bg-brand-success-soft text-brand-success",
  inactive:
    "border border-brand-border-strong bg-brand-soft text-brand-text-muted",
};

export function normalizeAppointmentState(state) {
  const normalized = typeof state === "string" ? state.toUpperCase() : "";
  return ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"].includes(normalized)
    ? normalized
    : "PENDING";
}

export function normalizeDoctorStatus(status) {
  const s = String(status ?? "").trim().toLowerCase();
  if (s === "inactive" || s === "inactivo") return "inactive";
  return "active";
}
