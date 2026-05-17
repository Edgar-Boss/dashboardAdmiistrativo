import { useEffect, useRef, useState } from "react";
import {
  ChevronRight,
  Eye,
  MoreVertical,
  Pencil,
  RefreshCw,
  Trash2,
} from "lucide-react";
import AppointmentStateConfirmDialog from "./AppointmentStateConfirmDialog";
import AppointmentStatusSubmenu from "./AppointmentStatusSubmenu";
import { requiresStateConfirmation } from "./appointmentStateConfirm";

const menuItemClass =
  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-gray-700 transition-colors duration-150 hover:bg-gray-50";

export default function AppointmentActionsMenu({
  appointmentId,
  state,
  patientName,
  disabled = false,
  isOpen,
  onOpen,
  onClose,
  onStateChange,
  onEdit,
}) {
  const [statusSubmenuOpen, setStatusSubmenuOpen] = useState(false);
  const [pendingState, setPendingState] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      setStatusSubmenuOpen(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    function handlePointerDown(event) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        onClose?.();
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose?.();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
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
    closeMenu();
    onEdit?.();
  }

  function handleViewDetails() {
    console.log("[AppointmentActions] Ver detalles", appointmentId);
    closeMenu();
  }

  function handleDelete() {
    console.log("[AppointmentActions] Eliminar cita", appointmentId);
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
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors duration-150 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-200 focus:ring-offset-1 disabled:pointer-events-none disabled:opacity-45"
      >
        <MoreVertical className="h-4 w-4" strokeWidth={2} aria-hidden />
      </button>

      {isOpen ? (
        <div
          role="menu"
          aria-label="Acciones de la cita"
          className="absolute right-0 top-full z-30 mt-1.5 min-w-[11.5rem] origin-top-right rounded-xl border border-gray-100 bg-white p-1.5 shadow-lg shadow-gray-200/60 animate-menu-in"
        >
          <ul className="space-y-0.5">
            <li>
              <button
                type="button"
                role="menuitem"
                className={menuItemClass}
                onClick={handleEdit}
              >
                <Pencil className="h-4 w-4 shrink-0 text-gray-400" strokeWidth={2} />
                Editar cita
              </button>
            </li>

            <li className="relative">
              <button
                type="button"
                role="menuitem"
                aria-haspopup="menu"
                aria-expanded={statusSubmenuOpen}
                className={`${menuItemClass} ${statusSubmenuOpen ? "bg-gray-50" : ""}`}
                onClick={() => setStatusSubmenuOpen((open) => !open)}
                onMouseEnter={() => setStatusSubmenuOpen(true)}
              >
                <RefreshCw className="h-4 w-4 shrink-0 text-gray-400" strokeWidth={2} />
                <span className="flex-1">Cambiar estado</span>
                <ChevronRight
                  className={`h-4 w-4 shrink-0 text-gray-300 transition-transform duration-150 ${
                    statusSubmenuOpen ? "translate-x-0.5 text-gray-400" : ""
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

            <li>
              <button
                type="button"
                role="menuitem"
                className={menuItemClass}
                onClick={handleViewDetails}
              >
                <Eye className="h-4 w-4 shrink-0 text-gray-400" strokeWidth={2} />
                Ver detalles
              </button>
            </li>

            <li className="my-1 border-t border-gray-100" aria-hidden />

            <li>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-rose-600 transition-colors duration-150 hover:bg-rose-50"
                onClick={handleDelete}
              >
                <Trash2 className="h-4 w-4 shrink-0" strokeWidth={2} />
                Eliminar cita
              </button>
            </li>
          </ul>
        </div>
      ) : null}
    </div>
  </>
  );
}
