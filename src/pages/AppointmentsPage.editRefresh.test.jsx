import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
  updateAppointmentState,
} from "../services/appointmentService";
import { AppointmentApiError } from "../services/appointmentApiError";
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

  it("keeps the editor and the card untouched when the edit is rejected, then saves after a retry", async () => {
    const user = userEvent.setup();
    let dayLoads = 0;
    let saved = false;
    fetchAppointmentsByDate.mockImplementation(({ date }) => {
      if (date !== DAY) return Promise.resolve({ appointments: [], summary: null });
      dayLoads += 1;
      return Promise.resolve({
        appointments: [saved ? updatedAppointment : originalAppointment],
        summary: null,
      });
    });
    updateAppointment.mockRejectedValueOnce(
      new AppointmentApiError({
        kind: "business",
        status: 409,
        code: "APPOINTMENT_OVERLAP",
        message: "La cita se traslapa con otra cita existente.",
      }),
    );

    await openDay(user);
    const loadsBeforeEdit = dayLoads;
    const heightBefore = cardHeight();

    await user.click(screen.getByRole("button", { name: /Cita de Cliente 555/ }));
    await user.selectOptions(screen.getByLabelText("Duración de la cita"), "2");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("La cita se traslapa con otra cita existente.");
    expect(alert).not.toHaveTextContent(/Request failed/);
    expect(screen.getByRole("dialog", { name: "Editar cita" })).toBeInTheDocument();
    expect(screen.getByLabelText("Duración de la cita")).toHaveValue("2");
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeEnabled();
    expect(dayLoads).toBe(loadsBeforeEdit);
    expect(screen.queryByText("Actualizando la agenda…")).not.toBeInTheDocument();

    const card = screen.getByTestId("appointment-calendar-card");
    expect(card).toHaveTextContent(TIME_BEFORE);
    expect(cardHeight()).toBe(heightBefore);

    saved = true;
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Editar cita" })).not.toBeInTheDocument();
    });
    const refreshed = await screen.findByTestId("appointment-calendar-card");
    expect(refreshed).toHaveTextContent(TIME_AFTER);
    expect(updateAppointment).toHaveBeenCalledTimes(2);
    expect(dayLoads).toBeGreaterThan(loadsBeforeEdit);
  });

  describe("partial save (fields saved, state change failed)", () => {
    const PARTIAL = "Los datos de la cita se guardaron, pero no se pudo cambiar su estado.";
    const stateError = () =>
      new AppointmentApiError({
        kind: "business",
        status: 400,
        code: "APPOINTMENT_CANCELLED",
        message: "No se puede editar una cita cancelada.",
      });

    async function submitPartialEdit(user) {
      await user.click(screen.getByRole("button", { name: /Cita de Cliente 555/ }));
      await user.selectOptions(screen.getByLabelText("Duración de la cita"), "2");
      await user.selectOptions(screen.getByLabelText("Estado"), "PENDING");
      await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
      return screen.getByRole("dialog", { name: "Editar cita" });
    }

    it("reloads the agenda, keeps the editor open and retries only the state", async () => {
      const user = userEvent.setup();
      let saved = false;
      let dayLoads = 0;
      fetchAppointmentsByDate.mockImplementation(({ date }) => {
        if (date !== DAY) return Promise.resolve({ appointments: [], summary: null });
        dayLoads += 1;
        return Promise.resolve({
          appointments: [saved ? updatedAppointment : originalAppointment],
          summary: null,
        });
      });
      fetchAppointments.mockImplementation(() =>
        Promise.resolve([saved ? updatedAppointment : originalAppointment]),
      );
      updateAppointment.mockImplementation(async () => {
        saved = true;
        return { success: true };
      });
      updateAppointmentState.mockRejectedValueOnce(stateError());

      await openDay(user);
      const loadsBefore = dayLoads;
      const dialog = await submitPartialEdit(user);

      expect(await within(dialog).findByText(PARTIAL)).toBeInTheDocument();
      expect(dialog).toHaveTextContent("No se puede editar una cita cancelada.");
      expect(dayLoads).toBeGreaterThan(loadsBefore);
      expect(screen.getByRole("dialog", { name: "Editar cita" })).toBeInTheDocument();
      await waitFor(() =>
        expect(screen.getByTestId("appointment-calendar-card")).toHaveTextContent(TIME_AFTER),
      );
      // The editor now shows the persisted data and the real (unchanged) state.
      expect(within(dialog).getByLabelText("Duración de la cita")).toHaveValue("2");
      expect(within(dialog).getByLabelText("Estado")).toHaveValue("CONFIRMED");
      expect(within(dialog).getByText(PARTIAL)).toBeInTheDocument();

      updateAppointmentState.mockResolvedValueOnce({ success: true });
      await user.click(
        within(dialog).getByRole("button", { name: "Reintentar cambio de estado" }),
      );

      await waitFor(() => {
        expect(screen.queryByRole("dialog", { name: "Editar cita" })).not.toBeInTheDocument();
      });
      expect(updateAppointment).toHaveBeenCalledTimes(1);
      expect(updateAppointmentState).toHaveBeenCalledTimes(2);
      expect(updateAppointmentState).toHaveBeenLastCalledWith({ id: 555, change: "PENDING" });
    });

    it("says the view could not be updated and retries only the read", async () => {
      const user = userEvent.setup();
      let saved = false;
      let failReload = false;
      fetchAppointmentsByDate.mockImplementation(({ date }) => {
        if (date !== DAY) return Promise.resolve({ appointments: [], summary: null });
        if (failReload) return Promise.reject(new Error("day down"));
        return Promise.resolve({
          appointments: [saved ? updatedAppointment : originalAppointment],
          summary: null,
        });
      });
      updateAppointment.mockImplementation(async () => {
        saved = true;
        failReload = true;
        return { success: true };
      });
      updateAppointmentState.mockRejectedValueOnce(stateError());

      await openDay(user);
      const dialog = await submitPartialEdit(user);

      expect(await within(dialog).findByText(PARTIAL)).toBeInTheDocument();
      await waitFor(() =>
        expect(dialog).toHaveTextContent("La vista no pudo actualizarse"),
      );
      expect(screen.getByRole("dialog", { name: "Editar cita" })).toBeInTheDocument();

      failReload = false;
      await user.click(within(dialog).getByRole("button", { name: "Reintentar lectura" }));

      await waitFor(() =>
        expect(dialog).not.toHaveTextContent("La vista no pudo actualizarse"),
      );
      expect(within(dialog).getByText(PARTIAL)).toBeInTheDocument();
      await waitFor(() =>
        expect(screen.getByTestId("appointment-calendar-card")).toHaveTextContent(TIME_AFTER),
      );
      expect(updateAppointment).toHaveBeenCalledTimes(1);
      expect(updateAppointmentState).toHaveBeenCalledTimes(1);
    });
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
