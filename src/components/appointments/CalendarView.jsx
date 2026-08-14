import { useEffect, useMemo, useState } from "react";
import MedicalCalendarGrid from "./calendar/MedicalCalendarGrid";
import {
  USE_CALENDAR_MOCK,
  getMockCalendarAppointments,
  getMockSpecialists,
} from "./calendar/mockCalendarData";
import { buildCalendarConfigFromSchedule } from "./calendar/calendarConfig";
import { normalizeAppointment } from "./appointmentEditHelpers";
import { fetchSpecialists } from "../../services/specialistService";
import { fetchBusinessSchedule } from "../../services/appointmentService";

const MOCK_SCHEDULE = {
  date: "2026-05-27",
  open: true,
  startTime: "09:00",
  endTime: "18:00",
  slotMinutes: 30,
};

function ClosedDayState() {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center rounded-brand-md border border-dashed border-brand-border bg-brand-soft/40 px-6 text-center">
      <p className="text-sm font-medium text-brand-text">
        El negocio no labora este día.
      </p>
      <p className="mt-1 max-w-sm text-xs text-brand-text-muted">
        Cambia la fecha en la barra superior para ver otro día.
      </p>
    </div>
  );
}

export default function CalendarView({
  appointments = [],
  loading = false,
  selectedDate,
  onAppointmentClick,
  onStateChange,
  savingIds,
}) {
  const [specialists, setSpecialists] = useState([]);
  const [loadState, setLoadState] = useState("loading");
  const [loadError, setLoadError] = useState(null);
  const [scheduleState, setScheduleState] = useState("loading");
  const [schedule, setSchedule] = useState(null);
  const [scheduleError, setScheduleError] = useState(null);

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

  useEffect(() => {
    if (USE_CALENDAR_MOCK) {
      setSchedule({ ...MOCK_SCHEDULE, date: selectedDate });
      setScheduleState("ok");
      setScheduleError(null);
      return undefined;
    }

    if (!selectedDate) return undefined;

    let cancelled = false;

    async function loadSchedule() {
      setScheduleState("loading");
      setSchedule(null);
      setScheduleError(null);
      try {
        const data = await fetchBusinessSchedule(selectedDate);
        if (!cancelled) {
          setSchedule(data);
          setScheduleState("ok");
        }
      } catch {
        if (!cancelled) {
          setSchedule(null);
          setScheduleState("error");
          setScheduleError("No se pudo cargar el horario del negocio.");
        }
      }
    }

    loadSchedule();
    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  const rows = useMemo(() => {
    if (USE_CALENDAR_MOCK) {
      return getMockCalendarAppointments().map((a) => normalizeAppointment(a));
    }
    return appointments.map((a) => normalizeAppointment(a));
  }, [appointments]);

  const displaySpecialists = USE_CALENDAR_MOCK ? getMockSpecialists() : specialists;
  const calendarConfig = useMemo(
    () => buildCalendarConfigFromSchedule(schedule),
    [schedule],
  );
  const scheduleLoading = scheduleState === "loading";
  const businessClosed = scheduleState === "ok" && schedule && !schedule.open;

  return (
    <div className="space-y-3">
      {loadState === "error" && loadError && (
        <p
          className="rounded-brand border border-brand-accent/40 bg-brand-warning-soft px-3 py-2 text-xs text-brand-warning"
          role="status"
        >
          {loadError}. Mostrando columnas según las citas del día.
        </p>
      )}
      {scheduleState === "error" && scheduleError ? (
        <div
          className="flex min-h-[280px] flex-col items-center justify-center rounded-brand-md border border-brand-danger/25 bg-brand-danger-soft px-6 text-center"
          role="alert"
        >
          <p className="text-sm font-medium text-brand-danger">{scheduleError}</p>
        </div>
      ) : businessClosed ? (
        <ClosedDayState />
      ) : (
        <MedicalCalendarGrid
          appointments={rows}
          specialists={displaySpecialists}
          specialistsReady={USE_CALENDAR_MOCK || loadState !== "loading"}
          loading={loading || scheduleLoading}
          selectedDate={selectedDate}
          config={calendarConfig}
          onAppointmentClick={onAppointmentClick}
          onStateChange={onStateChange}
          savingIds={savingIds}
        />
      )}
    </div>
  );
}
