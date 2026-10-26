import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { updateAppointment, updateAppointmentState } from "../../services/appointmentService";
import {
  AppointmentApiError,
  CONNECTION_ERROR_MESSAGE,
  GENERIC_SAVE_ERROR_MESSAGE,
} from "../../services/appointmentApiError";
import AppointmentEditDrawer from "./AppointmentEditDrawer";

vi.mock("../../services/appointmentService", () => ({
  updateAppointment: vi.fn(),
  updateAppointmentState: vi.fn(),
}));

const confirmedAppointment = {
  id: 416,
  name: "Cliente Confirmada",
  phoneNumber: "522221234567",
  reason: "Manicure",
  notes: "Manicure",
  appointmentDate: "2026-08-10",
  appointmentTime: "10:00",
  state: "CONFIRMED",
  doctorId: 1,
  doctorName: "Ana",
  specialty: "Uñas",
  slotCount: 2,
};

function renderDrawer({
  appointment = confirmedAppointment,
  onSendConfirmation = vi.fn(),
  sendingConfirmationId = null,
  onClose = vi.fn(),
  onSave = vi.fn(),
  onPartialSave,
} = {}) {
  const props = { onSendConfirmation, onClose, onSave, onPartialSave };
  render(
    <AppointmentEditDrawer
      appointment={appointment}
      isOpen
      onClose={onClose}
      onSave={onSave}
      onPartialSave={onPartialSave}
      onSendConfirmation={onSendConfirmation}
      sendingConfirmationId={sendingConfirmationId}
    />
  );
  return props;
}

describe("AppointmentEditDrawer WhatsApp confirmation", () => {
  it("shows the WhatsApp section for a persisted CONFIRMED appointment", () => {
    renderDrawer();

    expect(screen.getByText("Confirmación por WhatsApp")).toBeInTheDocument();
    expect(
      screen.getByText("Envía al paciente los datos confirmados de su cita.")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Enviar confirmación" })
    ).toBeEnabled();
  });

  it("does not show the WhatsApp section for a PENDING appointment", () => {
    renderDrawer({
      appointment: { ...confirmedAppointment, id: 1, state: "PENDING" },
    });

    expect(screen.queryByText("Confirmación por WhatsApp")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Enviar confirmación" })
    ).not.toBeInTheDocument();
  });

  it("does not show the WhatsApp section for a CANCELLED appointment", () => {
    renderDrawer({
      appointment: { ...confirmedAppointment, id: 2, state: "CANCELLED" },
    });

    expect(screen.queryByText("Confirmación por WhatsApp")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Enviar confirmación" })
    ).not.toBeInTheDocument();
  });

  it("does not enable send when PENDING is changed locally to CONFIRMED without saving", async () => {
    const user = userEvent.setup();
    const onSendConfirmation = vi.fn();
    renderDrawer({
      appointment: { ...confirmedAppointment, id: 3, state: "PENDING" },
      onSendConfirmation,
    });

    await user.selectOptions(screen.getByLabelText("Estado"), "CONFIRMED");

    expect(screen.queryByText("Confirmación por WhatsApp")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Enviar confirmación" })
    ).not.toBeInTheDocument();
    expect(onSendConfirmation).not.toHaveBeenCalled();
  });

  it("calls onSendConfirmation with the persisted appointment when the form is clean", async () => {
    const user = userEvent.setup();
    const onSendConfirmation = vi.fn();
    renderDrawer({ onSendConfirmation });

    await user.click(screen.getByRole("button", { name: "Enviar confirmación" }));

    expect(onSendConfirmation).toHaveBeenCalledTimes(1);
    expect(onSendConfirmation).toHaveBeenCalledWith(confirmedAppointment);
  });

  it("disables send and shows a hint when there are unsaved changes", async () => {
    const user = userEvent.setup();
    const onSendConfirmation = vi.fn();
    renderDrawer({ onSendConfirmation });

    await user.clear(screen.getByLabelText("Paciente"));
    await user.type(screen.getByLabelText("Paciente"), "Nombre nuevo");

    const action = screen.getByRole("button", { name: "Enviar confirmación" });
    expect(action).toBeDisabled();
    expect(
      screen.getByText("Guarda los cambios antes de enviar la confirmación.")
    ).toBeInTheDocument();

    fireEvent.click(action);
    expect(onSendConfirmation).not.toHaveBeenCalled();
  });

  it("shows Enviando... and disables the button while this appointment is sending", () => {
    const onSendConfirmation = vi.fn();
    renderDrawer({
      sendingConfirmationId: confirmedAppointment.id,
      onSendConfirmation,
    });

    const action = screen.getByRole("button", { name: "Enviando..." });
    expect(action).toBeDisabled();
    expect(action).toHaveAttribute("aria-busy", "true");
    expect(
      screen.queryByRole("button", { name: "Enviar confirmación" })
    ).not.toBeInTheDocument();

    fireEvent.click(action);
    expect(onSendConfirmation).not.toHaveBeenCalled();
  });

  it("keeps send enabled when another appointment is sending", async () => {
    const user = userEvent.setup();
    const onSendConfirmation = vi.fn();
    renderDrawer({
      sendingConfirmationId: 999,
      onSendConfirmation,
    });

    const action = screen.getByRole("button", { name: "Enviar confirmación" });
    expect(action).toBeEnabled();

    await user.click(action);
    expect(onSendConfirmation).toHaveBeenCalledWith(confirmedAppointment);
  });
});

