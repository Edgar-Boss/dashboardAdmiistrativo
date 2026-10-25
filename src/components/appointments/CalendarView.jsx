import { useEffect, useMemo, useState } from "react";
import MedicalCalendarGrid from "./calendar/MedicalCalendarGrid";
import {
  USE_CALENDAR_MOCK,
  getMockCalendarAppointments,
  getMockSpecialists,
} from "./calendar/mockCalendarData";
import {
  buildCalendarConfigFromDoctorSchedules,
  buildCalendarConfigFromSchedule,
} from "./calendar/calendarConfig";
import { formatShiftRange, hasIntervalSchedule, shiftsForCivilDate } from "./calendar/scheduleIntervals";
import { normalizeAppointment } from "./appointmentEditHelpers";
import { fetchSpecialists, specialistActivity } from "../../services/specialistService";
import { fetchBusinessSchedule } from "../../services/appointmentService";

const MOCK_SCHEDULE = {
  date: "2026-05-27",
  open: true,
  startTime: "09:00",
  endTime: "18:00",
  slotMinutes: 30,
};

function ClosedDayState({
  title = "La clínica no labora este día.",
}) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center rounded-brand-md border border-dashed border-brand-border bg-brand-soft/40 px-6 text-center">
      <p className="text-sm font-medium text-brand-text">{title}</p>
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
  const [columnStates, setColumnStates] = useState([]);
  const [scheduleError, setScheduleError] = useState(null);
  const [scheduleAttempt, setScheduleAttempt] = useState(0);

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
              : "No se pudieron cargar los doctores."
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
      setColumnStates([]);
      setScheduleState("ok");
      setScheduleError(null);
      return undefined;
    }

    if (!selectedDate || loadState === "loading") return undefined;

    let cancelled = false;

    async function loadSchedule() {
      setScheduleState("loading");
      setSchedule(null);
      setColumnStates([]);
      setScheduleError(null);
      const businessRequest = fetchBusinessSchedule(selectedDate);
      const scheduleTargets =
        loadState === "ok"
          ? specialists.filter((specialist) => specialistActivity(specialist) !== "inactive")
          : [];
      const doctorRequests = scheduleTargets.map((specialist) =>
        fetchBusinessSchedule(selectedDate, specialist.id),
      );
      const [businessResult, ...doctorResults] = await Promise.allSettled([
        businessRequest,
        ...doctorRequests,
      ]);
      if (cancelled) return;

      const business =
        businessResult.status === "fulfilled" ? businessResult.value : null;
      const resultByDoctor = new Map(
        scheduleTargets.map((specialist, index) => [String(specialist.id), doctorResults[index]]),
      );
      const doctors = specialists.map((specialist) => {
        if (specialistActivity(specialist) === "inactive") {
          return { doctorId: specialist.id, status: "inactive" };
        }
        const result = resultByDoctor.get(String(specialist.id));
        if (!result || result.status === "rejected") {
          const reason = result?.reason;
          return {
            doctorId: specialist.id,
            status: "error",
            message:
              reason instanceof Error && reason.message
                ? reason.message
                : "No se pudo cargar el horario.",
          };
        }
        const doctorSchedule = { ...result.value, doctorId: specialist.id };
        return {
          doctorId: specialist.id,
          status: classifyDoctorSchedule(doctorSchedule, selectedDate),
          schedule: doctorSchedule,
        };
      });
      setSchedule(business);
      setColumnStates(doctors);
      if (!business) {
        setScheduleState("error");
        setScheduleError("No se pudo cargar el horario de la clínica.");
        return;
      }
      setScheduleState("ok");
    }

    loadSchedule();
    return () => {
      cancelled = true;
    };
  }, [selectedDate, loadState, specialists, scheduleAttempt]);

  const rows = useMemo(() => {
    if (USE_CALENDAR_MOCK) {
      return getMockCalendarAppointments().map((a) => normalizeAppointment(a));
    }
    return appointments.map((a) => normalizeAppointment(a));
  }, [appointments]);

  const displaySpecialists = USE_CALENDAR_MOCK ? getMockSpecialists() : specialists;
  const calendarConfig = useMemo(() => {
    const businessConfig = buildCalendarConfigFromSchedule(schedule);
    const intervalSchedules = columnStates
      .filter(
        (column) =>
          column.status === "loaded" && hasIntervalSchedule(column.schedule),
      )
      .map((column) => column.schedule);
    const doctorConfig = buildCalendarConfigFromDoctorSchedules(
      intervalSchedules,
      selectedDate,
    );
    return combineScale(businessConfig, doctorConfig);
  }, [columnStates, selectedDate, schedule]);
  const businessWindow = useMemo(() => {
    if (!hasIntervalSchedule(schedule)) return [];
    return shiftsForCivilDate(schedule.intervals, schedule.date ?? selectedDate)
      .filter((shift) => shift.visibleStart != null)
      .map(formatShiftRange);
  }, [schedule, selectedDate]);
  const scheduleLoading = scheduleState === "loading";
  const businessClosed =
    scheduleState === "ok" && schedule && !schedule.open && !calendarConfig;
  const scheduleFailed = scheduleState === "error" && !calendarConfig;

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
      {scheduleFailed && scheduleError ? (
        <div
          className="flex min-h-[280px] flex-col items-center justify-center rounded-brand-md border border-brand-danger/25 bg-brand-danger-soft px-6 text-center"
          role="alert"
        >
          <p className="text-sm font-medium text-brand-danger">{scheduleError}</p>
          <button
            type="button"
            onClick={() => setScheduleAttempt((attempt) => attempt + 1)}
            className="mt-3 rounded-brand border border-brand-danger/30 bg-brand-surface px-3 py-1.5 text-xs font-medium text-brand-danger"
          >
            Reintentar
          </button>
        </div>
      ) : !calendarConfig && !scheduleLoading ? (
        <div className="space-y-3">
          <ClosedDayState
            title={
              businessClosed
                ? "La clínica no labora este día."
                : "Ningún doctor tiene turno este día."
            }
          />
          <DayAppointmentList
            appointments={rows}
            onAppointmentClick={onAppointmentClick}
          />
        </div>
      ) : (
        <>
          {scheduleError ? (
            <div
              className="flex flex-wrap items-center justify-between gap-2 rounded-brand border border-brand-danger/25 bg-brand-danger-soft px-3 py-2"
              role="alert"
            >
              <p className="text-xs font-medium text-brand-danger">{scheduleError}</p>
              <button
                type="button"
                onClick={() => setScheduleAttempt((attempt) => attempt + 1)}
                className="rounded-brand border border-brand-danger/30 bg-brand-surface px-2 py-1 text-[11px] font-medium text-brand-danger"
              >
                Reintentar
              </button>
            </div>
          ) : null}
          {businessWindow.length > 0 ? (
            <div className="text-xs text-brand-text-muted" data-testid="business-window">
              {businessWindow.map((label) => (
                <p key={label}>{label}</p>
              ))}
            </div>
          ) : null}
          <MedicalCalendarGrid
            appointments={rows}
            specialists={displaySpecialists}
            specialistsReady={USE_CALENDAR_MOCK || loadState !== "loading"}
            loading={loading || scheduleLoading}
            selectedDate={selectedDate}
            config={calendarConfig}
            columnStates={columnStates}
            onRetrySchedule={() => setScheduleAttempt((attempt) => attempt + 1)}
            onAppointmentClick={onAppointmentClick}
            onStateChange={onStateChange}
            savingIds={savingIds}
          />
        </>
      )}
    </div>
  );
}

