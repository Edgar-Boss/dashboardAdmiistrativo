export const CANCELLED_INFO_MESSAGE =
  "Esta cita fue cancelada y no puede reactivarse.";

export const CANCELLED_CANNOT_REACTIVATE_MESSAGE =
  "Una cita cancelada no puede reactivarse. Registra una nueva cita.";

function normalizeState(state) {
  const normalized = typeof state === "string" ? state.toUpperCase() : "";
  return ["PENDING", "CONFIRMED", "CANCELLED"].includes(normalized)
    ? normalized
    : "PENDING";
}

export function isCancelledAppointment(state) {
  return normalizeState(state) === "CANCELLED";
}

/** True when trying to move a CANCELLED appointment to PENDING or CONFIRMED. */
export function isCancelledReactivation(currentState, nextState) {
  if (!isCancelledAppointment(currentState)) return false;
  const next = normalizeState(nextState);
  return next === "PENDING" || next === "CONFIRMED";
}

export function requiresStateConfirmation(nextState) {
  const normalized = normalizeState(nextState);
  return normalized === "CONFIRMED" || normalized === "CANCELLED";
}

export function getStateConfirmationCopy(nextState, patientName) {
  const normalized = normalizeState(nextState);
  const label = patientName?.trim() || "esta cita";

  if (normalized === "CONFIRMED") {
    return {
      title: "Confirmar cita",
      description: `¿Deseas marcar la cita de ${label} como confirmada?`,
      confirmLabel: "Sí, confirmar",
      variant: "success",
    };
  }

  if (normalized === "CANCELLED") {
    return {
      title: "Cancelar cita",
      description: `¿Deseas cancelar la cita de ${label}? El estado pasará a cancelada.`,
      confirmLabel: "Sí, cancelar",
      variant: "danger",
    };
  }

  return null;
}
