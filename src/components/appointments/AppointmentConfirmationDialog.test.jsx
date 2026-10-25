import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AppointmentConfirmationDialog from "./AppointmentConfirmationDialog";
import {
  CONFIRMATION_DIALOG_STATUS,
  CONFIRMATION_SUCCESS_AUTO_CLOSE_MS,
} from "./appointmentConfirmationAction";

function renderDialog(props = {}) {
  const onConfirm = props.onConfirm ?? vi.fn();
  const onClose = props.onClose ?? vi.fn();
  render(
    <div data-testid="dialog-host">
      <AppointmentConfirmationDialog
        status={CONFIRMATION_DIALOG_STATUS.CONFIRM}
        onConfirm={onConfirm}
        onClose={onClose}
        {...props}
      />
    </div>
  );
  return { onConfirm, onClose };
}

describe("AppointmentConfirmationDialog", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the confirm question and does not call onConfirm until Sí, enviar", async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderDialog();

    expect(screen.getByRole("dialog", { name: "Enviar confirmación" })).toBeInTheDocument();
    expect(
      screen.getByText("¿Deseas enviar la confirmación por WhatsApp a este cliente?")
    ).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Sí, enviar" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("closes from Cancelar without confirming", async () => {
    const user = userEvent.setup();
    const { onConfirm, onClose } = renderDialog();

    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("shows sending copy, aria-busy, and no dismiss controls", () => {
    renderDialog({ status: CONFIRMATION_DIALOG_STATUS.SENDING });

    const dialog = screen.getByRole("dialog", { name: "Enviando mensaje..." });
    expect(dialog).toHaveAttribute("aria-busy", "true");
    expect(
      screen.getByText("Estamos enviando la confirmación por WhatsApp.")
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sí, enviar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancelar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cerrar" })).not.toBeInTheDocument();
  });

  it("does not close sending on backdrop click or Escape", async () => {
    const user = userEvent.setup();
    const { onClose } = renderDialog({ status: CONFIRMATION_DIALOG_STATUS.SENDING });

    await user.click(screen.getByTestId("appointment-confirmation-dialog-root").firstChild);
    await user.keyboard("{Escape}");

    expect(onClose).not.toHaveBeenCalled();
  });

  it("shows success and auto-closes after the timeout", () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    renderDialog({
      status: CONFIRMATION_DIALOG_STATUS.SUCCESS,
      onClose,
    });

    expect(screen.getByText("Mensaje enviado")).toBeInTheDocument();
    expect(
      screen.getByText("La confirmación fue enviada correctamente por WhatsApp.")
    ).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(CONFIRMATION_SUCCESS_AUTO_CLOSE_MS - 1);
    });
    expect(onClose).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows a Meta send error and keeps the dialog open until Cerrar", async () => {
    const user = userEvent.setup();
    const message = "No fue posible enviar la confirmación por WhatsApp.";
    const { onClose } = renderDialog({
      status: CONFIRMATION_DIALOG_STATUS.ERROR,
      errorMessage: message,
    });

    expect(screen.getByText("No se pudo enviar")).toBeInTheDocument();
    expect(screen.getByText(message)).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows the translated already-sent copy", () => {
    renderDialog({ status: CONFIRMATION_DIALOG_STATUS.ALREADY_SENT });

    expect(screen.getByText("Confirmación ya enviada")).toBeInTheDocument();
    expect(
      screen.getByText("Esta cita ya tiene una confirmación enviada por WhatsApp.")
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Appointment confirmation has already been sent")
    ).not.toBeInTheDocument();
  });

  it("portals the dialog to document.body outside the host", () => {
    renderDialog();

    const dialog = screen.getByRole("dialog");
    const root = screen.getByTestId("appointment-confirmation-dialog-root");
    const host = screen.getByTestId("dialog-host");

    expect(document.body.contains(dialog)).toBe(true);
    expect(document.body.contains(root)).toBe(true);
    expect(host.contains(dialog)).toBe(false);
    expect(root.parentElement).toBe(document.body);
  });
});
