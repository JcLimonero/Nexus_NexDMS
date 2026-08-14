import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
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
