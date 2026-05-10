import DoctorStatusBadge from "./DoctorStatusBadge";

function initials(name) {
  const s = String(name ?? "").trim();
  if (!s) return "—";
  const parts = s.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (first + last).toUpperCase();
}

function formatDisplay(value) {
  const s = String(value ?? "").trim();
  return s || "—";
}

export default function DoctorCard({ doctor, onEdit }) {
  return (
    <article className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700 ring-1 ring-blue-100">
            {initials(doctor?.name)}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-sm font-semibold text-gray-900">
                {formatDisplay(doctor?.name)}
              </h3>
              <DoctorStatusBadge status={doctor?.status} />
            </div>
            <p className="mt-1 truncate text-xs text-gray-500">
              {formatDisplay(doctor?.specialty)}
            </p>
          </div>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3">
        <div>
          <dt className="text-[11px] font-medium text-gray-500">Citas (mes)</dt>
          <dd className="mt-0.5 text-sm font-semibold tabular-nums text-gray-900">
            {Number(doctor?.appointmentsThisMonth ?? 0)}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-medium text-gray-500">Contacto</dt>
          <dd className="mt-0.5 truncate text-xs font-medium text-gray-700">
            {doctor?.email
              ? doctor.email
              : doctor?.phone
                ? doctor.phone
                : "—"}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onEdit?.(doctor)}
          className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 focus:ring-offset-1"
        >
          Editar
        </button>
      </div>
    </article>
  );
}

