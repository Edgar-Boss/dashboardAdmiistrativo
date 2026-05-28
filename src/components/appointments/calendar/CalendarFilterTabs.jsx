const TABS = [
  { id: "ALL", label: "Todas" },
  { id: "PENDING", label: "Pendientes" },
  { id: "CONFIRMED", label: "Confirmadas" },
  { id: "CANCELLED", label: "Canceladas" },
];

export default function CalendarFilterTabs({ value, onChange }) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-xl border border-gray-200/80 bg-gray-50/80 p-1 shadow-sm">
      {TABS.map((tab) => {
        const active = value === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange?.(tab.id)}
            className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/25 ${
              active
                ? "bg-white text-gray-900 shadow-sm ring-1 ring-gray-200/60"
                : "text-gray-600 hover:bg-white/60 hover:text-gray-900"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
