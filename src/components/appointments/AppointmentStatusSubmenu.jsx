const STATUS_OPTIONS = [
  {
    value: "PENDING",
    label: "Pendiente",
    dotClass: "bg-amber-400",
    hoverClass: "hover:bg-amber-50",
    activeClass: "bg-amber-50",
  },
  {
    value: "CONFIRMED",
    label: "Confirmada",
    dotClass: "bg-emerald-500",
    hoverClass: "hover:bg-emerald-50",
    activeClass: "bg-emerald-50",
  },
  {
    value: "CANCELLED",
    label: "Cancelada",
    dotClass: "bg-rose-500",
    hoverClass: "hover:bg-rose-50",
    activeClass: "bg-rose-50",
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
      className={`absolute right-full top-0 z-20 mr-1.5 min-w-[10.5rem] rounded-xl border border-gray-100 bg-white p-1.5 shadow-lg shadow-gray-200/60 animate-menu-in ${className}`}
    >
      <p className="px-2.5 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
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
                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-gray-700 transition-colors duration-150 ${option.hoverClass} ${
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
                  <span className="ml-auto text-[10px] font-medium text-gray-400">
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
