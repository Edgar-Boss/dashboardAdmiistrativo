/** Set to true to preview the calendar UI with sample data. */
export const USE_CALENDAR_MOCK = false;

export function getMockSpecialists() {
  return [
    { id: 7, name: "Ana López", specialty: "Uñas gel" },
    { id: 2, name: "María Ruiz", specialty: "Nail art" },
    { id: 4, name: "Sofía Méndez", specialty: "Pedicure spa" },
    { id: 6, name: "Laura Torres", specialty: "Manicure" },
  ];
}

export function getMockCalendarAppointments() {
  const date = "2026-05-27";
  return [
    {
      id: 9001,
      name: "Valeria González",
      phoneNumber: "5212221112233",
      reason: "Manicure gel",
      appointmentDate: date,
      appointmentTime: "09:00",
      state: "CONFIRMED",
      doctorId: 7,
      doctorName: "Ana López",
      specialty: "Uñas gel",
      slotCount: 3,
    },
    {
      id: 9002,
      name: "Camila Ruiz",
      phoneNumber: "5212224445566",
      reason: "Diseño con Swarovski",
      appointmentDate: date,
      appointmentTime: "10:30",
      state: "PENDING",
      doctorId: 2,
      doctorName: "María Ruiz",
      specialty: "Nail art",
      slotCount: 2,
    },
    {
      id: 9003,
      name: "Daniela Martínez",
      phoneNumber: "5212227778899",
      reason: "Pedicure spa",
      appointmentDate: date,
      appointmentTime: "11:00",
      state: "CONFIRMED",
      doctorId: 4,
      doctorName: "Sofía Méndez",
      specialty: "Pedicure spa",
      slotCount: 1,
    },
    {
      id: 9004,
      name: "Fernanda Hernández",
      phoneNumber: "5212223334455",
      reason: "Cambio de gel",
      appointmentDate: date,
      appointmentTime: "14:00",
      state: "CANCELLED",
      doctorId: 6,
      doctorName: "Laura Torres",
      specialty: "Manicure",
      slotCount: 4,
    },
  ];
}
