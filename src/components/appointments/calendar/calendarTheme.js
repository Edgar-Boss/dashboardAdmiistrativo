/** Shared badge chrome — premium pill style */
export const STATUS_BADGE_BASE =
  "inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide";

const DOCTOR_THEMES = [
  {
    header: "bg-gradient-to-br from-brand-soft/30 to-white",
    avatar: "bg-brand-soft text-brand-primary-text ring-brand-primary-text/20",
    column: "bg-brand-soft/[0.08]",
  },
  {
    header: "bg-gradient-to-br from-brand-secondary/12 to-white",
    avatar: "bg-brand-secondary/20 text-brand-primary-text ring-brand-secondary/30",
    column: "bg-brand-secondary/[0.04]",
  },
  {
    header: "bg-gradient-to-br from-brand-success-soft/70 to-white",
    avatar: "bg-brand-success-soft text-brand-success ring-brand-success/20",
    column: "bg-brand-success-soft/[0.22]",
  },
  {
    header: "bg-gradient-to-br from-brand-accent/12 to-white",
    avatar: "bg-brand-accent/20 text-brand-warning ring-brand-accent/25",
    column: "bg-brand-accent/[0.04]",
  },
  {
    header: "bg-gradient-to-br from-brand-warning-soft/70 to-white",
    avatar: "bg-brand-warning-soft text-brand-warning ring-brand-warning/20",
    column: "bg-brand-warning-soft/[0.22]",
  },
  {
    header: "bg-gradient-to-br from-brand-nude/35 to-white",
    avatar: "bg-brand-nude text-brand-ink ring-brand-border-strong/60",
    column: "bg-brand-nude/[0.12]",
  },
];

export function getDoctorTheme(index = 0) {
  return DOCTOR_THEMES[index % DOCTOR_THEMES.length];
}

export function normalizeCalendarState(state) {
  const key = typeof state === "string" ? state.toUpperCase() : "";
  return ["PENDING", "CONFIRMED", "CANCELLED"].includes(key) ? key : "PENDING";
}

/** Appointment state colors. Blue tones follow the logo; status hues stay distinct. */
const STATE_STYLES = {
  CONFIRMED: {
    label: "Confirmada",
    border: "border-l-brand-success/70",
    badge: "bg-brand-success-soft text-brand-success ring-1 ring-brand-success/20",
    card: "bg-brand-surface hover:border-brand-success/40 hover:bg-brand-success-soft/40",
    dot: "bg-brand-success/80",
  },
  PENDING: {
    label: "Pendiente",
    border: "border-l-brand-accent/70",
    badge: "bg-brand-warning-soft text-brand-warning ring-1 ring-brand-accent/25",
    card: "bg-brand-surface hover:border-brand-accent/40 hover:bg-brand-warning-soft/40",
    dot: "bg-brand-accent/80",
  },
  CANCELLED: {
    label: "Cancelada",
    border: "border-l-brand-danger/70",
    badge: "bg-brand-danger-soft text-brand-danger ring-1 ring-brand-danger/20",
    card: "bg-brand-surface hover:border-brand-danger/40 hover:bg-brand-danger-soft/40",
    dot: "bg-brand-danger/80",
  },
};

export function getStateStyle(state) {
  return STATE_STYLES[normalizeCalendarState(state)] ?? STATE_STYLES.PENDING;
}
