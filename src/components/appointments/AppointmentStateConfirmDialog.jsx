import ConfirmDialog from "../ConfirmDialog";
import { getStateConfirmationCopy } from "./appointmentStateConfirm";

export default function AppointmentStateConfirmDialog({
  open,
  targetState,
  patientName,
  loading = false,
  onConfirm,
  onCancel,
}) {
  const copy = getStateConfirmationCopy(targetState, patientName);
  if (!copy) return null;

  return (
    <ConfirmDialog
      open={open}
      title={copy.title}
      description={copy.description}
      confirmLabel={copy.confirmLabel}
      variant={copy.variant}
      loading={loading}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
