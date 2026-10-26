import { CANCELLED_CANNOT_REACTIVATE_MESSAGE } from "../components/appointments/appointmentStateConfirm";

export const CONNECTION_ERROR_MESSAGE =
  "No se pudo conectar con el servidor. Intenta nuevamente.";
export const GENERIC_SAVE_ERROR_MESSAGE =
  "No se pudieron guardar los cambios. Intenta nuevamente.";

// Same text thrown by apiClient on HTTP 401. Duplicated on purpose: several
// service tests mock apiClient with only `apiFetch`.
const SESSION_EXPIRED_MESSAGE = "Sesión expirada. Inicia sesión nuevamente.";

const MAX_BACKEND_MESSAGE_LENGTH = 300;

const OVERLAP_MESSAGE = "La cita se traslapa con otra cita existente.";
const OUT_OF_SCHEDULE_MESSAGE = "La cita queda fuera del turno del especialista.";

/**
 * Business codes the panel knows how to explain.
 * - `fallback`: text used when the backend sends no usable message.
 * - `trustBackendMessage`: show the backend message when present (Spanish, readable).
 * Any other code (including a bare 409) is NOT assumed to be an overlap.
 */
const BUSINESS_ERRORS = {
  APPOINTMENT_OVERLAP: { fallback: OVERLAP_MESSAGE, trustBackendMessage: true },
  SLOT_ALREADY_BOOKED: { fallback: OVERLAP_MESSAGE, trustBackendMessage: true },
  OVERLAP: { fallback: OVERLAP_MESSAGE, trustBackendMessage: true },
  SLOT_OVERLAP: { fallback: OVERLAP_MESSAGE, trustBackendMessage: true },
  OUT_OF_SCHEDULE: { fallback: OUT_OF_SCHEDULE_MESSAGE, trustBackendMessage: true },
  DURATION_OUT_OF_SCHEDULE: {
    fallback: OUT_OF_SCHEDULE_MESSAGE,
    trustBackendMessage: true,
  },
  UNMIGRATED_BOOKING: {
    fallback:
      "Esta cita no tiene una duración histórica registrada y no se puede cambiar su duración.",
    trustBackendMessage: true,
  },
  INVALID_REASON: {
    fallback: "El motivo excede la longitud permitida.",
    trustBackendMessage: true,
  },
  INVALID_SLOT_COUNT: {
    fallback: "La duración seleccionada no es válida.",
    trustBackendMessage: true,
  },
  INVALID_NAME: {
    fallback: "El nombre del paciente es obligatorio.",
    trustBackendMessage: true,
  },
  INVALID_FIELD_LENGTH: {
    fallback: "Uno de los datos excede la longitud permitida.",
    trustBackendMessage: true,
  },
  APPOINTMENT_CANCELLED: {
    fallback: "No se puede editar una cita cancelada.",
    trustBackendMessage: true,
  },
  CANCELLED_APPOINTMENT_CANNOT_BE_REACTIVATED: {
    fallback: CANCELLED_CANNOT_REACTIVATE_MESSAGE,
    trustBackendMessage: true,
  },
  // The backend answers these in English ("Appointment not found").
  APPOINTMENT_NOT_FOUND: {
    fallback: "La cita ya no existe.",
    trustBackendMessage: false,
  },
  NOT_FOUND: { fallback: "La cita ya no existe.", trustBackendMessage: false },
};

/**
 * Error raised by appointment write calls. `message` is always safe to show
 * to the user; the raw HTTP/backend details stay in the other fields.
 */
export class AppointmentApiError extends Error {
  constructor({
    message,
    kind,
    status = null,
    code = null,
    backendMessage = null,
    body = null,
  }) {
    super(message);
    this.name = "AppointmentApiError";
    this.kind = kind; // "business" | "connection" | "server" | "unexpected"
    this.status = status;
    this.code = code;
    this.backendMessage = backendMessage;
    this.body = body;
  }
}

function readCode(body) {
  for (const key of ["error", "status", "code"]) {
    const value = body?.[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim().toUpperCase();
    }
  }
  return null;
}

function readBackendMessage(body) {
  const value = body?.message;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_BACKEND_MESSAGE_LENGTH) return null;
  return trimmed;
}

async function readJsonBody(response) {
  const text = await response.text().catch(() => "");
  if (!text) return null;
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : null;
  } catch {
    return null;
  }
}

/**
 * Builds an AppointmentApiError from a non-ok fetch response. The body is
 * never exposed raw: only a recognized business message or a safe fallback.
 */
export async function buildAppointmentApiError(response) {
  const status = Number(response?.status) || null;
  const body = await readJsonBody(response);
  const code = readCode(body);
  const backendMessage = readBackendMessage(body);
  const details = { status, code, backendMessage, body };

  if (status !== null && status >= 500) {
    return new AppointmentApiError({
      ...details,
      kind: "server",
      message: GENERIC_SAVE_ERROR_MESSAGE,
    });
  }

  const known = code ? BUSINESS_ERRORS[code] : undefined;
  if (known) {
    return new AppointmentApiError({
      ...details,
      kind: "business",
      message:
        known.trustBackendMessage && backendMessage
          ? backendMessage
          : known.fallback,
    });
  }

  return new AppointmentApiError({
    ...details,
    kind: "unexpected",
    message: GENERIC_SAVE_ERROR_MESSAGE,
  });
}

/** Wraps a network failure (fetch rejects with TypeError). */
export function buildConnectionError(cause) {
  const error = new AppointmentApiError({
    kind: "connection",
    message: CONNECTION_ERROR_MESSAGE,
  });
  error.cause = cause;
  return error;
}

/**
 * Runs apiFetch for an appointment write and normalizes network failures.
 * Other errors (e.g. expired session) are rethrown untouched.
 */
export async function fetchAppointmentWrite(fetcher) {
  try {
    return await fetcher();
  } catch (error) {
    if (error instanceof TypeError) throw buildConnectionError(error);
    throw error;
  }
}

/** Text the edit drawer may show for any error thrown while saving. */
export function getSaveErrorMessage(error) {
  if (error instanceof AppointmentApiError) return error.message;
  if (error instanceof TypeError) return CONNECTION_ERROR_MESSAGE;
  if (error instanceof Error && error.message === SESSION_EXPIRED_MESSAGE) {
    return SESSION_EXPIRED_MESSAGE;
  }
  return GENERIC_SAVE_ERROR_MESSAGE;
}
