# Reporte QA — sistema de citas WhatsApp

Fecha de ejecución: 2026-10-25.  
Informe de pruebas ejecutadas. Una compilación correcta no se toma como prueba de funcionamiento.

## A. Resumen ejecutivo

**Estado general:** la validación no alcanza para liberar el sistema completo. En Oracle local, los tenants 1 y 2 aceptan una cita válida y rechazan teléfono vacío, horario fuera de jornada, día de descanso, especialista de otro negocio y traslape. El tenant 3 (Clínica San José) no existe en esa base, así que los turnos nocturnos de Luis y Rolando no se reservaron en Oracle. El panel real no se operó: no hay sesión. No se envió ningún mensaje de WhatsApp.

**Entorno usado**

- Panel: repositorio de este workspace, rama `clinica-sanjose`, commit `57ba3a3`.
- Backend: `webhookCitas`, rama `feature`, árbol de trabajo ya sucio. No se hizo commit ni push.
- Base: Oracle local `XEPDB1`, servicio `xepdb1`, usuario de sesión `WEBHOOK_USER`, puerto local `1522`. Perfil Spring `local`.
- No se usó el perfil `dev` ni la base remota. No se llamó a la API del túnel de desarrollo. No se llamó a Meta.

**Componentes revisados**

- Compilación Maven con JDK 17 y suite de pruebas unitarias del backend.
- `npm test` y `npm run build` del panel.
- Pruebas de integración locales con rollback contra `SP_CREATE_APPOINTMENT_SAFE_V2` y `SP_CREATE_APPOINTMENT_SAFE`.
- Lectura SQL de catálogo de tenants, especialistas, intervalos y conteos de citas.
- Llamadas controladas a los procedimientos de alta, con `ROLLBACK` y conteo posterior en cero.
- Mapeo Java de errores Oracle, cubierto por pruebas unitarias ya existentes.
- Calendario React de celdas “Sin turno”, cubierto por Vitest.

**Componentes no revisados**

- Clínica San José en Oracle (tenant 3 ausente en esta base).
- Panel administrativo con sesión real, persistencia tras recargar y vista móvil del calendario conectado a la API.
- WhatsApp Cloud API, webhooks reales, reintentos de Meta y notificaciones a especialistas o clientes.
- Ataques HTTP de autorización (JWT de otro tenant, ID de cita ajena).
- Alta concurrente de la misma hora.
- Transiciones de estado PENDING, CONFIRMED y CANCELLED sobre filas reales.
- Playwright o Cypress: no existen en el panel. ESLint: el panel no tiene script de lint.

**Principales riesgos**

1. Los turnos de sábado y domingo 07:00–19:00 y el turno nocturno 19:00–07:00 no tienen evidencia Oracle en este entorno.
2. Hay credenciales de OpenWA por defecto escritas en la configuración versionada. No se reproducen aquí. Hay que retirarlas y rotarlas antes de compartir el repositorio o desplegar.
3. El código `ORA-20001` significa teléfono obligatorio al crear y “cita no encontrada” al cambiar estado por el camino administrativo. Está cubierto por pruebas distintas, pero es fácil de confundir.
4. La prueba `AppointmentServiceLocalOracleIT` no arrancaba sola: Spring tomaba una configuración de prueba de otro paquete. Se corrigió en el archivo no versionado y la prueba pasó. Sin esa corrección, el fallo parecía un bean ausente.

**Recomendación de liberación:** no liberar a producción el flujo de Clínica San José ni el sistema completo con la evidencia de esta corrida. Los rechazos locales de los tenants 1 y 2 sí quedaron demostrados.

## B. Resultados reales

Estados: PASS ejecutada y cumplió; FAIL ejecutada y falló; BLOCKED no pudo ejecutarse; NOT_RUN no se intentó.

