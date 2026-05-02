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
    <div className="rounded-2xl bg-white p-4 shadow-md ring-1 ring-slate-900/5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-3xl font-semibold tracking-tight text-slate-900 tabular-nums">
            {value}
          </p>
          <p className="mt-1 text-sm font-medium text-slate-500">{label}</p>
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconWrapClass}`}>
          <Icon className="h-6 w-6" />
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

export default function SummaryCards({ appointments }) {
  const total = appointments.length;
  let pending = 0;
  let confirmed = 0;
  let cancelled = 0;
  for (const a of appointments) {
    const s = normalizeState(a.state);
    if (s === "PENDING") pending += 1;
    else if (s === "CONFIRMED") confirmed += 1;
    else if (s === "CANCELLED") cancelled += 1;
  }

  return (
    <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card
        icon={IconCalendar}
        label="Total citas"
        value={total}
        iconWrapClass="bg-sky-100 text-sky-700"
      />
      <Card
        icon={IconClock}
        label="Pendientes"
        value={pending}
        iconWrapClass="bg-amber-100 text-amber-700"
      />
      <Card
        icon={IconCheck}
        label="Confirmadas"
        value={confirmed}
        iconWrapClass="bg-emerald-100 text-emerald-700"
      />
      <Card
        icon={IconX}
        label="Canceladas"
        value={cancelled}
        iconWrapClass="bg-rose-100 text-rose-700"
      />
    </div>
  );
}
