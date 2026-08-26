import { Conversation, FlowData } from "./conversacion.model";

/**
 * Escenarios de ejemplo del agente conversacional.
 *
 * Cubren el ciclo completo: aviso de servicio pendiente, alta de la cita con
 * WhatsApp Flow, confirmación con detalle, rechazo, reagendamiento, y los casos
 * de escalada a un asesor. Las fechas se calculan al abrir la pantalla para que
 * el demo no envejezca (a partir de las partes locales, no de `toISOString()`,
 * que salta a UTC y en México devolvería el día siguiente después de las 18:00).
 */

const DOWS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MONS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** Próximo día a `offset` días, saltando domingos. */
const soon = (offset: number): Date => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  if (d.getDay() === 0) d.setDate(d.getDate() + 1);
  return d;
};

const flowOf = (d: Date, time: string): FlowData => ({
  year: d.getFullYear(),
  month: d.getMonth(),
  day: d.getDate(),
  time,
});

const label = (d: Date, time: string): string =>
  `${DOWS[d.getDay()]} ${d.getDate()} de ${MONS[d.getMonth()]} · ${time}`;

const dAndrea = soon(3);
const dSofia = soon(4);

export const DEMO_CONVERSATIONS: Conversation[] = [
  // 1 · Servicio pendiente → agenda con WhatsApp Flow → confirmación con datos
  {
    id: "wa-flow",
    name: "Andrea Ríos",
    phone: "+52 81 **** 5521",
    state: "BOOKED",
    lastActivity: "hace 3 min",
    appointmentRef: "CITA-2490",
    code: "DEMC00000031",
    tag: "Servicio → Flow",
    messages: [
      { author: "bot", text: "Hola *Andrea* 👋 Su *Civic 2022* ya alcanzó los *20,000 km* y le corresponde su *servicio de mantenimiento*. ¿Desea que le agende una cita?", buttons: ["✅ Sí, agendar", "Más tarde"], time: "14:02" },
      { author: "customer", text: "Sí, por favor.", time: "14:03" },
      { author: "bot", text: "Perfecto. Toque el botón para elegir la fecha y la hora que más le convengan en *Sucursal Pachuca*.", buttons: ["📅 Elegir fecha y hora"], time: "14:03" },
      { author: "system", flow: flowOf(dAndrea, "08:00"), time: "14:04" },
      { author: "bot", detail: { name: "Andrea Ríos", servicio: "Servicio de 20,000 km", fecha: label(dAndrea, "08:00"), folio: "DEMCT00000031" }, time: "14:04" },
      { author: "customer", text: "Muchas gracias, ahí estaré.", time: "14:05" },
    ],
  },
  // 2 · Servicio pendiente · aviso recibido (aún sin agendar)
  {
    id: "wa-serv",
    name: "Marcos Lara",
    phone: "+52 81 **** 7714",
    state: "LEAD",
    lastActivity: "hace 20 min",
    code: "DEMC00000018",
    tag: "Servicio · aviso",
    messages: [
      { author: "bot", text: "Hola *Marcos* 👋 Su *Jetta 2021* ya alcanzó los *40,000 km* y le corresponde su *servicio de mantenimiento*. ¿Desea que le agende una cita?", buttons: ["✅ Sí, agendar", "Más tarde"], time: "11:15" },
      { author: "customer", text: "¿Qué incluye y cuánto cuesta?", time: "11:20" },
      { author: "bot", text: "El *servicio mayor de 40,000 km* incluye cambio de aceite y filtros, revisión de frenos y alineación. Costo de *$4,850* IVA incluido, con duración aproximada de 3 horas.", time: "11:20" },
      { author: "customer", text: "Gracias, lo agendo más tarde.", time: "11:22" },
      { author: "bot", text: "Con gusto. Cuando lo decida, respóndame por este medio y le comparto las fechas disponibles. Quedo al pendiente.", time: "11:22" },
    ],
  },
  // 3 · Recordatorio de cita → el cliente confirma
  {
    id: "wa-conf",
    name: "Patricia Gómez",
    phone: "+52 81 **** 6642",
    state: "BOOKED",
    lastActivity: "hace 8 min",
    appointmentRef: "CITA-2486",
    code: "DEMC00000012",
    tag: "Cita · confirma",
    messages: [
      { author: "bot", text: "Hola *Patricia* 👋 Le recordamos su cita en *Sucursal Pachuca* mañana a las *10:00* para *Cambio de frenos*. ¿Podrá asistir?", buttons: ["✅ Confirmar", "📅 Reagendar", "✖️ Cancelar"], time: "09:30" },
      { author: "customer", text: "Confirmo, ahí estaré.", time: "09:41" },
      { author: "bot", detail: { name: "Patricia Gómez", servicio: "Cambio de frenos", fecha: "mañana · 10:00", folio: "DEMCT00000012" }, time: "09:41" },
    ],
  },
  // 4 · Recordatorio de cita → el cliente rechaza / cancela
  {
    id: "wa-rech",
    name: "Guillermo Ponce",
    phone: "+52 81 **** 9908",
    state: "CANCELLED",
    lastActivity: "hace 15 min",
    appointmentRef: "CITA-2482",
    code: "DEMC00000024",
    tag: "Cita · rechaza",
    messages: [
      { author: "bot", text: "Hola *Guillermo* 👋 Le recordamos su cita en *Sucursal Pachuca* mañana a las *12:30* para *Afinación*. ¿Podrá asistir?", buttons: ["✅ Confirmar", "📅 Reagendar", "✖️ Cancelar"], time: "13:05" },
      { author: "customer", text: "No podré asistir, necesito cancelar.", time: "13:18" },
      { author: "bot", text: "Entendido, su cita ha sido *cancelada*. Si más adelante desea reagendar, con gusto le comparto nuevas fechas y horarios. Que tenga excelente día.", time: "13:18" },
    ],
  },
  // 5 · Reagendamiento con WhatsApp Flow
  {
    id: "wa-reag",
    name: "Sofía Herrera",
    phone: "+52 81 **** 3390",
    state: "BOOKED",
    lastActivity: "hace 2 min",
    appointmentRef: "CITA-2483",
    code: "DEMC00000029",
    tag: "Cita · reagenda",
    messages: [
      { author: "customer", text: "Buenas tardes. Necesito reagendar mi cita del jueves, por favor.", time: "15:10" },
      { author: "bot", text: "Con gusto. Toque el botón para elegir una nueva fecha y hora disponibles en *Sucursal Pachuca*.", buttons: ["📅 Elegir fecha y hora"], time: "15:10" },
      { author: "system", flow: flowOf(dSofia, "09:30"), time: "15:11" },
      { author: "bot", text: `✅ Su cita ha sido *reprogramada*:\n\n• Nueva fecha: *${label(dSofia, "09:30")}*\n• Sucursal Pachuca\n\nLe enviaremos un recordatorio un día antes. Quedo a sus órdenes.`, time: "15:12" },
      { author: "customer", text: "Muy amable, muchas gracias.", time: "15:12" },
    ],
  },
  // 6 · Diagnóstico con foto (cliente nuevo)
  {
    id: "wa-foto",
    name: "Roberto Salinas",
    phone: "+52 81 **** 9034",
    state: "BOOKED",
    lastActivity: "hace 24 min",
    appointmentRef: "CITA-2480",
    nuevo: true,
    pre: "PRE-2480",
    tag: "Diagnóstico · foto",
    messages: [
      { author: "customer", text: "Buenas tardes. Se encendió un testigo en el tablero de mi vehículo y desconozco su significado.", time: "11:38" },
      { author: "bot", text: "Buenas tardes. ¿Podría enviarme una fotografía del tablero? Con ello le indico de qué se trata.", time: "11:38" },
      { author: "customer", attachment: { kind: "dash", description: "Tablero encendido, testigo ámbar a la izquierda" }, time: "11:40" },
      { author: "customer", text: "Es el testigo ámbar de la izquierda.", time: "11:40" },
      { author: "bot", text: "Corresponde al *testigo de presión de aceite*. Le recomiendo evitar trayectos largos hasta su revisión; podría tratarse únicamente del sensor, pero conviene descartarlo el día de hoy.\n\n¿Se encuentra cerca de la sucursal? Le reservo el primer espacio disponible.", time: "11:41" },
      { author: "customer", text: "Sí, me encuentro a unos 10 minutos.", time: "11:42" },
      { author: "bot", text: "Perfecto. El día de hoy tengo disponibilidad a las *13:00* y *15:30* en Sucursal Pachuca. ¿Le reservo a la 1:00?", time: "11:42" },
      { author: "customer", text: "Sí, a la 1:00, por favor.", time: "11:43" },
      { author: "bot", text: "Su cita ha quedado registrada para hoy a las *13:00* en Sucursal Pachuca. Si el testigo cambia a color rojo o percibe un ruido inusual en el motor, le sugiero no continuar la marcha y contactarnos.", time: "11:44" },
    ],
  },
  // 7 · Escalada por bucle del asistente (cliente nuevo)
  {
    id: "wa-loop",
    name: "Marisol Cantú",
    phone: "+52 81 **** 2276",
    state: "BOOKED",
    lastActivity: "hace 1 h",
    reason: "BOT_LOOPED",
    appointmentRef: "CITA-2478",
    nuevo: true,
    pre: "PRE-2478",
    tag: "Escaló a asesor",
    messages: [
      { author: "customer", text: "Buenas tardes. Deseo agendar un servicio. Mi camioneta cuenta con una adaptación para silla de ruedas.", time: "10:12" },
      { author: "bot", text: "Buenas tardes, con gusto le agendo. ¿Podría confirmarme el kilometraje del vehículo?", time: "10:12" },
      { author: "customer", text: "El asunto no es el kilometraje; necesito confirmar si la rampa cabe en su taller.", time: "10:14" },
      { author: "bot", text: "Entiendo. Para determinar el servicio que corresponde, ¿podría confirmarme el kilometraje?", time: "10:14" },
      { author: "customer", text: "Ya le comenté que no es eso; requiero saber si la rampa entra.", time: "10:15" },
      { author: "bot", text: "Con gusto le ayudo a agendar su servicio. ¿Podría confirmarme el kilometraje?", time: "10:15" },
      { author: "customer", text: "No me está comprendiendo.", time: "10:16" },
      { author: "agent", agentName: "Karla Medina", text: "Buenas tardes, Marisol. Le saluda Karla, del taller. Una disculpa por la confusión con el asistente.\n\nSí es posible: la bahía 3 tiene 2.60 m de altura y la rampa queda a nivel de piso, sin escalón. ¿Qué altura tiene su camioneta ya con la adaptación?", time: "10:19" },
      { author: "customer", text: "2.35 m con todo y el riel.", time: "10:22" },
      { author: "agent", agentName: "Karla Medina", text: "Entra sin problema. Le reservo la bahía 3 y notifico al técnico para mantenerla disponible. ¿Le agendo para mañana a las 10:00?", time: "10:24" },
      { author: "customer", text: "Sí, perfecto. Muchas gracias.", time: "10:25" },
      { author: "agent", agentName: "Karla Medina", text: "Su cita ha quedado registrada para *mañana* a las *10:00*, bahía 3. Quedo a sus órdenes por este medio para cualquier aclaración.", time: "10:26" },
    ],
  },
  // 8 · Pidió hablar con un asesor (garantía)
  {
    id: "wa-human",
    name: "Diego Fuentes",
    phone: "+52 81 **** 7723",
    state: "WITH_AGENT",
    lastActivity: "hace 12 min",
    reason: "ASKED_FOR_HUMAN",
    code: "DEMC00000045",
    tag: "Pidió asesor",
    messages: [
      { author: "customer", text: "Buenas tardes. ¿Podría comunicarme con un asesor?", time: "12:48" },
      { author: "bot", text: "Con gusto. Le comunico con un asesor del taller; la respuesta puede tardar algunos minutos.", time: "12:48" },
      { author: "agent", agentName: "Iván Robles", text: "Buenas tardes, Diego. Le saluda Iván, asesor de servicio. ¿En qué puedo ayudarle?", time: "12:53" },
      { author: "customer", text: "Recibí mi vehículo ayer y continúa presentando el mismo ruido.", time: "12:55" },
      { author: "customer", attachment: { kind: "doc", description: "Orden de servicio de la visita anterior" }, time: "12:56" },
      { author: "agent", agentName: "Iván Robles", text: "La identifico, corresponde a la *OS-1042*. Permítame revisarlo con el técnico que la atendió y le confirmo el día de hoy.\n\nSi el ruido proviene del mismo trabajo, la revisión procede por garantía, sin costo.", time: "12:59" },
      { author: "customer", text: "De acuerdo, gracias.", time: "13:00" },
      { author: "agent", agentName: "Iván Robles", text: "Le confirmo antes de las 18:00 horas.", time: "13:00" },
    ],
  },
];
