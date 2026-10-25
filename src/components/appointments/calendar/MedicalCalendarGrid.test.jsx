import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MedicalCalendarGrid from "./MedicalCalendarGrid";
import {
  CALENDAR_CONFIG,
  CALENDAR_PAGED_MAX_WIDTH_PX,
  buildCalendarConfigFromDoctorSchedules,
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

  it("does not mark a V1 business window as off shift", () => {
    renderGrid();

    expect(screen.queryByTestId("calendar-off-shift")).not.toBeInTheDocument();
    expect(screen.queryByText("Sin turno")).not.toBeInTheDocument();
  });
});

const OCTOBER_24 = "2026-10-24";

function october24Config() {
  return buildCalendarConfigFromDoctorSchedules(
    [
      {
        doctorId: 1,
        intervals: [
          {
            start: "2026-10-24T07:00:00",
            end: "2026-10-24T19:00:00",
            slotMinutes: 30,
          },
        ],
      },
      {
        doctorId: 2,
        intervals: [
          {
            start: "2026-10-23T19:00:00",
            end: "2026-10-24T07:00:00",
            slotMinutes: 30,
          },
          {
            start: "2026-10-24T19:00:00",
            end: "2026-10-25T07:00:00",
            slotMinutes: 30,
          },
        ],
      },
    ],
    OCTOBER_24,
  );
}

function minuteRange(start, end, step) {
  const minutes = [];
  for (let minute = start; minute < end; minute += step) minutes.push(minute);
  return minutes;
}

function labelStarts(column) {
  return within(column)
    .getAllByTestId("calendar-off-shift-label")
    .map((node) => Number(node.getAttribute("data-start-minutes")));
}

describe("off-shift labels on 24 October", () => {
  const specialistsOnDay = [
    { id: 1, name: "Luis", specialty: "Medicina" },
    { id: 2, name: "Rolando", specialty: "Medicina" },
  ];

  it("repeats Sin turno on each full block and switches exactly at 19:00", async () => {
    const user = userEvent.setup();
    const { onAppointmentClick } = renderGrid({
      specialists: specialistsOnDay,
      selectedDate: OCTOBER_24,
      config: october24Config(),
      columnStates: [
        { doctorId: 1, status: "loaded" },
        { doctorId: 2, status: "loaded" },
      ],
      appointments: [
        {
          id: 501,
          name: "Noche Luis",
          appointmentTime: "20:00",
          state: "CONFIRMED",
          doctorId: 1,
          doctorName: "Luis",
          slotCount: 1,
        },
        {
          id: 502,
          name: "Mediodía Rolando",
          appointmentTime: "12:00",
          state: "CONFIRMED",
          doctorId: 2,
          doctorName: "Rolando",
          slotCount: 1,
        },
      ],
    });

    const luis = screen.getByTestId("calendar-doctor-col-sp-1");
    const rolando = screen.getByTestId("calendar-doctor-col-sp-2");
    const luisStarts = labelStarts(luis);
    const rolandoStarts = labelStarts(rolando);

    expect(luisStarts).toEqual([
      ...minuteRange(0, 7 * 60, 30),
      ...minuteRange(19 * 60, 24 * 60, 30),
    ]);
    expect(luisStarts).not.toContain(18 * 60);
    expect(luisStarts).not.toContain(18 * 60 + 30);
    expect(luisStarts).toContain(19 * 60);
    expect(rolandoStarts).toEqual(minuteRange(7 * 60, 19 * 60, 30));
    expect(rolandoStarts).not.toContain(19 * 60);
    expect(within(luis).getAllByText("Sin turno")).toHaveLength(luisStarts.length);
    expect(within(rolando).getAllByText("Sin turno")).toHaveLength(rolandoStarts.length);

    for (const column of [luis, rolando]) {
      const bands = within(column).getAllByTestId("calendar-off-shift");
      expect(bands.length).toBeGreaterThan(0);
      for (const band of bands) {
        expect(band).toHaveClass("bg-brand-background/85");
      }
    }
    expect(within(luis).getAllByTestId("calendar-off-shift")).toHaveLength(2);
    expect(within(rolando).getAllByTestId("calendar-off-shift")).toHaveLength(1);

    const luisVisit = within(luis).getByRole("button", { name: /Noche Luis/ });
    const rolandoVisit = within(rolando).getByRole("button", { name: /Mediodía Rolando/ });
    expect(luisVisit).toBeInTheDocument();
    expect(rolandoVisit).toBeInTheDocument();
    await user.click(luisVisit);
    await user.click(rolandoVisit);
    expect(onAppointmentClick).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ id: 501, doctorId: 1 }),
    );
    expect(onAppointmentClick).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ id: 502, doctorId: 2 }),
    );
  });

  it("labels every cell when the specialist is closed all day", () => {
    renderGrid({
      appointments: [],
      specialists: [{ id: 1, name: "Luis", specialty: "Medicina" }],
      selectedDate: OCTOBER_24,
      config: calendarConfigForRange("07:00", "19:00", { slotMinutes: 30 }),
      columnStates: [{ doctorId: 1, status: "closed" }],
    });

    const column = screen.getByTestId("calendar-doctor-col-sp-1");
    expect(labelStarts(column)).toEqual(minuteRange(7 * 60, 19 * 60, 30));
    expect(within(column).getByTestId("calendar-off-shift")).toHaveClass(
      "bg-brand-background/85",
    );
    expect(screen.getByTestId("column-status")).toHaveTextContent("Sin turno");
  });

  it("keeps a schedule error and an inactive specialist out of Sin turno", () => {
    renderGrid({
      appointments: [],
      specialists: specialistsOnDay,
      selectedDate: OCTOBER_24,
      config: october24Config(),
      columnStates: [
        { doctorId: 1, status: "error", message: "schedule down" },
        { doctorId: 2, status: "inactive" },
      ],
    });

    const luis = screen.getByTestId("calendar-doctor-col-sp-1");
    const rolando = screen.getByTestId("calendar-doctor-col-sp-2");
    expect(luis).toHaveAttribute("data-availability", "error");
    expect(within(luis).getByRole("alert")).toHaveTextContent(
      "No se pudo cargar el horario.",
    );
    expect(within(luis).queryByText("Sin turno")).not.toBeInTheDocument();
    expect(within(luis).queryByTestId("calendar-off-shift")).not.toBeInTheDocument();
    expect(rolando).toHaveAttribute("data-availability", "inactive");
    expect(
      within(screen.getByTestId("calendar-doctor-header-sp-2")).getByText(
        "Especialista inactivo",
      ),
    ).toBeInTheDocument();
    expect(within(rolando).queryByText("Sin turno")).not.toBeInTheDocument();
    expect(within(rolando).queryByTestId("calendar-off-shift")).not.toBeInTheDocument();
  });
});
