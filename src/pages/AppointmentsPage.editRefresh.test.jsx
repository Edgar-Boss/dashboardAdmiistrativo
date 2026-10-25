import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("../services/appointmentService", async () => {
  const actual = await vi.importActual("../services/appointmentService");
  return {
    ...actual,
    fetchAppointments: vi.fn(),
    fetchAppointmentsByDate: vi.fn(),
    fetchBusinessSchedule: vi.fn(),
    updateAppointment: vi.fn(),
    updateAppointmentState: vi.fn(),
    sendAppointmentConfirmation: vi.fn(),
  };
});

vi.mock("../services/specialistService", async () => {
  const actual = await vi.importActual("../services/specialistService");
  return {
    ...actual,
    fetchSpecialists: vi.fn(),
  };
});

import {
  fetchAppointments,
  fetchAppointmentsByDate,
  fetchBusinessSchedule,
  updateAppointment,
} from "../services/appointmentService";
import { fetchSpecialists } from "../services/specialistService";
import AppointmentsPage from "./AppointmentsPage";

const DAY = "2026-10-27";
const TIME_BEFORE = /10:00\s+\u2013\s+10:30/;
const TIME_AFTER = /10:00\s+\u2013\s+11:00/;

const originalAppointment = {
  id: 555,
  name: "Cliente 555",
  state: "CONFIRMED",
  appointmentDate: DAY,
  appointmentTime: "10:00",
  doctorId: 1,
  doctorName: "Ana",
  slotCount: 1,
  slotMinutesAtBooking: 30,
  durationMinutes: 30,
  startAt: "2026-10-27T10:00:00",
  endAt: "2026-10-27T10:30:00",
  temporalStatus: "OK",
};

const updatedAppointment = {
  ...originalAppointment,
  slotCount: 2,
  slotMinutesAtBooking: 30,
  durationMinutes: 60,
  startAt: "2026-10-27T10:00:00",
  endAt: "2026-10-27T11:00:00",
};

const nextDayAppointment = {
  id: 999,
  name: "Día siguiente",
  state: "CONFIRMED",
  appointmentDate: "2026-10-28",
  appointmentTime: "12:00",
  doctorId: 1,
  doctorName: "Ana",
  slotCount: 1,
  slotMinutesAtBooking: 30,
  durationMinutes: 30,
  startAt: "2026-10-28T12:00:00",
  endAt: "2026-10-28T12:30:00",
  temporalStatus: "OK",
};

function cardHeight() {
  return Number.parseFloat(screen.getByTestId("appointment-calendar-card").style.height);
}

function calendarDateInput() {
  const input = screen
    .getAllByLabelText("Fecha")
    .find((element) => element.getAttribute("aria-label") === "Fecha");
  if (!input) throw new Error("Calendar date input was not found");
  return input;
}

async function openDay(user) {
  render(<AppointmentsPage />);
  await waitFor(() => {
    expect(screen.queryByText("Cargando citas…")).not.toBeInTheDocument();
  });
  await user.click(screen.getByRole("button", { name: "Calendario" }));
  fireEvent.change(calendarDateInput(), { target: { value: DAY } });
  const card = await screen.findByTestId("appointment-calendar-card");
  expect(card).toHaveTextContent(TIME_BEFORE);
  return card;
}

