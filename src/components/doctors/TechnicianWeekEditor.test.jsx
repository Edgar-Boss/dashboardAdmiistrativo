import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TechnicianWeekEditor from "./TechnicianWeekEditor";

vi.mock("../../services/doctorWeekService", async () => {
  const actual = await vi.importActual("../../services/doctorWeekService");
  return {
    ...actual,
    fetchDoctorWeek: vi.fn(),
    saveDoctorWeek: vi.fn(),
  };
});

import { fetchDoctorWeek, saveDoctorWeek } from "../../services/doctorWeekService";

function weekError(message, status, code) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function customWeek(shifts) {
  return {
    doctorId: 7,
    mode: "CUSTOM",
    shifts,
    legacySchedule: null,
  };
}

function shift(dayOfWeek, shiftNo, startTime, endTime, endDayOffset = 0) {
  return { dayOfWeek, shiftNo, startTime, endTime, endDayOffset };
}

function legacyWeek() {
  return {
    doctorId: 7,
    mode: "LEGACY",
    shifts: [],
    legacySchedule: [1, 2, 3, 4, 5, 6, 7].map((dayOfWeek) => ({
      dayOfWeek,
      working: dayOfWeek !== 7,
      startTime: dayOfWeek !== 7 ? "10:00" : null,
      endTime: dayOfWeek !== 7 ? "14:00" : null,
    })),
  };
}

async function renderWeek(week) {
  fetchDoctorWeek.mockResolvedValue(week);
  render(<TechnicianWeekEditor doctorId={7} doctorName="Ana López" />);
  expect(
    await screen.findByRole("form", { name: "Editor de turnos semanales" }),
  ).toBeInTheDocument();
}

async function replaceField(user, name, value) {
  const field = screen.getByLabelText(name);
  await user.clear(field);
  await user.type(field, value);
  expect(field).toHaveValue(value);
}

