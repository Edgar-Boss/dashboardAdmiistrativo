import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DoctorForm from "./DoctorForm";

describe("DoctorForm WhatsApp fields", () => {
  it("loads phone and notifications toggle on edit", () => {
    render(
      <DoctorForm
        mode="edit"
        doctor={{
          id: 7,
          name: "Ana López",
          specialty: "Uñas gel",
          status: "active",
          whatsappPhone: "522221234567",
          notificationsEnabled: true,
        }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByLabelText("Número WhatsApp para notificaciones")).toHaveValue(
      "2221234567"
    );
    expect(
      screen.getByRole("button", { name: "Recibir notificaciones de nuevas citas" })
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("clearing phone turns off and disables the notifications toggle", async () => {
    const user = userEvent.setup();
    render(
      <DoctorForm
        mode="edit"
        doctor={{
          id: 7,
          name: "Ana López",
          specialty: "Uñas gel",
          status: "active",
          whatsappPhone: "2221234567",
          notificationsEnabled: true,
        }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const phone = screen.getByLabelText("Número WhatsApp para notificaciones");
    await user.clear(phone);

    const toggle = screen.getByRole("button", {
      name: "Recibir notificaciones de nuevas citas",
    });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(toggle).toBeDisabled();
  });

  it("allows saving with empty phone and notificationsEnabled false", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <DoctorForm
        mode="create"
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />
    );

    await user.type(screen.getByPlaceholderText("Ej: Dr. Luis García"), "Ana López");
    await user.click(screen.getByRole("button", { name: "Crear doctor" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({
      name: "Ana López",
      specialty: "",
      active: true,
      whatsappPhone: "",
      notificationsEnabled: false,
    });
  });

  it("shows error and does not call onSubmit for invalid phone", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <DoctorForm mode="create" onSubmit={onSubmit} onCancel={vi.fn()} />
    );

    await user.type(screen.getByPlaceholderText("Ej: Dr. Luis García"), "Ana");
    await user.type(
      screen.getByLabelText("Número WhatsApp para notificaciones"),
      "12345"
    );
    await user.click(screen.getByRole("button", { name: "Crear doctor" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /exactamente 10 dígitos/i
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("rejects invalid characters in phone and does not submit", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <DoctorForm mode="create" onSubmit={onSubmit} onCancel={vi.fn()} />
    );

    await user.type(screen.getByPlaceholderText("Ej: Dr. Luis García"), "Ana");
    await user.type(
      screen.getByLabelText("Número WhatsApp para notificaciones"),
      "2221234567#"
    );
    await user.click(screen.getByRole("button", { name: "Crear doctor" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /dígitos, espacios, \+ y guiones/i
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("rejects phones that are not exactly 10 digits", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <DoctorForm mode="create" onSubmit={onSubmit} onCancel={vi.fn()} />
    );

    await user.type(screen.getByPlaceholderText("Ej: Dr. Luis García"), "Ana");
    await user.type(
      screen.getByLabelText("Número WhatsApp para notificaciones"),
      "22212345678"
    );
    await user.click(screen.getByRole("button", { name: "Crear doctor" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /exactamente 10 dígitos/i
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("cannot enable notifications without a phone", async () => {
    const user = userEvent.setup();
    render(
      <DoctorForm mode="create" onSubmit={vi.fn()} onCancel={vi.fn()} />
    );

    const toggle = screen.getByRole("button", {
      name: "Recibir notificaciones de nuevas citas",
    });
    expect(toggle).toBeDisabled();
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "false");
  });

  it("submits exact payload for a valid phone with notifications enabled", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <DoctorForm mode="create" onSubmit={onSubmit} onCancel={vi.fn()} />
    );

    await user.type(screen.getByPlaceholderText("Ej: Dr. Luis García"), "Ana López");
    await user.type(
      screen.getByPlaceholderText("Ej: Medicina general, Cardiología"),
      "Uñas gel"
    );
    await user.type(
      screen.getByLabelText("Número WhatsApp para notificaciones"),
      "222 123 4567"
    );
    await user.click(
      screen.getByRole("button", { name: "Recibir notificaciones de nuevas citas" })
    );
    await user.click(screen.getByRole("button", { name: "Crear doctor" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({
      name: "Ana López",
      specialty: "Uñas gel",
      active: true,
      whatsappPhone: "522221234567",
      notificationsEnabled: true,
    });
  });
});