| ID | Módulo | Escenario | Resultado esperado | Resultado real | Estado |
|---|---|---|---|---|---|
| P1-01 | Backend | `mvn clean verify` con JDK 17 | Compila y las pruebas unitarias pasan | BUILD SUCCESS. Tests run: 734, Failures: 0, Errors: 0, Skipped: 0. Las clases `*IT.java` quedan excluidas por Surefire salvo `-Dtest`. | PASS |
| P1-02 | Backend | El mismo comando con el `JAVA_HOME` por defecto de Maven | Compila con Java 17 | Falló en unos segundos: `release version 17 not supported`. `JAVA_HOME` de Maven apuntaba a JDK 11 (`C:\jdk-11.0.2`). No es un defecto del código. | FAIL |
| P1-03 | Panel | `npm test` | Vitest en verde | 24 archivos, 177 pruebas, todas pasaron. | PASS |
| P1-04 | Panel | `npm run build` | Build de Vite | Terminó bien. CSS e JS de `dist` generados. | PASS |
| P1-05 | Panel | Lint | Script de lint ejecutable | `package.json` no define lint. | BLOCKED |
| P1-06 | Panel | E2E Playwright o Cypress | Suite crítica de UI | No hay configuración de ninguna de las dos. | BLOCKED |
| C-01 | Citas | Alta válida, tenant 1, especialista asignado | Oracle guarda slot count y minutos y la fila no queda tras el rollback | `AppointmentServiceLocalOracleIT`: `SP_CREATE_APPOINTMENT_SAFE_V2`, tenant 1, doctor 1, fecha 2026-10-26, hora 09:00, slotCount 2. Estado `OK`. La fila no existió en una conexión nueva. | PASS |
| C-02 | Citas | Alta desde el panel | La cita queda y se ve al recargar | No hay credenciales de login. No se escribió en la API remota. | BLOCKED |
| C-03 | Citas | Alta tenant 2 por el procedimiento legado | `OK` y rollback limpio | `SP_CREATE_APPOINTMENT_SAFE`, tenant 2, doctor 72, 2026-10-26 10:00. Estado `OK`. Dentro de la transacción había 1 fila del marcador. Tras `ROLLBACK`, `after_rows=0`. | PASS |
| C-04 | Citas | Sin teléfono | Oracle rechaza y no inserta | Tenant 1 V2 y tenant 2 legado: `ORA-20001`. Conteo del marcador `QA-AUDIT-7F3C%`: antes 0, dentro 0, después 0. El mapeo Java a `PHONE_NUMBER_REQUIRED` está en `AppointmentRepositoryCreateOracleErrorTest`, incluido en las 734. | PASS |
| C-05 | Citas | Horario ya ocupado | Rechazo y la duración original no cambia | La IT de servicio pidió ampliar la cita de 2 bloques hasta invadir la vecina de las 10:00. Respuesta `APPOINTMENT_OVERLAP`. `slot_count` siguió en 2. La IT de escritura de tenants 1 y 2 también obtuvo `SLOT_ALREADY_BOOKED` y 0 filas extra. | PASS |
| C-06 | Citas | Fuera de horario | `ORA-20009` y ninguna fila | Tenant 1, doctor 1, 2026-10-26 03:00, V2: `ORA-20009: OUT_OF_SCHEDULE`. Filas del marcador: 0. No hay prueba unitaria que mencione el código 20009; el `switch` de Java sí lo traduce a `OUT_OF_SCHEDULE`. | PASS |
| C-07 | Citas | Día de descanso del especialista | Rechazo de ese día | Tenant 2, doctor 72, `rest_day_of_week=2`. El martes 2026-10-27 10:00 devolvió `ORA-20010: DOCTOR_REST_DAY`. El lunes 2026-10-26 sí devolvió `OK` y se revirtió. Convención observada: 1 = lunes. | PASS |
| C-08 | Citas | Alta encima de otra cita | Igual que C-05 | Mismo resultado que C-05. | PASS |
| C-09 | Citas | Dos altas simultáneas del mismo hueco | Una sola fila | No se lanzaron peticiones paralelas. | NOT_RUN |
| C-10 | Citas | Dos citas seguidas sin traslape | Ambas `OK` | IT de servicio: 09:00 con 2 bloques y 10:00 con 1 bloque, las dos `OK`, luego rollback. | PASS |
| C-11 | Citas | La duración guardada coincide con la pedida | `slot_count=2` y minutos del intervalo | La IT leyó `slot_count` y `slot_minutes_at_booking` y los comparó con el intervalo del especialista. | PASS |
| E-01 | Edición | Cambiar el nombre | El nombre cambia y la duración no | `SP_UPDATE_APPOINTMENT_BASIC_V2` sobre el id creado en la transacción. Estado `OK`. `slot_count` y minutos iguales. | PASS |
| E-02 | Edición | Cambiar teléfono | Teléfono nuevo, resto intacto | El procedimiento de edición básica usado no recibe teléfono. | NOT_RUN |
| E-03 | Edición | Cambiar fecha | Fecha nueva si hay cupo | No ejercido. | NOT_RUN |
| E-04 | Edición | Cambiar hora | Hora nueva si hay cupo | No ejercido. | NOT_RUN |
| E-05 | Edición | Cambiar especialista | Especialista nuevo si hay cupo | No ejercido. | NOT_RUN |
| E-06 | Edición | Ampliar duración con hueco libre | La cita crece | Solo se probó la ampliación que invade otra cita. | NOT_RUN |
| E-07 | Edición | Ampliar si invade otra cita | Rechazo y duración original | `APPOINTMENT_OVERLAP`, `slot_count` permaneció en 2. | PASS |
| E-08 | Edición | Reducir duración y liberar el hueco | El slot siguiente vuelve a ofrecerse | No ejercido. | NOT_RUN |
| E-09 | Edición | Editar texto sin tocar duración ni estado | Duración igual | Cubierto por E-01. El estado de la fila no se volvió a leer tras el update. | PASS |
| S-01 | Estados | PENDING a CONFIRMED | Una sola transición | No se llamó al procedimiento de estado. | NOT_RUN |
| S-02 | Estados | PENDING a CANCELLED | La hora queda libre | No ejercido. | NOT_RUN |
| S-03 | Estados | CONFIRMED a CANCELLED | Igual que S-02 | No ejercido. | NOT_RUN |
| S-04 | Estados | Reactivar una cita CANCELLED | HTTP 409 y código de negocio | `AdminExceptionHandlerTest` mapea ORA-20204 a HTTP 409 y `CANCELLED_APPOINTMENT_CANNOT_BE_REACTIVATED`. No se provocó el error dentro de Oracle. | PASS |
| S-05 | Estados | No duplicar confirmación ni notificación | Un solo envío | Las IT desactivan notificaciones y el scheduler. No prueba el comportamiento con Meta encendido. | NOT_RUN |
| H-01 | Horarios | Dr. Luis, sábados y domingos 07:00–19:00, tenant 3 | Oracle acepta dentro y rechaza fuera | `tenants` solo tiene 1 `DEMO_CLINIC` y 2 `NAILS_BOUTIQUE`. `doctors` del tenant 3: 0. | BLOCKED |
| H-02 | Horarios | Dr. Rolando, lunes a viernes 19:00–07:00 | Reserva nocturna, antes y después de medianoche, fin exacto 07:00, inicio exacto 19:00 | Misma ausencia del tenant 3. | BLOCKED |
| H-03 | Horarios | Cita que cruza de día, traslape entre dos fechas, día de descanso y cambio de día | Oracle acepta o rechaza según el turno | Misma ausencia del tenant 3. | BLOCKED |
| H-04 | Horarios | Esas celdas en React | “Sin turno” solo en el bloque completo fuera de turno | Vitest de `scheduleIntervals`, `MedicalCalendarGrid` y `CalendarView`: Luis 18:00 no se etiqueta; desde 19:00 sí. Rolando queda libre hasta las 07:00 y etiquetado desde la celda que empieza a las 07:00. Esto no demuestra que Oracle reserve. | PASS |
| H-05 | Horarios | Especialista con horario propio, domingo sin intervalo | Oracle no crea la cita | Tenant 1, doctor 7, modo `CUSTOM`, único intervalo lunes 09:00–14:00. Domingo 2026-10-25 10:00: `ORA-20007: NO_SCHEDULE`. Filas: 0. El token no es `DOCTOR_DAY_OFF`; la reserva sí se rechazó. | PASS |
| D-01 | Duración | El hueco ocupado deja de ofrecerse | Ni 1 ni 2 bloques incluyen el inicio ocupado | La IT de servicio recorrió los slots devueltos por `SP_GET_AVAILABLE_SLOTS_V2` y fallaría si el tramo ocupado siguiera ofreciéndose. | PASS |
| D-02 | Duración | Slots consecutivos | 09:00 y 10:00 conviven | Ver C-10. | PASS |
| D-03 | Duración | Slot parcialmente ocupado | El procedimiento rechaza el resto del bloque | No se construyó un caso de ocupación parcial distinto del traslape de bloques. | NOT_RUN |
| D-04 | Duración | Cancelar libera disponibilidad | El slot reaparece | No se canceló ninguna cita. | NOT_RUN |
| D-05 | Duración | Editar no corrompe la duración | Minutos iguales tras el rename y tras el traslape rechazado | Ver E-01 y E-07. | PASS |
| D-06 | Duración | Reservas simultáneas | Una sola gana | No ejercido. | NOT_RUN |
| D-07 | Duración | El bloqueo de traslape está en Oracle | El rechazo no depende de React | C-05 y C-06 se hicieron con procedimientos, sin navegador. | PASS |
| D-08 | Duración | WhatsApp 60 min y panel 30 min | Cada canal persiste su duración | La IT administrativa usó 2 bloques del tamaño del intervalo. No se recorrió el FSM hasta una fila real de 60 minutos. | NOT_RUN |
| D-09 | Duración | Límite de la jornada | 03:00 rechazado | Ver C-06. El cierre exacto de la jornada del tenant 1 no se barrió minuto a minuto. | PASS |
| D-10 | Duración | Medianoche | Cruce de día aceptado solo dentro del turno | Depende del tenant 3. | BLOCKED |
| M-01 | Tenants | Cada negocio ve sus citas | Conteos distintos y procedimientos distintos | Lectura: tenant 1, 37 PENDING. Tenant 2, 26 PENDING, 19 CONFIRMED, 3 CANCELLED. La IT de lectura usó `GET_ALL_APPOINTMENTS_V2` en tenant 1 y el procedimiento legado en tenant 2. | PASS |
| M-02 | Tenants | Especialistas de su negocio | 14 en tenant 1 y 5 en tenant 2 | SQL de solo lectura. Tenant 3: 0 especialistas. | PASS |
| M-03 | Tenants | No crear en tenant 1 con el doctor 32 del tenant 2 | `DOCTOR_NOT_FOUND` y ninguna fila | `ORA-20003: DOCTOR_NOT_FOUND`. Después del rollback, 0 filas. No es una prueba HTTP. | PASS |
| M-04 | Tenants | No cancelar una cita de otro tenant por HTTP | 403 o 404 | No se llamó a la API. | NOT_RUN |
| M-05 | Tenants | No leer una cita ajena cambiando el id | 404 | No se llamó a la API. | NOT_RUN |
| M-06 | Tenants | Disponibilidad aislada | La consulta lleva `tenant_id` | Los logs de la IT muestran `tenantId=1` en intervalos, slots, alta y update. No se pidieron slots del tenant 1 con un doctor del tenant 2. | PASS |
| M-07 | Tenants | El número de WhatsApp resuelve el tenant correcto | Canal 3 no cae en tenant 1 o 2 | No se envió ni se simuló un webhook real. Hay pruebas unitarias de resolución de tenant dentro de las 734. | BLOCKED |
| M-08 | Tenants | Cambiar de sesión no conserva el negocio anterior | El panel limpia el estado | Login no disponible. | BLOCKED |
| M-09 | Tenants | Petición con JWT manipulado | Rechazo | No se fabricó un token ni se atacó un endpoint. | NOT_RUN |
| R-01 | Panel | Login, expiración y cierre de sesión | Sesión válida y salida limpia | Sin credenciales. Un intento anterior de abrir el panel quedó detenido en el login. | BLOCKED |
| R-02 | Panel | Calendario, celdas fuera de turno, inactivo y error | “Sin turno” no sustituye error ni inactivo | Incluido en las 177 pruebas de Vitest. | PASS |
| R-03 | Panel | Alta, edición, cancelación y confirmación manual | Persisten tras recargar | Sin sesión y sin escritura a la API. | BLOCKED |
| R-04 | Panel | Especialistas, horarios, día y semana | Los cambios quedan guardados | Sin sesión. | BLOCKED |
| R-05 | Panel | Errores 400, 401, 403, 404, 409 y 500 en la UI | Mensaje comprensible, sin cita duplicada | No se provocaron esas respuestas contra el panel. El 409 de reactivación está cubierto en backend por S-04. | NOT_RUN |
| R-06 | Panel | Escritorio y móvil del calendario real | La grilla se puede usar en ambos | No verificable sin sesión. La revisión visual previa de “Sin turno” usó una vista local de ejemplo y después se retiró; no cuenta como prueba de este sistema contra Oracle. | BLOCKED |
| W-01 | WhatsApp | FSM START hasta CONFIRMATION con mocks | Los estados y los rechazos de secuencia están probados | Hay pruebas `AppointmentFsm*` dentro de las 734, incluidos turno nocturno simulado, confirmación y hueco ocupado. No abren Meta. | PASS |
| W-02 | WhatsApp | Webhook duplicado, fallo temporal de Meta, reintento y aviso al especialista | Idempotencia y ningún envío doble | No se apuntó al webhook real ni a Graph. Las IT dejan las notificaciones apagadas. | BLOCKED |
| W-03 | WhatsApp | No enviar mensajes durante la auditoría | Cero envíos | No se invocó Graph ni OpenWA. Los procedimientos de esta corrida no disparan WhatsApp. | PASS |
| B-01 | Base | Rollback de altas de prueba | Cero filas del marcador | `QA-AUDIT-7F3C%`: 0 antes, 0 después, también tras el `OK` del lunes que se revirtió. La IT de servicio comprobó ausencia en una conexión nueva. | PASS |
| B-02 | Base | Identidad de la base antes de escribir | Solo `XEPDB1` / `WEBHOOK_USER` | La IT corta si la sesión no es ese usuario, esquema y servicio. `sqlplus / as sysdba` local no ve ese esquema: es otra instancia. Las escrituras de esta auditoría fueron por el puerto 1522. | PASS |
| B-03 | Base | America/Mexico_City frente a UTC en una fila guardada | La hora civil no se desplaza | No se comparó `CREATED_AT` con la hora de la cita en un caso dedicado. | NOT_RUN |
| B-04 | Base | Carrera e idempotencia de webhooks | Una sola cita | No ejercido. | NOT_RUN |
| G-01 | Regresión | Nails Boutique y DEMO_CLINIC siguen reservando | Altas y rechazos en ambos | C-01, C-03, C-04, C-05 y C-07. Conteos leídos al inicio no se usaron como fixture modificable: las filas de prueba no permanecieron. | PASS |
| G-02 | Regresión | Clínica San José no se altera | Datos iguales antes y después | No había filas de tenant 3 que proteger. Tampoco se pudo demostrar su agenda. | BLOCKED |

