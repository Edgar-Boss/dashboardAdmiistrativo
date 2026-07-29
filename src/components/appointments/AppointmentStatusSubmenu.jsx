const STATUS_OPTIONS = [
  {
    value: "PENDING",
    label: "Pendiente",
    dotClass: "bg-brand-warning",
    hoverClass: "hover:bg-brand-warning-soft",
    activeClass: "bg-brand-warning-soft",
  },
  {
    value: "CONFIRMED",
    label: "Confirmada",
    dotClass: "bg-brand-success",
    hoverClass: "hover:bg-brand-success-soft",
    activeClass: "bg-brand-success-soft",
  },
  {
    value: "CANCELLED",
    label: "Cancelada",
    dotClass: "bg-brand-danger",
    hoverClass: "hover:bg-brand-danger-soft",
    activeClass: "bg-brand-danger-soft",
  },
];

function normalizeState(state) {
  const normalized = typeof state === "string" ? state.toUpperCase() : "";
  return ["PENDING", "CONFIRMED", "CANCELLED"].includes(normalized)
    ? normalized
    : "PENDING";
}

export default function AppointmentStatusSubmenu({
  currentState,
  onSelect,
  className = "",
}) {
  const active = normalizeState(currentState);

  return (
    <div
      role="menu"
      aria-label="Cambiar estado de la cita"
      className={`absolute right-full top-0 z-20 mr-1.5 min-w-[10.5rem] rounded-brand-md border border-brand-border bg-brand-surface p-1.5 shadow-brand-lg animate-menu-in ${className}`}
    >
      <p className="px-2.5 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-brand-text-muted">
        Estado
      </p>
      <ul className="space-y-0.5">
        {STATUS_OPTIONS.map((option) => {
          const isActive = active === option.value;
          return (
            <li key={option.value}>
              <button
                type="button"
                role="menuitemradio"
                aria-checked={isActive}
                className={`flex w-full items-center gap-2.5 rounded-brand px-2.5 py-2 text-left text-sm text-brand-text transition-colors duration-150 ${option.hoverClass} ${
                  isActive ? option.activeClass : ""
                }`}
                onClick={() => onSelect?.(option.value)}
              >
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${option.dotClass}`}
                  aria-hidden
                />
                <span className="font-medium">{option.label}</span>
                {isActive ? (
                  <span className="ml-auto text-[10px] font-medium text-brand-text-muted">
                    Actual
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
