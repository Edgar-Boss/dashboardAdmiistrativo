import { useState } from "react";
import AppointmentStateConfirmDialog from "./AppointmentStateConfirmDialog";

const STATES = ["PENDING", "CONFIRMED", "CANCELLED"];

function normalizeState(state) {
  const normalized = typeof state === "string" ? state.toUpperCase() : "";
  return STATES.includes(normalized) ? normalized : "PENDING";
}

const btnBase =
  "inline-flex min-h-[1.875rem] items-center justify-center gap-0.5 rounded-brand border bg-brand-surface px-2 py-1 text-[11px] font-medium leading-tight transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/25 disabled:pointer-events-none disabled:opacity-45";

export default function ActionButtons({
  state,
  appointmentId,
  patientName,
  disabled,
  onStateChange,
}) {
  const [pendingState, setPendingState] = useState(null);
  const normalized = normalizeState(state);

  function requestStateChange(nextState) {
    setPendingState(normalizeState(nextState));
  }

  function handleConfirm() {
    if (!pendingState) return;
    onStateChange?.(appointmentId, pendingState);
    setPendingState(null);
  }

  const dialog = (
    <AppointmentStateConfirmDialog
      open={pendingState !== null}
      targetState={pendingState}
      patientName={patientName}
      loading={disabled}
      onConfirm={handleConfirm}
      onCancel={() => setPendingState(null)}
    />
  );

  if (normalized === "PENDING") {
    return (
      <>
        {dialog}
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <button
            type="button"
            disabled={disabled}
            className={`${btnBase} border-brand-success/30 text-brand-success hover:border-brand-success/50 hover:bg-brand-success-soft`}
            onClick={() => requestStateChange("CONFIRMED")}
          >
            <span aria-hidden className="opacity-70">
              ✅
            </span>
            Confirmar
          </button>
          <button
            type="button"
            disabled={disabled}
            className={`${btnBase} border-brand-danger/30 text-brand-danger hover:border-brand-danger/50 hover:bg-brand-danger-soft`}
            onClick={() => requestStateChange("CANCELLED")}
          >
            <span aria-hidden className="opacity-70">
              ❌
            </span>
            Cancelar
          </button>
        </div>
      </>
    );
  }

  if (normalized === "CONFIRMED") {
    return (
      <>
        {dialog}
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <button
            type="button"
            disabled
            className={`${btnBase} cursor-not-allowed border-brand-border bg-brand-soft/80 text-brand-text-muted`}
            aria-label="Editar (no disponible)"
          >
            <span aria-hidden className="opacity-60">
              ✏️
            </span>
            Editar
          </button>
          <button
            type="button"
            disabled={disabled}
            className={`${btnBase} border-brand-danger/30 text-brand-danger hover:border-brand-danger/50 hover:bg-brand-danger-soft`}
            onClick={() => requestStateChange("CANCELLED")}
          >
            <span aria-hidden className="opacity-70">
              ❌
            </span>
            Cancelar
          </button>
        </div>
      </>
    );
  }

  return (
    <div className="flex justify-end">
      <button
        type="button"
        disabled
        className={`${btnBase} cursor-not-allowed border-brand-border bg-brand-soft/80 text-brand-text-muted`}
        aria-label="Ver detalle"
      >
        <span aria-hidden className="opacity-60">
          👁
        </span>
        Ver detalle
      </button>
    </div>
  );
}
