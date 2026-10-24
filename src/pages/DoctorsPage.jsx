import { useEffect, useMemo, useState } from "react";
import DoctorCard from "../components/doctors/DoctorCard";
import DoctorDrawer from "../components/doctors/DoctorDrawer";
import DoctorForm from "../components/doctors/DoctorForm";
import DoctorsFilters from "../components/doctors/DoctorsFilters";
import TechnicianWeekEditor from "../components/doctors/TechnicianWeekEditor";
import Button from "../components/ui/Button";
import {
  createSpecialist,
  fetchSpecialists,
  updateSpecialist,
} from "../services/specialistService";

function normalize(text) {
  return String(text ?? "").trim().toLowerCase();
}

function SummaryCard({ label, value, tone = "neutral" }) {
  const toneStyles =
    tone === "success"
      ? "bg-brand-success-soft text-brand-success"
      : tone === "danger"
        ? "bg-brand-danger-soft text-brand-danger"
        : "bg-brand-soft text-brand-primary-text";

  return (
    <div className="nb-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-3xl font-semibold tracking-tight text-brand-text tabular-nums">
            {value}
          </p>
          <p className="mt-1.5 text-sm font-medium text-brand-text-muted">{label}</p>
        </div>
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-brand ${toneStyles}`}
          aria-hidden
        >
          <span className="text-sm font-semibold tabular-nums">{value}</span>
        </div>
      </div>
    </div>
  );
}

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [mode, setMode] = useState("create");
  const [query, setQuery] = useState("");
  const [specialty, setSpecialty] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("name-asc");
  const [scheduleDoctor, setScheduleDoctor] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const specialists = await fetchSpecialists();
        if (!cancelled) {
          // API returns {id, name, specialty, activeFlag}. UI needs stats, so we mock those.
          const enriched = specialists.map((s) => {
            const idNum = Number(s.id);
            const flag = String(s.activeFlag ?? "").trim().toUpperCase();
            const active = flag === "Y";
            const appointmentsThisMonth = Number.isFinite(idNum)
              ? (idNum * 7) % 65
              : 0;
            return {
              id: s.id,
              name: s.name,
              specialty: s.specialty,
              status: active ? "active" : "inactive",
              email: null,
              phone: null,
              whatsappPhone: s.whatsappPhone ?? "",
              notificationsEnabled: Boolean(s.notificationsEnabled),
              appointmentsThisMonth,
            };
          });
          setDoctors(enriched);
        }
      } catch (e) {
        if (!cancelled) {
          setDoctors([]);
          setLoadError(e instanceof Error ? e.message : "No se pudieron cargar las especialistas.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const specialties = useMemo(() => {
    const set = new Set(doctors.map((d) => d.specialty).filter(Boolean));
    return [...set].sort((a, b) => a.localeCompare(b, "es"));
  }, [doctors]);

  const filtered = useMemo(() => {
    const q = normalize(query);
    const spec = specialty;
    const st = status;

    let rows = doctors.filter((d) => {
      if (q) {
        const hay = `${d.name} ${d.specialty} ${d.email ?? ""} ${d.phone ?? ""}`;
        if (!normalize(hay).includes(q)) return false;
      }
      if (spec !== "all" && d.specialty !== spec) return false;
      if (st !== "all" && normalize(d.status) !== st) return false;
      return true;
    });

    rows = rows.slice().sort((a, b) => {
      if (sort === "name-desc") return a.name.localeCompare(b.name, "es") * -1;
      if (sort === "appointments-desc")
        return (b.appointmentsThisMonth ?? 0) - (a.appointmentsThisMonth ?? 0);
      if (sort === "appointments-asc")
        return (a.appointmentsThisMonth ?? 0) - (b.appointmentsThisMonth ?? 0);
      return a.name.localeCompare(b.name, "es");
    });

    return rows;
  }, [doctors, query, specialty, status, sort]);

  const summary = useMemo(() => {
    const total = doctors.length;
    const active = doctors.filter((d) => normalize(d.status) === "active").length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [doctors]);

  function handleNewDoctor() {
    setMode("create");
    setSelectedDoctor(null);
    setDrawerOpen(true);
  }

  function handleEdit(doctor) {
    setMode("edit");
    setSelectedDoctor(doctor);
    setDrawerOpen(true);
  }

  function handleCloseDrawer() {
    setDrawerOpen(false);
    setSelectedDoctor(null);
    setMode("create");
  }

  async function handleSubmitDoctor(values) {
    const whatsappPhone = String(values.whatsappPhone ?? "");
    const notificationsEnabled = Boolean(values.notificationsEnabled);

    if (mode === "create") {
      const name = String(values.name ?? "").trim();
      const specialty = String(values.specialty ?? "").trim();
      const result = await createSpecialist({
        name,
        specialty,
        active: values.active ? "Y" : "N",
        whatsappPhone,
        notificationsEnabled,
      });
      const doctorId = result?.doctorId;
      if (!Number.isFinite(Number(doctorId))) {
        throw new Error("La API no devolvió un identificador válido para el especialista.");
      }
      setDoctors((prev) => [
        {
          id: doctorId,
          name,
          specialty,
          status: values.active ? "active" : "inactive",
          email: null,
          phone: null,
          whatsappPhone,
          notificationsEnabled,
          appointmentsThisMonth: 0,
        },
        ...prev,
      ]);
      setDrawerOpen(false);
      return;
    }

    const doctorId = Number(selectedDoctor?.id);
    if (!Number.isFinite(doctorId)) {
      throw new Error("No se pudo identificar al especialista.");
    }

    await updateSpecialist({
      doctorId,
      name: String(values.name ?? "").trim(),
      specialty: String(values.specialty ?? "").trim(),
      active: values.active ? "Y" : "N",
      whatsappPhone,
      notificationsEnabled,
    });

    const nextStatus = values.active ? "active" : "inactive";
    setDoctors((prev) =>
      prev.map((d) =>
        Number(d.id) === doctorId
          ? {
              ...d,
              name: values.name,
              specialty: values.specialty,
              status: nextStatus,
              whatsappPhone,
              notificationsEnabled,
            }
          : d
      )
    );
    setDrawerOpen(false);
  }

  return (
    <div className="min-h-screen bg-brand-background">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-8 sm:py-12 lg:px-10">
        <header className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-brand-text sm:text-3xl">
              Especialistas
            </h1>
            <p className="mt-2 text-sm text-brand-text-muted">
              Administra las especialistas y servicios de la boutique
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button type="button" onClick={handleNewDoctor}>
              + Nuevo especialista
            </Button>
          </div>
        </header>

        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          <SummaryCard label="Total especialistas" value={summary.total} tone="neutral" />
          <SummaryCard label="Activas" value={summary.active} tone="success" />
          <SummaryCard label="Inactivas" value={summary.inactive} tone="danger" />
        </section>

        {scheduleDoctor ? (
          <div className="mb-8">
            <TechnicianWeekEditor
              key={scheduleDoctor.id}
              doctorId={scheduleDoctor.id}
              doctorName={scheduleDoctor.name}
              onClose={() => setScheduleDoctor(null)}
            />
          </div>
        ) : null}

        <div className="mb-6">
          <DoctorsFilters
            query={query}
            onQueryChange={setQuery}
            specialty={specialty}
            specialties={specialties}
            onSpecialtyChange={setSpecialty}
            status={status}
            onStatusChange={setStatus}
            sort={sort}
            onSortChange={setSort}
          />
        </div>

        <section className="nb-card p-6 sm:p-8">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-brand-text">
              {filtered.length} especialista{filtered.length !== 1 ? "s" : ""}
            </p>
            {loading ? (
              <p className="text-xs text-brand-text-muted" role="status" aria-live="polite">
                Cargando especialistas...
              </p>
            ) : loadError ? (
              <p className="text-xs text-brand-danger" role="status">
                {loadError}
              </p>
            ) : (
              <p className="text-xs text-brand-text-muted">Datos actualizados</p>
            )}
          </div>

          {loading ? (
            <div className="flex min-h-[180px] items-center justify-center rounded-brand-md border border-dashed border-brand-border bg-brand-soft/40 px-6 py-12 text-center text-sm font-medium text-brand-text-muted">
              Cargando...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex min-h-[180px] flex-col items-center justify-center rounded-brand-md border border-dashed border-brand-border bg-brand-soft/40 px-6 py-12 text-center">
              <p className="text-sm font-medium text-brand-text-muted">
                No hay especialistas que coincidan con los filtros.
              </p>
              <p className="mt-1 max-w-md text-xs text-brand-text-muted">
                Prueba con otro término de búsqueda o ajusta los filtros.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((doctor) => (
                <DoctorCard
                  key={doctor.id}
                  doctor={doctor}
                  onEdit={handleEdit}
                  onSchedule={setScheduleDoctor}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <DoctorDrawer
        open={drawerOpen}
        onClose={handleCloseDrawer}
        mode={mode}
        doctor={selectedDoctor}
      >
        <DoctorForm
          mode={mode}
          doctor={selectedDoctor}
          onSubmit={handleSubmitDoctor}
          onCancel={handleCloseDrawer}
        />
      </DoctorDrawer>
    </div>
  );
}

