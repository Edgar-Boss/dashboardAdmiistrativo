import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MedicalCalendarGrid from "./MedicalCalendarGrid";
import { calendarConfigForRange } from "./calendarConfig";

const overnight = {
  id: 77,
  name: "Nocturna",
  appointmentTime: "23:00",
  state: "CONFIRMED",
  doctorId: 1,
  doctorName: "Ana",
  slotCount: 4,
  slotMinutesAtBooking: 30,
  durationMinutes: 120,
  startAt: "2026-10-27T23:00:00",
  endAt: "2026-10-28T01:00:00",
  temporalStatus: "OK",
};

const startsToday = {
  id: 80,
  name: "Diurna",
  appointmentTime: "10:00",
  state: "CONFIRMED",
  doctorId: 1,
  doctorName: "Ana",
  slotCount: 2,
  slotMinutesAtBooking: 30,
  durationMinutes: 60,
  startAt: "2026-10-28T10:00:00",
  endAt: "2026-10-28T11:00:00",
  temporalStatus: "OK",
};

const specialists = [{ id: 1, name: "Ana", specialty: "Uñas" }];
const config = calendarConfigForRange("00:00", "24:00", { slotMinutes: 60 });

function renderDay(selectedDate, appointments, onAppointmentClick = vi.fn()) {
  render(
    <MedicalCalendarGrid
      appointments={appointments}
      specialists={specialists}
      specialistsReady
      selectedDate={selectedDate}
      config={config}
      savingIds={new Set()}
      onAppointmentClick={onAppointmentClick}
    />
  );
  return onAppointmentClick;
}

describe("rendered V2 calendar segments", () => {
  it("opens either visible segment of the same appointment", async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <MedicalCalendarGrid
        appointments={[overnight]}
        specialists={specialists}
        specialistsReady
        selectedDate="2026-10-27"
        config={config}
        savingIds={new Set()}
        onAppointmentClick={vi.fn()}
      />
    );
    const first = screen.getByTestId("appointment-calendar-card");
    expect(first).toHaveAttribute("data-appointment-id", "77");
    expect(first).toHaveTextContent("Termina el día siguiente");
    unmount();

    const onAppointmentClick = renderDay("2026-10-28", [overnight, startsToday]);
    const cards = screen.getAllByTestId("appointment-calendar-card");
    expect(cards.map((card) => card.getAttribute("data-appointment-id"))).toEqual([
      "77",
      "80",
    ]);
    expect(cards[0]).toHaveTextContent("Comenzó el día anterior");
    await user.click(cards[0].querySelector("button"));
    expect(onAppointmentClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: 77 }),
    );
  });
});
