const STATES = ["PENDING", "CONFIRMED", "CANCELLED"];

function normalizeState(state) {
  const normalized = typeof state === "string" ? state.toUpperCase() : "";
  return STATES.includes(normalized) ? normalized : "PENDING";
}

const btnBase =
  "inline-flex min-h-[1.875rem] items-center justify-center gap-0.5 rounded-md border bg-white px-2 py-1 text-[11px] font-medium leading-tight transition-colors focus:outline-none focus:ring-2 focus:ring-gray-200 focus:ring-offset-1 disabled:pointer-events-none disabled:opacity-45";

export default function ActionButtons({
  state,
  appointmentId,
  disabled,
  onStateChange,
}) {
  const normalized = normalizeState(state);

  if (normalized === "PENDING") {
    return (
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <button
          type="button"
          disabled={disabled}
          className={`${btnBase} border-emerald-200 text-emerald-600/90 hover:border-emerald-300 hover:bg-emerald-50/40`}
          onClick={() => onStateChange?.(appointmentId, "CONFIRMED")}
        >
          <span aria-hidden className="opacity-70">✅</span>
          Confirmar
        </button>
        <button
          type="button"
          disabled={disabled}
          className={`${btnBase} border-rose-200 text-rose-600/85 hover:border-rose-300 hover:bg-rose-50/50`}
          onClick={() => onStateChange?.(appointmentId, "CANCELLED")}
        >
          <span aria-hidden className="opacity-70">❌</span>
          Cancelar
        </button>
      </div>
    );
  }

  if (normalized === "CONFIRMED") {
    return (
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <button
          type="button"
          disabled
          className={`${btnBase} cursor-not-allowed border-gray-200 bg-gray-50/80 text-gray-400`}
          aria-label="Editar (no disponible)"
        >
          <span aria-hidden className="opacity-60">✏️</span>
          Editar
        </button>
        <button
          type="button"
          disabled={disabled}
          className={`${btnBase} border-rose-200 text-rose-600/85 hover:border-rose-300 hover:bg-rose-50/50`}
          onClick={() => onStateChange?.(appointmentId, "CANCELLED")}
        >
          <span aria-hidden className="opacity-70">❌</span>
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <div className="flex justify-end">
      <button
        type="button"
        disabled
        className={`${btnBase} cursor-not-allowed border-gray-200 bg-gray-50/80 text-gray-400`}
        aria-label="Ver detalle"
      >
        <span aria-hidden className="opacity-60">👁</span>
        Ver detalle
      </button>
    </div>
  );
}
