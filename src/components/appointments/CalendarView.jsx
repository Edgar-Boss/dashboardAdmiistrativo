import { useEffect, useMemo, useState } from "react";
import DailyCalendarView from "./DailyCalendarView";
import { fetchSpecialists } from "../../services/specialistService";

/**
 * Day calendar: loads specialists for base columns, renders day appointments in a doctor×time grid.
 * Accepts either legacy appointment shape or SP_GET_APPOINTMENTS_BY_DATE result rows.
 *
 * @param {Array<any>} appointments
 * @param {boolean} loading
 */
export default function CalendarView({ appointments = [], loading = false }) {
  const [specialists, setSpecialists] = useState([]);
  const [loadState, setLoadState] = useState("loading");
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
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
    return appointments.map((a) => ({
      id: a.id,
      appointmentTime: a.appointmentTime ?? a.appointment_time,
      patientName: a.patientName ?? a.patient_name ?? a.name,
      phoneNumber: a.phoneNumber ?? a.phone_number ?? a.phone,
      doctorId: a.doctorId ?? a.doctor_id ?? a.specialistId ?? a.specialist_id,
      doctorName: a.doctorName ?? a.doctor_name,
      specialty: a.specialty ?? a.doctorSpecialty ?? a.speciality,
      reason: a.reason,
      state: a.state,
    }));
  }, [appointments]);

  return (
    <div className="space-y-3">
      {loadState === "error" && loadError && (
        <p className="text-xs text-amber-800" role="status">
          {loadError}. Mostrando columnas según las citas del día.
        </p>
      )}
      <DailyCalendarView
        appointments={rows}
        specialists={specialists}
        specialistsReady={loadState !== "loading"}
        loading={loading}
      />
    </div>
  );
}
