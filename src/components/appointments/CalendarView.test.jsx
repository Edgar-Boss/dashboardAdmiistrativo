import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CalendarView from "./CalendarView";

vi.mock("../../services/appointmentService", () => ({
  fetchBusinessSchedule: vi.fn(),
}));

vi.mock("../../services/specialistService", async () => {
  const actual = await vi.importActual("../../services/specialistService");
  return {
    ...actual,
    fetchSpecialists: vi.fn(),
  };
});

import { fetchBusinessSchedule } from "../../services/appointmentService";
import { fetchSpecialists } from "../../services/specialistService";

const specialists = [{ id: 1, name: "Ana", specialty: "Uñas" }];

const appointments = [
  {
    id: 416,
    name: "Cliente Confirmada",
    appointmentTime: "10:00",
    state: "CONFIRMED",
    doctorId: 1,
    doctorName: "Ana",
    slotCount: 1,
  },
];

describe("CalendarView business hours", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchSpecialists.mockResolvedValue(specialists);
  });

  it("renders 09:00–18:00 and not 07:00 or 20:00", async () => {
    fetchBusinessSchedule.mockResolvedValue({
      date: "2026-08-10",
      open: true,
      startTime: "09:00",
      endTime: "18:00",
      slotMinutes: 30,
    });

    render(
      <CalendarView
        appointments={appointments}
        selectedDate="2026-08-10"
        savingIds={new Set()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("09:00")).toBeInTheDocument();
    });
    expect(screen.getByText("18:00")).toBeInTheDocument();
    expect(screen.queryByText("07:00")).not.toBeInTheDocument();
    expect(screen.queryByText("20:00")).not.toBeInTheDocument();
    expect(fetchBusinessSchedule).toHaveBeenCalledWith("2026-08-10");
  });

  it("changes the visible range when selectedDate changes", async () => {
    fetchBusinessSchedule.mockImplementation(async (date) => {
      if (date === "2026-08-10") {
        return {
          date,
          open: true,
          startTime: "09:00",
          endTime: "18:00",
          slotMinutes: 30,
        };
      }
      return {
        date,
        open: true,
        startTime: "10:00",
        endTime: "14:00",
        slotMinutes: 30,
      };
    });

    const { rerender } = render(
      <CalendarView
        appointments={appointments}
        selectedDate="2026-08-10"
        savingIds={new Set()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("09:00")).toBeInTheDocument();
    });
    expect(screen.getByText("18:00")).toBeInTheDocument();

    rerender(
      <CalendarView
        appointments={appointments}
        selectedDate="2026-08-15"
        savingIds={new Set()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("14:00")).toBeInTheDocument();
    });
    expect(screen.getByText("10:00")).toBeInTheDocument();
    expect(screen.queryByText("09:00")).not.toBeInTheDocument();
    expect(screen.queryByText("18:00")).not.toBeInTheDocument();
    expect(fetchBusinessSchedule).toHaveBeenCalledWith("2026-08-15");
  });

  it("shows a closed-day state instead of the hour grid", async () => {
    fetchBusinessSchedule.mockResolvedValue({
      date: "2026-08-16",
      open: false,
      startTime: null,
      endTime: null,
      slotMinutes: 30,
    });

    render(
      <CalendarView
        appointments={appointments}
        selectedDate="2026-08-16"
        savingIds={new Set()}
      />
    );

    expect(
      await screen.findByText("El negocio no labora este día.")
    ).toBeInTheDocument();
    expect(screen.queryByText("Hora")).not.toBeInTheDocument();
    expect(screen.queryByText("09:00")).not.toBeInTheDocument();
  });

  it("shows a clear error when the schedule request fails", async () => {
    fetchBusinessSchedule.mockRejectedValue(new Error("network"));

    render(
      <CalendarView
        appointments={appointments}
        selectedDate="2026-08-13"
        savingIds={new Set()}
      />
    );

    expect(
      await screen.findByText("No se pudo cargar el horario del negocio.")
    ).toBeInTheDocument();
    expect(screen.queryByText("07:00")).not.toBeInTheDocument();
  });

  it("shows each overnight shift and leaves the gap off the working schedule", async () => {
    fetchBusinessSchedule.mockImplementation(async (date, doctorId) => {
      if (doctorId) {
        return {
          date,
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
        };
      }
      return {
        date,
        open: true,
        startTime: "09:00",
        endTime: "18:00",
        slotMinutes: 30,
        intervals: null,
      };
    });

    render(
      <CalendarView
        appointments={appointments}
        selectedDate="2026-10-27"
        savingIds={new Set()}
      />
    );

    expect(
      await screen.findByText("26 oct 19:00 – 27 oct 07:00")
    ).toBeInTheDocument();
    expect(screen.getByText("27 oct 19:00 – 28 oct 07:00")).toBeInTheDocument();
    expect(screen.getByText("Sin turno")).toBeInTheDocument();
    expect(screen.queryByText("07:00–19:00")).not.toBeInTheDocument();
    expect(fetchBusinessSchedule).toHaveBeenCalledWith("2026-10-27");
    expect(fetchBusinessSchedule).toHaveBeenCalledWith("2026-10-27", 1);
  });

  it("shows a 24 hour business day instead of a closed day", async () => {
    fetchBusinessSchedule.mockImplementation(async (date, doctorId) => {
      if (doctorId) return closedSchedule(date);
      return {
        date,
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
      };
    });

    render(
      <CalendarView
        appointments={appointments}
        selectedDate="2026-10-27"
        savingIds={new Set()}
      />
    );

    expect(
      await screen.findByText("27 oct 00:00 – 28 oct 00:00")
    ).toBeInTheDocument();
    expect(screen.getByText("06:00")).toBeInTheDocument();
    expect(screen.getByText("23:00")).toBeInTheDocument();
    expect(
      screen.queryByText("El negocio no labora este día.")
    ).not.toBeInTheDocument();
    expect(screen.getAllByText("Sin turno").length).toBeGreaterThan(0);
    expect(screen.getByText("Cliente Confirmada")).toBeInTheDocument();
  });

  it("shows the continuation from the previous day as open", async () => {
    fetchBusinessSchedule.mockImplementation(async (date, doctorId) => {
      if (doctorId) return closedSchedule(date);
      return {
        date,
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
        ],
      };
    });

    render(
      <CalendarView
        appointments={appointments}
        selectedDate="2026-10-27"
        savingIds={new Set()}
      />
    );

    expect(
      await screen.findByText("26 oct 19:00 – 27 oct 07:00")
    ).toBeInTheDocument();
    expect(screen.getByText("06:00")).toBeInTheDocument();
    expect(screen.queryByText("12:00")).not.toBeInTheDocument();
    expect(
      screen.queryByText("El negocio no labora este día.")
    ).not.toBeInTheDocument();
    expect(screen.getAllByText("Sin turno").length).toBeGreaterThan(0);
  });

  it("keeps a real closure closed when nothing continues from yesterday", async () => {
    fetchBusinessSchedule.mockImplementation(async (date) => closedSchedule(date));

    render(
      <CalendarView
        appointments={appointments}
        selectedDate="2026-10-27"
        savingIds={new Set()}
      />
    );

    expect(
      await screen.findByText("El negocio no labora este día.")
    ).toBeInTheDocument();
    expect(screen.queryByText("26 oct 19:00 – 27 oct 07:00")).not.toBeInTheDocument();
    expect(screen.queryByText("Sin turno")).not.toBeInTheDocument();
    expect(screen.queryByText("00:00")).not.toBeInTheDocument();
  });

  it("keeps every closed specialist off the business window", async () => {
    fetchSpecialists.mockResolvedValue([
      { id: 1, name: "Ana", specialty: "Uñas" },
      { id: 2, name: "Luis", specialty: "Color" },
    ]);
    fetchBusinessSchedule.mockImplementation(async (date, doctorId) => {
      if (doctorId) return closedSchedule(date);
      return {
        date,
        open: true,
        startTime: "09:00",
        endTime: "18:00",
        slotMinutes: 60,
        intervals: null,
      };
    });

    render(
      <CalendarView
        appointments={appointments}
        selectedDate="2026-10-27"
        savingIds={new Set()}
      />
    );

    const ana = await screen.findByTestId("calendar-doctor-col-sp-1");
    const luis = screen.getByTestId("calendar-doctor-col-sp-2");
    expect(ana).toHaveAttribute("data-availability", "closed");
    expect(luis).toHaveAttribute("data-availability", "closed");
    expect(within(ana).getAllByText("Sin turno").length).toBeGreaterThan(0);
    expect(within(luis).getAllByText("Sin turno").length).toBeGreaterThan(0);
    expect(within(ana).getByText("Cliente Confirmada")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /reservar/i })).not.toBeInTheDocument();
    expect(screen.queryByText("El negocio no labora este día.")).not.toBeInTheDocument();
  });

  it("shows a specialist schedule failure without inventing availability", async () => {
    const user = userEvent.setup();
    fetchSpecialists.mockResolvedValue([
      { id: 1, name: "Ana", specialty: "Uñas" },
      { id: 2, name: "Luis", specialty: "Color" },
    ]);
    fetchBusinessSchedule.mockImplementation(async (date, doctorId) => {
      if (doctorId === 2) throw new Error("schedule down");
      return {
        date,
        open: true,
        startTime: "09:00",
        endTime: "18:00",
        slotMinutes: 30,
        intervals: null,
      };
    });

    render(
      <CalendarView
        appointments={appointments}
        selectedDate="2026-10-27"
        savingIds={new Set()}
      />
    );

    const luis = await screen.findByTestId("calendar-doctor-col-sp-2");
    expect(luis).toHaveAttribute("data-availability", "error");
    expect(within(luis).getByRole("alert")).toHaveTextContent(
      "No se pudo cargar el horario.",
    );
    expect(within(luis).queryByText("09:00–18:00")).not.toBeInTheDocument();
    const ana = screen.getByTestId("calendar-doctor-col-sp-1");
    expect(ana).toHaveAttribute("data-availability", "loaded");
    expect(within(ana).queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText("Cliente Confirmada")).toBeInTheDocument();

    const calls = fetchBusinessSchedule.mock.calls.length;
    await user.click(within(luis).getByRole("button", { name: "Reintentar" }));
    await waitFor(() => {
      expect(fetchBusinessSchedule.mock.calls.length).toBeGreaterThan(calls);
    });
  });

  it("lists an unmigrated booking without a timed bar", async () => {
    fetchBusinessSchedule.mockImplementation(async (date, doctorId) => {
      if (doctorId) return closedSchedule(date);
      return {
        date,
        open: true,
        startTime: "09:00",
        endTime: "18:00",
        slotMinutes: 30,
        intervals: null,
      };
    });

    render(
      <CalendarView
        appointments={[
          {
            id: 90,
            name: "Histórica",
            appointmentDate: "2026-10-27",
            appointmentTime: "10:00",
            state: "CONFIRMED",
            doctorId: 1,
            doctorName: "Ana",
            slotCount: null,
            temporalStatus: "UNMIGRATED_BOOKING",
          },
        ]}
        selectedDate="2026-10-27"
        savingIds={new Set()}
      />
    );

    const row = await screen.findByTestId("appointment-without-duration");
    expect(row).toHaveAttribute("data-appointment-id", "90");
    expect(row).toHaveTextContent("Duración no disponible");
    expect(row).toHaveTextContent("Histórica");
    expect(screen.queryByTestId("appointment-calendar-card")).not.toBeInTheDocument();
  });

  it("does not request a schedule for an explicitly inactive specialist", async () => {
    fetchSpecialists.mockResolvedValue([
      { id: 1, name: "Ana", specialty: "Uñas", activeFlag: "Y" },
      { id: 2, name: "Luis", specialty: "Color", activeFlag: "N" },
    ]);
    fetchBusinessSchedule.mockImplementation(async (date, doctorId) => {
      if (doctorId === 1) {
        return {
          date,
          open: true,
          startTime: null,
          endTime: null,
          slotMinutes: 30,
          intervals: [
            { start: `${date}T09:00:00`, end: `${date}T18:00:00`, slotMinutes: 30 },
          ],
        };
      }
      return openDay(date);
    });

    render(
      <CalendarView
        appointments={appointments}
        selectedDate="2026-10-27"
        savingIds={new Set()}
      />
    );

    const luis = await screen.findByTestId("calendar-doctor-col-sp-2");
    const luisHeader = screen.getByTestId("calendar-doctor-header-sp-2");
    expect(luis).toHaveAttribute("data-availability", "inactive");
    expect(within(luisHeader).getByText("Especialista inactivo")).toBeInTheDocument();
    expect(within(luis).queryByRole("button", { name: "Reintentar" })).not.toBeInTheDocument();
    expect(within(luisHeader).queryByRole("button", { name: "Reintentar" })).not.toBeInTheDocument();
    expect(within(luisHeader).queryByTestId("calendar-shifts")).not.toBeInTheDocument();
    expect(fetchBusinessSchedule).toHaveBeenCalledWith("2026-10-27");
    expect(fetchBusinessSchedule).toHaveBeenCalledWith("2026-10-27", 1);
    expect(fetchBusinessSchedule).not.toHaveBeenCalledWith("2026-10-27", 2);

    const ana = screen.getByTestId("calendar-doctor-col-sp-1");
    const anaHeader = screen.getByTestId("calendar-doctor-header-sp-1");
    expect(ana).toHaveAttribute("data-availability", "loaded");
    expect(within(anaHeader).queryByText("Especialista inactivo")).not.toBeInTheDocument();
    expect(within(anaHeader).getByText("09:00–18:00")).toBeInTheDocument();
  });

  it("keeps an inactive specialist's appointments open and does not offer a new booking", async () => {
    const user = userEvent.setup();
    const onAppointmentClick = vi.fn();
    fetchSpecialists.mockResolvedValue([
      { id: 1, name: "Ana", specialty: "Uñas", activeFlag: "Y" },
      { id: 8, name: "Inés", specialty: "Color", activeFlag: "N" },
    ]);
    fetchBusinessSchedule.mockImplementation(async (date) => openDay(date));

    render(
      <CalendarView
        appointments={[
          {
            id: 90,
            name: "Histórica",
            appointmentDate: "2026-10-27",
            appointmentTime: "10:00",
            state: "CONFIRMED",
            doctorId: 8,
            doctorName: "Inés",
            slotCount: null,
            temporalStatus: "UNMIGRATED_BOOKING",
          },
          {
            id: 77,
            name: "Nocturna",
            appointmentTime: "23:00",
            state: "CONFIRMED",
            doctorId: 8,
            doctorName: "Inés",
            slotCount: 4,
            slotMinutesAtBooking: 30,
            durationMinutes: 120,
            startAt: "2026-10-27T23:00:00",
            endAt: "2026-10-28T01:00:00",
            temporalStatus: "OK",
          },
        ]}
        selectedDate="2026-10-27"
        savingIds={new Set()}
        onAppointmentClick={onAppointmentClick}
      />
    );

    const ines = await screen.findByTestId("calendar-doctor-col-sp-8");
    const inesHeader = screen.getByTestId("calendar-doctor-header-sp-8");
    expect(within(inesHeader).getByText("Especialista inactivo")).toBeInTheDocument();
    expect(within(ines).queryByRole("button", { name: "Reintentar" })).not.toBeInTheDocument();
    expect(within(inesHeader).queryByRole("button", { name: "Reintentar" })).not.toBeInTheDocument();
    expect(within(ines).queryByRole("button", { name: /reservar|nueva cita/i })).not.toBeInTheDocument();
    expect(fetchBusinessSchedule).not.toHaveBeenCalledWith("2026-10-27", 8);

    const historical = within(ines).getByRole("button", { name: /Histórica/ });
    expect(historical).toHaveTextContent("Duración no disponible");
    await user.click(historical);
    expect(onAppointmentClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: 90, doctorId: 8 }),
    );

    const overnight = within(ines).getByRole("button", { name: /Nocturna/ });
    expect(overnight).toHaveTextContent("Termina el día siguiente");
    await user.click(overnight);
    expect(onAppointmentClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: 77, doctorId: 8 }),
    );
    expect(screen.getByText("Histórica")).toBeInTheDocument();
    expect(screen.getByText("Nocturna")).toBeInTheDocument();
  });

  it("shows a 404 for an active specialist as a schedule error", async () => {
    fetchSpecialists.mockResolvedValue([
      { id: 1, name: "Ana", specialty: "Uñas", activeFlag: "Y" },
      { id: 8, name: "Rita", specialty: "Color", activeFlag: "Y" },
    ]);
    fetchBusinessSchedule.mockImplementation(async (date, doctorId) => {
      if (doctorId === 8) throw new Error("Doctor not found");
      return openDay(date);
    });

    render(
      <CalendarView
        appointments={appointments}
        selectedDate="2026-10-27"
        savingIds={new Set()}
      />
    );

    const rita = await screen.findByTestId("calendar-doctor-col-sp-8");
    expect(rita).toHaveAttribute("data-availability", "error");
    expect(within(rita).getByRole("alert")).toHaveTextContent(
      "No se pudo cargar el horario.",
    );
    expect(within(rita).getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
    expect(within(rita).queryByText("Especialista inactivo")).not.toBeInTheDocument();
    expect(within(rita).queryByText("Sin turno")).not.toBeInTheDocument();
    expect(within(rita).queryByText("09:00–18:00")).not.toBeInTheDocument();
    expect(fetchBusinessSchedule).toHaveBeenCalledWith("2026-10-27", 8);
    expect(screen.getByText("Cliente Confirmada")).toBeInTheDocument();
  });
});

function openDay(date) {
  return {
    date,
    open: true,
    startTime: "09:00",
    endTime: "18:00",
    slotMinutes: 30,
    intervals: null,
  };
}

function closedSchedule(date) {
  return {
    date,
    open: false,
    startTime: null,
    endTime: null,
    slotMinutes: 30,
    intervals: null,
  };
}
