import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("../services/appointmentService", () => ({
  fetchAppointments: vi.fn(), fetchAppointmentsByDate: vi.fn(),
  updateAppointmentState: vi.fn(), updateAppointment: vi.fn(),
  sendAppointmentConfirmation: vi.fn(), fetchBusinessSchedule: vi.fn(),
}));
vi.mock("../components/appointments/SummaryCards", () => ({ default: () => null }));
vi.mock("../components/appointments/CreateAppointmentDrawer", () => ({ default: () => null }));
vi.mock("../components/appointments/AppointmentEditDrawer", () => ({ default: () => null }));
vi.mock("../components/appointments/AppointmentConfirmationDialog", () => ({ default: () => null }));
vi.mock("../components/appointments/CalendarView", () => ({
  default: ({ appointments, onStateChange }) => (
    <div data-testid="audit-calendar">
      {appointments.map((row) => <div key={row.id}>
        <span>{row.id}:{row.state}</span>
        <button onClick={() => onStateChange(row.id, "CONFIRMED")}>Confirmar audit</button>
        <button onClick={() => onStateChange(row.id, "CANCELLED")}>Cancelar audit</button>
      </div>)}
    </div>
  ),
}));

import { fetchAppointments, fetchAppointmentsByDate, updateAppointmentState } from "../services/appointmentService";
import AppointmentsPage from "./AppointmentsPage";

const appointment = { id: 900002, name: "Audit", state: "PENDING", doctorId: 1,
  appointmentDate: "2026-10-27", appointmentTime: "10:00", slotCount: 1 };
const v2Appointment = {
  ...appointment,
  slotCount: 2,
  slotMinutesAtBooking: 60,
  durationMinutes: 120,
  startAt: "2026-10-27T10:00:00",
  endAt: "2026-10-27T12:00:00",
  temporalStatus: "OK",
};
let storedAppointment;

