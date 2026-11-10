import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("../services/appointmentService", () => ({
  fetchAppointments: vi.fn(),
  fetchAppointmentsByDate: vi.fn(),
  updateAppointmentState: vi.fn(),
  updateAppointment: vi.fn(),
  sendAppointmentConfirmation: vi.fn(),
  fetchBusinessSchedule: vi.fn(),
}));

vi.mock("../components/appointments/SummaryCards", () => ({
  default: () => null,
}));

vi.mock("../components/appointments/CreateAppointmentDrawer", () => ({
  default: () => null,
}));

vi.mock("../components/appointments/AppointmentEditDrawer", () => ({
  default: () => null,
}));

vi.mock("../components/appointments/AppointmentConfirmationDialog", () => ({
  default: () => null,
}));

vi.mock("../components/appointments/CalendarView", () => ({
  default: function MockCalendarView({ appointments }) {
    return (
      <ul aria-label="Calendario del día">
        {appointments.map((appointment) => (
          <li key={appointment.id}>
            {appointment.id}:{appointment.durationMinutes ?? "none"}
          </li>
        ))}
      </ul>
    );
  },
}));

import {
  fetchAppointments,
  fetchAppointmentsByDate,
} from "../services/appointmentService";
import AppointmentsPage from "./AppointmentsPage";

const catalogAppointment = {
  id: 80,
  name: "Diurna",
  state: "CONFIRMED",
  appointmentDate: "2026-10-28",
  appointmentTime: "10:00",
  doctorId: 1,
  doctorName: "Ana",
  slotCount: 1,
  durationMinutes: 30,
  temporalStatus: "OK",
  endAt: "2026-10-28T10:30:00",
};

async function openCalendar(user) {
  render(<AppointmentsPage />);
  await waitFor(() => {
    expect(screen.queryByText("Cargando citas…")).not.toBeInTheDocument();
  });
  await user.click(screen.getByRole("button", { name: "Calendario" }));
}

describe("AppointmentsPage calendar day source", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchAppointments.mockResolvedValue([catalogAppointment]);
  });

  it("does not fill an empty daily response from the catalog", async () => {
    const user = userEvent.setup();
    fetchAppointmentsByDate.mockResolvedValue({ appointments: [], summary: null });

    await openCalendar(user);

    expect(await screen.findByRole("list", { name: "Calendario del día" })).toBeEmptyDOMElement();
    expect(screen.queryByText(/80:/)).not.toBeInTheDocument();
  });

  it("does not show catalog rows when the daily query fails", async () => {
    const user = userEvent.setup();
    fetchAppointmentsByDate.mockRejectedValue(new Error("day down"));

    await openCalendar(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se pudieron cargar las citas de este día.",
    );
    expect(screen.getByText("day down")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Calendario del día" })).not.toBeInTheDocument();
    expect(screen.queryByText("Diurna")).not.toBeInTheDocument();

    fetchAppointmentsByDate.mockResolvedValue({
      appointments: [
        {
          ...catalogAppointment,
          durationMinutes: 60,
          endAt: "2026-10-28T11:00:00",
        },
      ],
      summary: null,
    });
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("80:60")).toBeInTheDocument();
  });
});