function DayAppointmentList({ appointments, onAppointmentClick }) {
  if (!appointments.length) return null;
  return (
    <ul className="space-y-2" aria-label="Citas del día">
      {appointments.map((appointment) => (
        <li key={appointment.id}>
          <button
            type="button"
            onClick={() => onAppointmentClick?.(appointment)}
            className="w-full rounded-brand border border-brand-border bg-brand-surface px-3 py-2 text-left text-sm"
          >
            {appointment.name ?? appointment.patientName ?? "Cita"}{" "}
            <span className="text-brand-text-muted">{appointment.appointmentTime}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function classifyDoctorSchedule(schedule, civilDate) {
  if (!schedule || schedule.open === false) return "closed";
  if (Array.isArray(schedule.intervals)) {
    if (!hasIntervalSchedule(schedule)) return "closed";
    const visible = shiftsForCivilDate(schedule.intervals, civilDate).some(
      (shift) => shift.visibleStart != null,
    );
    return visible ? "loaded" : "closed";
  }
  return "loaded";
}

function combineScale(businessConfig, doctorConfig) {
  if (!businessConfig) return doctorConfig;
  if (!doctorConfig) return businessConfig;
  return {
    ...doctorConfig,
    dayStartMinutes: Math.min(
      businessConfig.dayStartMinutes,
      doctorConfig.dayStartMinutes,
    ),
    dayEndMinutes: Math.max(
      businessConfig.dayEndMinutes,
      doctorConfig.dayEndMinutes,
    ),
    intervalMode: Boolean(doctorConfig.intervalMode || businessConfig.intervalMode),
    shiftsByDoctor: doctorConfig.shiftsByDoctor,
    sharedShifts: doctorConfig.shiftsByDoctor ? undefined : businessConfig.sharedShifts,
  };
}
