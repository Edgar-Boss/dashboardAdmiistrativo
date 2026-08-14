import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
} = {}) {
  const props = { onSendConfirmation, onClose, onSave };
  render(
    <AppointmentEditDrawer
      appointment={appointment}
      isOpen
      onClose={onClose}
      onSave={onSave}
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
      screen.getByText("Envía al cliente los datos confirmados de su cita.")
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

    await user.clear(screen.getByLabelText("Clienta"));
    await user.type(screen.getByLabelText("Clienta"), "Nombre nuevo");

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

    expect(screen.getByText("Teléfono del cliente")).toBeInTheDocument();
    expect(screen.getByText("522221234567")).toBeInTheDocument();
  });

  it("shows a dash when the appointment has no phone", () => {
    renderDrawer({
      appointment: { ...confirmedAppointment, phoneNumber: "" },
    });

    expect(screen.getByText("Teléfono del cliente")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
