import { useEffect, useMemo, useState } from "react";
import MedicalCalendarGrid from "./calendar/MedicalCalendarGrid";
import {
  USE_CALENDAR_MOCK,
  getMockCalendarAppointments,
  getMockSpecialists,
} from "./calendar/mockCalendarData";
import { normalizeAppointment } from "./appointmentEditHelpers";
import { fetchSpecialists } from "../../services/specialistService";

export default function CalendarView({
  appointments = [],
  loading = false,
  selectedDate,
  onAppointmentClick,
}) {
  const [specialists, setSpecialists] = useState([]);
  const [loadState, setLoadState] = useState("loading");
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    if (USE_CALENDAR_MOCK) {
      setSpecialists(getMockSpecialists());
      setLoadState("ok");
      return undefined;
    }

    let cancelled = false;

    async function load() {
      setLoadState("loading");
      setLoadError(null);
      try {
        const data = await fetchSpecialists();
        if (!cancelled) {
          setSpecialists(data);
          setLoadState("ok");
        }
      } catch (e) {
        if (!cancelled) {
          setSpecialists([]);
          setLoadState("error");
          setLoadError(
            e instanceof Error
              ? e.message
              : "No se pudieron cargar los especialistas."
          );
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo(() => {
    if (USE_CALENDAR_MOCK) {
      return getMockCalendarAppointments().map((a) => normalizeAppointment(a));
    }
    return appointments.map((a) => normalizeAppointment(a));
  }, [appointments]);

  const displaySpecialists = USE_CALENDAR_MOCK ? getMockSpecialists() : specialists;

  return (
    <div className="space-y-3">
      {loadState === "error" && loadError && (
        <p
          className="rounded-xl border border-amber-200/80 bg-amber-50 px-3 py-2 text-xs text-amber-900"
          role="status"
        >
          {loadError}. Mostrando columnas según las citas del día.
        </p>
      )}
      <MedicalCalendarGrid
        appointments={rows}
        specialists={displaySpecialists}
        specialistsReady={USE_CALENDAR_MOCK || loadState !== "loading"}
        loading={loading}
        selectedDate={selectedDate}
        onAppointmentClick={onAppointmentClick}
      />
    </div>
  );
}
