import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./apiClient", () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from "./apiClient";
import {
  createSpecialist,
  isSpecialistActiveEntry,
  normalizeSpecialistEntry,
  updateSpecialist,
} from "./specialistService";

function mockJsonResponse(body, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    headers: {
      get: (name) =>
        String(name).toLowerCase() === "content-type" ? "application/json" : null,
    },
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

describe("normalizeSpecialistEntry", () => {
  it("supports legacy 4-position tuples", () => {
    expect(normalizeSpecialistEntry([7, "Ana López", "Uñas gel", "Y"])).toEqual({
      id: 7,
      name: "Ana López",
      specialty: "Uñas gel",
      activeFlag: "Y",
      whatsappPhone: "",
      notificationsEnabled: false,
    });
  });

  it("supports new 6-position tuples", () => {
    expect(
      normalizeSpecialistEntry([
        7,
        "Ana López",
        "Uñas gel",
        "Y",
        "2221234567",
        "Y",
      ])
    ).toEqual({
      id: 7,
      name: "Ana López",
      specialty: "Uñas gel",
      activeFlag: "Y",
      whatsappPhone: "2221234567",
      notificationsEnabled: true,
    });
  });

  it("treats notificationsEnabled as true only for Y", () => {
    expect(
      normalizeSpecialistEntry([1, "A", "B", "Y", "2221234567", "N"])
        .notificationsEnabled
    ).toBe(false);
    expect(
      normalizeSpecialistEntry([1, "A", "B", "Y", "2221234567", true])
        .notificationsEnabled
    ).toBe(false);
    expect(
      normalizeSpecialistEntry([1, "A", "B", "Y", "2221234567", "y"])
        .notificationsEnabled
    ).toBe(true);
  });

  it("keeps old objects without WhatsApp fields working", () => {
    expect(
      normalizeSpecialistEntry({
        id: 3,
        name: "Sofía",
        specialty: "Pedicure",
        active: "N",
      })
    ).toEqual({
      id: 3,
      name: "Sofía",
      specialty: "Pedicure",
      activeFlag: "N",
      whatsappPhone: "",
      notificationsEnabled: false,
    });
  });
});

describe("isSpecialistActiveEntry", () => {
  it("uses only index 3 for arrays (index 5=Y does not make inactive active)", () => {
    expect(isSpecialistActiveEntry([1, "Ana", "Uñas", "N", "2221234567", "Y"])).toBe(
      false
    );
    expect(isSpecialistActiveEntry([1, "Ana", "Uñas", "Y", "", "N"])).toBe(true);
  });

  it("uses activeFlag/active for objects", () => {
    expect(isSpecialistActiveEntry({ name: "A", active: "Y" })).toBe(true);
    expect(isSpecialistActiveEntry({ name: "A", activeFlag: "N" })).toBe(false);
  });
});

describe("createSpecialist / updateSpecialist payloads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates without phone and includes notificationsEnabled false in JSON", async () => {
    apiFetch.mockResolvedValue(mockJsonResponse({ ok: true, doctorId: 10 }));

    await createSpecialist({
      name: "Ana",
      specialty: "Uñas",
      active: "Y",
      whatsappPhone: "",
      notificationsEnabled: false,
    });

    expect(apiFetch).toHaveBeenCalledTimes(1);
    const [, options] = apiFetch.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body).toEqual({
      name: "Ana",
      specialty: "Uñas",
      active: "Y",
      whatsappPhone: "",
      notificationsEnabled: false,
    });
    expect(Object.prototype.hasOwnProperty.call(body, "notificationsEnabled")).toBe(
      true
    );
    expect(body.notificationsEnabled).toBe(false);
  });

  it("creates with phone and notificationsEnabled true", async () => {
    apiFetch.mockResolvedValue(mockJsonResponse({ ok: true, doctorId: 11 }));

    await createSpecialist({
      name: "Ana",
      specialty: "Uñas",
      active: "Y",
      whatsappPhone: "222 123 4567",
      notificationsEnabled: true,
    });

    const [, options] = apiFetch.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({
      name: "Ana",
      specialty: "Uñas",
      active: "Y",
      whatsappPhone: "222 123 4567",
      notificationsEnabled: true,
    });
  });

  it("updates with empty phone and false, preserving active as Y/N", async () => {
    apiFetch.mockResolvedValue(mockJsonResponse({ ok: true }));

    await updateSpecialist({
      doctorId: 7,
      name: "Ana",
      specialty: "Uñas",
      active: "N",
      whatsappPhone: "",
      notificationsEnabled: false,
    });

    const [, options] = apiFetch.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body).toEqual({
      doctorId: 7,
      name: "Ana",
      specialty: "Uñas",
      active: "N",
      whatsappPhone: "",
      notificationsEnabled: false,
    });
    expect(body.active).toBe("N");
    expect(body.notificationsEnabled).toBe(false);
  });

  it("keeps active as Y/N on create", async () => {
    apiFetch.mockResolvedValue(mockJsonResponse({ ok: true, doctorId: 12 }));

    await createSpecialist({
      name: "Laura",
      specialty: "Manicure",
      active: "N",
      whatsappPhone: "5212221234567",
      notificationsEnabled: true,
    });

    const body = JSON.parse(apiFetch.mock.calls[0][1].body);
    expect(body.active).toBe("N");
    expect(typeof body.notificationsEnabled).toBe("boolean");
  });
});