describe("AppointmentsPage edit refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchAppointments.mockResolvedValue([originalAppointment]);
    fetchSpecialists.mockResolvedValue([
      { id: 1, name: "Ana", specialty: "Uñas", activeFlag: "Y" },
    ]);
    fetchBusinessSchedule.mockResolvedValue({
      date: DAY,
      open: true,
      startTime: "09:00",
      endTime: "18:00",
      slotMinutes: 30,
    });
    updateAppointment.mockResolvedValue({
      status: "OK",
      success: true,
      message: "Cita actualizada correctamente",
    });
  });

  it("replaces the card from the daily response after PATCH without a page reload", async () => {
    const user = userEvent.setup();
    let dayLoads = 0;
    let releaseDay = () => {};
    fetchAppointmentsByDate.mockImplementation(({ date }) => {
      if (date !== DAY) return Promise.resolve({ appointments: [], summary: null });
      dayLoads += 1;
      if (dayLoads === 1) {
        return Promise.resolve({ appointments: [originalAppointment], summary: null });
      }
      return new Promise((resolve) => {
        releaseDay = () =>
          resolve({ appointments: [updatedAppointment], summary: null });
      });
    });

    await openDay(user);
    const heightBefore = cardHeight();

    await user.click(screen.getByRole("button", { name: /Cita de Cliente 555/ }));
    await user.selectOptions(screen.getByLabelText("Duración de la cita"), "2");

    const form = screen.getByRole("dialog", { name: "Editar cita" }).querySelector("form");
    fireEvent.submit(form);
    fireEvent.submit(form);

    expect(await screen.findByText("Actualizando la agenda…")).toBeInTheDocument();
    expect(screen.queryByTestId("appointment-calendar-card")).not.toBeInTheDocument();
    expect(updateAppointment).toHaveBeenCalledTimes(1);
    expect(updateAppointment).toHaveBeenCalledWith(
      555,
      expect.objectContaining({ slotCount: 2 }),
    );

    releaseDay();

    const card = await screen.findByTestId("appointment-calendar-card");
    expect(card).toHaveTextContent(TIME_AFTER);
    expect(cardHeight()).toBeGreaterThan(heightBefore);
    expect(screen.queryByText("Actualizando la agenda…")).not.toBeInTheDocument();
    expect(screen.queryByText("Cita actualizada correctamente")).not.toBeInTheDocument();
  });

  it("says the edit was saved when the daily reload fails, and retries the view", async () => {
    const user = userEvent.setup();
    let phase = "initial";
    let rejectReload;
    fetchAppointmentsByDate.mockImplementation(({ date }) => {
      if (date !== DAY) return Promise.resolve({ appointments: [], summary: null });
      if (phase === "initial") {
        return Promise.resolve({ appointments: [originalAppointment], summary: null });
      }
      if (phase === "fail") {
        return new Promise((_, reject) => {
          rejectReload = () => reject(new Error("day down"));
        });
      }
      return Promise.resolve({ appointments: [updatedAppointment], summary: null });
    });

    await openDay(user);
    const heightBefore = cardHeight();

    await user.click(screen.getByRole("button", { name: /Cita de Cliente 555/ }));
    await user.selectOptions(screen.getByLabelText("Duración de la cita"), "2");
    phase = "fail";
    fireEvent.submit(screen.getByRole("dialog", { name: "Editar cita" }).querySelector("form"));

    expect(await screen.findByText("Actualizando la agenda…")).toBeInTheDocument();
    rejectReload();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("La cita se guardó.");
    expect(alert).toHaveTextContent("No se pudo actualizar la vista.");
    expect(screen.queryByText("Cita actualizada correctamente")).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Editar cita" })).not.toBeInTheDocument();

    const card = screen.getByTestId("appointment-calendar-card");
    expect(card).toHaveTextContent(TIME_BEFORE);
    expect(card).not.toHaveTextContent(TIME_AFTER);
    expect(cardHeight()).toBe(heightBefore);

    phase = "updated";
    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    const refreshed = await screen.findByTestId("appointment-calendar-card");
    expect(refreshed).toHaveTextContent(TIME_AFTER);
    expect(cardHeight()).toBeGreaterThan(heightBefore);
    expect(screen.queryByText("No se pudo actualizar la vista.")).not.toBeInTheDocument();
  });

  it("ignores a late daily response after the selected date changes", async () => {
    const user = userEvent.setup();
    let releaseLate;
    fetchAppointmentsByDate.mockImplementation(({ date }) => {
      if (date === "2026-10-28") {
        return Promise.resolve({ appointments: [nextDayAppointment], summary: null });
      }
      if (date === DAY && releaseLate) {
        return new Promise((resolve) => {
          releaseLate = () =>
            resolve({ appointments: [updatedAppointment], summary: null });
        });
      }
      if (date === DAY) {
        return Promise.resolve({ appointments: [originalAppointment], summary: null });
      }
      return Promise.resolve({ appointments: [], summary: null });
    });

    await openDay(user);
    await user.click(screen.getByRole("button", { name: /Cita de Cliente 555/ }));
    await user.selectOptions(screen.getByLabelText("Duración de la cita"), "2");

    releaseLate = () => {};
    fireEvent.submit(screen.getByRole("dialog", { name: "Editar cita" }).querySelector("form"));
    expect(await screen.findByText("Actualizando la agenda…")).toBeInTheDocument();

    fireEvent.change(calendarDateInput(), { target: { value: "2026-10-28" } });
    expect(await screen.findByText("Día siguiente")).toBeInTheDocument();

    releaseLate();
    await waitFor(() => {
      expect(screen.getByTestId("appointment-calendar-card")).toHaveTextContent("Día siguiente");
    });
    expect(screen.getByTestId("appointment-calendar-card")).not.toHaveTextContent(TIME_AFTER);
    expect(screen.queryByText("Cliente 555")).not.toBeInTheDocument();
  });
});