### Evidencia de procedimientos

Procedimientos que sí se ejecutaron en Oracle local:

- `SP_CREATE_APPOINTMENT_SAFE_V2` (tenant 1).
- `SP_CREATE_APPOINTMENT_SAFE` (tenant 2).
- `SP_UPDATE_APPOINTMENT_BASIC_V2`.
- `SP_GET_AVAILABLE_SLOTS_V2`.
- `SP_GET_DOCTOR_INTERVALS_V2`.

`SP_GET_DOCTOR_DAY_SCHEDULE` es el camino legado. En la lectura previa del tenant 2 la IT lo usó; en tenant 1 el catálogo V2 no cae a ese procedimiento. `SP_GET_AVAILABLE_DATES` no se volvió a invocar en esta última corrida. `SP_GET_APPOINTMENT_BY_ID_V2` no se llamó aquí.

Catálogo local leído, sin teléfonos:

- Tenant 1 `DEMO_CLINIC`, flujo `APPOINTMENT`, `ACTIVE`. 14 especialistas. 37 citas `PENDING`.
- Tenant 2 `NAILS_BOUTIQUE`, flujo `APPOINTMENT`, `ACTIVE`. 5 especialistas. 26 `PENDING`, 19 `CONFIRMED`, 3 `CANCELLED`.
- `doctor_schedule_mode`: una fila, tenant 1 doctor 7, `CUSTOM`.
- `doctor_work_intervals`: una fila, tenant 1 doctor 7, día 1, turno 1, `09:00`–`14:00`, `end_day_offset` 0.
- `doctor_schedule`: ninguna fila.
- Tenant 3: no está en `tenants` ni en `doctors`.

