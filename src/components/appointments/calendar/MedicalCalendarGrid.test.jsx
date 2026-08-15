import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import MedicalCalendarGrid from "./MedicalCalendarGrid";
import {
  CALENDAR_CONFIG,
  CALENDAR_PAGED_MAX_WIDTH_PX,
  calendarConfigForRange,
  getCalendarGridWidthPx,
  getDoctorColumnWidthPx,
} from "./calendarConfig";

const specialists = [
  { id: 1, name: "Mia", specialty: "Uñas" },
  { id: 2, name: "Sofía", specialty: "Color" },
];

const appointments = [
  {
    id: 10,
    name: "Ana Pérez",
    phoneNumber: "522221234567",
    reason: "Corte",
    appointmentTime: "10:00",
    state: "CONFIRMED",
    doctorId: 1,
    doctorName: "Mia",
    slotCount: 2,
  },
];

function renderGrid(props = {}) {
  const onAppointmentClick = props.onAppointmentClick ?? vi.fn();
  const onStateChange = props.onStateChange ?? vi.fn();
  render(
    <MedicalCalendarGrid
      appointments={appointments}
      specialists={specialists}
      specialistsReady
      selectedDate="2026-08-10"
      config={calendarConfigForRange("09:00", "18:00")}
      savingIds={new Set()}
      onAppointmentClick={onAppointmentClick}
      onStateChange={onStateChange}
      {...props}
    />
  );
  return { onAppointmentClick, onStateChange };
}

describe("paged specialist column width", () => {
  it("uses containerWidth - timeColumnWidth on mobile", () => {
    expect(CALENDAR_PAGED_MAX_WIDTH_PX).toBe(767);
    expect(CALENDAR_CONFIG.timeColumnWidthPx).toBe(72);
    expect(getDoctorColumnWidthPx(303, true)).toBe(231);
    expect(getDoctorColumnWidthPx(318, true)).toBe(246);
    expect(getDoctorColumnWidthPx(358, true)).toBe(286);
  });

  it("keeps the configured desktop specialist width", () => {
    expect(getDoctorColumnWidthPx(1200, false)).toBe(
      CALENDAR_CONFIG.doctorColumnWidthPx
    );
    expect(getDoctorColumnWidthPx(303, false)).toBe(300);
  });

  it("builds the total grid width from time + specialist columns", () => {
    expect(getCalendarGridWidthPx(2, 231)).toBe(72 + 2 * 231);
    expect(getCalendarGridWidthPx(3, CALENDAR_CONFIG.doctorColumnWidthPx)).toBe(
      72 + 3 * 300
    );
  });
});

describe("MedicalCalendarGrid", () => {
  it("marks the horizontal scroller and specialist columns for mobile snap", () => {
    renderGrid();

    const scroller = screen.getByTestId("calendar-scroll");
    expect(scroller).toHaveClass("calendar-scroll");
    expect(scroller.style.getPropertyValue("--calendar-time-col")).toBe("72px");
    expect(scroller.style.getPropertyValue("--calendar-doctor-col")).toBe("300px");
    expect(scroller.style.getPropertyValue("--calendar-col-count")).toBe("2");

    expect(screen.getByTestId("calendar-doctor-col-sp-1")).toHaveClass(
      "calendar-doctor-col"
    );
    expect(screen.getByTestId("calendar-doctor-header-sp-1")).toHaveClass(
      "calendar-doctor-col"
    );

    const css = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../../../index.css"),
      "utf8"
    );
    expect(css).toContain("scroll-snap-type: x mandatory");
    expect(css).toContain("scroll-snap-align: start");
    expect(css).toContain("scroll-padding-left: var(--calendar-time-col)");
    expect(css).toContain("100cqw - var(--calendar-time-col)");
  });

  it("still renders AppointmentCalendarCard with the same appointment data", () => {
    renderGrid();

    const card = screen.getByTestId("appointment-calendar-card");
    expect(card).toBeInTheDocument();
    expect(screen.getByText("Ana Pérez")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Acciones de la cita" })).toBeInTheDocument();
  });

  it("keeps the first hour label below the sticky header", () => {
    renderGrid();

    const firstHour = screen.getByText("09:00");
    expect(firstHour).toHaveClass("mt-1");
    expect(firstHour).not.toHaveClass("-mt-2");

    const lastHour = screen.getByText("18:00");
    expect(lastHour).toHaveClass("-mt-2");
  });
});
