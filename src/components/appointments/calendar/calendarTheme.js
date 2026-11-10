/** Shared badge chrome — premium pill style */
export const STATUS_BADGE_BASE =
  "inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide";

const DOCTOR_THEMES = [
  {
    header: "bg-white",
    avatar: "bg-[#fde8ef] text-[#c4476a] ring-[#f3c3d1]",
    column: "bg-white",
  },
  {
    header: "bg-white",
    avatar: "bg-[#eceefe] text-[#6d78c8] ring-[#d5daf5]",
    column: "bg-white",
  },
  {
    header: "bg-white",
    avatar: "bg-brand-success-soft text-brand-success ring-brand-success/15",
    column: "bg-white",
  },
  {
    header: "bg-white",
    avatar: "bg-brand-warning-soft text-brand-warning ring-brand-accent/20",
    column: "bg-white",
  },
];

export function getDoctorTheme(index = 0) {
  return DOCTOR_THEMES[index % DOCTOR_THEMES.length];
}

export function normalizeCalendarState(state) {
  const key = typeof state === "string" ? state.toUpperCase() : "";
  return ["PENDING", "CONFIRMED", "CANCELLED"].includes(key) ? key : "PENDING";
}

/** Soft Nails Boutique palette — warm pastels, low saturation */
const STATE_STYLES = {
  CONFIRMED: {
    label: "Confirmada",
    border: "border-[#e4e7ee]",
    badge: "bg-[#e7f6ee] text-[#3d8f62]",
    card: "bg-white hover:border-[#d5dae6]",
    dot: "bg-brand-success/80",
  },
  PENDING: {
    label: "Pendiente",
    border: "border-[#e4e7ee]",
    badge: "bg-brand-warning-soft text-brand-warning",
    card: "bg-white hover:border-[#d5dae6]",
    dot: "bg-brand-accent/80",
  },
  CANCELLED: {
    label: "Cancelada",
    border: "border-[#e4e7ee]",
    badge: "bg-brand-danger-soft text-brand-danger",
    card: "bg-white hover:border-[#d5dae6]",
    dot: "bg-brand-danger/80",
  },
};

export function getStateStyle(state) {
  return STATE_STYLES[normalizeCalendarState(state)] ?? STATE_STYLES.PENDING;
}