describe("TechnicianWeekEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    saveDoctorWeek.mockResolvedValue({ doctorId: 7, mode: "CUSTOM", shifts: [] });
  });

  it("saves several shifts on the same day with stable numbers", async () => {
    const user = userEvent.setup();
    await renderWeek(
      customWeek([
        shift(2, 1, "09:00", "12:00"),
        shift(2, 2, "13:00", "18:00"),
      ]),
    );

    expect(screen.getByLabelText("Inicio martes turno 1")).toHaveValue("09:00");
    expect(screen.getByLabelText("Fin martes turno 2")).toHaveValue("18:00");

    await user.click(screen.getByRole("button", { name: "Añadir turno el martes" }));
    await replaceField(user, "Inicio martes turno 3", "18:00");
    await replaceField(user, "Fin martes turno 3", "20:00");

    await user.click(screen.getByRole("button", { name: "Guardar turnos" }));

    await waitFor(() => expect(saveDoctorWeek).toHaveBeenCalledTimes(1));
    expect(saveDoctorWeek).toHaveBeenCalledWith(7, {
      mode: "CUSTOM",
      shifts: [
        shift(2, 1, "09:00", "12:00"),
        shift(2, 2, "13:00", "18:00"),
        shift(2, 3, "18:00", "20:00"),
      ],
    });
    expect(fetchDoctorWeek).toHaveBeenCalledTimes(2);
  });

  it("edits a night shift that ends the next day", async () => {
    const user = userEvent.setup();
    await renderWeek(customWeek([]));

    await user.click(screen.getByRole("button", { name: "Añadir turno el martes" }));
    await replaceField(user, "Inicio martes turno 1", "19:00");
    await replaceField(user, "Fin martes turno 1", "07:00");
    await user.selectOptions(screen.getByLabelText("Termina martes turno 1"), "1");

    expect(screen.getByText("martes 19:00 → miércoles 07:00")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Guardar turnos" }));

    await waitFor(() => expect(saveDoctorWeek).toHaveBeenCalledTimes(1));
    const payload = saveDoctorWeek.mock.calls[0][1];
    expect(payload).toEqual({
      mode: "CUSTOM",
      shifts: [shift(2, 1, "19:00", "07:00", 1)],
    });
    expect(Object.keys(payload.shifts[0]).sort()).toEqual([
      "dayOfWeek",
      "endDayOffset",
      "endTime",
      "shiftNo",
      "startTime",
    ]);
    expect(payload.tenantId).toBeUndefined();
  });

  it("blocks an obvious sunday to monday overlap before saving", async () => {
    const user = userEvent.setup();
    await renderWeek(customWeek([]));

    await user.click(screen.getByRole("button", { name: "Añadir turno el domingo" }));
    await replaceField(user, "Inicio domingo turno 1", "23:00");
    await replaceField(user, "Fin domingo turno 1", "02:00");
    await user.selectOptions(screen.getByLabelText("Termina domingo turno 1"), "1");

    await user.click(screen.getByRole("button", { name: "Añadir turno el lunes" }));
    await replaceField(user, "Inicio lunes turno 1", "01:00");
    await replaceField(user, "Fin lunes turno 1", "03:00");

    expect(screen.getByText("domingo 23:00 → lunes 02:00")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Guardar turnos" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/solapan/i);
    expect(saveDoctorWeek).not.toHaveBeenCalled();
    expect(fetchDoctorWeek).toHaveBeenCalledTimes(1);
  });

  it("shows seven legacy rows and does not convert them until the admin chooses", async () => {
    const user = userEvent.setup();
    await renderWeek(legacyWeek());

    const legacy = screen.getByRole("list", { name: "Horario anterior" });
    expect(within(legacy).getAllByRole("listitem")).toHaveLength(7);
    expect(within(legacy).getByText("Domingo: Descanso")).toBeInTheDocument();
    expect(within(legacy).getByText("Lunes: 10:00–14:00")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Heredar horario de la clínica" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "Personalizado" })).not.toBeChecked();

    await user.click(screen.getByRole("button", { name: "Guardar turnos" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/elige heredar/i);
    expect(saveDoctorWeek).not.toHaveBeenCalled();

    await user.click(screen.getByRole("radio", { name: "Personalizado" }));
    expect(screen.getAllByDisplayValue("10:00")).toHaveLength(6);
    expect(saveDoctorWeek).not.toHaveBeenCalled();

    await user.click(screen.getByRole("radio", { name: "Heredar horario de la clínica" }));
    await user.click(screen.getByRole("button", { name: "Guardar turnos" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/revisaste los turnos/i);
    expect(saveDoctorWeek).not.toHaveBeenCalled();

    await user.click(screen.getByRole("checkbox", { name: "Revisé el modo y los turnos antes de guardar." }));
    await user.click(screen.getByRole("button", { name: "Guardar turnos" }));

    await waitFor(() => expect(saveDoctorWeek).toHaveBeenCalledTimes(1));
    expect(saveDoctorWeek).toHaveBeenCalledWith(7, { mode: "INHERIT", shifts: [] });
    expect(saveDoctorWeek.mock.calls.every((call) => call[1].mode !== "LEGACY")).toBe(true);
  });

  it("requires an explicit confirmation before saving a closed custom week", async () => {
    const user = userEvent.setup();
    await renderWeek(customWeek([]));

    await user.click(screen.getByRole("button", { name: "Guardar turnos" }));
    const dialog = await screen.findByRole("alertdialog", { name: "Semana cerrada" });
    expect(saveDoctorWeek).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(saveDoctorWeek).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Guardar turnos" }));
    await user.click(screen.getByRole("button", { name: "Guardar semana cerrada" }));

    await waitFor(() => expect(saveDoctorWeek).toHaveBeenCalledTimes(1));
    expect(saveDoctorWeek).toHaveBeenCalledWith(7, { mode: "CUSTOM", shifts: [] });
  });

  it("keeps the local edit when save is rejected with 409", async () => {
    const user = userEvent.setup();
    await renderWeek(customWeek([shift(2, 1, "09:00", "12:00")]));
    await replaceField(user, "Fin martes turno 1", "13:00");

    saveDoctorWeek.mockRejectedValue(
      weekError(
        "Existing bookings conflict with this schedule",
        409,
        "EXISTING_BOOKING_CONFLICT",
      ),
    );

    await user.click(screen.getByRole("button", { name: "Guardar turnos" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Una cita futura impide este cambio. El horario no se guardó.",
    );
    expect(screen.getByLabelText("Fin martes turno 1")).toHaveValue("13:00");
    expect(screen.queryByText("Turnos guardados.")).not.toBeInTheDocument();
    expect(saveDoctorWeek).toHaveBeenCalledTimes(1);
    expect(fetchDoctorWeek).toHaveBeenCalledTimes(1);
  });

  it("keeps the local edit when the server reports SHIFT_OVERLAP or UNMIGRATED_BOOKING", async () => {
    const user = userEvent.setup();
    await renderWeek(customWeek([shift(2, 1, "09:00", "12:00")]));
    await replaceField(user, "Fin martes turno 1", "13:00");

    saveDoctorWeek.mockRejectedValueOnce(
      weekError("Shifts overlap", 400, "SHIFT_OVERLAP"),
    );
    await user.click(screen.getByRole("button", { name: "Guardar turnos" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/los turnos se solapan/i);
    expect(screen.getByLabelText("Fin martes turno 1")).toHaveValue("13:00");
    expect(screen.queryByText("Turnos guardados.")).not.toBeInTheDocument();

    await replaceField(user, "Inicio martes turno 1", "08:00");
    saveDoctorWeek.mockRejectedValueOnce(
      weekError("An existing booking has no saved duration", 409, "UNMIGRATED_BOOKING"),
    );
    await user.click(screen.getByRole("button", { name: "Guardar turnos" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/impide guardar/i);
    expect(screen.getByLabelText("Inicio martes turno 1")).toHaveValue("08:00");
    expect(screen.getByLabelText("Fin martes turno 1")).toHaveValue("13:00");
    expect(screen.queryByText("Turnos guardados.")).not.toBeInTheDocument();
    expect(fetchDoctorWeek).toHaveBeenCalledTimes(1);
  });

  it("shows success only after save and reloads the raw week", async () => {
    const user = userEvent.setup();
    fetchDoctorWeek
      .mockResolvedValueOnce(customWeek([shift(2, 1, "09:00", "12:00")]))
      .mockResolvedValueOnce(customWeek([shift(2, 1, "09:00", "16:00")]));
    render(<TechnicianWeekEditor doctorId={7} doctorName="Ana López" />);
    expect(
      await screen.findByRole("form", { name: "Editor de turnos semanales" }),
    ).toBeInTheDocument();

    await replaceField(user, "Fin martes turno 1", "15:00");
    saveDoctorWeek.mockResolvedValue(customWeek([shift(2, 1, "09:00", "15:00")]));

    await user.click(screen.getByRole("button", { name: "Guardar turnos" }));

    expect(await screen.findByText("Turnos guardados.")).toBeInTheDocument();
    expect(screen.getByLabelText("Fin martes turno 1")).toHaveValue("16:00");
    expect(saveDoctorWeek).toHaveBeenCalledTimes(1);
    expect(fetchDoctorWeek).toHaveBeenCalledTimes(2);
    expect(saveDoctorWeek).toHaveBeenCalledWith(7, {
      mode: "CUSTOM",
      shifts: [shift(2, 1, "09:00", "15:00")],
    });
  });

  it("hides the editor when the week routes are off", async () => {
    fetchDoctorWeek.mockRejectedValue(weekError("Not found", 404, "NOT_FOUND"));

    render(<TechnicianWeekEditor doctorId={7} doctorName="Ana López" />);

    expect(
      await screen.findByText("El editor de turnos no está disponible."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Guardar turnos" })).not.toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: "Personalizado" })).not.toBeInTheDocument();
    expect(saveDoctorWeek).not.toHaveBeenCalled();
  });
});
