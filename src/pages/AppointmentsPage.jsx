import { useEffect, useMemo, useRef, useState } from "react";
import { Plus } from "lucide-react";
import AppointmentTable from "../components/appointments/AppointmentTable";
import AppointmentConfirmationDialog from "../components/appointments/AppointmentConfirmationDialog";
import AppointmentEditDrawer from "../components/appointments/AppointmentEditDrawer";
import CreateAppointmentDrawer from "../components/appointments/CreateAppointmentDrawer";
import CalendarView from "../components/appointments/CalendarView";
import CalendarFilterTabs from "../components/appointments/calendar/CalendarFilterTabs";
import CalendarToolbar from "../components/appointments/calendar/CalendarToolbar";
import FilterTabs from "../components/appointments/FilterTabs";
import { appointmentDateKey } from "../components/appointments/appointmentHelpers";
import { selectCalendarDay } from "../components/appointments/calendar/calendarDaySelection";
import {
  CANCELLED_CANNOT_REACTIVATE_MESSAGE,
  isCancelledReactivation,
} from "../components/appointments/appointmentStateConfirm";
import SummaryCards from "../components/appointments/SummaryCards";
import {
  fetchAppointments,
  fetchAppointmentsByDate,
  sendAppointmentConfirmation,
  updateAppointmentState,
} from "../services/appointmentService";
import { normalizeAppointment } from "../components/appointments/appointmentEditHelpers";
import { rememberAppointmentIds } from "../hooks/useAppointmentNotifications";
import {
  CONFIRMATION_DIALOG_STATUS,
  getClosedConfirmationDialog,
  isAlreadySentConfirmationError,
} from "../components/appointments/appointmentConfirmationAction";

function normalizeState(state) {
  const normalized = typeof state === "string" ? state.toUpperCase() : "";
  return ["PENDING", "CONFIRMED", "CANCELLED"].includes(normalized)
    ? normalized
    : "PENDING";
}

