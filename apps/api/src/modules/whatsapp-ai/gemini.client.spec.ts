import { ConfigService } from '@nestjs/config';
import { generateKeyPairSync } from 'crypto';
import { GeminiClient } from './gemini.client';
import { WORKSHOP_TOOLS, SYSTEM_PROMPT } from './tool-contract';

/**
 * Llave RSA de juguete, generada en cada corrida.
 *
 * Se firma de verdad —no se simula `crypto`— porque el error clásico aquí es
 * una llave que no se reconoce como PEM, y eso sólo sale al firmar.
 */
const { privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});

const CONFIG: Record<string, string> = {
  GCP_PROJECT_ID: 'nexus-q-tech',
  GCP_LOCATION: 'us-central1',
  GCP_SA_EMAIL: 'bot@nexus-q-tech.iam.gserviceaccount.com',
  GCP_SA_PRIVATE_KEY: privateKey,
  GEMINI_MODEL: 'gemini-2.5-flash-lite',
};

function clientWith(env: Record<string, string> = CONFIG): GeminiClient {
  const config = { get: (k: string) => env[k] } as unknown as ConfigService;
  return new GeminiClient(config);
}

/** Respuestas del token y del modelo, en ese orden. */
function mockFetch(respuestaModelo: unknown, ok = true) {
  const fetchMock = jest
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ access_token: 'token-de-prueba' }),
    })
    .mockResolvedValueOnce({
      ok,
      status: ok ? 200 : 500,
      json: () => Promise.resolve(respuestaModelo),
      text: () => Promise.resolve(JSON.stringify(respuestaModelo)),
    });
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

const turnos = [{ role: 'user' as const, text: 'hola, quiero una cita' }];

const params = () => ({
  systemPrompt: SYSTEM_PROMPT,
  turns: turnos,
  tools: WORKSHOP_TOOLS,
});

describe('GeminiClient', () => {
  afterEach(() => jest.restoreAllMocks());

  describe('sin configurar', () => {
    it('no llama a nadie y devuelve null', async () => {
      const fetchMock = jest.fn();
      global.fetch = fetchMock as unknown as typeof fetch;

      const client = clientWith({});

      expect(client.isConfigured).toBe(false);
      // El bot sigue con su flujo de menús; no se cae por falta de credenciales.
      await expect(client.generate(params())).resolves.toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('petición', () => {
    it('manda las instrucciones, los turnos y las herramientas', async () => {
      const fetchMock = mockFetch({
        candidates: [{ content: { parts: [{ text: '¡Hola!' }] } }],
      });

      await clientWith().generate(params());

      const [, init] = fetchMock.mock.calls[1] as [string, RequestInit];
      const body = JSON.parse(init.body as string);

      expect(body.systemInstruction.parts[0].text).toContain('No des precios');
      expect(body.contents[0]).toEqual({
        role: 'user',
        parts: [{ text: 'hola, quiero una cita' }],
      });
      expect(body.tools[0].functionDeclarations).toHaveLength(
        WORKSHOP_TOOLS.length,
      );
    });

    it('acota la respuesta: es un chat, no un correo', async () => {
      const fetchMock = mockFetch({ candidates: [] });

      await clientWith().generate(params());

      const [, init] = fetchMock.mock.calls[1] as [string, RequestInit];
      expect(
        JSON.parse(init.body as string).generationConfig.maxOutputTokens,
      ).toBeLessThanOrEqual(1024);
    });

    it('pega la foto al último turno del cliente, no como mensaje aparte', async () => {
      const fetchMock = mockFetch({ candidates: [] });

      await clientWith().generate({
        ...params(),
        images: [{ mimeType: 'image/jpeg', data: 'AAAA' }],
      });

      const [, init] = fetchMock.mock.calls[1] as [string, RequestInit];
      const partes = JSON.parse(init.body as string).contents[0].parts;

      expect(partes).toHaveLength(2);
      expect(partes[1].inlineData.mimeType).toBe('image/jpeg');
    });

    it('usa la región configurada', async () => {
      const fetchMock = mockFetch({ candidates: [] });

      await clientWith({
        ...CONFIG,
        GCP_LOCATION: 'southamerica-east1',
      }).generate(params());

      expect(fetchMock.mock.calls[1][0]).toContain('southamerica-east1');
    });
  });

  describe('respuesta', () => {
    it('separa el texto de las herramientas que pidió', async () => {
      mockFetch({
        candidates: [
          {
            content: {
              parts: [
                { text: 'Déjame ver qué horarios hay' },
                {
                  functionCall: {
                    name: 'consultar_disponibilidad',
                    args: { fecha: '2026-08-22' },
                  },
                },
              ],
            },
          },
        ],
      });

      const reply = await clientWith().generate(params());

      expect(reply?.text).toBe('Déjame ver qué horarios hay');
      expect(reply?.toolCalls).toEqual([
        { name: 'consultar_disponibilidad', args: { fecha: '2026-08-22' } },
      ]);
    });

    it('devuelve null si Vertex falla, en vez de reventar', async () => {
      mockFetch({ error: 'quota' }, false);

      // Quien llama decide qué contestar sin el modelo; el webhook no se cae.
      await expect(clientWith().generate(params())).resolves.toBeNull();
    });

    it('aguanta una respuesta sin candidatos', async () => {
      mockFetch({});

      const reply = await clientWith().generate(params());

      expect(reply).toEqual({ text: '', toolCalls: [] });
    });
  });

  describe('token', () => {
    it('lo pide una vez y lo reutiliza entre mensajes', async () => {
      const fetchMock = jest.fn().mockImplementation((url: string) =>
        url.includes('oauth2')
          ? Promise.resolve({
              ok: true,
              json: () => Promise.resolve({ access_token: 't' }),
            })
          : Promise.resolve({
              ok: true,
              status: 200,
              json: () => Promise.resolve({ candidates: [] }),
              text: () => Promise.resolve(''),
            }),
      );
      global.fetch = fetchMock as unknown as typeof fetch;

      const client = clientWith();
      await client.generate(params());
      await client.generate(params());

      const llamadasDeToken = fetchMock.mock.calls.filter((c) =>
        String(c[0]).includes('oauth2'),
      );
      // Firmar y canjear en cada mensaje serían dos viajes extra por cada
      // cosa que escriba un cliente.
      expect(llamadasDeToken).toHaveLength(1);
    });
  });
});
