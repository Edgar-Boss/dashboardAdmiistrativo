import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("../services/appointmentService", () => ({
  fetchAppointments: vi.fn(),
  fetchAppointmentsByDate: vi.fn(),
  updateAppointmentState: vi.fn(),
}));

vi.mock("../components/appointments/AppointmentTable", () => ({
  default: function MockAppointmentTable({ appointments, onStateChange }) {
    return (
      <ul aria-label="Tabla de citas (mock)">
        {appointments.map((appointment) => (
          <li key={appointment.id}>
            <span data-testid={`appointment-state-${appointment.id}`}>
              {appointment.state}
            </span>
            <button
              type="button"
              onClick={() => onStateChange(appointment.id, "PENDING")}
            >
              Intentar reactivar {appointment.id}
            </button>
          </li>
        ))}
      </ul>
    );
  },
}));

vi.mock("../components/appointments/SummaryCards", () => ({
  default: () => null,
}));

vi.mock("../components/appointments/AppointmentEditDrawer", () => ({
  default: () => null,
}));

vi.mock("../components/appointments/CreateAppointmentDrawer", () => ({
  default: () => null,
}));

vi.mock("../components/appointments/CalendarView", () => ({
  default: () => null,
}));

import {
  fetchAppointments,
  updateAppointmentState,
} from "../services/appointmentService";
import AppointmentsPage from "./AppointmentsPage";
import { CANCELLED_CANNOT_REACTIVATE_MESSAGE } from "../components/appointments/appointmentStateConfirm";

const cancelledAppointment = {
  id: 101,
  phoneNumber: "522221234567",
  name: "Cliente Cancelada",
  reason: null,
  createdAt: "2026-08-01T10:00:00",
  appointmentDate: "2026-08-10",
  appointmentTime: "10:00",
  state: "CANCELLED",
  doctorId: 1,
  doctorName: "Ana",
  specialty: "Uñas",
  slotCount: 1,
};

describe("AppointmentsPage cancelled reactivation guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchAppointments.mockResolvedValue([cancelledAppointment]);
    updateAppointmentState.mockResolvedValue({ ok: true });
  });

  it("blocks CANCELLED → PENDING without calling updateAppointmentState", async () => {
    const user = userEvent.setup();
    render(<AppointmentsPage />);

    await waitFor(() => {
      expect(screen.queryByText("Cargando citas…")).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole("tab", { name: "Canceladas" }));

    const rowState = screen.getByTestId("appointment-state-101");
    expect(rowState).toHaveTextContent("CANCELLED");

    await user.click(
      screen.getByRole("button", { name: "Intentar reactivar 101" })
    );

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("No se pudo actualizar");
    expect(
      within(alert).getByText(CANCELLED_CANNOT_REACTIVATE_MESSAGE)
    ).toBeInTheDocument();
    expect(alert).toHaveTextContent(
      "Una cita cancelada no puede reactivarse. Registra una nueva cita."
    );

    expect(updateAppointmentState).not.toHaveBeenCalled();
    expect(screen.getByTestId("appointment-state-101")).toHaveTextContent(
      "CANCELLED"
    );
  });
});
