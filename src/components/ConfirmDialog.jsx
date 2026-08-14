import { useEffect } from "react";
import { createPortal } from "react-dom";
import Button from "./ui/Button";

const VARIANT_STYLES = {
  success: {
    icon: "bg-brand-success-soft text-brand-success",
    confirmVariant: "primary",
  },
  danger: {
    icon: "bg-brand-danger-soft text-brand-danger",
    confirmVariant: "danger",
  },
  default: {
    icon: "bg-brand-soft text-brand-primary",
    confirmVariant: "primary",
  },
};

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "default",
  loading = false,
  onConfirm,
  onCancel,
}) {
  const styles = VARIANT_STYLES[variant] ?? VARIANT_STYLES.default;

  useEffect(() => {
    if (!open) return undefined;

    function onKeyDown(event) {
      if (event.key === "Escape" && !loading) {
        onCancel?.();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, loading, onCancel]);

  if (!open) return null;
  if (typeof document === "undefined" || !document.body) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="presentation"
      data-testid="confirm-dialog-root"
    >
      <div
        className="nb-overlay absolute inset-0 animate-menu-in"
        aria-hidden
        onClick={() => {
          if (!loading) onCancel?.();
        }}
      />

      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        className="relative max-h-[min(90vh,640px)] w-full max-w-[min(28rem,calc(100vw-2rem))] overflow-y-auto rounded-brand-md border border-brand-border bg-brand-surface p-6 shadow-brand-lg animate-menu-in"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex gap-4">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${styles.icon}`}
            aria-hidden
          >
            {variant === "success" ? (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : variant === "danger" ? (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                />
              </svg>
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h2
              id="confirm-dialog-title"
              className="font-display text-xl font-semibold text-brand-text"
            >
              {title}
            </h2>
            <p
              id="confirm-dialog-description"
              className="mt-2 text-sm leading-relaxed text-brand-text-muted"
            >
              {description}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            disabled={loading}
            onClick={() => onCancel?.()}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={styles.confirmVariant}
            loading={loading}
            onClick={() => onConfirm?.()}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