describe("AppointmentEditDrawer appointment info", () => {
  it("shows the client phone number in the read-only info section", () => {
    renderDrawer();

    expect(screen.getByText("Teléfono del paciente")).toBeInTheDocument();
    expect(screen.getByText("522221234567")).toBeInTheDocument();
  });

  it("shows a dash when the appointment has no phone", () => {
    renderDrawer({
      appointment: { ...confirmedAppointment, phoneNumber: "" },
    });

    expect(screen.getByText("Teléfono del paciente")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});

describe("AppointmentEditDrawer historical duration", () => {
  it("labels two historical blocks from the booking snapshot", () => {
    renderDrawer({
      appointment: {
        ...confirmedAppointment,
        slotCount: 2,
        slotMinutesAtBooking: 30,
        durationMinutes: 60,
        startAt: "2026-10-27T23:00:00",
        endAt: "2026-10-28T01:00:00",
        temporalStatus: "OK",
      },
    });

    expect(screen.getByRole("option", { name: "1 hora" })).toBeInTheDocument();
    expect(screen.getByText("2026-10-27 23:00")).toBeInTheDocument();
    expect(screen.getByText("2026-10-28 01:00")).toBeInTheDocument();
  });

  it("labels a 60 minute snapshot without using a 30 minute default", () => {
    renderDrawer({
      appointment: {
        ...confirmedAppointment,
        slotCount: 2,
        slotMinutesAtBooking: 60,
        durationMinutes: 120,
        startAt: "2026-10-27T12:00:00",
        endAt: "2026-10-27T14:00:00",
        temporalStatus: "OK",
      },
    });

    expect(screen.getByRole("option", { name: "2 horas" })).toBeInTheDocument();
  });

  it("does not allow a duration change when the snapshot is missing", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    updateAppointment.mockResolvedValue({});
    renderDrawer({
      appointment: {
        ...confirmedAppointment,
        name: "Histórica",
        slotCount: null,
        temporalStatus: "UNMIGRATED_BOOKING",
      },
      onSave,
    });

    const duration = screen.getByLabelText("Duración de la cita");
    expect(duration).toBeDisabled();
    expect(screen.getByText("Duración no disponible")).toBeInTheDocument();
    expect(
      screen.getByText(
        "La duración histórica no está disponible, así que no se puede modificar.",
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(updateAppointment).toHaveBeenCalledWith(
      confirmedAppointment.id,
      expect.objectContaining({ name: "Histórica", slotCount: null }),
    );
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("does not announce success when the backend rejects the edit", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    updateAppointment.mockRejectedValue(
      new AppointmentApiError({
        kind: "business",
        status: 409,
        code: "UNMIGRATED_BOOKING",
        message:
          "Esta cita no tiene una duración histórica registrada y no se puede cambiar su duración.",
      }),
    );
    renderDrawer({
      appointment: {
        ...confirmedAppointment,
        temporalStatus: "UNMIGRATED_BOOKING",
        slotCount: null,
      },
      onSave,
    });

    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "no se puede cambiar su duración",
    );
    expect(onSave).not.toHaveBeenCalled();
  });
});

describe("AppointmentEditDrawer save errors", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("shows the readable backend message for a 409 overlap and keeps the editor usable", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const onClose = vi.fn();
    updateAppointment.mockRejectedValue(
      new AppointmentApiError({
        kind: "business",
        status: 409,
        code: "APPOINTMENT_OVERLAP",
        message: "La cita se traslapa con otra cita existente.",
      }),
    );
    renderDrawer({ onSave, onClose });

    await user.selectOptions(screen.getByLabelText("Duración de la cita"), "3");
    await user.clear(screen.getByLabelText("Paciente"));
    await user.type(screen.getByLabelText("Paciente"), "Nombre editado");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("La cita se traslapa con otra cita existente.");
    expect(alert).not.toHaveTextContent(/Request failed/);
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Paciente")).toHaveValue("Nombre editado");
    expect(screen.getByLabelText("Duración de la cita")).toHaveValue("3");
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeEnabled();
    expect(updateAppointmentState).not.toHaveBeenCalled();
  });

  it("shows the out-of-schedule message for a 400 OUT_OF_SCHEDULE", async () => {
    const user = userEvent.setup();
    updateAppointment.mockRejectedValue(
      new AppointmentApiError({
        kind: "business",
        status: 400,
        code: "OUT_OF_SCHEDULE",
        message: "La cita queda fuera del turno del especialista.",
      }),
    );
    renderDrawer();

    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "La cita queda fuera del turno del especialista.",
    );
  });

  it("lets the user correct and save again after a rejection", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    updateAppointment
      .mockRejectedValueOnce(
        new AppointmentApiError({
          kind: "business",
          status: 409,
          code: "APPOINTMENT_OVERLAP",
          message: "La cita se traslapa con otra cita existente.",
        }),
      )
      .mockResolvedValueOnce({ success: true });
    renderDrawer({ onSave });

    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();

    await user.selectOptions(screen.getByLabelText("Duración de la cita"), "1");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(updateAppointment).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows a connection message when the server cannot be reached", async () => {
    const user = userEvent.setup();
    updateAppointment.mockRejectedValue(new TypeError("Failed to fetch"));
    renderDrawer();

    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      CONNECTION_ERROR_MESSAGE,
    );
  });

  it("never shows raw technical errors", async () => {
    const user = userEvent.setup();
    updateAppointment.mockRejectedValue(
      new Error("ORA-00942: table or view does not exist at Foo.java:42"),
    );
    renderDrawer();

    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(GENERIC_SAVE_ERROR_MESSAGE);
    expect(alert).not.toHaveTextContent(/ORA-/);
  });

  it("does not report a failed agenda reload as a failed save", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockRejectedValue(new Error("reload down"));
    updateAppointment.mockResolvedValue({ success: true });
    renderDrawer({ onSave });

    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Los cambios se guardaron");
    expect(alert).not.toHaveTextContent(GENERIC_SAVE_ERROR_MESSAGE);
    expect(updateAppointment).toHaveBeenCalledTimes(1);
  });
});

