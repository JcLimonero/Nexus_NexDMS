import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { fetchWithRetry } from '../../common/http/retry.util';
import { ContextTurn } from './conversation-context';
import { ToolDeclaration } from './tool-contract';

/**
 * Cliente de Gemini en Vertex AI.
 *
 * Se llama por REST y no con `@google-cloud/vertexai` a propósito: la
 * biblioteca arrastra media plataforma de Google para hacer un POST, y aquí ya
 * existe el patrón de hablarle a un tercero por HTTP con reintentos (ver
 * `notifications/providers/whatsapp.provider.ts`). El token se firma con
 * `crypto`, que trae Node.
 *
 * Un solo proyecto de GCP para todos los tenants: el prompt y el catálogo son
 * por sucursal, pero la credencial es una. Atribuir el costo por cliente se
 * hace con etiquetas, no con proyectos separados.
 *
 * ⚠️ Pendiente legal: la región está en configuración porque todavía no se
 * decide si el contrato con los grupos automotrices permite procesar datos de
 * sus clientes fuera de México. No encender producción sin resolverlo.
 */

/** Lo que el modelo pidió que se ejecutara. */
export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
}

export interface GeminiReply {
  /** Texto para el cliente. Vacío cuando sólo pidió una herramienta. */
  text: string;
  /** Herramientas que el modelo quiere que se corran, en orden. */
  toolCalls: ToolCall[];
}

/** Una imagen que el cliente mandó, para que el modelo la vea. */
export interface InlineImage {
  mimeType: string;
  /** Contenido en base64. */
  data: string;
}

export interface GenerateParams {
  systemPrompt: string;
  turns: ContextTurn[];
  tools: ToolDeclaration[];
  /** Imágenes que acompañan al último mensaje del cliente. */
  images?: InlineImage[];
  /** Resultados de herramientas que el modelo pidió en la vuelta anterior. */
  toolResults?: { name: string; result: unknown }[];
}

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const TOKEN_TTL_SEC = 3600;
/** Se renueva antes de que expire para no perder una petición por segundos. */
const TOKEN_MARGIN_SEC = 300;

/**
 * Tope de salida por turno.
 *
 * Es un chat de WhatsApp: nadie lee doscientas palabras en el teléfono, y sin
 * tope una conversación atorada puede costar lo que un servicio mayor.
 */
const MAX_OUTPUT_TOKENS = 512;

@Injectable()
export class GeminiClient {
  private readonly logger = new Logger(GeminiClient.name);

  private readonly projectId: string | null;
  private readonly location: string;
  private readonly model: string;
  private readonly saEmail: string | null;
  private readonly saPrivateKey: string | null;

  private cachedToken: { value: string; expiresAt: number } | null = null;

  constructor(private readonly config: ConfigService) {
    this.projectId = this.config.get<string>('GCP_PROJECT_ID') ?? null;
    this.location = this.config.get<string>('GCP_LOCATION') ?? 'us-central1';
    this.model =
      this.config.get<string>('GEMINI_MODEL') ?? 'gemini-2.5-flash-lite';
    this.saEmail = this.config.get<string>('GCP_SA_EMAIL') ?? null;
    // En `.env` la llave va en una línea con `\n` escapados; aquí se
    // restauran los saltos, si no `crypto` no la reconoce como PEM.
    this.saPrivateKey =
      this.config.get<string>('GCP_SA_PRIVATE_KEY')?.replace(/\\n/g, '\n') ??
      null;
  }

  /** `false` cuando falta configuración: el bot sigue con su flujo de menús. */
  get isConfigured(): boolean {
    return !!(this.projectId && this.saEmail && this.saPrivateKey);
  }