## C. Errores encontrados

### 1. La prueba de Oracle de `AppointmentService` no arrancaba

- Severidad: MEDIA.
- Ubicación: `webhookCitas/src/test/java/com/example/whatsappbot/appointments/service/AppointmentServiceLocalOracleIT.java`. La configuración que la secuestraba está en `BookingTenantRoutingTest.PilotApplication`, anotada con `@SpringBootConfiguration` en el paquete padre `appointments`.
- Causa: `@SpringBootTest` sin `classes` sube por los paquetes y encuentra esa configuración de prueba. El contexto no tiene `AppointmentService`. El síntoma fue `NoSuchBeanDefinitionException`. No era un fallo de la reserva.
- Reproducción: `mvn "-Dtest=AppointmentServiceLocalOracleIT" "-Dlocal.oracle.appointments=true" test` antes de fijar `classes`.
- Impacto: la prueba que debía hablar con Oracle quedaba en error y podía leerse como si el servicio no existiera.
- Corrección: se añadió `classes = WhatsAppBotApplication.class`, igual que en las otras IT que sí arrancan.
- Estado: aplicada en el archivo, que ya era no versionado (`??`). No hay commit.
- Prueba posterior: Tests run: 1, Failures: 0, Errors: 0, Skipped: 0, 8.932 s. Logs: alta 09:00 slotCount 2, vecina 10:00 slotCount 1, update y traslape rechazado.

