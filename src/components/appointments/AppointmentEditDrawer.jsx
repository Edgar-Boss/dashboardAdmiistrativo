import { useEffect, useState } from "react";
import {
  Calendar,
  Clock,
  Hash,
  Stethoscope,
  X,
} from "lucide-react";
import { normalizeTimeKey } from "./appointmentHelpers";
import {
  DEFAULT_SLOT_MINUTES,
  STATE_OPTIONS,
  buildUpdatedAppointment,
  formatAppointmentDateLong,
  getAppointmentDateRaw,
  getNotes,
  getPatientName,
  getSlotCount,
  normalizeAppointmentState,
} from "./appointmentEditHelpers";
import AppointmentDurationSelect from "./AppointmentDurationSelect";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm transition placeholder:text-gray-400 hover:border-gray-300 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200/80 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-60";

const labelClass =
  "mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500";

function ReadOnlyInfo({ appointment }) {
  const dateRaw = getAppointmentDateRaw(appointment);
  const items = [
    {
      icon: Calendar,
      label: "Fecha",
      value: formatAppointmentDateLong(dateRaw),
    },
    {
      icon: Clock,
      label: "Hora de inicio",
      value: normalizeTimeKey(appointment?.appointmentTime),
    },
    {
      icon: Stethoscope,
      label: "Doctor",
      value: appointment?.doctorName ?? appointment?.doctor ?? "—",
    },
    {
      icon: Hash,
      label: "ID de cita",
      value: appointment?.id != null ? String(appointment.id) : "—",
    },
  ];

  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/90 p-4">
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
        Información de la cita
      </p>
      <dl className="space-y-3">
        {items.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-gray-400 shadow-sm ring-1 ring-gray-100">
              <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <dt className="text-[11px] font-medium text-gray-500">{label}</dt>
              <dd className="mt-0.5 text-sm font-medium text-gray-900">{value}</dd>
            </div>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default function AppointmentEditDrawer({
  appointment,
  isOpen,
  onClose,
  onSave,
}) {
  const [patientName, setPatientName] = useState("");
  const [slotCount, setSlotCount] = useState(1);
  const [state, setState] = useState("PENDING");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!appointment || !isOpen) return;
    setPatientName(getPatientName(appointment));
    setSlotCount(getSlotCount(appointment));
    setState(normalizeAppointmentState(appointment?.state));
    setNotes(getNotes(appointment));
    setSaving(false);
  }, [appointment, isOpen]);

  useEffect(() => {
    if (!isOpen || saving) return undefined;

    function onKeyDown(event) {
      if (event.key === "Escape") onClose?.();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, saving, onClose]);

  const stateOption =
    STATE_OPTIONS.find((o) => o.value === state) ?? STATE_OPTIONS[0];

  async function handleSubmit(event) {
    event.preventDefault();
    if (!appointment || saving) return;

    const trimmedName = patientName.trim();
    if (!trimmedName) return;

    setSaving(true);
    try {
      const updated = buildUpdatedAppointment(appointment, {
        patientName: trimmedName,
        slotCount,
        state,
        notes,
      });

      await new Promise((resolve) => setTimeout(resolve, 600));
      console.log("[AppointmentEdit] Guardar cambios", updated);
      onSave?.(updated);
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    if (saving) return;
    onClose?.();
  }

  return (
    <div
      className={`fixed inset-0 z-50 ${isOpen ? "pointer-events-auto" : "pointer-events-none"}`}
      aria-hidden={!isOpen}
    >
      <div
        className={`absolute inset-0 bg-gray-900/40 transition-opacity duration-200 ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden
        onClick={handleClose}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Editar cita"
        className={`absolute right-0 top-0 flex h-full w-full flex-col border-l border-gray-100 bg-white shadow-2xl transition-transform duration-300 ease-out sm:max-w-[420px] ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-100 px-5 py-5 sm:px-6">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-gray-900">Editar cita</h2>
            <p className="mt-1 text-xs text-gray-500">
              Actualiza los datos editables de la cita
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={saving}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 focus:ring-offset-1 disabled:opacity-50"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </header>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col"
          noValidate
        >
          <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
            {appointment ? (
              <div className="space-y-6">
                <ReadOnlyInfo appointment={appointment} />

                <div>
                  <label htmlFor="patient-name" className={labelClass}>
                    Paciente
                  </label>
                  <input
                    id="patient-name"
                    type="text"
                    required
                    disabled={saving}
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    className={inputClass}
                    placeholder="Nombre del paciente"
                    autoComplete="name"
                  />
                </div>

                <div>
                  <label htmlFor="appointment-duration" className={labelClass}>
                    Duración
                  </label>
                  <AppointmentDurationSelect
                    slotCount={slotCount}
                    onChange={setSlotCount}
                    slotMinutes={DEFAULT_SLOT_MINUTES}
                    appointmentTime={appointment.appointmentTime}
                    disabled={saving}
                  />
                </div>

                <div>
                  <label htmlFor="appointment-state" className={labelClass}>
                    Estado
                  </label>
                  <select
                    id="appointment-state"
                    disabled={saving}
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className={`${inputClass} cursor-pointer font-medium ${stateOption.selectClass}`}
                  >
                    {STATE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="appointment-notes" className={labelClass}>
                    Notas{" "}
                    <span className="font-normal normal-case tracking-normal text-gray-400">
                      (opcional)
                    </span>
                  </label>
                  <textarea
                    id="appointment-notes"
                    rows={4}
                    disabled={saving}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className={`${inputClass} resize-none`}
                    placeholder="Motivo, indicaciones u observaciones…"
                  />
                </div>
              </div>
            ) : null}
          </div>

          <footer className="shrink-0 border-t border-gray-100 bg-white px-5 py-4 sm:px-6">
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={saving}
                onClick={handleClose}
                className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 focus:ring-offset-1 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving || !patientName.trim()}
                className="inline-flex items-center justify-center rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500/30 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Guardando…" : "Guardar cambios"}
              </button>
            </div>
          </footer>
        </form>
      </aside>
    </div>
  );
}
