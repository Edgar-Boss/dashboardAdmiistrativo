import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./apiClient", () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from "./apiClient";
import {
  sendAppointmentConfirmation,
  updateAppointment,
  updateAppointmentState,
  fetchBusinessSchedule,
} from "./appointmentService";

function mockJsonResponse(body, { ok = true, status = 200, statusText } = {}) {
  return {
    ok,
    status,
    statusText: statusText ?? (ok ? "OK" : "Error"),
    headers: {
      get: (name) =>
        String(name).toLowerCase() === "content-type" ? "application/json" : null,
    },
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

describe("updateAppointmentState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("propagates backend message from HTTP 409 cancelled reactivation", async () => {
    const backendMessage =
      "Una cita cancelada no puede reactivarse. Registra una nueva cita.";

    apiFetch.mockResolvedValue(
      mockJsonResponse(
        {
          error: "CANCELLED_APPOINTMENT_CANNOT_BE_REACTIVATED",
          message: backendMessage,
        },
        { ok: false, status: 409, statusText: "Conflict" }
      )
    );

    let thrown;
    try {
      await updateAppointmentState({ id: 42, change: "PENDING" });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(Error);
    expect(thrown.message).toBe(backendMessage);
    expect(thrown.message).not.toMatch(/^Request failed/);
    expect(apiFetch).toHaveBeenCalledTimes(1);
  });
});

describe("sendAppointmentConfirmation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("POSTs confirmation-message and returns the backend payload on HTTP 200", async () => {
    const payload = {
      ok: true,
      message: "Confirmation message sent",
    };

    apiFetch.mockResolvedValue(mockJsonResponse(payload));

    const result = await sendAppointmentConfirmation(416);

    expect(apiFetch).toHaveBeenCalledTimes(1);
    const [url, options] = apiFetch.mock.calls[0];
    expect(url).toMatch(/\/api\/admin\/appointments\/416\/confirmation-message$/);
    expect(options.method).toBe("POST");
    expect(options.body).toBeUndefined();
    expect(result).toEqual(payload);
  });

  it("throws the backend message when confirmation was already sent", async () => {
    const backendMessage = "Appointment confirmation has already been sent";

    apiFetch.mockResolvedValue(
      mockJsonResponse(
        {
          error: "INVALID_REQUEST",
          message: backendMessage,
        },
        { ok: false, status: 400, statusText: "Bad Request" }
      )
    );

    let thrown;
    try {
      await sendAppointmentConfirmation(416);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(Error);
    expect(thrown.message).toBe(backendMessage);
  });

  it("throws the backend message when WhatsApp send fails", async () => {
    const backendMessage = "No fue posible enviar la confirmación por WhatsApp.";

    apiFetch.mockResolvedValue(
      mockJsonResponse(
        {
          error: "WHATSAPP_SEND_FAILED",
          message: backendMessage,
        },
        { ok: false, status: 502, statusText: "Bad Gateway" }
      )
    );

    let thrown;
    try {
      await sendAppointmentConfirmation(416);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(Error);
    expect(thrown.message).toBe(backendMessage);
  });
});

