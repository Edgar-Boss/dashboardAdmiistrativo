import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AppointmentActionsMenu from "./AppointmentActionsMenu";

const confirmedAppointment = {
  id: 416,
  name: "Cliente Confirmada",
  state: "CONFIRMED",
};

function renderMenu({
  appointment = confirmedAppointment,
  state = appointment.state,
  ...rest
} = {}) {
  const props = {
    appointment,
    appointmentId: appointment.id,
    state,
    patientName: appointment.name,
    isOpen: true,
    onOpen: vi.fn(),
    onClose: vi.fn(),
    onStateChange: vi.fn(),
    onEdit: vi.fn(),
    ...rest,
  };

  render(<AppointmentActionsMenu {...props} />);
  return props;
}

describe("AppointmentActionsMenu", () => {
  it("does not offer Enviar confirmación from the list menu", () => {
    renderMenu({ state: "CONFIRMED" });

    expect(
      screen.queryByRole("menuitem", { name: "Enviar confirmación" })
    ).not.toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Editar cita" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Cambiar estado" })).toBeInTheDocument();
    expect(
      screen.queryByRole("menuitem", { name: "Ver detalles" })
    ).not.toBeInTheDocument();
  });

  it("calls onEdit with the appointment when Editar cita is clicked", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    renderMenu({ onEdit });

    await user.click(screen.getByRole("menuitem", { name: "Editar cita" }));

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledWith(confirmedAppointment);
  });
});

describe("AppointmentActionsMenu state confirmation dialog", () => {
  it("portals the confirm dialog to document.body and keeps confirm/cancel callbacks", async () => {
    const user = userEvent.setup();
    const onStateChange = vi.fn();
    const onClose = vi.fn();
    const pending = { id: 7, name: "Cliente Lista", state: "PENDING" };

    function StatefulMenu() {
      const [isOpen, setIsOpen] = useState(true);
      return (
        <div data-testid="list-menu-host">
          <AppointmentActionsMenu
            appointment={pending}
            appointmentId={pending.id}
            state={pending.state}
            patientName={pending.name}
            isOpen={isOpen}
            onOpen={() => setIsOpen(true)}
            onClose={() => {
              onClose();
              setIsOpen(false);
            }}
            onStateChange={onStateChange}
            onEdit={vi.fn()}
          />
        </div>
      );
    }

    render(<StatefulMenu />);

    await user.hover(screen.getByRole("menuitem", { name: "Cambiar estado" }));
    await user.click(screen.getByRole("menuitemradio", { name: /Confirmada/i }));

    const dialog = screen.getByRole("alertdialog");
    const host = screen.getByTestId("list-menu-host");
    expect(document.body.contains(dialog)).toBe(true);
    expect(host.contains(dialog)).toBe(false);
    expect(
      screen.queryByRole("menu", { name: "Acciones de la cita" })
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onStateChange).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
});
