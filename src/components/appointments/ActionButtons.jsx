const STATES = ["PENDING", "CONFIRMED", "CANCELLED"];

function normalizeState(state) {
  const normalized = typeof state === "string" ? state.toUpperCase() : "";
  return STATES.includes(normalized) ? normalized : "PENDING";
}

const btnBase =
  "inline-flex items-center justify-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:pointer-events-none disabled:opacity-50";

export default function ActionButtons({
  state,
  appointmentId,
  disabled,
  onStateChange,
}) {
  const normalized = normalizeState(state);

  if (normalized === "PENDING") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={disabled}
          className={`${btnBase} border-emerald-500 text-emerald-700 hover:bg-emerald-50 focus:ring-emerald-500/40`}
          onClick={() => onStateChange?.(appointmentId, "CONFIRMED")}
        >
          <span aria-hidden>✅</span>
          Confirmar
        </button>
        <button
          type="button"
          disabled={disabled}
          className={`${btnBase} border-red-500 text-red-700 hover:bg-red-50 focus:ring-red-500/40`}
          onClick={() => onStateChange?.(appointmentId, "CANCELLED")}
        >
          <span aria-hidden>❌</span>
          Cancelar
        </button>
      </div>
    );
  }

  if (normalized === "CONFIRMED") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled
          className={`${btnBase} cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400`}
          aria-label="Editar (no disponible)"
        >
          <span aria-hidden>✏️</span>
          Editar
        </button>
        <button
          type="button"
          disabled={disabled}
          className={`${btnBase} border-red-500 text-red-700 hover:bg-red-50 focus:ring-red-500/40`}
          onClick={() => onStateChange?.(appointmentId, "CANCELLED")}
        >
          <span aria-hidden>❌</span>
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled
      className={`${btnBase} cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400`}
      aria-label="Ver detalle"
    >
      <span aria-hidden>👁</span>
      Ver detalle
    </button>
  );
}
