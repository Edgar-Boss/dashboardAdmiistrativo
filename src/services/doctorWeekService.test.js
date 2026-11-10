import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./apiClient", () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from "./apiClient";
import {
  fetchDoctorWeek,
  isWeekEditorUnavailable,
  saveDoctorWeek,
} from "./doctorWeekService";

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

describe("doctor week schedule client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GETs the raw week and does not send tenantId", async () => {
    apiFetch.mockResolvedValue(
      mockJsonResponse({
        doctorId: 7,
        mode: "CUSTOM",
        shifts: [
          {
            dayOfWeek: 1,
            shiftNo: 1,
            startTime: "19:00",
            endTime: "07:00",
            endDayOffset: 1,
          },
        ],
      }),
    );

    const week = await fetchDoctorWeek(7);

    expect(apiFetch).toHaveBeenCalledTimes(1);
    const [url, options] = apiFetch.mock.calls[0];
    expect(url).toMatch(/\/api\/admin\/schedule\/doctors\/7\/week$/);
    expect(url).not.toMatch(/tenantId/);
    expect(options.method).toBe("GET");
    expect(options.body).toBeUndefined();
    expect(week).toEqual({
      doctorId: 7,
      mode: "CUSTOM",
      shifts: [
        {
          dayOfWeek: 1,
          shiftNo: 1,
          startTime: "19:00",
          endTime: "07:00",
          endDayOffset: 1,
        },
      ],
      legacySchedule: null,
    });
  });

  it("PUTs only mode and the five shift fields", async () => {
    apiFetch.mockResolvedValue(
      mockJsonResponse({
        doctorId: 7,
        mode: "INHERIT",
        shifts: [],
      }),
    );

    await saveDoctorWeek(7, {
      mode: "INHERIT",
      shifts: [],
      tenantId: 2,
      legacySchedule: [{ dayOfWeek: 1 }],
    });

    const [url, options] = apiFetch.mock.calls[0];
    expect(url).toMatch(/\/api\/admin\/schedule\/doctors\/7\/week$/);
    expect(url).not.toMatch(/tenantId/);
    expect(options.method).toBe("PUT");
    expect(JSON.parse(options.body)).toEqual({ mode: "INHERIT", shifts: [] });
    expect(options.body).not.toMatch(/tenantId/);
    expect(options.body).not.toMatch(/legacySchedule/);
  });

  it("keeps exactly five fields on each custom shift", async () => {
    apiFetch.mockResolvedValue(mockJsonResponse({ doctorId: 3, mode: "CUSTOM", shifts: [] }));

    await saveDoctorWeek(3, {
      mode: "CUSTOM",
      shifts: [
        {
          id: "local",
          dayOfWeek: 2,
          shiftNo: 1,
          startTime: "09:00",
          endTime: "12:00",
          endDayOffset: 0,
          tenantId: 9,
        },
      ],
    });

    const body = JSON.parse(apiFetch.mock.calls[0][1].body);
    expect(body).toEqual({
      mode: "CUSTOM",
      shifts: [
        {
          dayOfWeek: 2,
          shiftNo: 1,
          startTime: "09:00",
          endTime: "12:00",
          endDayOffset: 0,
        },
      ],
    });
    expect(Object.keys(body.shifts[0]).sort()).toEqual([
      "dayOfWeek",
      "endDayOffset",
      "endTime",
      "shiftNo",
      "startTime",
    ]);
  });

  it("does not send LEGACY", async () => {
    await expect(saveDoctorWeek(7, { mode: "LEGACY", shifts: [] })).rejects.toMatchObject({
      code: "INVALID_MODE",
    });
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("marks the generic 404 as an unavailable editor and keeps a missing doctor distinct", async () => {
    apiFetch.mockResolvedValue(
      mockJsonResponse(
        { error: "NOT_FOUND", message: "Not found" },
        { ok: false, status: 404, statusText: "Not Found" },
      ),
    );

    await expect(fetchDoctorWeek(7)).rejects.toMatchObject({
      status: 404,
      code: "NOT_FOUND",
      message: "Not found",
    });

    const unavailable = new Error("Not found");
    unavailable.status = 404;
    unavailable.code = "NOT_FOUND";
    const missingDoctor = new Error("Doctor not found");
    missingDoctor.status = 404;
    missingDoctor.code = "NOT_FOUND";
    expect(isWeekEditorUnavailable(unavailable)).toBe(true);
    expect(isWeekEditorUnavailable(missingDoctor)).toBe(false);
  });

  it("preserves conflict codes from 409 responses", async () => {
    apiFetch.mockResolvedValue(
      mockJsonResponse(
        {
          error: "EXISTING_BOOKING_CONFLICT",
          message: "Existing bookings conflict with this schedule",
        },
        { ok: false, status: 409, statusText: "Conflict" },
      ),
    );

    await expect(
      saveDoctorWeek(7, { mode: "CUSTOM", shifts: [] }),
    ).rejects.toMatchObject({
      status: 409,
      code: "EXISTING_BOOKING_CONFLICT",
    });
  });
});
