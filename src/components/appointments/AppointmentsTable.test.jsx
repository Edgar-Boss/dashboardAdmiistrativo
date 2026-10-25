import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AppointmentsTable from "./AppointmentsTable";

const confirmedAppointment = {
  id: 416,
  name: "Ana panel",
  state: "CONFIRMED",
  appointmentDate: "2026-07-18",
  appointmentTime: "11:00",
  slotCount: 1,
  doctorName: "Especialista",
  reason: "Manicure",
};

describe("AppointmentsTable edit action", () => {
  it("opens edit from the list menu by calling onEditAppointment", async () => {
    const user = userEvent.setup();
    const onEditAppointment = vi.fn();

    render(
      <AppointmentsTable
        appointments={[confirmedAppointment]}
        savingIds={new Set()}
        onStateChange={vi.fn()}
        onEditAppointment={onEditAppointment}
      />
    );

    await user.click(screen.getAllByRole("button", { name: "Acciones de la cita" })[0]);
    await user.click(screen.getAllByRole("menuitem", { name: "Editar cita" })[0]);

    expect(onEditAppointment).toHaveBeenCalledTimes(1);
    expect(onEditAppointment).toHaveBeenCalledWith(confirmedAppointment);
  });
});