describe("fetchBusinessSchedule", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GETs /api/admin/schedule with date and no tenantId", async () => {
    apiFetch.mockResolvedValue(
      mockJsonResponse({
        date: "2026-08-13",
        open: true,
        startTime: "09:00",
        endTime: "18:00",
        slotMinutes: 30,
      })
    );

    const result = await fetchBusinessSchedule("2026-08-13");

    expect(apiFetch).toHaveBeenCalledTimes(1);
    const [url, options] = apiFetch.mock.calls[0];
    expect(url).toMatch(/\/api\/admin\/schedule\?date=2026-08-13$/);
    expect(url).not.toMatch(/tenantId=/);
    expect(options.method).toBe("GET");
    expect(result).toEqual({
      date: "2026-08-13",
      open: true,
      startTime: "09:00",
      endTime: "18:00",
      slotMinutes: 30,
      intervals: null,
    });
  });

  it("requests one technician and keeps null scalar hours with intervals", async () => {
    apiFetch.mockResolvedValue(
      mockJsonResponse({
        date: "2026-10-27",
        open: true,
        startTime: null,
        endTime: null,
        slotMinutes: 30,
        intervals: [
          {
            start: "2026-10-26T19:00:00",
            end: "2026-10-27T07:00:00",
            slotMinutes: 30,
          },
          {
            start: "2026-10-27T19:00:00",
            end: "2026-10-28T07:00:00",
            slotMinutes: 30,
          },
        ],
      })
    );

    const result = await fetchBusinessSchedule("2026-10-27", 3);

    const [url] = apiFetch.mock.calls[0];
    expect(url).toMatch(/date=2026-10-27/);
    expect(url).toMatch(/doctorId=3/);
    expect(url).not.toMatch(/tenantId=/);
    expect(result.startTime).toBeNull();
    expect(result.endTime).toBeNull();
    expect(result.intervals).toEqual([
      {
        start: "2026-10-26T19:00:00",
        end: "2026-10-27T07:00:00",
        slotMinutes: 30,
      },
      {
        start: "2026-10-27T19:00:00",
        end: "2026-10-28T07:00:00",
        slotMinutes: 30,
      },
    ]);
  });

  it("keeps a 24 hour business interval when no technician is requested", async () => {
    apiFetch.mockResolvedValue(
      mockJsonResponse({
        date: "2026-10-27",
        open: true,
        startTime: null,
        endTime: null,
        slotMinutes: 30,
        intervals: [
          {
            start: "2026-10-27T00:00:00",
            end: "2026-10-28T00:00:00",
            slotMinutes: 30,
          },
        ],
      })
    );

    const result = await fetchBusinessSchedule("2026-10-27");

    const [url] = apiFetch.mock.calls[0];
    expect(url).toMatch(/\/api\/admin\/schedule\?date=2026-10-27$/);
    expect(url).not.toMatch(/doctorId=/);
    expect(result).toEqual({
      date: "2026-10-27",
      open: true,
      startTime: null,
      endTime: null,
      slotMinutes: 30,
      intervals: [
        {
          start: "2026-10-27T00:00:00",
          end: "2026-10-28T00:00:00",
          slotMinutes: 30,
        },
      ],
    });
  });

  it("normalizes a closed day payload", async () => {
    apiFetch.mockResolvedValue(
      mockJsonResponse({
        date: "2026-08-16",
        open: false,
        startTime: null,
        endTime: null,
        slotMinutes: 30,
      })
    );

    const result = await fetchBusinessSchedule("2026-08-16");

    expect(result.open).toBe(false);
    expect(result.startTime).toBeNull();
    expect(result.endTime).toBeNull();
  });
});

