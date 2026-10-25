import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { formatAppointmentDuration, formatAppointmentTimeRange } from "./appointmentEditHelpers";
import AppointmentTable from "./AppointmentTable";

const booking = {
  id: 900001,
  slotCount: 2,
  appointmentDate: "2026-10-27",
  appointmentTime: "10:00",
  slotMinutesAtBooking: 60,
  durationMinutes: 120,
  startAt: "2026-10-27T10:00:00",
  endAt: "2026-10-27T12:00:00",
  temporalStatus: "OK",
  doctorName: "Ana",
  name: "Audit",
  state: "PENDING",
};

const overnight = {
  ...booking,
  id: 900010,
  appointmentTime: "23:00",
  durationMinutes: 120,
  startAt: "2026-10-27T23:00:00",
  endAt: "2026-10-28T01:00:00",
};

function renderView(viewMode, row) {
  return render(createElement(AppointmentTable, {
    appointments: [row],
    savingIds: new Set(),
    onStateChange: () => {},
    onEditAppointment: () => {},
    viewMode,
  }));
}

describe("audit: duration in list, timeline and doctor views", () => {
  it("shows the stored 120 minutes as two hours", () => {
    expect(formatAppointmentDuration(booking)).toBe("2 horas");
  });
  it("uses the stored end at 12:00 instead of the default 30 minute grid", () => {
    expect(formatAppointmentTimeRange(booking)).toBe("10:00 – 12:00");
  });
  it("does not invent a duration for UNMIGRATED_BOOKING", () => {
    expect(formatAppointmentDuration({
      ...booking,
      slotMinutesAtBooking: null,
      durationMinutes: null,
      endAt: null,
      temporalStatus: "UNMIGRATED_BOOKING",
    })).toBe("Duración no disponible");
  });
  it("keeps both civil dates when the stored interval crosses midnight", () => {
    expect(formatAppointmentDuration(overnight)).toBe("2 horas");
    expect(formatAppointmentTimeRange(overnight)).toBe("2026-10-27 23:00 – 2026-10-28 01:00");
  });
  it("does not invent a duration or end for an unknown temporal status", () => {
    const unknown = { ...booking, temporalStatus: "WHATEVER" };
    expect(formatAppointmentDuration(unknown)).toBe("Duración no disponible");
    expect(formatAppointmentTimeRange(unknown)).toBe("—");
  });
  it("does not invent a duration or end when V2 fields are null or invalid", () => {
    const incomplete = {
      ...booking,
      durationMinutes: null,
      startAt: null,
      endAt: null,
    };
    expect(formatAppointmentDuration(incomplete)).toBe("Duración no disponible");
    expect(formatAppointmentTimeRange(incomplete)).toBe("—");
    expect(formatAppointmentTimeRange({
      ...booking,
      endAt: "not-a-civil-time",
    })).toBe("—");
    expect(formatAppointmentDuration({
      ...booking,
      endAt: "not-a-civil-time",
    })).toBe("2 horas");
  });
  it("keeps V1 slot math when temporalStatus is omitted, even if durationMinutes is present", () => {
    const legacy = {
      id: 1,
      slotCount: 2,
      appointmentTime: "10:00",
      durationMinutes: 120,
      slotMinutesAtBooking: 60,
    };
    expect(formatAppointmentDuration(legacy)).toBe("1 hora");
    expect(formatAppointmentTimeRange(legacy)).toBe("10:00 – 11:00");
  });
  it("shows the stored range in the table, timeline and doctor views", () => {
    const table = renderView("all", booking);
    expect(table.container.textContent).toContain("2 horas");
    expect(table.container.textContent).toContain("10:00 – 12:00");
    table.unmount();

    const timeline = renderView("day", overnight);
    expect(timeline.container.textContent).toContain("2026-10-27 23:00 – 2026-10-28 01:00");
    expect(timeline.container.textContent).toContain("2 horas");
    timeline.unmount();

    const doctor = renderView("doctor", booking);
    expect(doctor.container.textContent).toContain("10:00 – 12:00");
    expect(doctor.container.textContent).toContain("2 horas");
  });
});
