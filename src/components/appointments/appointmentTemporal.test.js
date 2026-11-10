import { describe, expect, it } from "vitest";
import {
  parseCivilDateTime,
  proposedDurationMinutes,
  visibleDaySegment,
} from "./appointmentTemporal";

describe("civil appointment datetimes", () => {
  it("keeps the clock written in the value", () => {
    expect(parseCivilDateTime("2026-10-27T23:00:00")).toEqual({
      date: "2026-10-27",
      minutes: 23 * 60,
    });
    expect(parseCivilDateTime("2026-10-28T01:00:00")).toEqual({
      date: "2026-10-28",
      minutes: 60,
    });
    expect(parseCivilDateTime("2026-10-27T23:00:00Z")).toBeNull();
    expect(parseCivilDateTime("2026-10-27T23:00:00-06:00")).toBeNull();
  });

  it("excludes an interval that ends on the next midnight", () => {
    expect(
      visibleDaySegment("2026-10-27T22:00:00", "2026-10-28T00:00:00", "2026-10-28"),
    ).toBeNull();
    expect(
      visibleDaySegment("2026-10-27T23:00:00", "2026-10-28T01:00:00", "2026-10-27")
        .startMinute,
    ).toBe(23 * 60);
  });

  it("multiplies blocks by the booking snapshot only", () => {
    expect(proposedDurationMinutes(2, 30)).toBe(60);
    expect(proposedDurationMinutes(2, 60)).toBe(120);
    expect(proposedDurationMinutes(2, null)).toBeNull();
  });
});
