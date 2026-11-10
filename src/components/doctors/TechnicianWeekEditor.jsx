import { useEffect, useRef, useState } from "react";
import ConfirmDialog from "../ConfirmDialog";
import Button from "../ui/Button";
import {
  fetchDoctorWeek,
  isWeekEditorUnavailable,
  saveDoctorWeek,
} from "../../services/doctorWeekService";
import {
  WEEK_DAYS,
  buildWeekPayload,
  createDraftId,
  draftsFromLegacy,
  draftsFromRawShifts,
  formatShiftSpan,
  legacyDayLabel,
  weekSaveErrorMessage,
} from "./weekSchedule";

const FIELD_CLASS =
  "mt-2 w-full rounded-brand border border-brand-border bg-brand-surface px-3 py-2 text-sm text-brand-text shadow-brand transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/25";

const REVIEW_LABEL = "Revisé el modo y los turnos antes de guardar.";

export default function TechnicianWeekEditor({ doctorId, doctorName, onClose }) {
  const [phase, setPhase] = useState("loading");
  const [week, setWeek] = useState(null);
  const [mode, setMode] = useState("");
  const [shifts, setShifts] = useState([]);
  const [reviewed, setReviewed] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmClosed, setConfirmClosed] = useState(false);
  const savingRef = useRef(false);
  const seededCustom = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setPhase("loading");
      setError(null);
      setSuccess(null);
      setConfirmClosed(false);
      seededCustom.current = false;
      try {
        const data = await fetchDoctorWeek(doctorId);
        if (cancelled || !mounted.current) return;
        applyWeek(data);
      } catch (err) {
        if (cancelled || !mounted.current) return;
        if (isWeekEditorUnavailable(err)) {
          setWeek(null);
          setPhase("unavailable");
          return;
        }
        setWeek(null);
        setPhase("error");
        setError(
          err instanceof Error ? err.message : "No se pudo cargar la semana del técnico.",
        );
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [doctorId]);

  function applyWeek(data) {
    setWeek(data);
    if (data?.mode === "LEGACY") {
      setMode("");
      setShifts([]);
      setReviewed(false);
      seededCustom.current = false;
      setPhase("ready");
      return true;
    }
    if (data?.mode === "INHERIT") {
      setMode("INHERIT");
      setShifts([]);
      setReviewed(false);
      seededCustom.current = false;
      setPhase("ready");
      return true;
    }
    if (data?.mode === "CUSTOM") {
      setMode("CUSTOM");
      setShifts(draftsFromRawShifts(data.shifts));
      setReviewed(false);
      seededCustom.current = true;
      setPhase("ready");
      return true;
    }
    setPhase("error");
    setError("La semana recibida no tiene un modo reconocible.");
    return false;
  }

  function chooseMode(nextMode) {
    setMode(nextMode);
    setSuccess(null);
    setError(null);
    if (
      nextMode === "CUSTOM" &&
      week?.mode === "LEGACY" &&
      !seededCustom.current
    ) {
      setShifts(draftsFromLegacy(week.legacySchedule));
      seededCustom.current = true;
    }
  }

  function updateShift(id, patch) {
    setShifts((current) =>
      current.map((shift) => (shift.id === id ? { ...shift, ...patch } : shift)),
    );
    setSuccess(null);
  }

  function addShift(dayOfWeek) {
    setShifts((current) => {
      const count = current.filter((shift) => shift.dayOfWeek === dayOfWeek).length;
      if (count >= 99) return current;
      return [
        ...current,
        {
          id: createDraftId(),
          dayOfWeek,
          startTime: "09:00",
          endTime: "14:00",
          endDayOffset: 0,
        },
      ];
    });
    setSuccess(null);
  }

  function removeShift(id) {
    setShifts((current) => current.filter((shift) => shift.id !== id));
    setSuccess(null);
  }

  async function persist(payload) {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await saveDoctorWeek(doctorId, payload);
      const fresh = await fetchDoctorWeek(doctorId);
      if (!mounted.current) return;
      if (applyWeek(fresh)) setSuccess("Turnos guardados.");
    } catch (err) {
      if (!mounted.current) return;
      if (isWeekEditorUnavailable(err)) {
        setPhase("unavailable");
        setWeek(null);
        setSuccess(null);
        return;
      }
      setError(weekSaveErrorMessage(err));
      setSuccess(null);
    } finally {
      savingRef.current = false;
      if (mounted.current) setSaving(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (savingRef.current) return;
    setSuccess(null);

    if (week?.mode === "LEGACY" && mode !== "INHERIT" && mode !== "CUSTOM") {
      setError(
        "Elige heredar el horario del negocio o personalizado, y revisa los turnos antes de guardar.",
      );
      return;
    }
    if (week?.mode === "LEGACY" && !reviewed) {
      setError("Marca que revisaste los turnos antes de guardar.");
      return;
    }

    const built = buildWeekPayload(mode, shifts);
    if (built.error) {
      setError(built.error);
      return;
    }
    if (built.payload.mode === "CUSTOM" && built.payload.shifts.length === 0) {
      setError(null);
      setConfirmClosed(true);
      return;
    }
    await persist(built.payload);
  }

  async function confirmClosedWeek() {
    setConfirmClosed(false);
    await persist({ mode: "CUSTOM", shifts: [] });
  }

  if (phase === "loading") {
    return (
      <p className="text-sm text-brand-text-muted" role="status">
        Cargando turnos…
      </p>
    );
  }

  if (phase === "unavailable") {
    return (
      <section className="nb-card p-5" aria-label="Turnos semanales">
        <p className="text-sm font-medium text-brand-text" role="status">
          El editor de turnos no está disponible.
        </p>
      </section>
    );
  }

  if (phase === "error") {
    return (
      <section className="nb-card p-5" aria-label="Turnos semanales">
        <p className="text-sm font-medium text-brand-danger" role="alert">
          {error || "No se pudo cargar la semana del técnico."}
        </p>
      </section>
    );
  }

  const legacy = week?.mode === "LEGACY";
  const legacyRows = [...(week?.legacySchedule ?? [])].sort(
    (a, b) => a.dayOfWeek - b.dayOfWeek,
  );

  return (
    <section className="nb-card p-5 sm:p-6" aria-label="Turnos semanales">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-semibold text-brand-text">
            Turnos de {doctorName || "técnico"}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-brand-text-muted">
            Semana de lunes a domingo. Los horarios se leen y se guardan tal como
            están en la semana del técnico.
          </p>
        </div>
        {onClose ? (
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        ) : null}
      </div>

      <form aria-label="Editor de turnos semanales" onSubmit={handleSubmit} className="space-y-5">
        {legacy ? (
          <div className="rounded-brand border border-brand-border bg-brand-soft/50 p-4">
            <h3 className="text-sm font-semibold text-brand-text">Horario anterior</h3>
            <p className="mt-1 text-sm text-brand-text-muted">
              Este técnico todavía usa el horario anterior. Elige heredar el horario
              del negocio o personalizado, y revisa los turnos antes de guardar.
            </p>
            <ul aria-label="Horario anterior" className="mt-3 space-y-1">
              {legacyRows.map((day) => (
                <li key={day.dayOfWeek} className="text-sm text-brand-text">
                  {legacyDayLabel(day)}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <fieldset>
          <legend className="text-xs font-semibold text-brand-text-muted">Modo</legend>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <label className="flex items-center gap-2 rounded-brand border border-brand-border bg-brand-surface px-3 py-2 text-sm text-brand-text">
              <input
                type="radio"
                name="week-mode"
                value="INHERIT"
                checked={mode === "INHERIT"}
                onChange={() => chooseMode("INHERIT")}
              />
              Heredar horario del negocio
            </label>
            <label className="flex items-center gap-2 rounded-brand border border-brand-border bg-brand-surface px-3 py-2 text-sm text-brand-text">
              <input
                type="radio"
                name="week-mode"
                value="CUSTOM"
                checked={mode === "CUSTOM"}
                onChange={() => chooseMode("CUSTOM")}
              />
              Personalizado
            </label>
          </div>
        </fieldset>

        {mode === "INHERIT" ? (
          <p className="text-sm text-brand-text-muted">
            Al guardar se envía el modo heredar, sin turnos propios.
          </p>
        ) : null}

        {mode === "CUSTOM" ? (
          <div className="space-y-4">
            {WEEK_DAYS.map((day) => {
              const dayShifts = shifts.filter((shift) => shift.dayOfWeek === day.dayOfWeek);
              return (
                <section
                  key={day.dayOfWeek}
                  aria-label={day.title}
                  className="rounded-brand border border-brand-border p-4"
                >
                  <h3 className="text-sm font-semibold text-brand-text">{day.title}</h3>
                  {dayShifts.length === 0 ? (
                    <p className="mt-2 text-xs text-brand-text-muted">Sin turnos</p>
                  ) : (
                    <ul className="mt-3 space-y-3">
                      {dayShifts.map((shift, index) => {
                        const position = index + 1;
                        const startLabel = `Inicio ${day.name} turno ${position}`;
                        const endLabel = `Fin ${day.name} turno ${position}`;
                        const endsLabel = `Termina ${day.name} turno ${position}`;
                        return (
                          <li
                            key={shift.id}
                            className="rounded-brand border border-brand-border bg-brand-soft/40 p-3"
                          >
                            <p className="text-sm font-medium text-brand-text">
                              {formatShiftSpan(shift)}
                            </p>
                            <div className="mt-3 flex flex-wrap items-end gap-3">
                              <label className="min-w-[8rem] flex-1 text-xs font-semibold text-brand-text-muted">
                                {startLabel}
                                <input
                                  aria-label={startLabel}
                                  value={shift.startTime}
                                  onChange={(event) =>
                                    updateShift(shift.id, { startTime: event.target.value })
                                  }
                                  placeholder="HH:mm"
                                  autoComplete="off"
                                  className={FIELD_CLASS}
                                />
                              </label>
                              <label className="min-w-[8rem] flex-1 text-xs font-semibold text-brand-text-muted">
                                {endLabel}
                                <input
                                  aria-label={endLabel}
                                  value={shift.endTime}
                                  onChange={(event) =>
                                    updateShift(shift.id, { endTime: event.target.value })
                                  }
                                  placeholder="HH:mm"
                                  autoComplete="off"
                                  className={FIELD_CLASS}
                                />
                              </label>
                              <label className="min-w-[12rem] flex-1 text-xs font-semibold text-brand-text-muted">
                                Termina
                                <select
                                  aria-label={endsLabel}
                                  value={String(shift.endDayOffset)}
                                  onChange={(event) =>
                                    updateShift(shift.id, {
                                      endDayOffset: Number(event.target.value),
                                    })
                                  }
                                  className={FIELD_CLASS}
                                >
                                  <option value="0">El mismo día</option>
                                  <option value="1">Al día siguiente</option>
                                </select>
                              </label>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeShift(shift.id)}
                                disabled={saving}
                              >
                                {`Quitar turno ${day.name} ${position}`}
                              </Button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  <div className="mt-3">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => addShift(day.dayOfWeek)}
                      disabled={saving || dayShifts.length >= 99}
                    >
                      {`Añadir turno el ${day.name}`}
                    </Button>
                  </div>
                </section>
              );
            })}
          </div>
        ) : null}

        {legacy ? (
          <label className="flex items-start gap-2 text-sm text-brand-text">
            <input
              type="checkbox"
              className="mt-1"
              checked={reviewed}
              onChange={(event) => {
                setReviewed(event.target.checked);
                setError(null);
              }}
            />
            {REVIEW_LABEL}
          </label>
        ) : null}

        {error ? (
          <div
            className="rounded-brand border border-brand-danger/30 bg-brand-danger-soft px-4 py-3 text-sm font-medium text-brand-danger"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        {success ? (
          <p
            className="rounded-brand border border-brand-success/30 bg-brand-success-soft px-4 py-3 text-sm font-medium text-brand-success"
            role="status"
          >
            {success}
          </p>
        ) : null}

        <div className="flex justify-end">
          <Button type="submit" loading={saving} disabled={saving}>
            {saving ? "Guardando..." : "Guardar turnos"}
          </Button>
        </div>
      </form>

      <ConfirmDialog
        open={confirmClosed}
        title="Semana cerrada"
        description="Personalizado sin turnos cierra la semana: el técnico no tendrá horario. Confirma solo si quieres guardar esa semana cerrada."
        confirmLabel="Guardar semana cerrada"
        cancelLabel="Cancelar"
        variant="danger"
        loading={saving}
        onConfirm={confirmClosedWeek}
        onCancel={() => {
          if (!saving) setConfirmClosed(false);
        }}
      />
    </section>
  );
}
