const STATUS_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Activos" },
  { value: "inactive", label: "Inactivos" },
];

const SORT_OPTIONS = [
  { value: "name-asc", label: "Nombre (A–Z)" },
  { value: "name-desc", label: "Nombre (Z–A)" },
  { value: "appointments-desc", label: "Más citas" },
  { value: "appointments-asc", label: "Menos citas" },
];

export default function DoctorsFilters({
  query,
  onQueryChange,
  specialty,
  specialties,
  onSpecialtyChange,
  status,
  onStatusChange,
  sort,
  onSortChange,
}) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-sm transition focus-within:ring-2 focus-within:ring-gray-200">
          <span className="text-gray-400" aria-hidden>
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
          </span>
          <input
            value={query}
            onChange={(e) => onQueryChange?.(e.target.value)}
            placeholder="Buscar especialista..."
            className="min-w-0 flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none"
            aria-label="Buscar especialista"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-3 md:flex md:items-center">
          <label className="sr-only" htmlFor="specialty">
            Especialidad
          </label>
          <select
            id="specialty"
            value={specialty}
            onChange={(e) => onSpecialtyChange?.(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm transition hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 focus:ring-offset-1 md:w-56"
          >
            <option value="all">Todas las especialidades</option>
            {specialties.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <label className="sr-only" htmlFor="status">
            Estatus
          </label>
          <select
            id="status"
            value={status}
            onChange={(e) => onStatusChange?.(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm transition hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 focus:ring-offset-1 md:w-40"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <label className="sr-only" htmlFor="sort">
            Ordenar
          </label>
          <select
            id="sort"
            value={sort}
            onChange={(e) => onSortChange?.(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm transition hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 focus:ring-offset-1 md:w-44"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </section>
  );
}