  async generate(params: GenerateParams): Promise<GeminiReply | null> {
    if (!this.isConfigured) {
      this.logger.debug('Vertex AI sin configurar: no se llama al modelo');
      return null;
    }

    try {
      const token = await this.accessToken();
      const url =
        `https://${this.location}-aiplatform.googleapis.com/v1/projects/` +
        `${this.projectId}/locations/${this.location}/publishers/google/` +
        `models/${this.model}:generateContent`;

      const response = await fetchWithRetry(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(this.buildBody(params)),
      });

      if (!response.ok) {
        const detalle = await response.text();
        this.logger.error(`Vertex AI respondió ${response.status}: ${detalle}`);
        return null;
      }

      return this.parseReply(await response.json());
    } catch (e) {
      // Que el modelo falle no puede tumbar el webhook: quien llama decide
      // qué contestar sin él.
      this.logger.error('Error llamando a Gemini', e);
      return null;
    }
  }

  private buildBody(params: GenerateParams): Record<string, unknown> {
    const contents: Record<string, unknown>[] = params.turns.map((t) => ({
      role: t.role,
      parts: [{ text: t.text }],
    }));

    // Las imágenes se cuelgan del último turno del cliente: son parte de lo
    // que acaba de decir, no un mensaje aparte.
    if (params.images?.length) {
      const ultimo = contents[contents.length - 1];
      if (ultimo?.role === 'user') {
        (ultimo.parts as unknown[]).push(
          ...params.images.map((img) => ({
            inlineData: { mimeType: img.mimeType, data: img.data },
          })),
        );
      }
    }

    if (params.toolResults?.length) {
      contents.push({
        role: 'user',
        parts: params.toolResults.map((r) => ({
          functionResponse: { name: r.name, response: { resultado: r.result } },
        })),
      });
    }

    return {
      contents,
      systemInstruction: { parts: [{ text: params.systemPrompt }] },
      tools: [{ functionDeclarations: params.tools }],
      generationConfig: {
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        // Baja pero no cero: es atención a clientes, no generación creativa.
        // Con 0 las respuestas se vuelven idénticas y suenan a robot.
        temperature: 0.3,
      },
    };
  }

  private parseReply(raw: unknown): GeminiReply {
    const parts =
      (
        raw as {
          candidates?: { content?: { parts?: Record<string, unknown>[] } }[];
        }
      ).candidates?.[0]?.content?.parts ?? [];

    const textos: string[] = [];
    const toolCalls: ToolCall[] = [];

    for (const p of parts) {
      if (typeof p.text === 'string') textos.push(p.text);
      const fc = p.functionCall as
        | { name?: string; args?: Record<string, unknown> }
        | undefined;
      if (fc?.name) {
        toolCalls.push({ name: fc.name, args: fc.args ?? {} });
      }
    }

    return { text: textos.join('\n').trim(), toolCalls };
  }

  /**
   * Token de acceso de la cuenta de servicio.
   *
   * Se cachea en memoria: firmar y canjear en cada mensaje serían dos viajes
   * de red extra por cada cosa que escriba un cliente.
   */
  private async accessToken(): Promise<string> {
    const ahora = Math.floor(Date.now() / 1000);
    if (this.cachedToken && this.cachedToken.expiresAt > ahora) {
      return this.cachedToken.value;
    }

    const assertion = this.signAssertion(ahora);
    const response = await fetchWithRetry(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }).toString(),
    });

    if (!response.ok) {
      throw new Error(`No se pudo obtener token de GCP: ${response.status}`);
    }

    const data = (await response.json()) as { access_token: string };
    this.cachedToken = {
      value: data.access_token,
      expiresAt: ahora + TOKEN_TTL_SEC - TOKEN_MARGIN_SEC,
    };
    return data.access_token;
  }

  /** JWT firmado con la llave de la cuenta de servicio (RS256). */
  private signAssertion(ahora: number): string {
    const header = { alg: 'RS256', typ: 'JWT' };
    const claims = {
      iss: this.saEmail,
      scope: 'https://www.googleapis.com/auth/cloud-platform',
      aud: TOKEN_URL,
      iat: ahora,
      exp: ahora + TOKEN_TTL_SEC,
    };

    const base = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claims))}`;
    const firma = crypto
      .sign('RSA-SHA256', Buffer.from(base), this.saPrivateKey!)
      .toString('base64url');
    return `${base}.${firma}`;
  }
}

function b64url(s: string): string {
  return Buffer.from(s).toString('base64url');
}
