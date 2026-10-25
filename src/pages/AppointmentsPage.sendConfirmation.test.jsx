import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("../services/appointmentService", () => ({
  fetchAppointments: vi.fn(),
  fetchAppointmentsByDate: vi.fn(),
  updateAppointmentState: vi.fn(),
  updateAppointment: vi.fn(),
  sendAppointmentConfirmation: vi.fn(),
  fetchBusinessSchedule: vi.fn(),
}));

vi.mock("../components/appointments/AppointmentTable", () => ({
  default: function MockAppointmentTable({ appointments, onSendConfirmation }) {
    return (
      <ul aria-label="Tabla de citas (mock)" data-testid="list-view-host">
        {appointments.map((appointment) => (
          <li key={appointment.id}>
            <button
              type="button"
              onClick={() => onSendConfirmation?.(appointment)}
            >
              Enviar confirmación {appointment.id}
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

vi.mock("../components/appointments/CreateAppointmentDrawer", () => ({
  default: () => null,
}));

vi.mock("../components/appointments/CalendarView", () => ({
  default: function MockCalendarView({ appointments, onAppointmentClick }) {
    const appointment = appointments?.[0];
    return (
      <div data-testid="calendar-view-host">
        <button
          type="button"
          onClick={() => appointment && onAppointmentClick?.(appointment)}
        >
          Abrir cita calendario
        </button>
      </div>
    );
  },
}));

import {
  fetchAppointments,
  fetchAppointmentsByDate,
  sendAppointmentConfirmation,
} from "../services/appointmentService";
import AppointmentsPage from "./AppointmentsPage";

function todayIsoDate() {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

const confirmedAppointment = {
  id: 416,
  phoneNumber: "522221234567",
  name: "Cliente Confirmada",
  reason: "Manicure",
  notes: "Manicure",
  createdAt: "2026-08-01T10:00:00",
  appointmentDate: todayIsoDate(),
  appointmentTime: "10:00",
  state: "CONFIRMED",
  doctorId: 1,
  doctorName: "Ana",
  specialty: "Uñas",
  slotCount: 1,
};

async function renderLoadedPage() {
  render(<AppointmentsPage />);
  await waitFor(() => {
    expect(screen.queryByText("Cargando citas…")).not.toBeInTheDocument();
  });
}

async function openListConfirmation(user) {
  await user.click(
    screen.getByRole("button", { name: "Enviar confirmación 416" })
  );
}

describe("AppointmentsPage WhatsApp confirmation dialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchAppointments.mockResolvedValue([confirmedAppointment]);
    fetchAppointmentsByDate.mockResolvedValue({
      appointments: [confirmedAppointment],
      summary: null,
    });
    sendAppointmentConfirmation.mockResolvedValue({
      ok: true,
      message: "Confirmation message sent",
    });
  });

  it("opens the confirm modal from the list without calling the service", async () => {
    const user = userEvent.setup();
    await renderLoadedPage();

    await openListConfirmation(user);

    expect(
      screen.getByRole("dialog", { name: "Enviar confirmación" })
    ).toBeInTheDocument();
    expect(
      screen.getByText("¿Deseas enviar la confirmación por WhatsApp a este cliente?")
    ).toBeInTheDocument();
    expect(sendAppointmentConfirmation).not.toHaveBeenCalled();
  });

  it("closes the modal on Cancelar without calling the service", async () => {
    const user = userEvent.setup();
    await renderLoadedPage();

    await openListConfirmation(user);
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(sendAppointmentConfirmation).not.toHaveBeenCalled();
  });

  it("calls the service once and shows sending after Sí, enviar", async () => {
    const user = userEvent.setup();
    let resolveSend;
    sendAppointmentConfirmation.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSend = resolve;
        })
    );

    await renderLoadedPage();
    await openListConfirmation(user);
    await user.click(screen.getByRole("button", { name: "Sí, enviar" }));

    expect(sendAppointmentConfirmation).toHaveBeenCalledTimes(1);
    expect(sendAppointmentConfirmation).toHaveBeenCalledWith(416);
    expect(
      screen.getByRole("dialog", { name: "Enviando mensaje..." })
    ).toBeInTheDocument();

    resolveSend({ ok: true, message: "Confirmation message sent" });
    expect(
      await screen.findByText("Mensaje enviado")
    ).toBeInTheDocument();
  });

  it("does not send confirmation twice while the first request is pending", async () => {
    const user = userEvent.setup();
    let resolveSend;
    sendAppointmentConfirmation.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSend = resolve;
        })
    );

    await renderLoadedPage();
    await openListConfirmation(user);

    const confirm = screen.getByRole("button", { name: "Sí, enviar" });
    await user.click(confirm);
    await user.click(confirm);
    await openListConfirmation(user);

    expect(sendAppointmentConfirmation).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole("button", { name: "Sí, enviar" })
    ).not.toBeInTheDocument();

    resolveSend({ ok: true, message: "Confirmation message sent" });
    expect(await screen.findByText("Mensaje enviado")).toBeInTheDocument();
  });

  it("shows success in the modal and does not use the global banner", async () => {
    const user = userEvent.setup();
    await renderLoadedPage();

    await openListConfirmation(user);
    await user.click(screen.getByRole("button", { name: "Sí, enviar" }));

    expect(await screen.findByText("Mensaje enviado")).toBeInTheDocument();
    expect(
      screen.getByText("La confirmación fue enviada correctamente por WhatsApp.")
    ).toBeInTheDocument();
    expect(
      screen.queryByText("La confirmación fue enviada por WhatsApp.")
    ).not.toBeInTheDocument();
  });

  it("shows a Meta send error in the modal and keeps it open until Cerrar", async () => {
    const user = userEvent.setup();
    const backendMessage = "No fue posible enviar la confirmación por WhatsApp.";
    sendAppointmentConfirmation.mockRejectedValue(new Error(backendMessage));

    await renderLoadedPage();
    await openListConfirmation(user);
    await user.click(screen.getByRole("button", { name: "Sí, enviar" }));

    expect(await screen.findByText("No se pudo enviar")).toBeInTheDocument();
    expect(screen.getByText(backendMessage)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(sendAppointmentConfirmation).toHaveBeenCalledTimes(1);
  });

  it("shows the translated already-sent state instead of the English backend message", async () => {
    const user = userEvent.setup();
    sendAppointmentConfirmation.mockRejectedValue(
      new Error("Appointment confirmation has already been sent")
    );

    await renderLoadedPage();
    await openListConfirmation(user);
    await user.click(screen.getByRole("button", { name: "Sí, enviar" }));

    expect(await screen.findByText("Confirmación ya enviada")).toBeInTheDocument();
    expect(
      screen.getByText("Esta cita ya tiene una confirmación enviada por WhatsApp.")
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Appointment confirmation has already been sent")
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("portals the dialog to document.body outside the list host", async () => {
    const user = userEvent.setup();
    await renderLoadedPage();
    await openListConfirmation(user);

    const dialog = screen.getByRole("dialog");
    const root = screen.getByTestId("appointment-confirmation-dialog-root");
    const host = screen.getByTestId("list-view-host");

    expect(document.body.contains(dialog)).toBe(true);
    expect(host.contains(dialog)).toBe(false);
    expect(root.parentElement).toBe(document.body);
  });

  it("opens the same modal from the calendar edit panel", async () => {
    const user = userEvent.setup();
    await renderLoadedPage();

    await user.click(screen.getByRole("button", { name: "Calendario" }));
    await waitFor(() => {
      expect(screen.getByTestId("calendar-view-host")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Abrir cita calendario" }));
    expect(screen.getByRole("dialog", { name: "Editar cita" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Enviar confirmación" }));

    const confirmDialog = screen.getByRole("dialog", { name: "Enviar confirmación" });
    expect(confirmDialog).toBeInTheDocument();
    expect(
      within(confirmDialog).getByText(
        "¿Deseas enviar la confirmación por WhatsApp a este cliente?"
      )
    ).toBeInTheDocument();
    expect(sendAppointmentConfirmation).not.toHaveBeenCalled();

    const calendarHost = screen.getByTestId("calendar-view-host");
    expect(calendarHost.contains(confirmDialog)).toBe(false);
    expect(document.body.contains(confirmDialog)).toBe(true);
  });
});
