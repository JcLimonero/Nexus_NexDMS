import { Conversation } from "./conversacion.model";

/**
 * Sample chats for the conversations screen.
 *
 * They are handwritten, in the Spanish people actually use when asking for an
 * appointment: no menus, with typos, with photos and sometimes in a bad mood.
 * Each of the three escalation reasons gets its own case, because the point of
 * the screen is to show *when* the assistant fails, not only when it works.
 *
 * Note: the bot running in the API today does not talk like this. See the
 * comment in `conversacion.model.ts`.
 *
 * The message text stays in Spanish on purpose — it is what a user reads.
 */

/**
 * Dates are computed on the fly, relative to the day the screen is opened.
 *
 * They used to be hardcoded and the demo aged on its own: the next day the bot
 * appeared to be booking appointments on dates already past, which is exactly
 * what the real bot never offers.
 *
 * Built from the local parts rather than `toISOString()`, because that switches
 * to UTC and in Mexico (UTC-6) would return the next day from 18:00 onwards.
 */
const day = (offset: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const month = `${d.getMonth() + 1}`.padStart(2, "0");
  const dayOfMonth = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${month}-${dayOfMonth}`;
};

const TODAY = day(0);
const TOMORROW = day(1);

export const DEMO_CONVERSATIONS: Conversation[] = [
  // ── 1. The assistant alone, start to finish ───────────────────
  {
    id: "wa-001",
    name: "Laura Jiménez",
    phone: "+52 81 **** 4417",
    state: "BOOKED",
    lastActivity: "hace 6 min",
    appointmentRef: "CITA-2481",
    messages: [
      {
        author: "customer",
        text: "Buenas tardes, quiero llevar mi Jetta a servicio",
        time: "13:02",
      },
      {
        author: "bot",
        text: "¡Hola! 👋 Con gusto te ayudo.\n\n¿Me dices más o menos en cuántos kilómetros va el Jetta? Con eso te digo qué servicio le toca y cuánto sale.",
        time: "13:02",
      },
      { author: "customer", text: "va en 41 mil más o menos", time: "13:04" },
      {
        author: "bot",
        text: "Perfecto, entonces le toca el *servicio mayor de 40,000 km*: cambio de aceite y filtros, revisión de frenos y alineación.\n\nSon unas 3 horas y sale en *$4,850* con IVA. ¿Te acomoda mañana o prefieres otro día?",
        time: "13:04",
      },
      {
        author: "customer",
        text: "mañana estaría bien, temprano si se puede",
        time: "13:06",
      },
      {
        author: "bot",
        text: `Va. Para el *${TOMORROW}* tengo libre a las *8:00*, *9:30* y *11:00* en Sucursal Central. ¿Cuál te late?`,
        time: "13:06",
      },
      { author: "customer", text: "las 8 porfa", time: "13:07" },
      {
        author: "bot",
        text: "Listo. ¿A nombre de quién la dejo?",
        time: "13:07",
      },
      { author: "customer", text: "Laura Jiménez", time: "13:08" },
      {
        author: "bot",
        text: `¡Quedó agendada! 🎉\n\n• *Servicio mayor (40,000 km)*\n• *${TOMORROW}* a las *8:00*\n• Sucursal Central\n• A nombre de *Laura Jiménez*\n\nTe mando un recordatorio un día antes. Si la necesitas mover, nada más escríbeme.`,
        time: "13:08",
      },
      { author: "customer", text: "gracias!! 🙏", time: "13:09" },
    ],
  },

  // ── 2. Sends a photo and the assistant uses it ────────────────
  {
    id: "wa-002",
    name: "Roberto Salinas",
    phone: "+52 81 **** 9034",
    state: "BOOKED",
    lastActivity: "hace 24 min",
    appointmentRef: "CITA-2480",
    messages: [
      {
        author: "customer",
        text: "hola, se me prendió un foco en el tablero y no sé qué sea",
        time: "11:38",
      },
      {
        author: "bot",
        text: "¡Hola! 👋 ¿Me mandas una foto del tablero? Con eso te digo qué es.",
        time: "11:38",
      },
      {
        author: "customer",
        attachment: {
          type: "image",
          description: "Tablero encendido, testigo ámbar a la izquierda",
        },
        time: "11:40",
      },
      {
        author: "customer",
        text: "es ese ámbar de la izquierda",
        time: "11:40",
      },
      {
        author: "bot",
        text: "Ese es el *testigo de presión de aceite*. Mejor no manejes distancias largas hasta que lo revisen, puede ser sólo el sensor pero vale la pena descartarlo hoy mismo.\n\n¿Andas cerca de la sucursal? Te aparto el primer hueco que tengo.",
        time: "11:41",
      },
      { author: "customer", text: "si, estoy como a 10 min", time: "11:42" },
      {
        author: "bot",
        text: `Perfecto. Hoy *${TODAY}* me quedan las *13:00* y las *15:30* en Sucursal Central. ¿Te va la de la 1?`,
        time: "11:42",
      },
      { author: "customer", text: "sale, a la 1", time: "11:43" },
      { author: "bot", text: "¿A nombre de quién?", time: "11:43" },
      { author: "customer", text: "Roberto Salinas", time: "11:44" },
      {
        author: "bot",
        text: `Agendado ✅\n\n• *Revisión de testigo de aceite*\n• Hoy *${TODAY}* a las *13:00*\n• Sucursal Central\n\nSi ves que el foco se pone rojo o el motor suena distinto, mejor no lo muevas y me avisas.`,
        time: "11:44",
      },
    ],
  },

  // ── 3. The assistant loops and a person steps in ──────────────
  {
    id: "wa-003",
    name: "Marisol Cantú",
    phone: "+52 81 **** 2276",
    state: "BOOKED",
    lastActivity: "hace 1 h",
    reason: "BOT_LOOPED",
    appointmentRef: "CITA-2478",
    messages: [
      {
        author: "customer",
        text: "hola, quiero agendar pero mi camioneta trae una adaptación para silla de ruedas",
        time: "10:12",
      },
      {
        author: "bot",
        text: "¡Hola! Con gusto te agendo. ¿Me confirmas en cuántos kilómetros va?",
        time: "10:12",
      },
      {
        author: "customer",
        text: "no es por el kilometraje, lo que necesito saber es si la rampa cabe en su taller",
        time: "10:14",
      },
      {
        author: "bot",
        text: "Entiendo. Para saber qué servicio le toca, ¿me confirmas el kilometraje?",
        time: "10:14",
      },
      {
        author: "customer",
        text: "ya te dije que no es eso 😅 necesito saber si la rampa entra",
        time: "10:15",
      },
      {
        author: "bot",
        text: "Con gusto te ayudo a agendar tu servicio. ¿Me confirmas el kilometraje?",
        time: "10:15",
      },
      { author: "customer", text: "no me estás entendiendo", time: "10:16" },
      {
        author: "agent",
        agentName: "Karla Medina",
        text: "Hola Marisol, soy Karla, del taller. Perdón por la vuelta que te dio el asistente.\n\nSí entra: la bahía 3 tiene 2.60 m de alto y la rampa queda a nivel de piso, no hay escalón. ¿Qué altura tiene tu camioneta ya con la adaptación?",
        time: "10:19",
      },
      { author: "customer", text: "2.35 con todo y el riel", time: "10:22" },
      {
        author: "agent",
        agentName: "Karla Medina",
        text: "Entra sin problema. Te aparto la bahía 3 para que no batalles y le aviso al técnico para que no la mueva de ahí.\n\n¿Te queda mañana a las 10:00?",
        time: "10:24",
      },
      {
        author: "customer",
        text: "sí, perfecto, muchas gracias",
        time: "10:25",
      },
      {
        author: "agent",
        agentName: "Karla Medina",
        text: `Listo, quedó agendada para el *${TOMORROW}* a las *10:00*, bahía 3. Cualquier cosa me escribes directo por aquí. 🙌`,
        time: "10:26",
      },
    ],
  },

  // ── 4. Asks for a person from the very start ──────────────────
  {
    id: "wa-004",
    name: "Diego Fuentes",
    phone: "+52 81 **** 7723",
    state: "WITH_AGENT",
    lastActivity: "hace 12 min",
    reason: "ASKED_FOR_HUMAN",
    messages: [
      {
        author: "customer",
        text: "buenas, me pueden pasar con una persona?",
        time: "12:48",
      },
      {
        author: "bot",
        text: "Claro que sí. Te comunico con un asesor del taller, puede tardar unos minutos en contestar. 🙋",
        time: "12:48",
      },
      {
        author: "agent",
        agentName: "Iván Robles",
        text: "Hola Diego, soy Iván, asesor de servicio. ¿En qué te ayudo?",
        time: "12:53",
      },
      {
        author: "customer",
        text: "me entregaron el coche ayer y sigue haciendo el mismo ruido",
        time: "12:55",
      },
      {
        author: "customer",
        attachment: {
          type: "image",
          description: "Orden de servicio de la visita anterior",
          aspectRatio: "3 / 4",
        },
        time: "12:56",
      },
      {
        author: "agent",
        agentName: "Iván Robles",
        text: "Ya la veo, es la *OS-1042*. Déjame lo reviso con el técnico que la atendió y te confirmo hoy mismo.\n\nSi el ruido es del mismo trabajo, la revisión entra en garantía y no se te cobra nada.",
        time: "12:59",
      },
      { author: "customer", text: "va, gracias", time: "13:00" },
      {
        author: "agent",
        agentName: "Iván Robles",
        text: "Te confirmo antes de las 6. 👍",
        time: "13:00",
      },
    ],
  },

  // ── 5. The assistant quoted the wrong price ───────────────────
  {
    id: "wa-005",
    name: "Claudia Ríos",
    phone: "+52 81 **** 1188",
    state: "CANCELLED",
    lastActivity: "hace 2 h",
    reason: "BOT_WAS_WRONG",
    messages: [
      {
        author: "customer",
        text: "hola, cuánto me sale el servicio de mi Sentra 2019?",
        time: "09:31",
      },
      {
        author: "bot",
        text: "¡Hola! El *servicio mayor* para tu Sentra 2019 sale en *$2,300* con IVA e incluye afinación completa.",
        time: "09:31",
      },
      {
        author: "customer",
        text: "perfecto, agéndamelo el viernes",
        time: "09:33",
      },
      {
        author: "bot",
        text: "Listo, quedó apartado el *viernes a las 9:00*. 🎉",
        time: "09:33",
      },
      {
        author: "customer",
        text: "oye pero acabo de pasar al mostrador y me dijeron que son $3,900, cuál es el bueno?",
        time: "10:05",
      },
      {
        author: "agent",
        agentName: "Karla Medina",
        text: "Hola Claudia, soy Karla. Tienes razón y te ofrezco una disculpa: el asistente te pasó el precio de otra versión.\n\nPara tu Sentra 2019 el *servicio mayor* es *$3,900* con IVA. Los *$2,300* son del *servicio menor*, que es sólo aceite y filtro.",
        time: "10:11",
      },
      {
        author: "agent",
        agentName: "Karla Medina",
        attachment: {
          type: "image",
          description: "Desglose de precios por tipo de servicio",
        },
        time: "10:11",
      },
      {
        author: "customer",
        text: "uff, sí es bastante diferencia. déjame lo pienso",
        time: "10:20",
      },
      {
        author: "agent",
        agentName: "Karla Medina",
        text: "Sin problema. Te dejo apartado el viernes hasta el jueves por si te animas, y si no me dices nada lo libero. Sin compromiso. 🙂",
        time: "10:22",
      },
      {
        author: "customer",
        text: "mejor cancélalo por ahora, gracias",
        time: "10:31",
      },
      {
        author: "agent",
        agentName: "Karla Medina",
        text: "Hecho, ya quedó cancelada. Aquí andamos cuando la necesites. 🙌",
        time: "10:32",
      },
    ],
  },

  // ── 6. Sends the photo and never writes again ─────────────────
  {
    id: "wa-006",
    name: "+52 81 **** 6650",
    phone: "+52 81 **** 6650",
    state: "EXPIRED",
    lastActivity: "hace 3 h",
    messages: [
      {
        author: "customer",
        text: "hola, traigo un golpe en la salpicadera",
        time: "08:20",
      },
      {
        author: "customer",
        attachment: {
          type: "image",
          description: "Salpicadera delantera derecha con un golpe hundido",
        },
        time: "08:21",
      },
      {
        author: "bot",
        text: "¡Hola! 👋 Por la foto se ve un golpe en la salpicadera delantera. Eso lo revisa *hojalatería y pintura*.\n\n¿Te agendo una valuación sin costo? Toma unos 20 minutos y de ahí sale el presupuesto.",
        time: "08:21",
      },
    ],
  },

  // ── 7. Still going — the bot is handling it fine so far ────────
  // No `reason`: nobody has had to step in. This is the case the "Tomar
  // conversación" button is for — an advisor jumping in on their own,
  // not a rescue.
  {
    id: "wa-007",
    name: "Verónica Castillo",
    phone: "+52 81 **** 5521",
    state: "BOT",
    lastActivity: "hace 1 min",
    messages: [
      {
        author: "customer",
        text: "hola buenas, cuanto sale servicio para una cbr250",
        time: "16:40",
      },
      {
        author: "bot",
        text: "¡Hola! 👋 Con gusto te ayudo. ¿Me dices en cuántos kilómetros va tu CBR250?",
        time: "16:40",
      },
      { author: "customer", text: "como en 12 mil kms", time: "16:42" },
      {
        author: "bot",
        text: "Perfecto, le toca el *servicio de 10,000 km*: aceite, filtros, bujía y kit de arrastre. Son unas 2 horas y sale en *$3,450* con IVA.\n\n¿Quieres que te busque un horario?",
        time: "16:42",
      },
      {
        author: "customer",
        text: "si porfa, en la tarde si se puede",
        time: "16:44",
      },
    ],
  },

  // ── 8. Just started, one message in ─────────────────────────────
  {
    id: "wa-008",
    name: "Luis Ángel Peña",
    phone: "+52 81 **** 3390",
    state: "BOT",
    lastActivity: "justo ahora",
    messages: [
      { author: "customer", text: "buenas tardes", time: "17:05" },
      {
        author: "bot",
        text: "¡Buenas tardes! 👋 Soy el asistente del taller. ¿En qué te ayudo hoy: agendar servicio, cotizar una refacción o algo de tu unidad?",
        time: "17:05",
      },
      {
        author: "customer",
        text: "quiero saber si tienen refaccion de escape para una cb190",
        time: "17:06",
      },
    ],
  },
];
