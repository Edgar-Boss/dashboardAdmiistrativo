import { useEffect, useMemo, useState } from "react";
import Button from "../ui/Button";

const PHONE_ALLOWED_RE = /^[0-9+\-\s]*$/;
const MX_COUNTRY_PREFIX = "52";

function normalize(text) {
  return String(text ?? "").trim();
}

function onlyDigits(phone) {
  return String(phone ?? "").replace(/\D/g, "");
}

/** Show national 10 digits when backend stored 52 + 10. */
function toNationalWhatsappInput(phone) {
  const digits = onlyDigits(phone);
  if (digits.length === 12 && digits.startsWith(MX_COUNTRY_PREFIX)) {
    return digits.slice(2);
  }
  return digits.length === 10 ? digits : String(phone ?? "");
}

/** Build 12-digit payload: 52 + exactly 10 national digits. */
function toWhatsappPayload(phone) {
  const digits = onlyDigits(phone);
  if (digits.length === 0) return "";
  return `${MX_COUNTRY_PREFIX}${digits}`;
}

function isActiveFromDoctor(doctor) {
  const s = String(doctor?.status ?? doctor?.active ?? "").trim().toLowerCase();
  if (s === "inactive" || s === "inactivo" || s === "n" || s === "false") return false;
  return true;
}

function Toggle({ checked, onChange, label, disabled = false }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        onChange?.(!checked);
      }}
      className={`flex w-full items-center justify-between gap-3 rounded-brand border border-brand-border bg-brand-surface px-4 py-3 text-left shadow-brand transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/25 ${
        disabled
          ? "cursor-not-allowed opacity-60"
          : "hover:border-brand-border-strong"
      }`}
      aria-pressed={checked}
      aria-disabled={disabled}
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
      whatsappPhone: isEdit
        ? toNationalWhatsappInput(doctor?.whatsappPhone ?? "")
        : "",
      notificationsEnabled: isEdit
        ? Boolean(doctor?.notificationsEnabled)
        : false,
    };
  }, [doctor, isEdit]);

  const [name, setName] = useState(initial.name);
  const [specialty, setSpecialty] = useState(initial.specialty);
  const [active, setActive] = useState(initial.active);
  const [whatsappPhone, setWhatsappPhone] = useState(initial.whatsappPhone);
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    initial.notificationsEnabled
  );
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setName(initial.name);
    setSpecialty(initial.specialty);
    setActive(initial.active);
    setWhatsappPhone(initial.whatsappPhone);
    setNotificationsEnabled(initial.notificationsEnabled);
    setError(null);
    setSubmitting(false);
  }, [initial]);

  const phoneTrimmed = whatsappPhone.trim();
  const phoneEmpty = phoneTrimmed.length === 0;
  const notificationsToggleDisabled = phoneEmpty;

  function handlePhoneChange(value) {
    setWhatsappPhone(value);
    if (String(value ?? "").trim().length === 0) {
      setNotificationsEnabled(false);
    }
  }

  function handleNotificationsChange(next) {
    if (phoneEmpty) {
      setNotificationsEnabled(false);
      setError(
        "Agrega un número WhatsApp para activar las notificaciones de nuevas citas."
      );
      return;
    }
    setError(null);
    setNotificationsEnabled(next);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const nextName = normalize(name);
    if (!nextName) {
      setError("El nombre es obligatorio.");
      return;
    }

    let nextNotifications = notificationsEnabled;
    let phoneValue = "";

    if (phoneEmpty) {
      nextNotifications = false;
      phoneValue = "";
    } else {
      if (!PHONE_ALLOWED_RE.test(whatsappPhone)) {
        setError(
          "El número WhatsApp solo puede contener dígitos, espacios, + y guiones."
        );
        return;
      }
      const digits = onlyDigits(whatsappPhone);
      if (digits.length !== 10) {
        setError("El número WhatsApp debe tener exactamente 10 dígitos.");
        return;
      }
      phoneValue = toWhatsappPayload(digits);
    }

    if (nextNotifications && phoneEmpty) {
      setError(
        "Agrega un número WhatsApp para activar las notificaciones de nuevas citas."
      );
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await onSubmit?.({
        name: nextName,
        specialty: normalize(specialty),
        active,
        whatsappPhone: phoneValue,
        notificationsEnabled: nextNotifications,
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

      <div>
        <label
          htmlFor="doctor-whatsapp-phone"
          className="block text-xs font-semibold text-brand-text-muted"
        >
          Número WhatsApp para notificaciones
        </label>
        <input
          id="doctor-whatsapp-phone"
          type="tel"
          value={whatsappPhone}
          onChange={(e) => handlePhoneChange(e.target.value)}
          className="mt-2 w-full rounded-brand border border-brand-border bg-brand-surface px-3.5 py-2.5 text-sm text-brand-text shadow-brand transition placeholder:text-brand-text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/25"
          placeholder="10 dígitos, ej: 222 123 4567"
          autoComplete="tel"
        />
        <p className="mt-2 text-xs text-brand-text-muted">
          La especialista debe enviar un mensaje al WhatsApp del negocio para
          habilitar la ventana de notificaciones durante 24 horas.
        </p>
      </div>

      <div>
        <label className="block text-xs font-semibold text-brand-text-muted">
          Notificaciones
        </label>
        <div className="mt-2">
          <Toggle
            checked={notificationsEnabled}
            onChange={handleNotificationsChange}
            disabled={notificationsToggleDisabled}
            label="Recibir notificaciones de nuevas citas"
          />
        </div>
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