function isoToday() {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

async function openCalendar(expected = "900002:PENDING") {
  const user = userEvent.setup();
  render(<AppointmentsPage />);
  await waitFor(() => expect(screen.queryByText("Cargando citas…")).toBeNull());
  await user.click(screen.getByRole("button", { name: "Calendario" }));
  await screen.findByText(expected);
  return user;
}

describe("audit: calendar state after successful writes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storedAppointment = { ...appointment };
    fetchAppointments.mockImplementation(async () => [{ ...storedAppointment }]);
    fetchAppointmentsByDate.mockImplementation(async () => ({
      appointments: [{ ...storedAppointment }], summary: null,
    }));
    updateAppointmentState.mockImplementation(async ({ change }) => {
      storedAppointment = { ...storedAppointment, state: change };
      return { success: true };
    });
  });
  it("shows CONFIRMED after confirming a V1 row from the calendar", async () => {
    const user = await openCalendar();
    await user.click(screen.getByRole("button", { name: "Confirmar audit" }));
    expect(updateAppointmentState).toHaveBeenCalledWith({ id: 900002, change: "CONFIRMED" });
    await waitFor(() => {
      expect(screen.getByTestId("audit-calendar").textContent).toContain("900002:CONFIRMED");
    }, { timeout: 300 });
  });
  it("shows CONFIRMED after confirming a V2 row from the calendar", async () => {
    storedAppointment = { ...v2Appointment };
    const user = await openCalendar();
    await user.click(screen.getByRole("button", { name: "Confirmar audit" }));
    expect(updateAppointmentState).toHaveBeenCalledWith({ id: 900002, change: "CONFIRMED" });
    await waitFor(() => {
      expect(screen.getByTestId("audit-calendar").textContent).toContain("900002:CONFIRMED");
    });
  });
  it("removes a cancelled appointment from the active calendar", async () => {
    const user = await openCalendar();
    await user.click(screen.getByRole("button", { name: "Cancelar audit" }));
    expect(updateAppointmentState).toHaveBeenCalledWith({ id: 900002, change: "CANCELLED" });
    await waitFor(() => {
      expect(screen.getByTestId("audit-calendar").textContent).not.toContain("900002:");
    }, { timeout: 300 });
  });
  it("removes a cancelled row from the confirmed filter and reloads that filter", async () => {
    storedAppointment = { ...appointment, state: "CONFIRMED" };
    const user = await openCalendar("900002:CONFIRMED");
    await user.click(screen.getByRole("tab", { name: "Confirmadas" }));
    await screen.findByText("900002:CONFIRMED");
    await user.click(screen.getByRole("button", { name: "Cancelar audit" }));
    await waitFor(() => {
      expect(screen.getByTestId("audit-calendar").textContent).not.toContain("900002:");
    });
    expect(fetchAppointmentsByDate).toHaveBeenLastCalledWith(
      expect.objectContaining({ state: "CONFIRMED", doctorId: null }),
    );
  });
  it("can change a daily row that arrived after the original catalog load", async () => {
    fetchAppointments.mockResolvedValue([{ ...appointment, id: 900003 }]);
    const user = await openCalendar();
    await user.click(screen.getByRole("button", { name: "Confirmar audit" }));
    expect(updateAppointmentState).toHaveBeenCalledWith({ id: 900002, change: "CONFIRMED" });
  });
  it("does not paint the catalog when the daily response is empty", async () => {
    fetchAppointmentsByDate.mockResolvedValue({ appointments: [], summary: null });
    const user = userEvent.setup();
    render(<AppointmentsPage />);
    await waitFor(() => expect(screen.queryByText("Cargando citas…")).toBeNull());
    await user.click(screen.getByRole("button", { name: "Calendario" }));
    await screen.findByTestId("audit-calendar");
    expect(screen.getByTestId("audit-calendar").textContent).not.toContain("900002:");
  });
  it("does not paint the catalog when the daily read fails", async () => {
    fetchAppointmentsByDate.mockRejectedValue(new Error("día no disponible"));
    const user = userEvent.setup();
    render(<AppointmentsPage />);
    await waitFor(() => expect(screen.queryByText("Cargando citas…")).toBeNull());
    await user.click(screen.getByRole("button", { name: "Calendario" }));
    expect(await screen.findByText("No se pudieron cargar las citas de este día.")).toBeInTheDocument();
    expect(screen.queryByTestId("audit-calendar")).toBeNull();
    expect(screen.queryByText("900002:PENDING")).toBeNull();
  });
  it("keeps the previous calendar state and shows the write error", async () => {
    updateAppointmentState.mockRejectedValue(new Error("Oracle rechazó el estado"));
    const user = await openCalendar();
    await user.click(screen.getByRole("button", { name: "Confirmar audit" }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Oracle rechazó el estado");
    expect(alert).not.toHaveTextContent("La cita se guardó.");
    expect(screen.getByTestId("audit-calendar").textContent).toContain("900002:PENDING");
  });
  it("says the change was saved when the reload fails, and retries the read", async () => {
    let reads = 0;
    fetchAppointmentsByDate.mockImplementation(async () => {
      reads += 1;
      if (reads === 1) return { appointments: [{ ...storedAppointment }], summary: null };
      if (reads === 2) throw new Error("lectura caída");
      return { appointments: [{ ...storedAppointment }], summary: null };
    });
    const user = await openCalendar();
    await user.click(screen.getByRole("button", { name: "Confirmar audit" }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("La cita se guardó.");
    expect(alert).toHaveTextContent("No se pudo actualizar la vista.");
    expect(screen.getByTestId("audit-calendar").textContent).toContain("900002:PENDING");
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    await waitFor(() => {
      expect(screen.getByTestId("audit-calendar").textContent).toContain("900002:CONFIRMED");
    });
    expect(screen.queryByText("No se pudo actualizar la vista.")).toBeNull();
  });
  it("ignores a second confirm while the first write is still in flight", async () => {
    let release;
    updateAppointmentState.mockImplementation(() => new Promise((resolve) => {
      release = () => {
        storedAppointment = { ...storedAppointment, state: "CONFIRMED" };
        resolve({ success: true });
      };
    }));
    const user = await openCalendar();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar audit" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar audit" }));
    expect(updateAppointmentState).toHaveBeenCalledTimes(1);
    release();
    await waitFor(() => {
      expect(screen.getByTestId("audit-calendar").textContent).toContain("900002:CONFIRMED");
    });
  });
  it("discards a daily response for the date that was current when the write started", async () => {
    const today = isoToday();
    const otherDay = today === "2026-11-03" ? "2026-11-04" : "2026-11-03";
    let phase = "initial";
    let releaseStale = () => {};
    fetchAppointmentsByDate.mockImplementation(async ({ date }) => {
      if (phase === "initial") {
        return { appointments: [{ ...storedAppointment }], summary: null };
      }
      if (date === today) {
        return new Promise((resolve) => {
          releaseStale = () => resolve({
            appointments: [{ ...storedAppointment, state: "CONFIRMED" }],
            summary: null,
          });
        });
      }
      return {
        appointments: [{ ...appointment, id: 900008, state: "PENDING", appointmentDate: date }],
        summary: null,
      };
    });
    const user = await openCalendar();
    phase = "reload";
    fireEvent.click(screen.getByRole("button", { name: "Confirmar audit" }));
    await waitFor(() => expect(fetchAppointmentsByDate.mock.calls.length).toBeGreaterThanOrEqual(2));
    fireEvent.change(screen.getByLabelText("Fecha"), { target: { value: otherDay } });
    await screen.findByText("900008:PENDING");
    releaseStale();
    await waitFor(() => {
      const text = screen.getByTestId("audit-calendar").textContent;
      expect(text).toContain("900008:PENDING");
      expect(text).not.toContain("900002:");
    });
  });
  it("refreshes the list after a successful confirm and restores it when the write fails", async () => {
    const user = userEvent.setup();
    render(<AppointmentsPage />);
    await waitFor(() => expect(screen.queryByText("Cargando citas…")).toBeNull());
    await user.click(screen.getByRole("button", { name: "Por hora" }));
    const catalogCalls = fetchAppointments.mock.calls.length;
    await user.click(screen.getAllByRole("button", { name: "Confirmar" })[0]);
    await user.click(screen.getByRole("button", { name: "Sí, confirmar" }));
    await waitFor(() => expect(screen.getAllByText("Confirmada").length).toBeGreaterThan(0));
    expect(fetchAppointments.mock.calls.length).toBeGreaterThan(catalogCalls);

    updateAppointmentState.mockRejectedValueOnce(new Error("no se pudo cancelar"));
    await user.click(screen.getAllByRole("button", { name: "Cancelar" })[0]);
    await user.click(screen.getByRole("button", { name: "Sí, cancelar" }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("no se pudo cancelar");
    expect(alert).not.toHaveTextContent("La cita se guardó.");
    expect(screen.getAllByText("Confirmada").length).toBeGreaterThan(0);
    expect(screen.queryByText("Cancelada")).toBeNull();
  });
});
