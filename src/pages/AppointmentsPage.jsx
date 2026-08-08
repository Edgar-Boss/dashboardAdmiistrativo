import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import AppointmentTable from "../components/appointments/AppointmentTable";
import AppointmentEditDrawer from "../components/appointments/AppointmentEditDrawer";
import CreateAppointmentDrawer from "../components/appointments/CreateAppointmentDrawer";
import CalendarView from "../components/appointments/CalendarView";
import CalendarFilterTabs from "../components/appointments/calendar/CalendarFilterTabs";
import CalendarToolbar from "../components/appointments/calendar/CalendarToolbar";
import FilterTabs from "../components/appointments/FilterTabs";
import { mergeCalendarAppointment } from "../components/appointments/appointmentEditHelpers";
import { appointmentDateKey } from "../components/appointments/appointmentHelpers";
import {
  CANCELLED_CANNOT_REACTIVATE_MESSAGE,
  isCancelledReactivation,
} from "../components/appointments/appointmentStateConfirm";
import SummaryCards from "../components/appointments/SummaryCards";
import {
  fetchAppointments,
  fetchAppointmentsByDate,
  updateAppointmentState,
} from "../services/appointmentService";
import { normalizeAppointment } from "../components/appointments/appointmentEditHelpers";
import { rememberAppointmentIds } from "../hooks/useAppointmentNotifications";

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
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);

  const filteredAppointments = useMemo(() => {
    if (filter === "ALL") {
      // "Todas" = active appointments only; cancelled are under "Canceladas".
      return appointments.filter((a) => normalizeState(a.state) !== "CANCELLED");
    }
    return appointments.filter((a) => normalizeState(a.state) === filter);
  }, [appointments, filter]);

  const appointmentsById = useMemo(
    () => new Map(appointments.map((a) => [a.id, a])),
    [appointments]
  );

  const calendarAppointments = useMemo(() => {
    const catalogForDay = filteredAppointments.filter(
      (a) => appointmentDateKey(a) === selectedDate
    );

    // Prefer main catalog (includes slotCount from GET /api/admin/appointments).
    if (catalogForDay.length > 0) {
      return catalogForDay;
    }

    // Fallback: day search rows enriched with slotCount from catalog when possible.
    return calendarRows
      .filter((row) => {
        const state = normalizeState(row.state);
        if (filter === "ALL") return state !== "CANCELLED";
        return state === filter;
      })
      .map((row) =>
        mergeCalendarAppointment(row, appointmentsById.get(row.id))
      );
  }, [
    filteredAppointments,
    selectedDate,
    calendarRows,
    appointmentsById,
    filter,
  ]);

  function handleAppointmentUpdate(updated) {
    setActionError(null);
    setAppointments((prev) =>
      prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a))
    );
    setCalendarRows((prev) =>
      prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a))
    );
  }

  async function handleAppointmentCreated(created) {
    setActionError(null);
    if (created?.id != null) {
      rememberAppointmentIds([created.id]);
    }
    try {
      const data = await fetchAppointments();
      setAppointments(data);
      rememberAppointmentIds(data.map((a) => a.id));

      if (viewType === "calendar" && selectedDate) {
        const { appointments: rows, summary } = await fetchAppointmentsByDate({
          date: selectedDate,
          doctorId: null,
          state: filter === "ALL" ? null : filter,
        });
        setCalendarRows(Array.isArray(rows) ? rows : []);
        setCalendarSummary(summary ?? null);
      }

      if (
        created?.appointmentDate &&
        appointmentDateKey(created) !== selectedDate &&
        viewType === "calendar"
      ) {
        setSelectedDate(appointmentDateKey(created));
      }
    } catch (e) {
      if (created?.id != null) {
        const normalized = normalizeAppointment(created);
        setAppointments((prev) => [...prev, normalized]);
      }
      setActionError(
        e instanceof Error
          ? e.message
          : "La cita se creó, pero no se pudo actualizar el listado.",
      );
    }
  }

  async function handleStateChange(appointmentId, nextState) {
    setActionError(null);

    const current = appointments.find((a) => a.id === appointmentId);
    const previousState = current?.state;
    if (!current || previousState === nextState) {
      return;
    }

    if (isCancelledReactivation(previousState, nextState)) {
      setActionError(CANCELLED_CANNOT_REACTIVATE_MESSAGE);
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
      // Revert on failure — keep previous state (e.g. CANCELLED)
      setAppointments((prev) =>
        prev.map((a) =>
          a.id === appointmentId ? { ...a, state: previousState } : a
        )
      );

      setActionError(
        e instanceof Error
          ? e.message
          : "No se pudo actualizar el estado de la cita."
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
              : "No se pudieron cargar las citas. Verifica la conexión."
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
              : "No se pudo cargar el día del calendario."
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
    <div className="min-h-screen bg-brand-background">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-8 sm:py-12 lg:px-10">
        <header className="mb-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="font-display text-3xl font-semibold tracking-tight text-brand-text sm:text-4xl">
                Citas
              </h1>
              {viewType === "calendar" && (
                <p className="mt-2 capitalize text-sm text-brand-text-muted">
                  {formatHeaderDate(selectedDate)}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setCreateDrawerOpen(true)}
              className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-brand bg-brand-primary px-4 py-2.5 text-sm font-medium text-white shadow-brand transition-colors hover:bg-brand-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30 sm:w-auto"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Nueva cita
            </button>
          </div>
        </header>

        {!loading && !error && (
          <SummaryCards
            appointments={appointments}
            summary={viewType === "calendar" ? calendarSummary : null}
          />
        )}

        <section className="rounded-brand-md border border-brand-border bg-brand-surface p-6 shadow-brand sm:p-8 lg:p-10">
          {loading && (
            <div
              className="flex min-h-[200px] items-center justify-center text-sm font-medium text-brand-text-muted"
              role="status"
              aria-live="polite"
            >
              Cargando citas…
            </div>
          )}

          {!loading && error && (
            <div
              className="rounded-brand border border-brand-danger/25 bg-brand-danger-soft px-4 py-3 text-sm text-brand-danger"
              role="alert"
            >
              <p className="font-medium">No se pudieron cargar los datos</p>
              <p className="mt-1 opacity-90">{error}</p>
            </div>
          )}

          {!loading && !error && actionError && (
            <div
              className="mb-4 rounded-brand border border-brand-danger/25 bg-brand-danger-soft px-4 py-3 text-sm text-brand-danger"
              role="alert"
            >
              <p className="font-medium">No se pudo actualizar</p>
              <p className="mt-1 opacity-90">{actionError}</p>
            </div>
          )}

          {!loading && !error && appointments.length === 0 && (
            <div className="flex min-h-[160px] flex-col items-center justify-center rounded-brand-md border border-dashed border-brand-border bg-brand-soft/40 px-6 py-12 text-center">
              <p className="text-sm font-medium text-brand-text-muted">
                No hay citas para mostrar.
              </p>
              <p className="mt-1 max-w-md text-xs text-brand-text-muted/80">
                Cuando haya citas registradas, aparecerán aquí.
              </p>
            </div>
          )}

          {!loading && !error && appointments.length > 0 && (
            <>
              <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-brand-border pb-4">
                <span className="sr-only">Tipo de vista</span>
                <div className="inline-flex rounded-brand border border-brand-border bg-brand-soft/50 p-0.5">
                  <button
                    type="button"
                    onClick={() => setViewType("list")}
                    className={`rounded-[10px] px-3 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/25 ${
                      viewType === "list"
                        ? "bg-brand-surface text-brand-text shadow-brand"
                        : "text-brand-text-muted hover:text-brand-text"
                    }`}
                  >
                    Lista
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewType("calendar")}
                    className={`rounded-[10px] px-3 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/25 ${
                      viewType === "calendar"
                        ? "bg-brand-surface text-brand-text shadow-brand"
                        : "text-brand-text-muted hover:text-brand-text"
                    }`}
                  >
                    Calendario
                  </button>
                </div>
              </div>

              {viewType === "list" ? (
                <FilterTabs value={filter} onChange={setFilter} />
              ) : null}

              {viewType === "list" && (
                <>
                  <div className="mb-6 mt-6 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-brand-text-muted">Vista</span>
                    <div className="inline-flex flex-wrap rounded-brand border border-brand-border bg-brand-soft/50 p-0.5">
                      <button
                        type="button"
                        onClick={() => setViewMode("all")}
                        className={`rounded-[10px] px-2.5 py-1.5 text-xs font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/25 sm:px-3 ${
                          viewMode === "all"
                            ? "bg-brand-surface text-brand-text shadow-brand"
                            : "text-brand-text-muted hover:text-brand-text"
                        }`}
                      >
                        Todas las fechas
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode("day")}
                        className={`rounded-[10px] px-2.5 py-1.5 text-xs font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/25 sm:px-3 ${
                          viewMode === "day"
                            ? "bg-brand-surface text-brand-text shadow-brand"
                            : "text-brand-text-muted hover:text-brand-text"
                        }`}
                      >
                        Por hora
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode("doctor")}
                        className={`rounded-[10px] px-2.5 py-1.5 text-xs font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/25 sm:px-3 ${
                          viewMode === "doctor"
                            ? "bg-brand-surface text-brand-text shadow-brand"
                            : "text-brand-text-muted hover:text-brand-text"
                        }`}
                      >
                        Por especialista
                      </button>
                    </div>
                  </div>
                  <AppointmentTable
                    appointments={filteredAppointments}
                    savingIds={savingIds}
                    onStateChange={handleStateChange}
                    onAppointmentUpdate={handleAppointmentUpdate}
                    viewMode={viewMode}
                  />
                </>
              )}

              {viewType === "calendar" && (
                <div className="mt-2">
                  <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <CalendarToolbar
                      selectedDate={selectedDate}
                      onDateChange={setSelectedDate}
                      onToday={() => setSelectedDate(todayIsoDate())}
                      formattedDateLabel={formatHeaderDate(selectedDate)}
                    />
                    <CalendarFilterTabs value={filter} onChange={setFilter} />
                  </div>

                  {calendarError ? (
                    <div
                      className="mb-4 rounded-brand border border-brand-warning/30 bg-brand-warning-soft px-4 py-3 text-sm text-brand-warning"
                      role="status"
                    >
                      {calendarError}. Mostrando las citas del listado principal.
                    </div>
                  ) : null}

                  <CalendarView
                    appointments={calendarAppointments}
                    loading={calendarLoading}
                    selectedDate={selectedDate}
                    onAppointmentClick={setEditingAppointment}
                  />
                </div>
              )}
            </>
          )}
        </section>
      </div>

      <CreateAppointmentDrawer
        isOpen={createDrawerOpen}
        onClose={() => setCreateDrawerOpen(false)}
        onCreated={handleAppointmentCreated}
      />

      <AppointmentEditDrawer
        appointment={editingAppointment}
        isOpen={editingAppointment !== null}
        onClose={() => setEditingAppointment(null)}
        onSave={(updated) => {
          handleAppointmentUpdate(updated);
          setEditingAppointment(null);
        }}
      />
    </div>
  );
}
