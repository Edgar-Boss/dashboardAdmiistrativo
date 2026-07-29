import { useEffect, useMemo, useState } from "react";
import Button from "../ui/Button";

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
      className="flex w-full items-center justify-between gap-3 rounded-brand border border-brand-border bg-brand-surface px-4 py-3 text-left shadow-brand transition hover:border-brand-border-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/25"
      aria-pressed={checked}
    >
      <span className="text-sm font-semibold text-brand-text">{label}</span>
      <span
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
          checked ? "bg-brand-success" : "bg-brand-border-strong"
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
        <label className="block text-xs font-semibold text-brand-text-muted">Nombre</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-2 w-full rounded-brand border border-brand-border bg-brand-surface px-3.5 py-2.5 text-sm text-brand-text shadow-brand transition placeholder:text-brand-text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/25"
          placeholder="Ej: Ana López"
          autoFocus
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-brand-text-muted">Servicio</label>
        <input
          value={specialty}
          onChange={(e) => setSpecialty(e.target.value)}
          className="mt-2 w-full rounded-brand border border-brand-border bg-brand-surface px-3.5 py-2.5 text-sm text-brand-text shadow-brand transition placeholder:text-brand-text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/25"
          placeholder="Ej: Uñas gel, Pedicure spa"
        />
      </div>

      {isEdit ? (
        <div>
          <label className="block text-xs font-semibold text-brand-text-muted">Estado</label>
          <div className="mt-2">
            <Toggle
              checked={active}
              onChange={setActive}
              label={active ? "Activa" : "Inactiva"}
            />
          </div>
        </div>
      ) : null}

      {error ? (
        <div
          className="rounded-brand border border-brand-danger/30 bg-brand-danger-soft px-4 py-3 text-sm font-medium text-brand-danger"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={() => onCancel?.()} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" loading={submitting}>
          {submitting ? "Guardando..." : primaryLabel}
        </Button>
      </div>
    </form>
  );
}

