import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./apiClient", () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from "./apiClient";
import { sendAppointmentConfirmation, updateAppointmentState, fetchBusinessSchedule } from "./appointmentService";

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
