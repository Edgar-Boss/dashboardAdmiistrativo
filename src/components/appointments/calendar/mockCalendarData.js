/** Set to true to preview the calendar UI with sample data. */
export const USE_CALENDAR_MOCK = false;

export function getMockSpecialists() {
  return [
    { id: 7, name: "Dra. Ana López", specialty: "Medicina general" },
    { id: 2, name: "Dr. Carlos Ruiz", specialty: "Medicina familiar" },
    { id: 4, name: "Dra. Sofía Méndez", specialty: "Pediatría" },
    { id: 6, name: "Dr. Luis Torres", specialty: "Cardiología" },
  ];
}

export function getMockCalendarAppointments() {
  const date = "2026-05-27";
  return [
    {
      id: 9001,
      name: "Valeria González",
      phoneNumber: "5212221112233",
      reason: "Consulta general",
      appointmentDate: date,
      appointmentTime: "09:00",
      state: "CONFIRMED",
      doctorId: 7,
      doctorName: "Dra. Ana López",
      specialty: "Medicina general",
      slotCount: 3,
    },
    {
      id: 9002,
      name: "Camila Ruiz",
      phoneNumber: "5212224445566",
      reason: "Control de seguimiento",
      appointmentDate: date,
      appointmentTime: "10:30",
      state: "PENDING",
      doctorId: 2,
      doctorName: "Dr. Carlos Ruiz",
      specialty: "Medicina familiar",
      slotCount: 2,
    },
    {
      id: 9003,
      name: "Daniela Martínez",
      phoneNumber: "5212227778899",
      reason: "Revisión pediátrica",
      appointmentDate: date,
      appointmentTime: "11:00",
      state: "CONFIRMED",
      doctorId: 4,
      doctorName: "Dra. Sofía Méndez",
      specialty: "Pediatría",
      slotCount: 1,
    },
    {
      id: 9004,
      name: "Fernanda Hernández",
      phoneNumber: "5212223334455",
      reason: "Valoración cardiológica",
      appointmentDate: date,
      appointmentTime: "14:00",
      state: "CANCELLED",
      doctorId: 6,
      doctorName: "Dr. Luis Torres",
      specialty: "Cardiología",
      slotCount: 4,
    },
  ];
}
