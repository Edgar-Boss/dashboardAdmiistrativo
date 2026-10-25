import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronRight,
  MoreVertical,
  Pencil,
  RefreshCw,
} from "lucide-react";
import AppointmentStateConfirmDialog from "./AppointmentStateConfirmDialog";
import AppointmentStatusSubmenu from "./AppointmentStatusSubmenu";
import {
  isCancelledReactivation,
  requiresStateConfirmation,
} from "./appointmentStateConfirm";

const menuItemClass =
  "flex w-full items-center gap-2.5 rounded-brand px-3 py-2 text-left text-sm text-brand-text transition-colors duration-150 hover:bg-brand-soft";

function getMenuPosition(trigger) {
  if (!trigger) return null;
  const rect = trigger.getBoundingClientRect();
  return {
    top: rect.bottom + 6,
    right: Math.max(8, window.innerWidth - rect.right),
  };
}

export default function AppointmentActionsMenu({
  appointment,
  appointmentId,
  state,
  patientName,
  disabled = false,
  isOpen,
  onOpen,
  onClose,
  onStateChange,
  onEdit,
  compactTrigger = false,
}) {
  const [statusSubmenuOpen, setStatusSubmenuOpen] = useState(false);
  const [pendingState, setPendingState] = useState(null);
  const [menuPosition, setMenuPosition] = useState(null);
  const containerRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      setStatusSubmenuOpen(false);
    }
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isOpen) {
      setMenuPosition(null);
      return undefined;
    }

    function updatePosition() {
      setMenuPosition(getMenuPosition(containerRef.current));
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    function handlePointerDown(event) {
      const target = event.target;
      if (
        containerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      event.preventDefault();
      onClose?.();
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose?.();
      }
    }

    document.addEventListener("mousedown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  function handleToggle() {
    if (disabled) return;
    if (isOpen) {
      onClose?.();
    } else {
      onOpen?.();
    }
  }

  function closeMenu() {
    setStatusSubmenuOpen(false);
    onClose?.();
  }

  function handleEdit() {
    onEdit?.(appointment);
    closeMenu();
  }

  function handleStatusSelect(nextState) {
    const normalized =
      typeof nextState === "string" ? nextState.toUpperCase() : "";
    const current =
      typeof state === "string" ? state.toUpperCase() : "";
    if (normalized === current) {
      closeMenu();
      return;
    }

    if (isCancelledReactivation(current, normalized)) {
      closeMenu();
      return;
    }

    closeMenu();

    if (requiresStateConfirmation(nextState)) {
      setPendingState(normalized);
      return;
    }

    onStateChange?.(appointmentId, normalized);
  }

  function handleConfirmStateChange() {
    if (!pendingState) return;
    onStateChange?.(appointmentId, pendingState);
    setPendingState(null);
  }

  function handleCancelStateChange() {
    setPendingState(null);
  }

  const menu =
    isOpen && menuPosition
      ? createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label="Acciones de la cita"
            style={{
              position: "fixed",
              top: menuPosition.top,
              right: menuPosition.right,
              zIndex: 60,
            }}
            className="min-w-[11.5rem] origin-top-right rounded-brand-md border border-brand-border bg-brand-surface p-1.5 shadow-brand-lg animate-menu-in"
          >
            <ul className="space-y-0.5">
              <li>
                <button
                  type="button"
                  role="menuitem"
                  className={menuItemClass}
                  onClick={handleEdit}
                >
                  <Pencil className="h-4 w-4 shrink-0 text-brand-text-muted" strokeWidth={2} />
                  Editar cita
                </button>
              </li>

              <li className="relative">
                <button
                  type="button"
                  role="menuitem"
                  aria-haspopup="menu"
                  aria-expanded={statusSubmenuOpen}
                  className={`${menuItemClass} ${statusSubmenuOpen ? "bg-brand-soft" : ""}`}
                  onClick={() => setStatusSubmenuOpen((open) => !open)}
                  onMouseEnter={() => setStatusSubmenuOpen(true)}
                >
                  <RefreshCw className="h-4 w-4 shrink-0 text-brand-text-muted" strokeWidth={2} />
                  <span className="flex-1">Cambiar estado</span>
                  <ChevronRight
                    className={`h-4 w-4 shrink-0 text-brand-text-muted/70 transition-transform duration-150 ${
                      statusSubmenuOpen ? "translate-x-0.5 text-brand-text-muted" : ""
                    }`}
                    strokeWidth={2}
                    aria-hidden
                  />
                </button>

                {statusSubmenuOpen ? (
                  <AppointmentStatusSubmenu
                    currentState={state}
                    onSelect={handleStatusSelect}
                  />
                ) : null}
              </li>
            </ul>
          </div>,
          document.body,
        )
      : null;

  return (
  <>
    <AppointmentStateConfirmDialog
      open={pendingState !== null}
      targetState={pendingState}
      patientName={patientName}
      loading={disabled}
      onConfirm={handleConfirmStateChange}
      onCancel={handleCancelStateChange}
    />

    <div ref={containerRef} className="relative inline-flex items-center justify-center">
      <button
        type="button"
        disabled={disabled}
        aria-label="Acciones de la cita"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={handleToggle}
        className={`inline-flex items-center justify-center rounded-brand text-brand-text-muted transition-colors duration-150 hover:bg-brand-soft hover:text-brand-text focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/25 disabled:pointer-events-none disabled:opacity-45 ${
          compactTrigger ? "h-6 w-6" : "h-8 w-8"
        }`}
      >
        <MoreVertical
          className={compactTrigger ? "h-3.5 w-3.5" : "h-4 w-4"}
          strokeWidth={2}
          aria-hidden
        />
      </button>
    </div>
    {menu}
  </>
  );
}
