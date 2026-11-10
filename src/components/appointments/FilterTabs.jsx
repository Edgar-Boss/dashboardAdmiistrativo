const TABS = [
  { id: "ALL", label: "Todas" },
  { id: "PENDING", label: "Pendientes" },
  { id: "CONFIRMED", label: "Confirmadas" },
  { id: "CANCELLED", label: "Canceladas" },
];

export default function FilterTabs({ value, onChange }) {
  return (
    <div className="mb-8 flex flex-wrap gap-2 border-b border-brand-border pb-2">
      {TABS.map((tab) => {
        const active = value === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange?.(tab.id)}
            className={`rounded-brand px-4 py-2.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/25 ${
              active
                ? "bg-brand-primary text-brand-ink shadow-brand"
                : "text-brand-text-muted hover:bg-brand-soft hover:text-brand-text"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
