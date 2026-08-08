import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./apiClient", () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from "./apiClient";
import { updateAppointmentState } from "./appointmentService";

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
