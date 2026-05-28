const labelClass =
  "mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm transition placeholder:text-gray-400 hover:border-gray-300 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500";

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
              className="mb-2 rounded-xl border border-amber-200/80 bg-amber-50 px-3 py-2 text-xs text-amber-900"
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
              className="mb-2 rounded-xl border border-amber-200/80 bg-amber-50 px-3 py-2 text-xs text-amber-900"
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
            Razón de la cita{" "}
            <span className="font-normal normal-case tracking-normal text-gray-400">
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
            placeholder="Ej. Revisión, control, examen, etc."
          />
        </div>
      </div>

      <footer className="shrink-0 border-t border-gray-100 bg-white px-5 py-4 sm:px-6">
        {submitError ? (
          <div
            className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-800"
            role="alert"
          >
            {submitError}
          </div>
        ) : null}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 focus:ring-offset-1 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!isCreateFormValid(form) || saving}
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Creando…" : "Crear cita"}
          </button>
        </div>
      </footer>
    </form>
  );
}
