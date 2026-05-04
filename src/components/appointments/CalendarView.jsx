import DailyCalendarView from "./DailyCalendarView";

/**
 * Day calendar strip for Citas (wraps DailyCalendarView).
 * @param {Array<{ appointmentTime?: string, name?: string, doctorName?: string, state?: string }>} appointments
 */
export default function CalendarView({ appointments = [] }) {
  const rows = appointments.map((a) => ({
    appointmentTime: a.appointmentTime,
    name: a.name,
    doctorName: a.doctorName,
    state: a.state,
  }));

  return <DailyCalendarView appointments={rows} />;
}