### 2. Credencial de OpenWA por defecto en archivos de configuración

- Severidad: ALTA.
- Ubicación: `application.yml` y `application-local.yml`, claves `openwa.api-key` y `openwa.session-id`, como valor por defecto de la variable de entorno.
- Causa: el fallback está escrito en el repositorio.
- Reproducción: revisar esas claves. El valor no se copia en este informe.
- Impacto: cualquiera con el repositorio puede usar ese session id si sigue vigente.
- Corrección propuesta: quitar los literales, exigir la variable de entorno y rotar la clave en el proveedor. No se hizo en esta auditoría para no tocar configuración ni un secreto en un commit no pedido.
- Estado: sin corregir.
- Prueba posterior: no aplica.

### 3. El mismo número Oracle significa dos cosas

- Severidad: MEDIA.
- Ubicación: `AppointmentRepository.mapCreateAppointmentError` (20001 = teléfono obligatorio) y `AdminExceptionHandler` (20001 = cita no encontrada en el update de estado legado).
- Causa: contratos viejos reutilizan el número. El código Java lo separa a propósito y hay pruebas de ambos lados.
- Impacto: un manejador genérico de `SQLException` puede convertir un teléfono vacío en “no encontrada”, o al revés.
- Corrección propuesta: no unificarlos a ciegas. Documentar el contrato por procedimiento y evitar un mapeo único por número.
- Estado: sin cambio de reglas de negocio.
- Prueba posterior: las pruebas unitarias de ambos mapeos forman parte de las 734. No se forzó 20001 de estado dentro de Oracle.

### 4. Domingo sin intervalo responde `NO_SCHEDULE`, no `DOCTOR_DAY_OFF`