const SAVED_VIEW_TITLE = "La cita se guardó.";
const SAVED_VIEW_DETAIL = "No se pudo actualizar la vista.";

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
  const [actionSuccess, setActionSuccess] = useState(null);
  const [savingIds, setSavingIds] = useState(() => new Set());
  const [sendingConfirmationId, setSendingConfirmationId] = useState(null);
  const sendingConfirmationIdRef = useRef(null);
  const stateChangeIdsRef = useRef(new Set());
  const [confirmationDialog, setConfirmationDialog] = useState(
    getClosedConfirmationDialog
  );
  const [filter, setFilter] = useState("ALL");
  const [viewMode, setViewMode] = useState("all");
  const [viewType, setViewType] = useState("list");
  const [selectedDate, setSelectedDate] = useState(() => todayIsoDate());
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarRefreshing, setCalendarRefreshing] = useState(false);
  const [calendarError, setCalendarError] = useState(null);
  const [calendarRefreshError, setCalendarRefreshError] = useState(null);
  const [calendarRows, setCalendarRows] = useState([]);
  const [calendarRowsDate, setCalendarRowsDate] = useState(null);
  const [calendarAttempt, setCalendarAttempt] = useState(0);
  const [calendarSummary, setCalendarSummary] = useState(null);
  const dayLoadGeneration = useRef(0);
  const catalogGeneration = useRef(0);
  const calendarQueryRef = useRef({
    date: selectedDate,
    filter,
    viewType,
  });
  calendarQueryRef.current = { date: selectedDate, filter, viewType };
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

  const calendarSelection = useMemo(
    () =>
      selectCalendarDay({
        dailyRows: calendarRows,
        dailyDate: calendarRowsDate,
        selectedDate,
        dailyError: calendarError,
        catalogById: appointmentsById,
        filter,
      }),
    [
      calendarRows,
      calendarRowsDate,
      selectedDate,
      calendarError,
      appointmentsById,
      filter,
    ],
  );
  const calendarAppointments = calendarSelection.appointments;

  function handleAppointmentUpdate(updated) {
    setActionError(null);
    setAppointments((prev) =>
      prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a))
    );
    setCalendarRows((prev) =>
      prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a))
    );
  }

  async function reloadAfterAppointmentSave() {
    const requestedDate = calendarQueryRef.current.date;
    const requestedFilter = calendarQueryRef.current.filter;
    const requestedView = calendarQueryRef.current.viewType;
    const refreshDay = requestedView === "calendar" && Boolean(requestedDate);
    const token = ++dayLoadGeneration.current;
    const catalogToken = ++catalogGeneration.current;

    setCalendarRefreshing(true);
    if (refreshDay) setCalendarLoading(true);
    setCalendarRefreshError(null);

    const dayPromise = refreshDay
      ? fetchAppointmentsByDate({
          date: requestedDate,
          doctorId: null,
          state: requestedFilter === "ALL" ? null : requestedFilter,
        })
      : Promise.resolve(null);

    try {
      const [settledDay, settledCatalog] = await Promise.allSettled([
        dayPromise,
        fetchAppointments(),
      ]);

      const dayStillCurrent =
        token === dayLoadGeneration.current &&
        calendarQueryRef.current.date === requestedDate &&
        calendarQueryRef.current.filter === requestedFilter &&
        calendarQueryRef.current.viewType === requestedView;
      const dayFailed = refreshDay && settledDay.status === "rejected";
      const catalogFailed = settledCatalog.status === "rejected";

      if (dayStillCurrent && (dayFailed || (!refreshDay && catalogFailed))) {
        setCalendarRefreshError(SAVED_VIEW_DETAIL);
        return;
      }

      if (
        !dayFailed &&
        settledCatalog.status === "fulfilled" &&
        catalogToken === catalogGeneration.current
      ) {
        const data = Array.isArray(settledCatalog.value) ? settledCatalog.value : [];
        setAppointments(data);
        rememberAppointmentIds(data.map((item) => item.id));
      }

      if (!dayStillCurrent || !refreshDay || settledDay.status !== "fulfilled") return;

      const { appointments: rows, summary } = settledDay.value ?? {};
      setCalendarRows(Array.isArray(rows) ? rows : []);
      setCalendarRowsDate(requestedDate);
      setCalendarSummary(summary ?? null);
      setCalendarError(null);
      setCalendarRefreshError(null);
    } finally {
      if (token === dayLoadGeneration.current) {
        setCalendarRefreshing(false);
        if (refreshDay) setCalendarLoading(false);
      }
    }
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

  function appointmentInView(appointmentId) {
    const inCalendar = calendarRows.find((row) => row?.id === appointmentId) ?? null;
    const inCatalog = appointments.find((row) => row?.id === appointmentId) ?? null;
    if (viewType === "calendar") return inCalendar ?? inCatalog;
    return inCatalog ?? inCalendar;
  }

  async function handleStateChange(appointmentId, nextState) {
    if (stateChangeIdsRef.current.has(appointmentId)) return;

    const current = appointmentInView(appointmentId);
    const previousState = current?.state;
    if (!current || previousState === nextState) {
      return;
    }

    if (isCancelledReactivation(previousState, nextState)) {
      setActionError(CANCELLED_CANNOT_REACTIVATE_MESSAGE);
      return;
    }

    stateChangeIdsRef.current.add(appointmentId);
    setActionError(null);
    setCalendarRefreshError(null);
    setAppointments((prev) =>
      prev.map((row) =>
        row.id === appointmentId ? { ...row, state: nextState } : row
      )
    );
    setSavingIds((prev) => new Set([...prev, appointmentId]));

    let saved = false;
    try {
      await updateAppointmentState({ id: appointmentId, change: nextState });
      saved = true;
    } catch (e) {
      setAppointments((prev) =>
        prev.map((row) =>
          row.id === appointmentId ? { ...row, state: previousState } : row
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

    if (!saved) {
      stateChangeIdsRef.current.delete(appointmentId);
      return;
    }

    try {
      await reloadAfterAppointmentSave();
    } finally {
      stateChangeIdsRef.current.delete(appointmentId);
    }
  }

  function requestSendConfirmation(appointment) {
    if (sendingConfirmationIdRef.current != null) return;
    if (appointment?.id == null || appointment.id === "") return;
    setConfirmationDialog({
      status: CONFIRMATION_DIALOG_STATUS.CONFIRM,
      appointment,
      errorMessage: null,
    });
  }

  function closeConfirmationDialog() {
    setConfirmationDialog((prev) =>
      prev.status === CONFIRMATION_DIALOG_STATUS.SENDING
        ? prev
        : getClosedConfirmationDialog()
    );
  }

  async function handleSendConfirmation(appointment) {
    if (appointment?.id == null || appointment.id === "") {
      setConfirmationDialog({
        status: CONFIRMATION_DIALOG_STATUS.ERROR,
        appointment: appointment ?? null,
        errorMessage: "No se pudo enviar la confirmación de la cita.",
      });
      return;
    }

    const appointmentId = appointment.id;
    if (
      sendingConfirmationId === appointmentId ||
      sendingConfirmationIdRef.current === appointmentId
    ) {
      return;
    }

    sendingConfirmationIdRef.current = appointmentId;
    setSendingConfirmationId(appointmentId);
    setConfirmationDialog({
      status: CONFIRMATION_DIALOG_STATUS.SENDING,
      appointment,
      errorMessage: null,
    });

    try {
      await sendAppointmentConfirmation(appointmentId);
      setConfirmationDialog({
        status: CONFIRMATION_DIALOG_STATUS.SUCCESS,
        appointment,
        errorMessage: null,
      });
    } catch (e) {
      if (isAlreadySentConfirmationError(e)) {
        setConfirmationDialog({
          status: CONFIRMATION_DIALOG_STATUS.ALREADY_SENT,
          appointment,
          errorMessage: null,
        });
      } else {
        setConfirmationDialog({
          status: CONFIRMATION_DIALOG_STATUS.ERROR,
          appointment,
          errorMessage:
            e instanceof Error && String(e.message).trim()
              ? e.message
              : "No se pudo enviar la confirmación de la cita.",
        });
      }
    } finally {
      sendingConfirmationIdRef.current = null;
      setSendingConfirmationId(null);
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

    const requestedDate = selectedDate;
    const requestedFilter = filter;
    const token = ++dayLoadGeneration.current;
    setCalendarRefreshing(false);
    setCalendarRefreshError(null);

    async function loadCalendarDay() {
      setCalendarLoading(true);
      setCalendarError(null);
      setCalendarRowsDate(null);
      try {
        const { appointments: rows, summary } = await fetchAppointmentsByDate({
          date: requestedDate,
          doctorId: null,
          state: requestedFilter === "ALL" ? null : requestedFilter,
        });
        if (token !== dayLoadGeneration.current) return;
        setCalendarRows(Array.isArray(rows) ? rows : []);
        setCalendarRowsDate(requestedDate);
        setCalendarSummary(summary ?? null);
      } catch (e) {
        if (token !== dayLoadGeneration.current) return;
        setCalendarRows([]);
        setCalendarRowsDate(requestedDate);
        setCalendarSummary(null);
        setCalendarError(
          e instanceof Error
            ? e.message
            : "No se pudo cargar el día del calendario."
        );
      } finally {
        if (token === dayLoadGeneration.current) setCalendarLoading(false);
      }
    }

    loadCalendarDay();
    return () => {
      dayLoadGeneration.current += 1;
    };
  }, [viewType, selectedDate, filter, calendarAttempt]);

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
              className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-brand bg-brand-primary px-4 py-2.5 text-sm font-medium text-brand-ink shadow-brand transition-colors hover:bg-brand-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30 sm:w-auto"
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

          {!loading && !error && actionSuccess && (
            <div
              className="mb-4 rounded-brand border border-brand-success/25 bg-brand-success-soft px-4 py-3 text-sm text-brand-success"
              role="status"
            >
              <p className="font-medium">{actionSuccess}</p>
            </div>
          )}

          {!loading && !error && calendarRefreshing && (
            <p
              className="mb-4 text-sm font-medium text-brand-text-muted"
              role="status"
              aria-live="polite"
            >
              Actualizando la agenda…
            </p>
          )}

          {!loading && !error && calendarRefreshError && (
            <div
              className="mb-4 rounded-brand border border-brand-danger/25 bg-brand-danger-soft px-4 py-3 text-sm text-brand-danger"
              role="alert"
            >
              <p className="font-medium">{SAVED_VIEW_TITLE}</p>
              <p className="mt-1">{calendarRefreshError}</p>
              <button
                type="button"
                onClick={() => {
                  void reloadAfterAppointmentSave();
                }}
                disabled={calendarRefreshing}
                className="mt-3 rounded-brand border border-brand-danger/30 bg-brand-surface px-3 py-1.5 text-xs font-medium text-brand-danger disabled:opacity-50"
              >
                Reintentar
              </button>
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
                    sendingConfirmationId={sendingConfirmationId}
                    onStateChange={handleStateChange}
                    onAppointmentUpdate={handleAppointmentUpdate}
                    onSendConfirmation={requestSendConfirmation}
                    onEditAppointment={setEditingAppointment}
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
                      className="rounded-brand border border-brand-danger/25 bg-brand-danger-soft px-4 py-3 text-sm text-brand-danger"
                      role="alert"
                    >
                      <p className="font-medium">No se pudieron cargar las citas de este día.</p>
                      <p className="mt-1">{calendarError}</p>
                      <button
                        type="button"
                        onClick={() => setCalendarAttempt((attempt) => attempt + 1)}
                        className="mt-3 rounded-brand border border-brand-danger/30 bg-brand-surface px-3 py-1.5 text-xs font-medium text-brand-danger"
                      >
                        Reintentar
                      </button>
                    </div>
                  ) : (
                    <CalendarView
                      appointments={calendarAppointments}
                      loading={calendarLoading || calendarSelection.status === "pending"}
                      selectedDate={selectedDate}
                      onAppointmentClick={setEditingAppointment}
                      onStateChange={handleStateChange}
                      savingIds={savingIds}
                    />
                  )}
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
        onSave={async () => {
          await reloadAfterAppointmentSave();
          setEditingAppointment(null);
        }}
        onSendConfirmation={requestSendConfirmation}
        sendingConfirmationId={sendingConfirmationId}
      />

      <AppointmentConfirmationDialog
        status={confirmationDialog.status}
        errorMessage={confirmationDialog.errorMessage}
        onConfirm={() => handleSendConfirmation(confirmationDialog.appointment)}
        onClose={closeConfirmationDialog}
      />
    </div>
  );
}
