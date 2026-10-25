import { useEffect, useRef, useState } from "react";
import {
  Calendar,
  Clock,
  Hash,
  Phone,
  Send,
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
  formatAppointmentDateLong,
  formatDurationLabel,
  getAppointmentDateRaw,
  getNotes,
  getPatientName,
  getEditDurationMaxSlots,
  resolveSlotCount,
  normalizeAppointmentState,
  isAppointmentEditFormDirty,
} from "./appointmentEditHelpers";
import {
  describeAppointmentTemporal,
  durationChangeLocked,
} from "./appointmentTemporal";
import {
  canSendAppointmentConfirmation,
  isSendingAppointmentConfirmation,
} from "./appointmentConfirmationAction";
import {
  CANCELLED_CANNOT_REACTIVATE_MESSAGE,
  CANCELLED_INFO_MESSAGE,
  isCancelledAppointment,
  isCancelledReactivation,
} from "./appointmentStateConfirm";
import AppointmentDurationSelect from "./AppointmentDurationSelect";
import Button from "../ui/Button";

const inputClass = "nb-input disabled:bg-brand-soft";

const labelClass = "nb-label";

function getClientPhone(appointment) {
  const raw =
    appointment?.phoneNumber ??
    appointment?.phone_number ??
    appointment?.phone ??
    "";
  const phone = String(raw).trim();
  return phone || "—";
}

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
      label: "Doctor",
      value: appointment?.doctorName ?? appointment?.doctor ?? "—",
    },
    {
      icon: Phone,
      label: "Teléfono del paciente",
      value: getClientPhone(appointment),
      valueClass: "tabular-nums",
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
        {items.map(({ icon: Icon, label, value, valueClass = "" }) => (
          <div key={label} className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-brand bg-brand-surface text-brand-text-muted shadow-brand ring-1 ring-brand-border">
              <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <dt className="text-[11px] font-medium text-brand-text-muted">{label}</dt>
              <dd className={`mt-0.5 text-sm font-medium text-brand-text ${valueClass}`.trim()}>
                {value}
              </dd>
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
  onSendConfirmation,
  sendingConfirmationId,
}) {
  const [patientName, setPatientName] = useState("");
  const [slotCount, setSlotCount] = useState(1);
  const [state, setState] = useState("PENDING");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const savingRef = useRef(false);

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

  const previousState = normalizeAppointmentState(appointment?.state);
  const isCancelled = isCancelledAppointment(previousState);
  const effectiveState = isCancelled ? "CANCELLED" : state;
  const canSendWhatsappConfirmation = canSendAppointmentConfirmation(previousState);
  const isSendingConfirmation = isSendingAppointmentConfirmation(
    sendingConfirmationId,
    appointment?.id,
  );
  const isDirty = isAppointmentEditFormDirty(appointment, {
    patientName,
    slotCount,
    state: effectiveState,
    notes,
  });
  const sendDisabled = saving || isDirty || isSendingConfirmation;
  const stateOptions = isCancelled
    ? STATE_OPTIONS.filter((option) => option.value === "CANCELLED")
    : STATE_OPTIONS;
  const stateOption =
    STATE_OPTIONS.find((o) => o.value === effectiveState) ?? STATE_OPTIONS[0];
  const temporal = describeAppointmentTemporal(appointment);
  const durationLocked = durationChangeLocked(appointment);
  const durationSlotMinutes =
    temporal.kind === "ok" && temporal.slotMinutesAtBooking
      ? temporal.slotMinutesAtBooking
      : DEFAULT_SLOT_MINUTES;
  const recordedDurationLabel = Number.isFinite(temporal.durationMinutes)
    ? formatDurationLabel(temporal.durationMinutes, 1)
    : null;

  async function handleSubmit(event) {
    event.preventDefault();
    if (!appointment || savingRef.current) return;

    const trimmedName = patientName.trim();
    if (!trimmedName) return;

    const nextState = isCancelled ? "CANCELLED" : state;
    if (isCancelledReactivation(previousState, nextState)) {
      setSaveError(CANCELLED_CANNOT_REACTIVATE_MESSAGE);
      return;
    }

    savingRef.current = true;
    setSaving(true);
    setSaveError(null);

    const form = {
      patientName: trimmedName,
      slotCount,
      state: nextState,
      notes,
    };

    try {
      await updateAppointment(
        appointment.id,
        buildUpdateAppointmentPayload(form, appointment),
      );

      if (nextState !== previousState) {
        await updateAppointmentState({
          id: appointment.id,
          change: nextState,
        });
      }

      await onSave?.();
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "No se pudieron guardar los cambios.",
      );
    } finally {
      savingRef.current = false;
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
                    slotMinutes={durationSlotMinutes}
                    maxSlotCount={getEditDurationMaxSlots(
                      durationLocked ? 1 : resolveSlotCount(appointment),
                    )}
                    appointmentTime={appointment.appointmentTime}
                    disabled={saving || durationLocked}
                    unavailable={durationLocked}
                    startAt={temporal.kind === "ok" ? temporal.startAt : null}
                    endAt={temporal.kind === "ok" ? temporal.endAt : null}
                    recordedDurationLabel={recordedDurationLabel}
                  />
                </div>

                <div>
                  <label htmlFor="appointment-state" className={labelClass}>
                    Estado
                  </label>
                  <select
                    id="appointment-state"
                    disabled={saving || isCancelled}
                    value={effectiveState}
                    onChange={(e) => setState(e.target.value)}
                    className={`${inputClass} font-medium ${stateOption.selectClass} ${
                      isCancelled ? "cursor-not-allowed opacity-80" : "cursor-pointer"
                    }`}
                  >
                    {stateOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {isCancelled ? (
                    <p className="mt-2 text-xs leading-snug text-brand-text-muted">
                      {CANCELLED_INFO_MESSAGE}
                    </p>
                  ) : null}
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
                    placeholder="Motivo, síntomas u observaciones…"
                  />
                </div>

                {canSendWhatsappConfirmation ? (
                  <section className="border-t border-brand-border pt-6">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-text-muted">
                      Confirmación por WhatsApp
                    </p>
                    <p className="mt-1 text-xs leading-snug text-brand-text-muted">
                      Envía al paciente los datos confirmados de su cita.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-3 min-h-11 w-full sm:w-auto"
                      disabled={sendDisabled}
                      aria-busy={isSendingConfirmation || undefined}
                      onClick={() => {
                        if (sendDisabled) return;
                        onSendConfirmation?.(appointment);
                      }}
                    >
                      <Send className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                      {isSendingConfirmation ? "Enviando..." : "Enviar confirmación"}
                    </Button>
                    {isDirty ? (
                      <p className="mt-2 text-xs leading-snug text-brand-text-muted">
                        Guarda los cambios antes de enviar la confirmación.
                      </p>
                    ) : null}
                  </section>
                ) : null}
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