- Severidad: BAJA.
- Ubicación: tenant 1, doctor 7, domingo 2026-10-25 10:00, `SP_CREATE_APPOINTMENT_SAFE_V2`.
- Causa observada: no hay fila de intervalo para ese día. Oracle responde `ORA-20007: NO_SCHEDULE`.
- Impacto: la cita no se crea, así que el bloqueo funciona. Quien espere el código 20010 para pintar “día de descanso” no va a recibirlo en este caso.
- Corrección propuesta: ninguna en esta corrida. Hay que decidir si un día sin intervalo de un horario `CUSTOM` debe ser día de descanso o ausencia de agenda. No se cambió la regla.
- Estado: sin corrección.
- Prueba posterior: el rechazo quedó registrado y el conteo del marcador siguió en 0.

### 5. Maven no compila si hereda JDK 11

- Severidad: BAJA, de entorno.
- Ubicación: `JAVA_HOME` del proceso de Maven, no del `pom.xml`.
- Impacto: `mvn clean verify` falla antes de probar nada.
- Corrección: invocar Maven con JDK 17. No se cambió el `JAVA_HOME` permanente de la máquina.
- Estado: la corrida con JDK 17 pasó.

No apareció un fallo de producto en las reservas que Oracle sí ejecutó para los tenants 1 y 2.

## D. Cobertura

El porcentaje de abajo cuenta filas de la sección B, no líneas de código. Jacoco no se usa como cifra de “el sistema funciona”.

| Estado | Filas | Identificadores |
|---|---|---|
| PASS | 33 | P1-01, P1-03, P1-04, C-01, C-03, C-04, C-05, C-06, C-07, C-08, C-10, C-11, E-01, E-07, E-09, S-04, H-04, H-05, D-01, D-02, D-05, D-07, D-09, M-01, M-02, M-03, M-06, R-02, W-01, W-03, B-01, B-02, G-01 |
| FAIL | 1 | P1-02, fallo de entorno JDK 11 |
| BLOCKED | 15 | P1-05, P1-06, C-02, H-01, H-02, H-03, D-10, M-07, M-08, R-01, R-03, R-04, R-06, W-02, G-02 |
| NOT_RUN | 21 | C-09, E-02, E-03, E-04, E-05, E-06, E-08, S-01, S-02, S-03, S-05, D-03, D-04, D-06, D-08, M-04, M-05, M-09, R-05, B-03, B-04 |

Total de filas de la matriz: 33 + 1 + 15 + 21 = 70.

- Ejecutadas (PASS + FAIL): 34 / 70 = 48.6 %.
- Aprobadas sobre el total de escenarios pedidos: 33 / 70 = 47.1 %.
- Aprobadas sobre las ejecutadas: 33 / 34 = 97.1 %. La única FAIL ejecutada es el JDK 11 de Maven.
- No ejecutadas por bloqueo o porque no se intentaron: 36 / 70 = 51.4 %.

Esas cifras no dicen que el 47 % del producto funcione. Dicen cuántos escenarios de esta matriz se corrieron y cuántos cumplieron lo esperado.

Cobertura de código: `mvn clean verify` ejecutó 734 pruebas unitarias y el panel 177. No se publica un porcentaje de líneas. Las IT de Oracle no entran en las 734.

## E. Cambios realizados

| Archivo | Motivo |
|---|---|
| `Panel Administrativo/REPORTE_QA_SISTEMA_CITAS.md` | Este informe. |
| `webhookCitas/src/test/java/com/example/whatsappbot/appointments/service/AppointmentServiceLocalOracleIT.java` | Una línea: `classes = WhatsAppBotApplication.class`. El archivo ya estaba sin seguimiento en la rama `feature`. Sin esto la IT no crea `AppointmentService`. No se hizo commit. |

No se modificaron procedimientos, webhooks ni la configuración. Los marcadores `QA-AUDIT-7F3C%` quedaron en 0 filas después del `ROLLBACK`. La sección H creó un especialista y filas temporales de clínica solo en XEPDB1; la restauración dejó los conteos y los horarios originales como estaban al inicio.

## H. Turnos de 24 horas y nocturnos (tenant 1, Oracle local)

Corrida posterior, el 2026-10-25, contra `localhost:1522/XEPDB1`. Identidad comprobada antes de escribir: `WEBHOOK_USER` / `XEPDB1` / `xepdb1`. No se usó la base remota. No se cambió el texto de ningún procedimiento.

La disponibilidad V2 no es el turno del especialista solo. `PKG_WORK_INTERVALS_V2.PREVIEW_DAY` cruza `CLINIC_SCHEDULE` con `DOCTOR_WORK_INTERVALS` y se queda con la intersección. El bloque de la clínica de DEMO_CLINIC es lunes a viernes 09:00–18:00 y sábado 09:00–14:00, bloques de 30 minutos. Domingo no tiene fila. Por eso un especialista configurado de 00:00 a 00:00 sigue ofreciendo, con la clínica original, solo 09:00–18:00.

