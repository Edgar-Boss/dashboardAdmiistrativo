import Button from "../ui/Button";

const labelClass = "nb-label";

const inputClass = "nb-input disabled:bg-brand-soft";

export function isCreateFormValid(form) {
  return Boolean(
    form.name.trim() &&
      form.phoneNumber.trim() &&
      form.doctorId &&
      form.appointmentDate &&
      form.appointmentTime,
  );
}

export default function AppointmentCreateForm({
  form,
  onFieldChange,
  onSubmit,
  onCancel,
  doctors = [],
  doctorsLoading = false,
  doctorsError = null,
  availableSlots = [],
  slotsLoading = false,
  slotsError = null,
  saving = false,
  submitError = null,
}) {
  const slotsEnabled = Boolean(form.doctorId && form.appointmentDate);
  const timeSelectDisabled = !slotsEnabled || slotsLoading || saving;
  const fieldsDisabled = saving;

  return (
    <form
      onSubmit={onSubmit}
      className="flex min-h-0 flex-1 flex-col"
      noValidate
    >
      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
        <div>
          <label htmlFor="create-patient-name" className={labelClass}>
            Nombre del paciente
          </label>
          <input
            id="create-patient-name"
            type="text"
            value={form.name}
            disabled={fieldsDisabled}
            onChange={(e) => onFieldChange("name", e.target.value)}
            className={inputClass}
            placeholder="Ej. Ana Laura Díaz Ortiz"
            autoComplete="name"
          />
        </div>

        <div>
          <label htmlFor="create-phone" className={labelClass}>
            Teléfono
          </label>
          <input
            id="create-phone"
            type="tel"
            value={form.phoneNumber}
            disabled={fieldsDisabled}
            onChange={(e) => onFieldChange("phoneNumber", e.target.value)}
            className={inputClass}
            placeholder="Ej. 222 123 4567"
            autoComplete="tel"
          />
        </div>

        <div>
          <label htmlFor="create-doctor" className={labelClass}>
            Doctor
          </label>
          {doctorsError ? (
            <p
              className="mb-2 rounded-brand border border-brand-accent/40 bg-brand-warning-soft px-3 py-2 text-xs text-brand-warning"
              role="alert"
            >
              {doctorsError}
            </p>
          ) : null}
          <select
            id="create-doctor"
            value={form.doctorId}
            disabled={doctorsLoading || fieldsDisabled}
            onChange={(e) => onFieldChange("doctorId", e.target.value)}
            className={`${inputClass} cursor-pointer`}
          >
            <option value="">
              {doctorsLoading ? "Cargando doctores…" : "Seleccionar doctor"}
            </option>
            {doctors.map((doctor) => (
              <option key={doctor.id} value={String(doctor.id)}>
                {doctor.specialty
                  ? `${doctor.name} — ${doctor.specialty}`
                  : doctor.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="create-date" className={labelClass}>
            Fecha
          </label>
          <input
            id="create-date"
            type="date"
            value={form.appointmentDate}
            disabled={fieldsDisabled}
            onChange={(e) => onFieldChange("appointmentDate", e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="create-time" className={labelClass}>
            Horario disponible
          </label>
          {slotsError ? (
            <p
              className="mb-2 rounded-brand border border-brand-accent/40 bg-brand-warning-soft px-3 py-2 text-xs text-brand-warning"
              role="alert"
            >
              {slotsError}
            </p>
          ) : null}
          <select
            id="create-time"
            value={form.appointmentTime}
            disabled={timeSelectDisabled}
            onChange={(e) => onFieldChange("appointmentTime", e.target.value)}
            className={`${inputClass} cursor-pointer`}
          >
            <option value="">
              {!slotsEnabled
                ? "Selecciona fecha y doctor primero"
                : slotsLoading
                  ? "Cargando horarios…"
                  : availableSlots.length === 0
                    ? "Sin horarios disponibles"
                    : "Seleccionar horario"}
            </option>
            {slotsEnabled && !slotsLoading
              ? availableSlots.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))
              : null}
          </select>
        </div>

        <div>
          <label htmlFor="create-reason" className={labelClass}>
            Motivo de consulta{" "}
            <span className="font-normal normal-case tracking-normal text-brand-text-muted">
              (opcional)
            </span>
          </label>
          <textarea
            id="create-reason"
            rows={4}
            value={form.reason}
            disabled={fieldsDisabled}
            onChange={(e) => onFieldChange("reason", e.target.value)}
            className={`${inputClass} resize-none`}
            placeholder="Ej. Consulta general, control, estudios…"
          />
        </div>
      </div>

      <footer className="shrink-0 border-t border-brand-border bg-brand-surface px-5 py-4 sm:px-6">
        {submitError ? (
          <div
            className="mb-3 rounded-brand border border-brand-danger/30 bg-brand-danger-soft px-3.5 py-2.5 text-xs text-brand-danger"
            role="alert"
          >
            {submitError}
          </div>
        ) : null}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!isCreateFormValid(form)} loading={saving}>
            <span>{saving ? "Creando…" : "Crear cita"}</span>
          </Button>
        </div>
      </footer>
    </form>
  );
}
