import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Check, Send } from "lucide-react";
import Button from "../ui/Button";
import {
  CONFIRMATION_DIALOG_STATUS,
  CONFIRMATION_SUCCESS_AUTO_CLOSE_MS,
} from "./appointmentConfirmationAction";

const COPY = {
  [CONFIRMATION_DIALOG_STATUS.CONFIRM]: {
    title: "Enviar confirmación",
    description: "¿Deseas enviar la confirmación por WhatsApp a este paciente?",
    icon: "send",
    iconClass: "bg-brand-soft text-brand-primary-text",
  },
  [CONFIRMATION_DIALOG_STATUS.SENDING]: {
    title: "Enviando mensaje...",
    description: "Estamos enviando la confirmación por WhatsApp.",
    icon: "spinner",
    iconClass: "bg-brand-soft text-brand-primary-text",
  },
  [CONFIRMATION_DIALOG_STATUS.SUCCESS]: {
    title: "Mensaje enviado",
    description: "La confirmación fue enviada correctamente por WhatsApp.",
    icon: "check",
    iconClass: "bg-brand-success-soft text-brand-success",
  },
  [CONFIRMATION_DIALOG_STATUS.ERROR]: {
    title: "No se pudo enviar",
    description: "No fue posible enviar la confirmación por WhatsApp.",
    icon: "warning",
    iconClass: "bg-brand-danger-soft text-brand-danger",
  },
  [CONFIRMATION_DIALOG_STATUS.ALREADY_SENT]: {
    title: "Confirmación ya enviada",
    description: "Esta cita ya tiene una confirmación enviada por WhatsApp.",
    icon: "check",
    iconClass: "bg-brand-success-soft text-brand-success",
  },
};

function DialogIcon({ kind, className }) {
  return (
    <div
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${className}`}
      aria-hidden
    >
      {kind === "spinner" ? (
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-r-transparent" />
      ) : kind === "check" ? (
        <Check className="h-5 w-5" strokeWidth={2} />
      ) : kind === "warning" ? (
        <AlertTriangle className="h-5 w-5" strokeWidth={2} />
      ) : (
        <Send className="h-5 w-5" strokeWidth={2} />
      )}
    </div>
  );
}

export default function AppointmentConfirmationDialog({
  status = CONFIRMATION_DIALOG_STATUS.CLOSED,
  errorMessage = null,
  onConfirm,
  onClose,
}) {
  const isOpen = status !== CONFIRMATION_DIALOG_STATUS.CLOSED;
  const isSending = status === CONFIRMATION_DIALOG_STATUS.SENDING;
  const canDismiss =
    status === CONFIRMATION_DIALOG_STATUS.CONFIRM ||
    status === CONFIRMATION_DIALOG_STATUS.ERROR ||
    status === CONFIRMATION_DIALOG_STATUS.ALREADY_SENT;
  const copy = COPY[status];

  useEffect(() => {
    if (!isOpen) return undefined;
    const previous = document.activeElement;

    if (status === CONFIRMATION_DIALOG_STATUS.CONFIRM) {
      document.getElementById("appointment-confirmation-submit")?.focus();
    }

    return () => {
      if (previous && typeof previous.focus === "function") {
        previous.focus();
      }
    };
  }, [isOpen, status]);

  useEffect(() => {
    if (status !== CONFIRMATION_DIALOG_STATUS.SUCCESS) return undefined;
    const timer = window.setTimeout(() => {
      onClose?.();
    }, CONFIRMATION_SUCCESS_AUTO_CLOSE_MS);
    return () => window.clearTimeout(timer);
  }, [status, onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;

    function onKeyDown(event) {
      if (event.key === "Escape" && canDismiss) {
        onClose?.();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, canDismiss, onClose]);

  if (!isOpen || !copy) return null;
  if (typeof document === "undefined" || !document.body) return null;

  const description =
    status === CONFIRMATION_DIALOG_STATUS.ERROR && String(errorMessage ?? "").trim()
      ? errorMessage
      : copy.description;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="presentation"
      data-testid="appointment-confirmation-dialog-root"
    >
      <div
        className="nb-overlay absolute inset-0 animate-menu-in"
        aria-hidden
        onClick={() => {
          if (canDismiss) onClose?.();
        }}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="appointment-confirmation-title"
        aria-describedby="appointment-confirmation-description"
        aria-busy={isSending || undefined}
        className="relative w-[calc(100vw-32px)] max-w-[420px] rounded-brand-md border border-brand-border bg-brand-surface p-5 shadow-brand-lg animate-menu-in sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex gap-3.5">
          <DialogIcon kind={copy.icon} className={copy.iconClass} />
          <div className="min-w-0 flex-1">
            <h2
              id="appointment-confirmation-title"
              className="font-display text-lg font-semibold text-brand-text"
            >
              {copy.title}
            </h2>
            <p
              id="appointment-confirmation-description"
              className="mt-1.5 text-sm leading-relaxed text-brand-text-muted"
            >
              {description}
            </p>
          </div>
        </div>

        {status === CONFIRMATION_DIALOG_STATUS.CONFIRM ? (
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => onClose?.()}>
              Cancelar
            </Button>
            <Button
              id="appointment-confirmation-submit"
              variant="primary"
              onClick={() => onConfirm?.()}
            >
              Sí, enviar
            </Button>
          </div>
        ) : null}

        {status === CONFIRMATION_DIALOG_STATUS.ERROR ||
        status === CONFIRMATION_DIALOG_STATUS.ALREADY_SENT ? (
          <div className="mt-5 flex justify-end">
            <Button variant="outline" onClick={() => onClose?.()}>
              Cerrar
            </Button>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
