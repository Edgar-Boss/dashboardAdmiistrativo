import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import CalendarView from "./CalendarView";

vi.mock("../../services/appointmentService", () => ({
  fetchBusinessSchedule: vi.fn(),
}));

vi.mock("../../services/specialistService", () => ({
  fetchSpecialists: vi.fn(),
}));

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
});
