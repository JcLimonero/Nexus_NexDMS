import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { Agent } from 'https';
import { getB2Config } from '../../config/b2.config';

@Injectable()
export class StorageService {
  private readonly client: S3Client;
  private readonly bucketName: string;
  /**
   * Prefijo que la llave de aplicación tiene permitido tocar.
   *
   * Se aplica aquí y no en cada sitio que sube un archivo: son media docena
   * de módulos, y basta que uno lo olvide para que su subida falle con un
   * error de permisos que no menciona el nombre del objeto.
   */
  private readonly keyPrefix: string;

  constructor(private readonly configService: ConfigService) {
    const config = getB2Config(configService);
    this.bucketName = config.bucketName;
    this.keyPrefix = config.keyPrefix;
    this.client = new S3Client({
      region: config.region,
      endpoint: config.endpoint || undefined,
      credentials:
        config.keyId && config.appKey
          ? {
              accessKeyId: config.keyId,
              secretAccessKey: config.appKey,
            }
          : undefined,
      forcePathStyle: true,
      /*
       * IPv4 a la fuerza.
       *
       * El nombre de Backblaze resuelve a IPv4 y a IPv6, y la red de un
       * contenedor de Docker no suele tener salida IPv6: la conexión por esa
       * vía no falla rápido, se queda esperando hasta agotar el tiempo. La
       * variable `--dns-result-order=ipv4first` no bastó —se comprobó—, así
       * que se fija en el agente, que es donde sí surte efecto.
       */
      requestHandler: new NodeHttpHandler({
        httpsAgent: new Agent({ family: 4, keepAlive: true }),
        connectionTimeout: 10_000,
        requestTimeout: 60_000,
      }),
      // Desde la versión 3.729 el SDK añade por omisión sumas de verificación
      // en el cuerpo, codificadas como `aws-chunked` con tráilers. El API de
      // Backblaze no las admite: no devuelve error, simplemente deja la
      // petición esperando hasta que expira. Con la misma firma hecha a mano
      // la subida responde 200 en un segundo, así que el problema es esto y
      // no la credencial ni el endpoint.
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
  }

  /** Nombre completo del objeto, con el prefijo que exige la llave. */
  private objeto(key: string): string {
    return key.startsWith(this.keyPrefix) ? key : `${this.keyPrefix}${key}`;
  }

  async upload(
    buffer: Buffer,
    key: string,
    contentType?: string,
  ): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: this.objeto(key),
        Body: buffer,
        ContentType: contentType ?? 'application/octet-stream',
      }),
    );
    return key;
  }

  async download(key: string): Promise<Buffer> {
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucketName,
        Key: this.objeto(key),
      }),
    );
    const stream = response.Body;
    if (!stream) {
      throw new Error(`No content for key: ${key}`);
    }
    const chunks: Buffer[] = [];
    for await (const chunk of stream as AsyncIterable<Uint8Array>) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  async getSignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: this.objeto(key),
    });
    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: this.objeto(key),
      }),
    );
  }
}
