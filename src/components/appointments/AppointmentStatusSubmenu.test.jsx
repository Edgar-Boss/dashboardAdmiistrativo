import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import AppointmentStatusSubmenu from "./AppointmentStatusSubmenu";
import { CANCELLED_INFO_MESSAGE } from "./appointmentStateConfirm";

describe("AppointmentStatusSubmenu cancelled reactivation guard", () => {
  it("hides PENDING and CONFIRMED actions for a CANCELLED appointment", () => {
    render(
      <AppointmentStatusSubmenu currentState="CANCELLED" onSelect={vi.fn()} />
    );

    expect(
      screen.queryByRole("menuitemradio", { name: /Pendiente/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("menuitemradio", { name: /Confirmada/i })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("menuitemradio", { name: /Cancelada/i })
    ).toBeInTheDocument();
    expect(screen.getByText(CANCELLED_INFO_MESSAGE)).toBeInTheDocument();
    expect(
      screen.getByText("Esta cita fue cancelada y no puede reactivarse.")
    ).toBeInTheDocument();
  });

  it("keeps Confirmada available for a PENDING appointment", () => {
    render(
      <AppointmentStatusSubmenu currentState="PENDING" onSelect={vi.fn()} />
    );

    expect(
      screen.getByRole("menuitemradio", { name: /Confirmada/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitemradio", { name: /Pendiente/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitemradio", { name: /Cancelada/i })
    ).toBeInTheDocument();
    expect(screen.queryByText(CANCELLED_INFO_MESSAGE)).not.toBeInTheDocument();
  });

  it("keeps Cancelada available for a CONFIRMED appointment", () => {
    render(
      <AppointmentStatusSubmenu currentState="CONFIRMED" onSelect={vi.fn()} />
    );

    expect(
      screen.getByRole("menuitemradio", { name: /Cancelada/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitemradio", { name: /Confirmada/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitemradio", { name: /Pendiente/i })
    ).toBeInTheDocument();
    expect(screen.queryByText(CANCELLED_INFO_MESSAGE)).not.toBeInTheDocument();
  });
});
