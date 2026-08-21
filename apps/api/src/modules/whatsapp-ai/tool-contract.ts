/**
 * Lo que el asistente tiene permitido hacer.
 *
 * Ninguna de estas funciones la ejecuta el modelo: las *pide*, y el API las
 * corre con las mismas reglas que aplican cuando las hace una persona. Esa es
 * toda la diferencia entre un asistente y un problema legal — lo que el modelo
 * diga, el cliente lo va a cobrar.
 *
 * El caso `wa-005` del mock que dio origen a esta pantalla es justo el fallo
 * que esto evita: el asistente cotizó $2,300 cuando el servicio costaba
 * $3,900, la clienta llegó al mostrador con otro precio y canceló.
 */

/** Nombres de las herramientas. Se usan tal cual en el function calling. */
export enum WorkshopToolName {
  /** Qué servicios ofrece la sucursal. Sin precios: ver la nota de abajo. */
  LISTAR_SERVICIOS = 'listar_servicios',
  /** Horarios libres de verdad, de la agenda real. */
  CONSULTAR_DISPONIBILIDAD = 'consultar_disponibilidad',
  /** Agenda la cita. El único que escribe. */
  AGENDAR_CITA = 'agendar_cita',
  /** Pasa la conversación a una persona. */
  ESCALAR_A_PERSONA = 'escalar_a_persona',
}

/**
 * ⚠️ Por qué no hay una herramienta de "cotizar".
 *
 * Un precio de servicio no está en ninguna tabla que se pueda consultar con el
 * nombre del servicio. `service_types` no tiene columna de precio: lo que hay
 * es `service_kits.labor_price` más las refacciones del kit, y los kits
 * aplican por tipo de unidad, mientras el precio de cada refacción sale del
 * catálogo y de la lista de precios del cliente.
 *
 * O sea: no se puede cotizar "servicio mayor" sin saber de qué unidad se
 * trata, y el bot casi nunca lo sabe con certeza. Mientras no exista una
 * herramienta que reciba la unidad y devuelva un precio armado de la base, el
 * asistente **no cotiza**: dice que un asesor le confirma el costo. Es
 * preferible perder la respuesta rápida a repetir el error de `wa-005`.
 */
export const NO_COTIZAR = true;

/** Una herramienta declarada como la espera el function calling de Gemini. */
export interface ToolDeclaration {
  name: WorkshopToolName;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, ParameterSchema>;
    required?: string[];
  };
}

interface ParameterSchema {
  type: 'string' | 'number' | 'boolean';
  description: string;
  enum?: string[];
}

export const WORKSHOP_TOOLS: ToolDeclaration[] = [
  {
    name: WorkshopToolName.LISTAR_SERVICIOS,
    description:
      'Devuelve los servicios que ofrece esta sucursal, con su duración ' +
      'aproximada. No incluye precios: el costo lo confirma un asesor.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: WorkshopToolName.CONSULTAR_DISPONIBILIDAD,
    description:
      'Horarios realmente libres para una fecha. Úsala siempre antes de ' +
      'ofrecer una hora: nunca propongas horarios que no vengan de aquí.',
    parameters: {
      type: 'object',
      properties: {
        fecha: {
          type: 'string',
          description: 'Fecha en formato AAAA-MM-DD.',
        },
        servicio_id: {
          type: 'string',
          description:
            'Id del servicio, de listar_servicios. Ajusta la duración del ' +
            'hueco. Omítelo si el cliente aún no eligió.',
        },
      },
      required: ['fecha'],
    },
  },
  {
    name: WorkshopToolName.AGENDAR_CITA,
    description:
      'Agenda la cita. Sólo con un horario que haya devuelto ' +
      'consultar_disponibilidad y después de que el cliente lo confirme.',
    parameters: {
      type: 'object',
      properties: {
        inicio: {
          type: 'string',
          description:
            'Inicio del horario, en ISO, tal como lo devolvió ' +
            'consultar_disponibilidad. No lo construyas por tu cuenta.',
        },
        servicio: {
          type: 'string',
          description: 'Nombre del servicio que se va a hacer.',
        },
        nombre_cliente: {
          type: 'string',
          description: 'A nombre de quién queda la cita.',
        },
      },
      required: ['inicio', 'servicio', 'nombre_cliente'],
    },
  },
  {
    name: WorkshopToolName.ESCALAR_A_PERSONA,
    description:
      'Pasa la conversación a un asesor y deja de responder. Úsala cuando ' +
      'el cliente pida hablar con alguien, cuando pregunte algo que no ' +
      'puedas resolver con las otras herramientas (precios, garantías, ' +
      'quejas, un trabajo ya hecho), o cuando lleves dos intentos sin ' +
      'entenderle.',
    parameters: {
      type: 'object',
      properties: {
        motivo: {
          type: 'string',
          description: 'Por qué se escala.',
          enum: ['ASKED_FOR_HUMAN', 'BOT_LOOPED', 'BOT_WAS_WRONG'],
        },
      },
      required: ['motivo'],
    },
  },
];

/**
 * Instrucciones del asistente.
 *
 * Lo que no puede prometer es la parte que importa: el asistente habla a
 * nombre del taller y el cliente le va a cobrar lo que diga. Ante la duda,
 * escala; una respuesta de más cuesta más que una conversación de más.
 */
export const SYSTEM_PROMPT = [
  'Eres el asistente de servicio de un taller automotriz en México.',
  'Hablas por WhatsApp, en español mexicano, de usted sólo si el cliente lo usa.',
  'Mensajes cortos: es un chat, no un correo.',
  '',
  'Tu único trabajo es ayudar a agendar una cita de servicio.',
  '',
  'Nunca inventes nada del taller. En particular:',
  '- No des precios ni estimaciones de costo, ni "aproximados", ni rangos.',
  '  Si preguntan cuánto cuesta, di que un asesor se lo confirma y ofrece',
  '  agendar la revisión.',
  '- No ofrezcas un horario que no venga de consultar_disponibilidad.',
  '- No prometas tiempos de entrega, garantías, descuentos ni cortesías.',
  '- No opines sobre si una falla es grave ni sobre si algo entra en garantía.',
  '',
  'Si el cliente manda una foto, agradécela y di que el asesor la va a ver.',
  'No diagnostiques por foto.',
  '',
  'Cuando algo se salga de agendar una cita, usa escalar_a_persona.',
].join('\n');
