import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AppointmentCalendarCard from "./AppointmentCalendarCard";
import { CARD_VARIANT } from "./calendarCardLayout";

const confirmedAppointment = {
  id: 416,
  name: "Cliente Confirmada",
  phoneNumber: "522221234567",
  reason: "Manicure",
  appointmentDate: "2026-08-10",
  appointmentTime: "10:00",
  state: "CONFIRMED",
  doctorId: 1,
  doctorName: "Ana",
  specialty: "Uñas",
  slotCount: 3,
};

function buildBlock(appointment, variant = CARD_VARIANT.LARGE, heightPx = 160) {
  return {
    row: appointment,
    startKey: appointment.appointmentTime,
    slotCount: appointment.slotCount ?? 3,
    variant,
    heightPx,
  };
}

function StatefulCard(props) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  return (
    <AppointmentCalendarCard
      {...props}
      isMenuOpen={isMenuOpen}
      onMenuOpen={() => setIsMenuOpen(true)}
      onMenuClose={() => setIsMenuOpen(false)}
    />
  );
}

function renderCard({
  appointment = confirmedAppointment,
  onClick = vi.fn(),
  onStateChange = vi.fn(),
  variant = CARD_VARIANT.LARGE,
  heightPx = 160,
} = {}) {
  const props = { onClick, onStateChange };
  render(
    <div style={{ position: "relative", height: 240 }}>
      <StatefulCard
        block={buildBlock(appointment, variant, heightPx)}
        onClick={onClick}
        onStateChange={onStateChange}
        style={{ top: 0 }}
      />
    </div>
  );
  return props;
}

async function openActionsMenu(user) {
  await user.click(screen.getByRole("button", { name: "Acciones de la cita" }));
}

describe("AppointmentCalendarCard actions menu", () => {
  it("does not offer Enviar confirmación for a CONFIRMED appointment", async () => {
    const user = userEvent.setup();
    renderCard();

    await openActionsMenu(user);

    expect(
      screen.queryByRole("menuitem", { name: "Enviar confirmación" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Enviar confirmación" })
    ).not.toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Editar cita" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Cambiar estado" })).toBeInTheDocument();
    expect(
      screen.queryByRole("menuitem", { name: "Ver detalles" })
    ).not.toBeInTheDocument();
  });

  it("still opens the appointment when the card body is clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    renderCard({ onClick });

    await user.click(
      screen.getByRole("button", { name: /Cita de Cliente Confirmada/ })
    );

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledWith(confirmedAppointment);
  });

  it("does not open the edit form when dismissing the actions menu by clicking the card", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    renderCard({ onClick });

    await openActionsMenu(user);
    expect(screen.getByRole("menu", { name: "Acciones de la cita" })).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /Cita de Cliente Confirmada/ })
    );

    expect(onClick).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("menu", { name: "Acciones de la cita" })
    ).not.toBeInTheDocument();
  });

  it("keeps edit and change-state actions in the menu", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    renderCard({ onClick });

    await openActionsMenu(user);

    expect(screen.getByRole("menuitem", { name: "Editar cita" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Cambiar estado" })).toBeInTheDocument();

    await user.click(screen.getByRole("menuitem", { name: "Editar cita" }));

    expect(onClick).toHaveBeenCalledWith(confirmedAppointment);
  });

  it("does not grow card height to fit the confirmation action", () => {
    renderCard({
      variant: CARD_VARIANT.COMPACT,
      heightPx: 56,
    });

    expect(screen.getByTestId("appointment-calendar-card")).toHaveStyle({
      height: "56px",
      maxHeight: "56px",
    });
    expect(
      screen.queryByRole("button", { name: "Enviar confirmación" })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Acciones de la cita" })
    ).toBeInTheDocument();
  });

  it("keeps the Confirmada badge fully visible next to the menu", () => {
    renderCard();

    const badge = screen.getByText("Confirmada");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("shrink-0");
    expect(badge).toHaveClass("leading-tight");
    expect(badge).toHaveClass("whitespace-nowrap");
    expect(
      screen.getByRole("button", { name: /Cita de Cliente Confirmada/ })
    ).toHaveClass("pr-8");
  });
});

const pendingAppointment = {
  ...confirmedAppointment,
  id: 417,
  name: "Ana whastapp",
  state: "PENDING",
};

async function openConfirmedStateDialog(user) {
  await openActionsMenu(user);
  await user.hover(screen.getByRole("menuitem", { name: "Cambiar estado" }));
  await user.click(screen.getByRole("menuitemradio", { name: /Confirmada/i }));
}

describe("AppointmentCalendarCard state confirmation modal", () => {
  it("portals the confirm dialog to document.body outside the calendar card", async () => {
    const user = userEvent.setup();
    renderCard({ appointment: pendingAppointment });

    await openConfirmedStateDialog(user);

    const dialog = screen.getByRole("alertdialog");
    const card = screen.getByTestId("appointment-calendar-card");
    const root = screen.getByTestId("confirm-dialog-root");

    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveTextContent("Confirmar cita");
    expect(document.body.contains(dialog)).toBe(true);
    expect(document.body.contains(root)).toBe(true);
    expect(card.contains(dialog)).toBe(false);
    expect(card.contains(root)).toBe(false);
    expect(root.parentElement).toBe(document.body);
    expect(dialog.className).toMatch(/max-w-\[min\(28rem,calc\(100vw-2rem\)\)\]/);
  });

  it("calls onStateChange when confirming PENDING → CONFIRMED", async () => {
    const user = userEvent.setup();
    const onStateChange = vi.fn();
    renderCard({ appointment: pendingAppointment, onStateChange });

    await openConfirmedStateDialog(user);
    await user.click(screen.getByRole("button", { name: "Sí, confirmar" }));

    expect(onStateChange).toHaveBeenCalledTimes(1);
    expect(onStateChange).toHaveBeenCalledWith(417, "CONFIRMED");
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("closes the modal on Cancelar without changing state", async () => {
    const user = userEvent.setup();
    const onStateChange = vi.fn();
    renderCard({ appointment: pendingAppointment, onStateChange });

    await openConfirmedStateDialog(user);
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onStateChange).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("closes the actions menu and status submenu when the modal opens", async () => {
    const user = userEvent.setup();
    renderCard({ appointment: pendingAppointment });

    await openConfirmedStateDialog(user);

    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(
      screen.queryByRole("menu", { name: "Acciones de la cita" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("menu", { name: "Cambiar estado de la cita" })
    ).not.toBeInTheDocument();
  });
});
