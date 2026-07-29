import { useEffect, useState } from "react";
import {
  Calendar,
  Clock,
  Hash,
  Sparkles,
  X,
} from "lucide-react";
import { normalizeTimeKey } from "./appointmentHelpers";
import {
  updateAppointment,
  updateAppointmentState,
} from "../../services/appointmentService";
import {
  DEFAULT_SLOT_MINUTES,
  STATE_OPTIONS,
  buildUpdateAppointmentPayload,
  buildUpdatedAppointment,
  formatAppointmentDateLong,
  getAppointmentDateRaw,
  getNotes,
  getPatientName,
  getEditDurationMaxSlots,
  resolveSlotCount,
  normalizeAppointmentState,
} from "./appointmentEditHelpers";
import AppointmentDurationSelect from "./AppointmentDurationSelect";
import Button from "../ui/Button";

const inputClass = "nb-input disabled:bg-brand-soft";

const labelClass = "nb-label";

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
      icon: Sparkles,
      label: "Especialista",
      value: appointment?.doctorName ?? appointment?.doctor ?? "—",
    },
    {
      icon: Hash,
      label: "Folio de cita",
      value: appointment?.id != null ? String(appointment.id) : "—",
    },
  ];

  return (
    <div className="rounded-brand-md border border-brand-border bg-brand-soft/60 p-4">
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-brand-text-muted">
        Información de la cita
      </p>
      <dl className="space-y-3">
        {items.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-brand bg-brand-surface text-brand-text-muted shadow-brand ring-1 ring-brand-border">
              <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <dt className="text-[11px] font-medium text-brand-text-muted">{label}</dt>
              <dd className="mt-0.5 text-sm font-medium text-brand-text">{value}</dd>
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
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    if (!appointment || !isOpen) return;
    setPatientName(getPatientName(appointment));
    setSlotCount(resolveSlotCount(appointment));
    setState(normalizeAppointmentState(appointment?.state));
    setNotes(getNotes(appointment));
    setSaving(false);
    setSaveError(null);
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
    setSaveError(null);

    const form = {
      patientName: trimmedName,
      slotCount,
      state,
      notes,
    };

    try {
      await updateAppointment(
        appointment.id,
        buildUpdateAppointmentPayload(form),
      );

      const previousState = normalizeAppointmentState(appointment.state);
      if (state !== previousState) {
        await updateAppointmentState({ id: appointment.id, change: state });
      }

      const updated = buildUpdatedAppointment(appointment, form);
      onSave?.(updated);
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "No se pudieron guardar los cambios.",
      );
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
        className={`nb-overlay absolute inset-0 transition-opacity duration-200 ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden
        onClick={handleClose}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Editar cita"
        className={`absolute right-0 top-0 flex h-full w-full flex-col border-l border-brand-border bg-brand-surface shadow-brand-lg transition-transform duration-300 ease-out sm:max-w-[420px] ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-brand-border px-5 py-5 sm:px-6">
          <div className="min-w-0">
            <h2 className="font-display text-base font-semibold text-brand-text">Editar cita</h2>
            <p className="mt-1 text-xs text-brand-text-muted">
              Actualiza los datos de la cita
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={saving}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-brand border border-brand-border bg-brand-surface text-brand-text-muted shadow-brand transition hover:bg-brand-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/25 disabled:opacity-50"
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
                    Clienta
                  </label>
                  <input
                    id="patient-name"
                    type="text"
                    required
                    disabled={saving}
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    className={inputClass}
                    placeholder="Nombre de la clienta"
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
                    maxSlotCount={getEditDurationMaxSlots(resolveSlotCount(appointment))}
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
                    <span className="font-normal normal-case tracking-normal text-brand-text-muted">
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
                    placeholder="Servicio, preferencias u observaciones…"
                  />
                </div>
              </div>
            ) : null}
          </div>

          <footer className="shrink-0 border-t border-brand-border bg-brand-surface px-5 py-4 sm:px-6">
            {saveError ? (
              <div
                className="mb-3 rounded-brand border border-brand-danger/30 bg-brand-danger-soft px-3.5 py-2.5 text-xs text-brand-danger"
                role="alert"
              >
                {saveError}
              </div>
            ) : null}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" disabled={saving} onClick={handleClose}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={!patientName.trim()}
                loading={saving}
              >
                <span>{saving ? "Guardando…" : "Guardar cambios"}</span>
              </Button>
            </div>
          </footer>
        </form>
      </aside>
    </div>
  );
}
