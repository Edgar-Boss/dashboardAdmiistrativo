const TABS = [
  { id: "ALL", label: "Todas" },
  { id: "PENDING", label: "Pendientes" },
  { id: "CONFIRMED", label: "Confirmadas" },
  { id: "CANCELLED", label: "Canceladas" },
];

export default function CalendarFilterTabs({ value, onChange }) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-brand border border-brand-border bg-brand-soft/60 p-1 shadow-brand">
      {TABS.map((tab) => {
        const active = value === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange?.(tab.id)}
            className={`rounded-brand px-3.5 py-2 text-sm font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/25 ${
              active
                ? "bg-brand-surface text-brand-text shadow-brand ring-1 ring-brand-border"
                : "text-brand-text-muted hover:bg-brand-surface/60 hover:text-brand-text"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
