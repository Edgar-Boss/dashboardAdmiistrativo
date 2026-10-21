function IconCalendar({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5a2.25 2.25 0 002.25-2.25m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5a2.25 2.25 0 012.25 2.25v7.5" />
    </svg>
  );
}

function IconClock({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function IconCheck({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function IconX({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function Card({ icon: Icon, label, value, iconWrapClass }) {
  return (
    <div className="nb-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-3xl font-semibold tracking-tight text-brand-text tabular-nums">
            {value}
          </p>
          <p className="mt-1.5 text-sm font-medium text-brand-text-muted">{label}</p>
        </div>
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-brand ${iconWrapClass}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function normalizeState(state) {
  const normalized = typeof state === "string" ? state.toUpperCase() : "";
  return ["PENDING", "CONFIRMED", "CANCELLED"].includes(normalized)
    ? normalized
    : "PENDING";
}

function normalizeSummary(summary) {
  if (!summary || typeof summary !== "object") return null;

  const total =
    summary.total ??
    summary.totalAppointments ??
    summary.total_appointments ??
    summary.TOTAL ??
    summary.total_citas;
  const pending = summary.pending ?? summary.PENDING ?? summary.pendientes;
  const confirmed = summary.confirmed ?? summary.CONFIRMED ?? summary.confirmadas;
  const cancelled = summary.cancelled ?? summary.CANCELLED ?? summary.canceladas;

  const toInt = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const t = toInt(total);
  const p = toInt(pending);
  const c = toInt(confirmed);
  const x = toInt(cancelled);
  if (t === null && p === null && c === null && x === null) return null;
  return {
    total: t ?? 0,
    pending: p ?? 0,
    confirmed: c ?? 0,
    cancelled: x ?? 0,
  };
}

export default function SummaryCards({ appointments = [], summary = null }) {
  const normalized = normalizeSummary(summary);
  let total = normalized?.total ?? appointments.length;
  let pending = normalized?.pending ?? 0;
  let confirmed = normalized?.confirmed ?? 0;
  let cancelled = normalized?.cancelled ?? 0;

  if (!normalized) {
    pending = 0;
    confirmed = 0;
    cancelled = 0;
    for (const a of appointments) {
      const s = normalizeState(a.state);
      if (s === "PENDING") pending += 1;
      else if (s === "CONFIRMED") confirmed += 1;
      else if (s === "CANCELLED") cancelled += 1;
    }
    total = appointments.length;
  }

  return (
    <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
      <Card
        icon={IconCalendar}
        label="Total citas"
        value={total}
        iconWrapClass="bg-brand-soft text-brand-primary-text"
      />
      <Card
        icon={IconClock}
        label="Pendientes"
        value={pending}
        iconWrapClass="bg-brand-warning-soft text-brand-warning"
      />
      <Card
        icon={IconCheck}
        label="Confirmadas"
        value={confirmed}
        iconWrapClass="bg-brand-success-soft text-brand-success"
      />
      <Card
        icon={IconX}
        label="Canceladas"
        value={cancelled}
        iconWrapClass="bg-brand-danger-soft text-brand-danger"
      />
    </div>
  );
}
