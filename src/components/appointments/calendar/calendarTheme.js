/** Shared badge chrome — premium pill style */
export const STATUS_BADGE_BASE =
  "inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide";

const DOCTOR_THEMES = [
  {
    header: "bg-gradient-to-br from-sky-50/55 to-blue-50/40",
    avatar: "bg-sky-50 text-sky-600 ring-sky-100/80",
    column: "bg-sky-50/[0.07]",
  },
  {
    header: "bg-gradient-to-br from-violet-50/55 to-purple-50/40",
    avatar: "bg-violet-50 text-violet-600 ring-violet-100/80",
    column: "bg-violet-50/[0.07]",
  },
  {
    header: "bg-gradient-to-br from-emerald-50/55 to-teal-50/40",
    avatar: "bg-emerald-50 text-emerald-600 ring-emerald-100/80",
    column: "bg-emerald-50/[0.07]",
  },
  {
    header: "bg-gradient-to-br from-amber-50/55 to-orange-50/40",
    avatar: "bg-amber-50 text-amber-700 ring-amber-100/80",
    column: "bg-amber-50/[0.07]",
  },
  {
    header: "bg-gradient-to-br from-rose-50/55 to-pink-50/40",
    avatar: "bg-rose-50 text-rose-600 ring-rose-100/80",
    column: "bg-rose-50/[0.07]",
  },
  {
    header: "bg-gradient-to-br from-cyan-50/55 to-slate-50/40",
    avatar: "bg-cyan-50 text-cyan-700 ring-cyan-100/80",
    column: "bg-cyan-50/[0.07]",
  },
];

export function getDoctorTheme(index = 0) {
  return DOCTOR_THEMES[index % DOCTOR_THEMES.length];
}

export function normalizeCalendarState(state) {
  const key = typeof state === "string" ? state.toUpperCase() : "";
  return ["PENDING", "CONFIRMED", "CANCELLED"].includes(key) ? key : "PENDING";
}

/** Soft SaaS palette — low saturation, Stripe / Linear / Notion feel */
const STATE_STYLES = {
  CONFIRMED: {
    label: "Confirmada",
    border: "border-l-emerald-300/80",
    badge: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100/90",
    card: "bg-white hover:border-emerald-200/50 hover:bg-emerald-50/25",
    dot: "bg-emerald-400/80",
  },
  PENDING: {
    label: "Pendiente",
    border: "border-l-amber-300/80",
    badge: "bg-amber-50 text-amber-800/90 ring-1 ring-amber-100/90",
    card: "bg-white hover:border-amber-200/50 hover:bg-amber-50/30",
    dot: "bg-amber-400/70",
  },
  CANCELLED: {
    label: "Cancelada",
    border: "border-l-rose-300/80",
    badge: "bg-rose-50 text-rose-700/90 ring-1 ring-rose-100/90",
    card: "bg-white hover:border-rose-200/50 hover:bg-rose-50/25",
    dot: "bg-rose-400/75",
  },
};

export function getStateStyle(state) {
  return STATE_STYLES[normalizeCalendarState(state)] ?? STATE_STYLES.PENDING;
}