describe("updateAppointment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the acknowledgement and does not invent appointment fields", async () => {
    apiFetch.mockResolvedValue(
      mockJsonResponse({
        status: "OK",
        success: true,
        message: "Cita actualizada correctamente",
      }),
    );

    const result = await updateAppointment(555, {
      name: "Cliente",
      slotCount: 2,
      reason: null,
    });

    expect(result).toEqual({
      status: "OK",
      success: true,
      message: "Cita actualizada correctamente",
    });
    expect(result).not.toHaveProperty("endAt");
    expect(result).not.toHaveProperty("durationMinutes");
    expect(result).not.toHaveProperty("slotCount");
  });

  async function rejection(promise) {
    try {
      await promise;
    } catch (error) {
      return error;
    }
    throw new Error("Expected updateAppointment to reject");
  }

  function mockTextResponse(text, { status, statusText = "" }) {
    return {
      ok: false,
      status,
      statusText,
      text: async () => text,
    };
  }

  const editPayload = { name: "Cliente", slotCount: 3, reason: null };

  it("surfaces the backend message of a 409 overlap instead of Request failed", async () => {
    apiFetch.mockResolvedValue(
      mockJsonResponse(
        {
          success: false,
          status: "APPOINTMENT_OVERLAP",
          error: "APPOINTMENT_OVERLAP",
          message: "La cita se traslapa con otra cita existente.",
        },
        { ok: false, status: 409, statusText: "" },
      ),
    );

    const error = await rejection(updateAppointment(1232, editPayload));

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe("La cita se traslapa con otra cita existente.");
    expect(error.message).not.toMatch(/Request failed/);
    expect(error.status).toBe(409);
    expect(error.code).toBe("APPOINTMENT_OVERLAP");
    expect(error.body).toMatchObject({ success: false });
  });

  it("maps a 400 OUT_OF_SCHEDULE that only carries `status`", async () => {
    apiFetch.mockResolvedValue(
      mockJsonResponse(
        {
          success: false,
          status: "OUT_OF_SCHEDULE",
          message: "La duración se sale del horario laboral",
        },
        { ok: false, status: 400, statusText: "" },
      ),
    );

    const error = await rejection(updateAppointment(1232, editPayload));

    expect(error.message).toBe("La duración se sale del horario laboral");
    expect(error.status).toBe(400);
    expect(error.code).toBe("OUT_OF_SCHEDULE");
  });

  it.each([
    ["APPOINTMENT_OVERLAP", 409, "La cita se traslapa con otra cita existente."],
    ["SLOT_ALREADY_BOOKED", 409, "La cita se traslapa con otra cita existente."],
    ["OUT_OF_SCHEDULE", 400, "La cita queda fuera del turno del especialista."],
    [
      "UNMIGRATED_BOOKING",
      409,
      "Esta cita no tiene una duración histórica registrada y no se puede cambiar su duración.",
    ],
    ["INVALID_REASON", 400, "El motivo excede la longitud permitida."],
  ])("falls back to a Spanish message for %s without a backend message", async (code, status, expected) => {
    apiFetch.mockResolvedValue(
      mockJsonResponse({ success: false, status: code }, { ok: false, status }),
    );

    const error = await rejection(updateAppointment(1, editPayload));

    expect(error.message).toBe(expected);
    expect(error.code).toBe(code);
  });

  it("does not treat an unrecognized 409 as an overlap", async () => {
    apiFetch.mockResolvedValue(
      mockJsonResponse(
        { success: false, status: "SOMETHING_ELSE", message: "ORA-00001 internal detail" },
        { ok: false, status: 409 },
      ),
    );

    const error = await rejection(updateAppointment(1, editPayload));

    expect(error.message).toBe("No se pudieron guardar los cambios. Intenta nuevamente.");
    expect(error.message).not.toMatch(/traslapa/);
    expect(error.message).not.toMatch(/ORA-/);
    expect(error.status).toBe(409);
  });

  it("hides backend details of HTTP 5xx responses", async () => {
    apiFetch.mockResolvedValue(
      mockJsonResponse(
        { success: false, status: "ERROR", message: "Database operation failed" },
        { ok: false, status: 500 },
      ),
    );

    const error = await rejection(updateAppointment(1, editPayload));

    expect(error.message).toBe("No se pudieron guardar los cambios. Intenta nuevamente.");
    expect(error.status).toBe(500);
  });

  it("uses the generic message for non-JSON error responses", async () => {
    apiFetch.mockResolvedValue(
      mockTextResponse("<html><body>Bad Gateway at /srv/app</body></html>", {
        status: 502,
      }),
    );
    const bad = await rejection(updateAppointment(1, editPayload));
    expect(bad.message).toBe("No se pudieron guardar los cambios. Intenta nuevamente.");
    expect(bad.message).not.toMatch(/html|Request failed/i);

    apiFetch.mockResolvedValue(
      mockTextResponse("<html>Not JSON</html>", { status: 409 }),
    );
    const conflict = await rejection(updateAppointment(1, editPayload));
    expect(conflict.message).toBe("No se pudieron guardar los cambios. Intenta nuevamente.");
  });

  it("reports a connection failure", async () => {
    apiFetch.mockRejectedValue(new TypeError("Failed to fetch"));

    const error = await rejection(updateAppointment(1, editPayload));

    expect(error.message).toBe("No se pudo conectar con el servidor. Intenta nuevamente.");
    expect(error.status).toBeNull();
  });

  it("does not rewrite the expired-session error", async () => {
    apiFetch.mockRejectedValue(new Error("Sesión expirada. Inicia sesión nuevamente."));

    const error = await rejection(updateAppointment(1, editPayload));

    expect(error.message).toBe("Sesión expirada. Inicia sesión nuevamente.");
  });

  it("does not fail a successful save when the acknowledgement is not JSON", async () => {
    apiFetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => "OK",
    });

    await expect(updateAppointment(1, editPayload)).resolves.toBeNull();
  });
});

describe("updateAppointmentState error mapping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not leak raw bodies of unrecognized errors", async () => {
    apiFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "",
      text: async () => '{"trace":"at com.example.Foo","message":"Database operation failed"}',
    });

    let thrown;
    try {
      await updateAppointmentState({ id: 1, change: "CONFIRMED" });
    } catch (error) {
      thrown = error;
    }

    expect(thrown.message).toBe("No se pudieron guardar los cambios. Intenta nuevamente.");
  });
});
