/** Visibility/loading helpers for the "Enviar confirmación" action. */

export const CONFIRMATION_DIALOG_STATUS = {
  CLOSED: "closed",
  CONFIRM: "confirm",
  SENDING: "sending",
  SUCCESS: "success",
  ERROR: "error",
  ALREADY_SENT: "already_sent",
};

export const ALREADY_SENT_BACKEND_MESSAGE =
  "Appointment confirmation has already been sent";

export const CONFIRMATION_SUCCESS_AUTO_CLOSE_MS = 1800;

export function getClosedConfirmationDialog() {
  return {
    status: CONFIRMATION_DIALOG_STATUS.CLOSED,
    appointment: null,
    errorMessage: null,
  };
}

export function canSendAppointmentConfirmation(state) {
  return typeof state === "string" && state.toUpperCase() === "CONFIRMED";
}

export function isSendingAppointmentConfirmation(sendingConfirmationId, appointmentId) {
  return sendingConfirmationId != null && sendingConfirmationId === appointmentId;
}

export function isAlreadySentConfirmationError(error) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return message.trim() === ALREADY_SENT_BACKEND_MESSAGE;
}
