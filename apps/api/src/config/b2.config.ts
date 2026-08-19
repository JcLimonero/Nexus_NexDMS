import { ConfigService } from '@nestjs/config';

export interface B2Config {
  endpoint: string;
  bucketName: string;
  keyId: string;
  appKey: string;
  bucketUrl?: string;
  /** Región del endpoint; el SDK la exige y va implícita en la URL. */
  region: string;
  /**
   * Prefijo obligatorio de cada objeto.
   *
   * Una llave de aplicación de Backblaze puede restringirse a un prefijo:
   * la nuestra solo puede escribir y leer nombres que empiecen así. Sin
   * aplicarlo, cada subida se rechaza con un error de permisos que no dice
   * que el problema es el nombre.
   */
  keyPrefix: string;
}

/**
 * La región va dentro del endpoint (`s3.eu-central-003.backblazeb2.com`).
 * Se deduce de ahí en vez de configurarla aparte, porque dos valores que
 * tienen que coincidir acaban no coincidiendo.
 */
const regionDelEndpoint = (endpoint: string): string =>
  /s3\.([a-z0-9-]+)\.backblazeb2\.com/.exec(endpoint)?.[1] ?? 'us-west-004';

export const getB2Config = (configService: ConfigService): B2Config => {
  const endpoint = configService.get<string>('B2_ENDPOINT') ?? '';
  return {
  endpoint,
  bucketName: configService.get<string>('B2_BUCKET_NAME') ?? '',
  keyId: configService.get<string>('B2_KEY_ID') ?? '',
  appKey: configService.get<string>('B2_APP_KEY') ?? '',
  bucketUrl: configService.get<string>('B2_BUCKET_URL'),
  region: regionDelEndpoint(endpoint),
  keyPrefix: configService.get<string>('B2_KEY_PREFIX') ?? '',
  };
};
