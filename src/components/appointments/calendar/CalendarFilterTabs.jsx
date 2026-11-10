const TABS = [
  { id: "ALL", label: "Todas" },
  { id: "PENDING", label: "Pendientes" },
  { id: "CONFIRMED", label: "Confirmadas" },
  { id: "CANCELLED", label: "Canceladas" },
];

export default function CalendarFilterTabs({ value, onChange }) {
  return (
    <div className="inline-flex flex-nowrap items-center gap-0.5 rounded-full border border-[#e4e7ee] bg-white p-1">
      {TABS.map((tab) => {
        const active = value === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange?.(tab.id)}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/25 ${
              active
                ? "border border-[#d7dce8] bg-white text-brand-text shadow-sm"
                : "border border-transparent text-brand-text-muted hover:text-brand-text"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
