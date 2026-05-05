import { useEffect, useMemo, useState } from "react";
import AppointmentTable from "../components/appointments/AppointmentTable";
import CalendarView from "../components/appointments/CalendarView";
import FilterTabs from "../components/appointments/FilterTabs";
import { appointmentDateKey } from "../components/appointments/appointmentHelpers";
import SummaryCards from "../components/appointments/SummaryCards";
import {
  fetchAppointments,
  fetchAppointmentsByDate,
  updateAppointmentState,
} from "../services/appointmentService";

function normalizeState(state) {
  const normalized = typeof state === "string" ? state.toUpperCase() : "";
  return ["PENDING", "CONFIRMED", "CANCELLED"].includes(normalized)
    ? normalized
    : "PENDING";
}

function todayIsoDate() {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatHeaderDate(iso) {
  if (!iso) return "";
  const parts = iso.split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return iso;
  const [y, m, day] = parts;
  const d = new Date(y, m - 1, day);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [savingIds, setSavingIds] = useState(() => new Set());
  const [filter, setFilter] = useState("ALL");
  const [viewMode, setViewMode] = useState("all");
  const [viewType, setViewType] = useState("list");
  const [selectedDate, setSelectedDate] = useState(() => todayIsoDate());
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarError, setCalendarError] = useState(null);
  const [calendarRows, setCalendarRows] = useState([]);
  const [calendarSummary, setCalendarSummary] = useState(null);

  const filteredAppointments = useMemo(() => {
    if (filter === "ALL") return appointments;
    return appointments.filter((a) => normalizeState(a.state) === filter);
  }, [appointments, filter]);

  const calendarAppointments = useMemo(() => {
    // When using SP_GET_APPOINTMENTS_BY_DATE, backend already filters by day.
    // This fallback keeps calendar usable when the SP endpoint is unavailable.
    if (calendarRows.length > 0 || calendarLoading || calendarError) {
      return calendarRows;
    }
    return filteredAppointments.filter(
      (a) => appointmentDateKey(a) === selectedDate
    );
  }, [
    filteredAppointments,
    selectedDate,
    calendarRows,
    calendarLoading,
    calendarError,
  ]);

  async function handleStateChange(appointmentId, nextState) {
    setActionError(null);

    const current = appointments.find((a) => a.id === appointmentId);
    const previousState = current?.state;
    if (!current || previousState === nextState) {
      return;
    }

    // Optimistic update
    setAppointments((prev) =>
      prev.map((a) =>
        a.id === appointmentId ? { ...a, state: nextState } : a
      )
    );

    setSavingIds((prev) => new Set([...prev, appointmentId]));

    try {
      await updateAppointmentState({ id: appointmentId, change: nextState });
    } catch (e) {
      // Revert on failure
      setAppointments((prev) =>
        prev.map((a) =>
          a.id === appointmentId ? { ...a, state: previousState } : a
        )
      );

      setActionError(
        e instanceof Error
          ? e.message
          : "Could not update appointment state."
      );
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(appointmentId);
        return next;
      });
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchAppointments();
        if (!cancelled) {
          setAppointments(data);
        }
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error
              ? e.message
              : "Could not load appointments. Check that the API is running."
          );
          setAppointments([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (viewType !== "calendar") return;
    if (!selectedDate) return;

    let cancelled = false;
    async function loadCalendarDay() {
      setCalendarLoading(true);
      setCalendarError(null);
      try {
        const { appointments: rows, summary } = await fetchAppointmentsByDate({
          date: selectedDate,
          doctorId: null,
          state: filter === "ALL" ? null : filter,
        });
        if (!cancelled) {
          setCalendarRows(Array.isArray(rows) ? rows : []);
          setCalendarSummary(summary ?? null);
        }
      } catch (e) {
        if (!cancelled) {
          setCalendarRows([]);
          setCalendarSummary(null);
          setCalendarError(
            e instanceof Error
              ? e.message
              : "Could not load calendar day."
          );
        }
      } finally {
        if (!cancelled) setCalendarLoading(false);
      }
    }

    loadCalendarDay();
    return () => {
      cancelled = true;
    };
  }, [viewType, selectedDate, filter]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-8 sm:py-12 lg:px-10">
        <header className="mb-10">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">
            Citas
          </h1>
          {viewType === "calendar" && (
            <p className="mt-2 capitalize text-sm text-gray-500">
              {formatHeaderDate(selectedDate)}
            </p>
          )}
        </header>

        {!loading && !error && (
          <SummaryCards
            appointments={appointments}
            summary={viewType === "calendar" ? calendarSummary : null}
          />
        )}

        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
          {loading && (
            <div
              className="flex min-h-[200px] items-center justify-center text-sm font-medium text-slate-500"
              role="status"
              aria-live="polite"
            >
              Loading appointments...
            </div>
          )}

          {!loading && error && (
            <div
              className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
              role="alert"
            >
              <p className="font-medium">Unable to load data</p>
              <p className="mt-1 text-rose-700/90">{error}</p>
            </div>
          )}

          {!loading && !error && actionError && (
            <div
              className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
              role="alert"
            >
              <p className="font-medium">Update failed</p>
              <p className="mt-1 text-rose-700/90">{actionError}</p>
            </div>
          )}

          {!loading && !error && appointments.length === 0 && (
            <div className="flex min-h-[160px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 px-6 py-12 text-center">
              <p className="text-sm font-medium text-gray-600">
                No appointments to display.
              </p>
              <p className="mt-1 max-w-md text-xs text-gray-500">
                When the backend returns records, they will appear in the table
                below.
              </p>
            </div>
          )}

          {!loading && !error && appointments.length > 0 && (
            <>
              <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-gray-100 pb-4">
                <span className="sr-only">Tipo de vista</span>
                <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50/80 p-0.5">
                  <button
                    type="button"
                    onClick={() => setViewType("list")}
                    className={`rounded-md px-3 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                      viewType === "list"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Lista
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewType("calendar")}
                    className={`rounded-md px-3 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                      viewType === "calendar"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Calendario
                  </button>
                </div>
              </div>

              {viewType === "calendar" && (
                <div className="mb-6 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedDate(todayIsoDate())}
                    className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 focus:ring-offset-1"
                  >
                    Hoy
                  </button>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm transition hover:border-gray-300 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 focus:ring-offset-1"
                    aria-label="Fecha"
                  />
                </div>
              )}

              <FilterTabs value={filter} onChange={setFilter} />

              {viewType === "list" && (
                <>
                  <div className="mb-6 mt-6 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-gray-500">Vista</span>
                    <div className="inline-flex flex-wrap rounded-lg border border-gray-200 bg-gray-50/80 p-0.5">
                      <button
                        type="button"
                        onClick={() => setViewMode("all")}
                        className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:px-3 ${
                          viewMode === "all"
                            ? "bg-white text-gray-900 shadow-sm"
                            : "text-gray-600 hover:text-gray-900"
                        }`}
                      >
                        Todas las fechas
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode("day")}
                        className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:px-3 ${
                          viewMode === "day"
                            ? "bg-white text-gray-900 shadow-sm"
                            : "text-gray-600 hover:text-gray-900"
                        }`}
                      >
                        Por hora
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode("doctor")}
                        className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:px-3 ${
                          viewMode === "doctor"
                            ? "bg-white text-gray-900 shadow-sm"
                            : "text-gray-600 hover:text-gray-900"
                        }`}
                      >
                        Por doctor
                      </button>
                    </div>
                  </div>
                  <AppointmentTable
                    appointments={filteredAppointments}
                    savingIds={savingIds}
                    onStateChange={handleStateChange}
                    viewMode={viewMode}
                  />
                </>
              )}

              {viewType === "calendar" && (
                <div className="mt-6">
                  {calendarError && (
                    <div
                      className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
                      role="status"
                    >
                      {calendarError}. Showing calendar using currently loaded appointments.
                    </div>
                  )}
                  <CalendarView
                    appointments={calendarAppointments}
                    loading={calendarLoading}
                  />
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
