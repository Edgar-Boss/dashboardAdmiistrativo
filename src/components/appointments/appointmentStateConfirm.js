function normalizeState(state) {
  const normalized = typeof state === "string" ? state.toUpperCase() : "";
  return ["PENDING", "CONFIRMED", "CANCELLED"].includes(normalized)
    ? normalized
    : "PENDING";
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
