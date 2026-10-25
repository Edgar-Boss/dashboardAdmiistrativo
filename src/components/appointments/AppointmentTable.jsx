import AppointmentsTable from "./AppointmentsTable";
import AppointmentsTimeline from "./AppointmentsTimeline";
import DoctorCalendar from "./DoctorCalendar";

function EmptyState() {
  return (
    <div className="rounded-brand-md border border-dashed border-brand-border bg-brand-soft/40 px-6 py-14 text-center">
      <p className="text-sm font-medium text-brand-text-muted">No hay citas en este filtro.</p>
      <p className="mt-1 text-xs text-brand-text-muted">Prueba con otra pestaña o revisa más tarde.</p>
    </div>
  );
}

/**
 * Routes to the correct appointments UI by viewMode.
 * @param {"all"|"day"|"doctor"} viewMode
 */
export default function AppointmentTable({
  appointments,
  savingIds,
  sendingConfirmationId,
  onStateChange,
  onAppointmentUpdate,
  onSendConfirmation,
  onEditAppointment,
  viewMode = "all",
}) {
  if (appointments.length === 0) {
    return <EmptyState />;
  }

  const shared = {
    appointments,
    savingIds,
    sendingConfirmationId,
    onStateChange,
    onAppointmentUpdate,
    onSendConfirmation,
    onEditAppointment,
  };

  if (viewMode === "all") {
    return <AppointmentsTable {...shared} />;
  }

  if (viewMode === "day") {
    return <AppointmentsTimeline {...shared} />;
  }

  if (viewMode === "doctor") {
    return <DoctorCalendar {...shared} />;
  }

  return <AppointmentsTable {...shared} />;
}
