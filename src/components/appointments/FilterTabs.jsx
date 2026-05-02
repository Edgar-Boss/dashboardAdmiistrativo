const TABS = [
  { id: "ALL", label: "Todas" },
  { id: "PENDING", label: "Pendientes" },
  { id: "CONFIRMED", label: "Confirmadas" },
  { id: "CANCELLED", label: "Canceladas" },
];

export default function FilterTabs({ value, onChange }) {
  return (
    <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-200/80 pb-1">
      {TABS.map((tab) => {
        const active = value === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange?.(tab.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${
              active
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
