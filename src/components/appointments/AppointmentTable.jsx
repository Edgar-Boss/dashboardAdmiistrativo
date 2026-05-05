import AppointmentsTable from "./AppointmentsTable";
import AppointmentsTimeline from "./AppointmentsTimeline";
import DoctorCalendar from "./DoctorCalendar";

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/80 px-6 py-14 text-center">
      <p className="text-sm font-medium text-gray-600">No hay citas en este filtro.</p>
      <p className="mt-1 text-xs text-gray-500">Prueba con otra pestaña o revisa más tarde.</p>
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
  onStateChange,
  viewMode = "all",
}) {
  if (appointments.length === 0) {
    return <EmptyState />;
  }

  const shared = { appointments, savingIds, onStateChange };

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
