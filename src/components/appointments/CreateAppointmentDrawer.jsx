import { useEffect, useState } from "react";

import { X } from "lucide-react";

import {

  createAppointment,

  fetchAvailableSlots,

} from "../../services/appointmentService";

import { fetchActiveSpecialists } from "../../services/specialistService";

import AppointmentCreateForm from "./AppointmentCreateForm";

import { isCreateFormValid } from "./AppointmentCreateForm";

import {

  EMPTY_CREATE_APPOINTMENT_FORM,

} from "./appointmentCreateConstants";



export default function CreateAppointmentDrawer({

  isOpen,

  onClose,

  onCreated,

}) {

  const [form, setForm] = useState(EMPTY_CREATE_APPOINTMENT_FORM);

  const [doctors, setDoctors] = useState([]);

  const [doctorsLoading, setDoctorsLoading] = useState(false);

  const [doctorsError, setDoctorsError] = useState(null);

  const [availableSlots, setAvailableSlots] = useState([]);

  const [slotsLoading, setSlotsLoading] = useState(false);

  const [slotsError, setSlotsError] = useState(null);

  const [saving, setSaving] = useState(false);

  const [submitError, setSubmitError] = useState(null);



  useEffect(() => {

    if (!isOpen) {

      setForm(EMPTY_CREATE_APPOINTMENT_FORM);

      setDoctors([]);

      setDoctorsError(null);

      setDoctorsLoading(false);

      setAvailableSlots([]);

      setSlotsError(null);

      setSlotsLoading(false);

      setSaving(false);

      setSubmitError(null);

    }

  }, [isOpen]);



  useEffect(() => {

    if (!isOpen) return undefined;



    let cancelled = false;



    async function loadDoctors() {

      setDoctorsLoading(true);

      setDoctorsError(null);

      try {

        const list = await fetchActiveSpecialists();

        if (!cancelled) setDoctors(list);

      } catch (error) {

        if (!cancelled) {

          setDoctors([]);

          setDoctorsError(

            error instanceof Error

              ? error.message

              : "No se pudieron cargar los doctores.",

          );

        }

      } finally {

        if (!cancelled) setDoctorsLoading(false);

      }

    }



    loadDoctors();

    return () => {

      cancelled = true;

    };

  }, [isOpen]);



  useEffect(() => {

    if (!isOpen) return undefined;



    const { doctorId, appointmentDate } = form;

    if (!doctorId || !appointmentDate) {

      setAvailableSlots([]);

      setSlotsError(null);

      setSlotsLoading(false);

      return undefined;

    }



    let cancelled = false;



    async function loadSlots() {

      setSlotsLoading(true);

      setSlotsError(null);

      try {

        const slots = await fetchAvailableSlots({

          date: appointmentDate,

          doctorId,

        });

        if (!cancelled) setAvailableSlots(slots);

      } catch (error) {

        if (!cancelled) {

          setAvailableSlots([]);

          setSlotsError(

            error instanceof Error

              ? error.message

              : "No se pudieron cargar los horarios disponibles.",

          );

        }

      } finally {

        if (!cancelled) setSlotsLoading(false);

      }

    }



    loadSlots();

    return () => {

      cancelled = true;

    };

  }, [isOpen, form.doctorId, form.appointmentDate]);



  useEffect(() => {

    if (!isOpen || saving) return undefined;



    function onKeyDown(event) {

      if (event.key === "Escape") handleClose();

    }



    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);

  }, [isOpen, saving]);



  function handleFieldChange(field, value) {

    setForm((prev) => {

      const next = { ...prev, [field]: value };



      if (field === "doctorId" || field === "appointmentDate") {

        next.appointmentTime = "";

      }



      return next;

    });

    setSubmitError(null);

  }



  function handleClose() {

    if (saving) return;

    setForm(EMPTY_CREATE_APPOINTMENT_FORM);

    setSubmitError(null);

    onClose?.();

  }



  async function handleSubmit(event) {

    event.preventDefault();

    if (saving || !isCreateFormValid(form)) return;



    const payload = {

      name: form.name.trim(),

      phoneNumber: form.phoneNumber.trim(),

      doctorId: Number(form.doctorId),

      appointmentDate: form.appointmentDate,

      appointmentTime: form.appointmentTime,

      reason: form.reason.trim() || undefined,

    };



    setSaving(true);

    setSubmitError(null);



    try {

      const created = await createAppointment(payload);

      await onCreated?.(created);

      handleClose();

    } catch (error) {

      setSubmitError(

        error instanceof Error

          ? error.message

          : "No se pudo crear la cita.",

      );

    } finally {

      setSaving(false);

    }

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

        aria-label="Nueva cita"

        className={`absolute right-0 top-0 flex h-full w-full flex-col border-l border-gray-100 bg-white shadow-2xl transition-transform duration-300 ease-out sm:max-w-[420px] ${

          isOpen ? "translate-x-0" : "translate-x-full"

        }`}

      >

        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-100 px-5 py-5 sm:px-6">

          <div className="min-w-0">

            <h2 className="text-base font-semibold text-gray-900">Nueva cita</h2>

            <p className="mt-1 text-xs text-gray-500">

              Completa la información para crear la cita

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



        <AppointmentCreateForm

          form={form}

          onFieldChange={handleFieldChange}

          onSubmit={handleSubmit}

          onCancel={handleClose}

          doctors={doctors}

          doctorsLoading={doctorsLoading}

          doctorsError={doctorsError}

          availableSlots={availableSlots}

          slotsLoading={slotsLoading}

          slotsError={slotsError}

          saving={saving}

          submitError={submitError}

        />

      </aside>

    </div>

  );

}


