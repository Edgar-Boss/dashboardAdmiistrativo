import { useEffect, useMemo, useState } from "react";
import AppointmentTable from "../components/appointments/AppointmentTable";
import FilterTabs from "../components/appointments/FilterTabs";
import SummaryCards from "../components/appointments/SummaryCards";
import {
  fetchAppointments,
  updateAppointmentState,
} from "../services/appointmentService";

function normalizeState(state) {
  const normalized = typeof state === "string" ? state.toUpperCase() : "";
  return ["PENDING", "CONFIRMED", "CANCELLED"].includes(normalized)
    ? normalized
    : "PENDING";
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [savingIds, setSavingIds] = useState(() => new Set());
  const [filter, setFilter] = useState("ALL");

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString("es-ES", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    []
  );

  const filteredAppointments = useMemo(() => {
    if (filter === "ALL") return appointments;
    return appointments.filter((a) => normalizeState(a.state) === filter);
  }, [appointments, filter]);

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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Citas de Hoy
          </h1>
          <p className="mt-2 capitalize text-slate-500 sm:text-base">{todayLabel}</p>
        </header>

        {!loading && !error && (
          <SummaryCards appointments={appointments} />
        )}

        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
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
            <div className="flex min-h-[160px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-10 text-center">
              <p className="text-sm font-medium text-slate-600">
                No appointments to display.
              </p>
              <p className="mt-1 max-w-md text-xs text-slate-500">
                When the backend returns records, they will appear in the table
                below.
              </p>
            </div>
          )}

          {!loading && !error && appointments.length > 0 && (
            <>
              <FilterTabs value={filter} onChange={setFilter} />
              <AppointmentTable
                appointments={filteredAppointments}
                savingIds={savingIds}
                onStateChange={handleStateChange}
              />
            </>
          )}
        </section>
      </div>
    </div>
  );
}
