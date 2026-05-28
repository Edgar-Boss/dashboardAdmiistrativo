/** Set to true to preview the calendar UI with sample data. */
export const USE_CALENDAR_MOCK = false;

export function getMockSpecialists() {
  return [
    { id: 7, name: "Dr. Edgar", specialty: "Neurología" },
    { id: 2, name: "Dr. Juan Pérez", specialty: "Medicina General" },
    { id: 4, name: "Dr. Daniel Ramos", specialty: "Urgenciología" },
    { id: 6, name: "Dr. Nardy", specialty: "Psicología" },
  ];
}

export function getMockCalendarAppointments() {
  const date = "2026-05-27";
  return [
    {
      id: 9001,
      name: "María González",
      phoneNumber: "5212221112233",
      reason: "Consulta de seguimiento",
      appointmentDate: date,
      appointmentTime: "09:00",
      state: "CONFIRMED",
      doctorId: 7,
      doctorName: "Dr. Edgar",
      specialty: "Neurología",
      slotCount: 3,
    },
    {
      id: 9002,
      name: "Carlos Ruiz",
      phoneNumber: "5212224445566",
      reason: "Valoración inicial",
      appointmentDate: date,
      appointmentTime: "10:30",
      state: "PENDING",
      doctorId: 2,
      doctorName: "Dr. Juan Pérez",
      specialty: "Medicina General",
      slotCount: 2,
    },
    {
      id: 9003,
      name: "Ana Martínez",
      phoneNumber: "5212227778899",
      reason: "Urgencia menor",
      appointmentDate: date,
      appointmentTime: "11:00",
      state: "CONFIRMED",
      doctorId: 4,
      doctorName: "Dr. Daniel Ramos",
      specialty: "Urgenciología",
      slotCount: 1,
    },
    {
      id: 9004,
      name: "Luis Hernández",
      phoneNumber: "5212223334455",
      reason: "Terapia",
      appointmentDate: date,
      appointmentTime: "14:00",
      state: "CANCELLED",
      doctorId: 6,
      doctorName: "Dr. Nardy",
      specialty: "Psicología",
      slotCount: 4,
    },
  ];
}