`CK_DWI_WINDOW` sí admite un intervalo de 24 horas: `END_DAY_OFFSET = 1` y `START_TIME >= END_TIME`. `00:00`–`00:00` con offset 1 cumple. `SP_SAVE_DOCTOR_WEEK_V2` lo aceptó (`SAVE_SINGLE_24H=OK`). No hizo falta partirlo en dos turnos. El día ISO sale de `TRUNC(fecha,'IW')`: lunes = 1.

Para probar las horas de madrugada sin dejar la clínica ampliada, se insertaron 13 filas temporales en `CLINIC_SCHEDULE` (ids nuevos, sin tocar los ids 1 a 6) y se borraron al final. Durante esa ventana el doctor 7 siguió resolviendo el lunes 09:00–14:00. El especialista de QA fue el id 92, nombre `QA Night 7F3C`, sin teléfono y con notificaciones en `N`. Su semana quedó así:

- Lunes y martes: `00:00`–`00:00`, offset 1.
- Miércoles: `19:00`–`07:00`, offset 1.
- Viernes: `07:00`–`19:00`, offset 0.
- Jueves, sábado y domingo: sin turno propio. El jueves solo hereda la cola del miércoles hasta las 07:00.

Esas dos jornadas de 24 horas seguidas se fusionan. El lunes 2 de noviembre de 2026 se resolvió como un solo intervalo `2026-11-02 00:00` → `2026-11-04 00:00`. Una cita que empieza a las 23:30 y dura dos bloques de 30 minutos cabe en ese intervalo. Una cita no puede salir del intervalo que contiene su hora de inicio: el final tiene que ser menor o igual que `end_at`.

| ID | Escenario | Resultado real | Estado |
|---|---|---|---|
| N-01 | Conexión local antes de escribir | `WEBHOOK_USER`, `XEPDB1`, `xepdb1`, puerto 1522 | PASS |
| N-02 | Un solo intervalo de 24 horas | `SP_SAVE_DOCTOR_WEEK_V2` devolvió `OK` para `00:00`–`00:00` offset 1 | PASS |
| N-03 | 00:00 con la clínica original | `ORA-20009: OUT_OF_SCHEDULE`, 0 filas. El mismo día a las 10:00 sí devolvió `OK` | PASS |
| N-04 | 00:00, 03:00, 06:30 y 07:00 con la clínica temporal | Las cuatro altas `OK`. La de las 03:00 quedó `2026-11-02`, hora `03:00`, 1 bloque, 30 minutos, `PENDING` | PASS |
| N-05 | 18:30 y 19:00 dentro de las 24 horas | Ambas `OK` el lunes | PASS |
| N-06 | 23:30 a 00:30 | Lunes 23:30, `slot_count=2`, `slot_minutes_at_booking=30`. Miércoles 23:30 igual: fecha `2026-11-04`, 60 minutos | PASS |
| N-07 | Termina exactamente a las 07:00 | Jueves 06:00, 2 bloques, `OK`. El turno de esa madrugada acaba a las 07:00 | PASS |
| N-08 | Excede el final del turno | Jueves 06:00 con 3 bloques: `ORA-20009`, 0 filas. Viernes 18:00 con 3 bloques: `ORA-20009`. Viernes 19:00 y viernes 06:30: `ORA-20009` | PASS |
| N-09 | Traslape entre dos fechas | Martes 00:00 rechazado por la cita del lunes 23:30. Jueves 00:00 rechazado por la del miércoles 23:30. Ambos `ORA-20002`, 0 filas | PASS |
| N-10 | Consecutivas sin traslape | Lunes 10:30 `OK` junto a las 10:00. Martes 00:30 `OK`. Jueves 00:30 `OK` | PASS |
| N-11 | Cancelar libera el hueco | `UPDATE_APPOINTMENT_STATE` pasó la de las 10:30 a `CANCELLED`. `SP_GET_AVAILABLE_SLOTS_V2` volvió a ofrecer `10:30` | PASS |
| N-12 | Cambiar duración | La de las 07:00 pasó de 1 a 3 bloques (`OK`, minutos siguen en 30). `07:30` dejó de ofrecerse y `08:30` siguió libre. Al volver a 1 bloque, `07:30` reapareció | PASS |
| N-13 | Fechas ofrecidas | `GET_AVAILABLE_DATES_V3` desde el 2026-11-02, horizonte 7, 1 bloque: 02, 03, 04, 05 y 06. Sábado no entra | PASS |
| N-14 | Día sin turno | Sábado 10:00: `ORA-20010: DOCTOR_DAY_OFF`, 0 filas. Intervalos del sábado: `DOCTOR_DAY_OFF` | PASS |
| N-15 | Reloj | `mexico_now` 2026-10-25 01:08:31 y UTC 07:08:31, seis horas. La cita de las 03:00 no se guardó como 09:00 UTC | PASS |
| N-16 | Dos sesiones, mismo 15:00 | La primera `OK` a las 07:09:15 UTC y esperó 5 segundos antes del `COMMIT`. La segunda recibió `ORA-20002` a las 07:09:20. Quedó 1 fila | PASS |
| N-17 | Otros especialistas y el tenant 2 | Doctor 1: 28 citas antes y después. Tenant 2: 48 antes y después. Cero citas QA en otro doctor. Doctor 7, durante la clínica ampliada: lunes 09:00–14:00 | PASS |
| N-18 | Restauración | Borradas 16 citas QA, 4 intervalos, 1 modo, 1 doctor y 13 filas temporales de clínica. Conteos finales iguales al inicio: 14 y 5 doctores, 37 citas `PENDING` del tenant 1, tenant 2 en 3/19/26, un intervalo del doctor 7, clínica ids 1–6 sin cambio de horas | PASS |

