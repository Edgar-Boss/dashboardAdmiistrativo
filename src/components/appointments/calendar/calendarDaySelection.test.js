import { describe, expect, it } from "vitest";
import { selectCalendarDay } from "./calendarDaySelection";

const continuation = {
  id: 77,
  name: "Nocturna",
  state: "CONFIRMED",
  doctorId: 1,
  temporalStatus: "OK",
  startAt: "2026-10-27T23:00:00",
  endAt: "2026-10-28T01:00:00",
  durationMinutes: 120,
  slotMinutesAtBooking: 30,
  slotCount: 4,
};

const startsToday = {
  id: 80,
  name: "Diurna",
  state: "CONFIRMED",
  doctorId: 1,
  temporalStatus: "OK",
  startAt: "2026-10-28T10:00:00",
  endAt: "2026-10-28T11:00:00",
  durationMinutes: 60,
  slotMinutesAtBooking: 30,
  slotCount: 2,
};

describe("selectCalendarDay", () => {
  it("keeps a continuation when another appointment starts today", () => {
    const catalog = new Map([
      [
        80,
        {
          ...startsToday,
          durationMinutes: 30,
          endAt: "2026-10-28T10:30:00",
          phoneNumber: "520000000001",
        },
      ],
    ]);

    const selected = selectCalendarDay({
      dailyRows: [continuation, startsToday],
      dailyDate: "2026-10-28",
      selectedDate: "2026-10-28",
      catalogById: catalog,
    });

    expect(selected.status).toBe("ready");
    expect(selected.appointments.map((row) => row.id)).toEqual([77, 80]);
    expect(selected.appointments[1].durationMinutes).toBe(60);
    expect(selected.appointments[1].endAt).toBe("2026-10-28T11:00:00");
    expect(selected.appointments[1].phoneNumber).toBe("520000000001");
  });

  it("keeps an empty daily response empty", () => {
    const catalog = new Map([[80, startsToday]]);
    const selected = selectCalendarDay({
      dailyRows: [],
      dailyDate: "2026-10-28",
      selectedDate: "2026-10-28",
      catalogById: catalog,
    });
    expect(selected).toEqual({ status: "ready", appointments: [] });
  });

  it("does not replace a failed daily query with the catalog", () => {
    const catalog = new Map([[80, startsToday]]);
    const selected = selectCalendarDay({
      dailyRows: [startsToday],
      dailyDate: "2026-10-28",
      selectedDate: "2026-10-28",
      dailyError: new Error("down"),
      catalogById: catalog,
    });
    expect(selected).toEqual({ status: "error", appointments: [] });
  });

  it("ignores rows loaded for another date", () => {
    const selected = selectCalendarDay({
      dailyRows: [continuation],
      dailyDate: "2026-10-27",
      selectedDate: "2026-10-28",
      catalogById: new Map(),
    });
    expect(selected).toEqual({ status: "pending", appointments: [] });
  });

  it("does not treat a V1 row as V2 because the catalog has temporal fields", () => {
    const daily = {
      id: 4,
      name: "Clásica",
      state: "CONFIRMED",
      appointmentTime: "10:00",
      slotCount: 2,
    };
    const selected = selectCalendarDay({
      dailyRows: [daily],
      dailyDate: "2026-10-28",
      selectedDate: "2026-10-28",
      catalogById: new Map([
        [
          4,
          {
            ...daily,
            temporalStatus: "OK",
            startAt: "2026-10-28T10:00:00",
            endAt: "2026-10-28T11:00:00",
            durationMinutes: 60,
          },
        ],
      ]),
    });
    expect(selected.appointments[0].temporalStatus).toBeUndefined();
    expect(selected.appointments[0].endAt).toBeUndefined();
    expect(selected.appointments[0].slotCount).toBe(2);
  });
});