describe("AppointmentEditDrawer partial save", () => {
  const PARTIAL = "Los datos de la cita se guardaron, pero no se pudo cambiar su estado.";
  const stateError = () =>
    new AppointmentApiError({
      kind: "business",
      status: 400,
      code: "APPOINTMENT_CANCELLED",
      message: "No se puede editar una cita cancelada.",
    });

  beforeEach(() => {
    vi.resetAllMocks();
  });

  async function submitPartial({ onPartialSave, onSave = vi.fn(), onClose = vi.fn() } = {}) {
    const user = userEvent.setup();
    updateAppointment.mockResolvedValue({ success: true });
    updateAppointmentState.mockRejectedValueOnce(stateError());
    renderDrawer({ onSave, onClose, onPartialSave });

    await user.selectOptions(screen.getByLabelText("Estado"), "PENDING");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
    return { user, onSave, onClose };
  }

  it("reports a partial result, reloads the agenda and keeps the editor open", async () => {
    const onPartialSave = vi.fn().mockResolvedValue({ ok: true });
    const { onSave, onClose } = await submitPartial({ onPartialSave });

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(PARTIAL);
    expect(alert).toHaveTextContent("No se puede editar una cita cancelada.");
    expect(alert).not.toHaveTextContent("La vista no pudo actualizarse");
    expect(onPartialSave).toHaveBeenCalledTimes(1);
    expect(onPartialSave).toHaveBeenCalledWith(confirmedAppointment.id);
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(updateAppointment).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Reintentar cambio de estado" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Reintentar lectura" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeDisabled();
  });

  it("retries only the state change and then finishes through onSave", async () => {
    const onPartialSave = vi.fn().mockResolvedValue({ ok: true });
    const { user, onSave } = await submitPartial({ onPartialSave });
    await screen.findByText(PARTIAL);
    updateAppointmentState.mockResolvedValueOnce({ success: true });

    await user.click(screen.getByRole("button", { name: "Reintentar cambio de estado" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(updateAppointment).toHaveBeenCalledTimes(1);
    expect(updateAppointmentState).toHaveBeenCalledTimes(2);
    expect(updateAppointmentState).toHaveBeenLastCalledWith({
      id: confirmedAppointment.id,
      change: "PENDING",
    });
    expect(screen.queryByText(PARTIAL)).not.toBeInTheDocument();
  });

  it("keeps the notice with the new error when the state retry fails again", async () => {
    const onPartialSave = vi.fn().mockResolvedValue({ ok: true });
    const { user, onSave } = await submitPartial({ onPartialSave });
    await screen.findByText(PARTIAL);
    updateAppointmentState.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    await user.click(screen.getByRole("button", { name: "Reintentar cambio de estado" }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(CONNECTION_ERROR_MESSAGE),
    );
    expect(screen.getByRole("alert")).toHaveTextContent(PARTIAL);
    expect(onSave).not.toHaveBeenCalled();
    expect(updateAppointment).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Reintentar cambio de estado" })).toBeEnabled();
  });

  it("offers to retry the read when the agenda reload also fails", async () => {
    const onPartialSave = vi
      .fn()
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: true });
    const { user } = await submitPartial({ onPartialSave });

    const alert = await screen.findByRole("alert");
    await waitFor(() =>
      expect(alert).toHaveTextContent("La vista no pudo actualizarse"),
    );
    expect(alert).toHaveTextContent(PARTIAL);

    await user.click(screen.getByRole("button", { name: "Reintentar lectura" }));

    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Reintentar lectura" })).not.toBeInTheDocument(),
    );
    expect(onPartialSave).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("alert")).not.toHaveTextContent("La vista no pudo actualizarse");
    expect(screen.getByText(PARTIAL)).toBeInTheDocument();
    expect(updateAppointment).toHaveBeenCalledTimes(1);
    expect(updateAppointmentState).toHaveBeenCalledTimes(1);
  });

  it("blocks double actions while the partial reload is in flight", async () => {
    let finishReload;
    const onPartialSave = vi.fn(
      () => new Promise((resolve) => { finishReload = () => resolve({ ok: true }); }),
    );
    const { user } = await submitPartial({ onPartialSave });

    const retry = await screen.findByRole("button", { name: "Reintentar cambio de estado" });
    expect(retry).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cerrar" })).toBeDisabled();
    fireEvent.submit(screen.getByRole("dialog", { name: "Editar cita" }).querySelector("form"));
    expect(updateAppointment).toHaveBeenCalledTimes(1);

    finishReload();
    await waitFor(() => expect(retry).toBeEnabled());
    expect(user).toBeDefined();
  });
});