No se agregó una prueba Java que repita esta corrida. Habría tenido que confirmar las filas temporales de `CLINIC_SCHEDULE` para que la segunda sesión las viera. Si esa prueba se corta antes de limpiar, todos los especialistas de DEMO_CLINIC quedan con horario de madrugada. La evidencia de esta sección es la ejecución SQL ya restaurada.

Efecto colateral: `UPDATE_APPOINTMENT_STATE` estaba `INVALID` antes de llamarlo y quedó `VALID` después. Oracle recompiló el mismo texto al ejecutarlo. No se editó el fuente. Los procedimientos de confirmación y recordatorio siguen `INVALID`; esta corrida no los usó.

Regla que queda demostrada, y que no se modificó: un turno nocturno del especialista no abre horas que la clínica no tiene. Con el horario real de DEMO_CLINIC, 00:00, 03:00, 19:00 y 23:30 se rechazan aunque el especialista esté en 24 horas. Con la clínica cubierta, el motor sí reserva de madrugada, corta en el fin exacto del turno y no deja dos citas en el mismo cruce de medianoche.

## F. Pendientes

### 1. Bloqueantes para producción

- Reservar y rechazar en Oracle el calendario real de Clínica San José: Luis 07:00–19:00 sábado y domingo, Rolando 19:00–07:00 de lunes a viernes, incluyendo 19:00 exacto, 07:00 exacto y el cruce de medianoche. Esta base local no tiene el tenant 3. No se debe probar eso en la base remota sin un respaldo y una restauración comprobados.
- Recorrer el panel con sesión de ese tenant: crear, editar, cancelar, confirmar, recargar y comprobar que la grilla muestra la misma fila que Oracle.
- Aislar tenants por HTTP: cita, especialista y slots con un identificador del otro negocio.
- Quitar y rotar la credencial OpenWA que está como valor por defecto.

### 2. Importantes, no bloqueantes de un despliegue que no use turnos nocturnos

- Transiciones PENDING a CONFIRMED, y CONFIRMED a CANCELLED, sobre una cita de prueba. La sección H solo cubrió PENDING a CANCELLED en el especialista QA.
- Editar teléfono, fecha, hora y especialista.
- La ampliación y la reducción de duración, y dos altas simultáneas del mismo horario, quedaron cubiertas en la sección H para el especialista QA. Falta el mismo caso con el horario real de otro tenant.
- Probar ORA-20204 dentro de Oracle, no solo el mapeo Java.
- Decidir si un domingo sin intervalo debe seguir respondiendo `NO_SCHEDULE`.
- Hacer que `AppointmentServiceLocalOracleIT` no dependa de encontrar por accidente otra `@SpringBootConfiguration`. La corrección actual está sin commit.
- Fijar el JDK 17 de Maven en la documentación de arranque, sin cambiar el `JAVA_HOME` global si la máquina lo usa para otros proyectos.

### 3. Mejoras futuras

- Script de lint en el panel.
- Una suite E2E mínima de login, alta y cancelación, con la API de prueba.
- La sección H ya comparó una cita de las 03:00 con `mexico_now` y UTC. Falta el mismo cruce cuando la clínica no está ampliada de forma temporal.
- Separar los números Oracle duplicados en el contrato nuevo, sin reinterpretar los procedimientos que ya están en producción.

## G. Conclusión

**VALIDACIÓN INSUFICIENTE.**

Oracle local sí reservó y sí rechazó, con restauración comprobada, para DEMO_CLINIC y Nails Boutique. La sección H además demostró, sobre un especialista QA ya eliminado, que el motor V2 opera de madrugada y en el cruce de medianoche cuando la clínica también cubre esas horas: 00:00, 23:30–00:30, fin exacto a las 07:00, rechazo al exceder el turno, traslape entre dos fechas y una sola ganadora entre dos sesiones. Con el horario real de la clínica, 09:00–18:00, esas horas de madrugada se rechazan aunque el especialista esté en 24 horas. El panel compila y sus 177 pruebas pasan. Clínica San José, el panel con sesión real y WhatsApp siguen sin ejecutarse. No corresponde declarar el sistema apto para producción.
