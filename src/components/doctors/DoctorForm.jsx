import { useEffect, useMemo, useState } from "react";

function normalize(text) {
  return String(text ?? "").trim();
}

function isActiveFromDoctor(doctor) {
  const s = String(doctor?.status ?? doctor?.active ?? "").trim().toLowerCase();
  if (s === "inactive" || s === "inactivo" || s === "n" || s === "false") return false;
  return true;
}

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      onClick={() => onChange?.(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 focus:ring-offset-1"
      aria-pressed={checked}
    >
      <span className="text-sm font-semibold text-gray-900">{label}</span>
      <span
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
          checked ? "bg-emerald-500" : "bg-gray-200"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
            checked ? "translate-x-5" : "translate-x-1"
          }`}
        />
      </span>
    </button>
  );
}

export default function DoctorForm({ mode, doctor, onSubmit, onCancel }) {
  const isEdit = mode === "edit";

  const initial = useMemo(() => {
    return {
      name: isEdit ? normalize(doctor?.name) : "",
      specialty: isEdit ? normalize(doctor?.specialty) : "",
      active: isEdit ? isActiveFromDoctor(doctor) : true,
    };
  }, [doctor, isEdit]);

  const [name, setName] = useState(initial.name);
  const [specialty, setSpecialty] = useState(initial.specialty);
  const [active, setActive] = useState(initial.active);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setName(initial.name);
    setSpecialty(initial.specialty);
    setActive(initial.active);
    setError(null);
    setSubmitting(false);
  }, [initial]);

  async function handleSubmit(e) {
    e.preventDefault();
    const nextName = normalize(name);
    if (!nextName) {
      setError("El nombre es obligatorio.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit?.({
        name: nextName,
        specialty: normalize(specialty),
        active,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo guardar. Intenta de nuevo."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const primaryLabel = isEdit ? "Guardar cambios" : "Crear especialista";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-xs font-semibold text-gray-500">Nombre</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm transition placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/25"
          placeholder="Ej: Juan Velázquez"
          autoFocus
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500">Especialidad</label>
        <input
          value={specialty}
          onChange={(e) => setSpecialty(e.target.value)}
          className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm transition placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/25"
          placeholder="Ej: Cardiología"
        />
      </div>

      {isEdit ? (
        <div>
          <label className="block text-xs font-semibold text-gray-500">Estado</label>
          <div className="mt-2">
            <Toggle
              checked={active}
              onChange={setActive}
              label={active ? "Activo" : "Inactivo"}
            />
          </div>
        </div>
      ) : null}

      {error ? (
        <div
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={() => onCancel?.()}
          className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 focus:ring-offset-1"
          disabled={submitting}
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={submitting}
        >
          {submitting ? "Guardando..." : primaryLabel}
        </button>
      </div>
    </form>
  );
}

