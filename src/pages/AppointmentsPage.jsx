import { useEffect, useState } from "react";
import AppointmentStateSelect from "../components/AppointmentStateSelect";
import {
  fetchAppointments,
  updateAppointmentState,
} from "../services/appointmentService";

function formatDisplay(value, fallback = "—") {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }
  return String(value);
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [savingIds, setSavingIds] = useState(() => new Set());

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
    <div className="min-h-screen bg-slate-100/80">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Appointments
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Overview of scheduled visits from the admin API.
          </p>
        </header>

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
            <div className="-mx-1 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead>
                  <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th scope="col" className="whitespace-nowrap px-4 py-3">
                      ID
                    </th>
                    <th scope="col" className="whitespace-nowrap px-4 py-3">
                      Paciente
                    </th>
                    <th scope="col" className="whitespace-nowrap px-4 py-3">
                      Teléfono
                    </th>
                    <th scope="col" className="whitespace-nowrap px-4 py-3">
                      Doctor
                    </th>
                    <th scope="col" className="whitespace-nowrap px-4 py-3">
                      Fecha
                    </th>
                    <th scope="col" className="whitespace-nowrap px-4 py-3">
                      Hora
                    </th>
                    <th scope="col" className="whitespace-nowrap px-4 py-3">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {appointments.map((row) => (
                    <tr
                      key={row.id}
                      className="transition-colors hover:bg-slate-50/80"
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-600">
                        {formatDisplay(row.id)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                        {formatDisplay(row.name)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                        {formatDisplay(row.phoneNumber)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                        {formatDisplay(row.doctorName)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                        {formatDisplay(row.appointmentDate)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                        {formatDisplay(row.appointmentTime)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <AppointmentStateSelect
                          value={row.state}
                          disabled={savingIds.has(row.id)}
                          onChange={(next) => handleStateChange(row.id, next)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
