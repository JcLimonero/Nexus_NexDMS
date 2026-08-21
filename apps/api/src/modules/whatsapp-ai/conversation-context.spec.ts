import {
  WhatsappMessage,
  WhatsappMessageAuthorEnum,
} from '../whatsapp-conversations/entities/whatsapp-message.entity';
import { buildConversationContext } from './conversation-context';

const msg = (
  author: WhatsappMessageAuthorEnum,
  body: string | null,
  attachmentType: string | null = null,
): WhatsappMessage => ({ author, body, attachmentType }) as WhatsappMessage;

const cliente = (t: string) => msg(WhatsappMessageAuthorEnum.CUSTOMER, t);
const bot = (t: string) => msg(WhatsappMessageAuthorEnum.BOT, t);
const asesor = (t: string) => msg(WhatsappMessageAuthorEnum.AGENT, t);

describe('buildConversationContext', () => {
  it('el cliente es `user` y el taller es `model`', () => {
    const { turns } = buildConversationContext([
      cliente('hola'),
      bot('¿en qué te ayudo?'),
    ]);

    expect(turns).toEqual([
      { role: 'user', text: 'hola' },
      { role: 'model', text: '¿en qué te ayudo?' },
    ]);
  });

  it('el asesor también es `model`: para el cliente es la misma voz', () => {
    const { turns } = buildConversationContext([
      cliente('quiero hablar con alguien'),
      asesor('Hola, soy Karla del taller'),
    ]);

    // Si el asesor fuera `user`, el modelo creería que eso lo dijo el cliente
    // y acabaría contestándole a su propio taller.
    expect(turns[1].role).toBe('model');
  });

  it('conserva el orden de la conversación', () => {
    const { turns } = buildConversationContext([
      cliente('uno'),
      bot('dos'),
      cliente('tres'),
    ]);

    expect(turns.map((t) => t.text)).toEqual(['uno', 'dos', 'tres']);
  });

  describe('adjuntos', () => {
    it('describe la foto, que el modelo no puede leer desde el texto', () => {
      const { turns } = buildConversationContext([
        msg(WhatsappMessageAuthorEnum.CUSTOMER, null, 'image'),
      ]);

      expect(turns[0].text).toBe('[el cliente envió una foto]');
    });

    it('junta la descripción con el texto que la acompaña', () => {
      const { turns } = buildConversationContext([
        msg(WhatsappMessageAuthorEnum.CUSTOMER, 'es este ruido', 'audio'),
      ]);

      expect(turns[0].text).toBe(
        '[el cliente envió una nota de voz]\nes este ruido',
      );
    });

    it('descarta lo que no aporta nada legible', () => {
      const { turns } = buildConversationContext([
        cliente('hola'),
        msg(WhatsappMessageAuthorEnum.CUSTOMER, null, null),
      ]);

      expect(turns).toHaveLength(1);
    });
  });

  describe('recorte', () => {
    it('se queda con los turnos recientes, que son los que deciden', () => {
      const muchos = Array.from({ length: 30 }, (_, i) => cliente(`m${i}`));

      const { turns, truncated, omitted } = buildConversationContext(muchos, {
        maxTurns: 5,
      });

      expect(turns.map((t) => t.text)).toEqual([
        'm25',
        'm26',
        'm27',
        'm28',
        'm29',
      ]);
      expect(truncated).toBe(true);
      expect(omitted).toBe(25);
    });

    it('no marca recorte cuando cupo todo', () => {
      const { truncated, omitted } = buildConversationContext([
        cliente('hola'),
      ]);

      expect(truncated).toBe(false);
      expect(omitted).toBe(0);
    });

    it('recorta también por tamaño, no sólo por número de turnos', () => {
      const largo = 'x'.repeat(3_000);
      const { turns } = buildConversationContext(
        [cliente(largo), cliente(largo), cliente('lo último')],
        { maxTurns: 10, maxChars: 4_000 },
      );

      // Con tres mensajes de 3 000 caracteres no caben todos aunque el número
      // de turnos lo permita.
      expect(turns.map((t) => t.text)).toContain('lo último');
      expect(turns.length).toBeLessThan(3);
    });

    it('nunca deja el contexto vacío, aunque el último mensaje se pase de largo', () => {
      // Alguien pega el historial completo de su unidad: no cabe, pero es
      // justo lo que hay que contestar.
      const enorme = 'x'.repeat(50_000);

      const { turns } = buildConversationContext([cliente(enorme)], {
        maxChars: 1_000,
      });

      expect(turns).toHaveLength(1);
    });
  });
});
