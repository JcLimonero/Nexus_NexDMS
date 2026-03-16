import { ConfigService } from '@nestjs/config';

export interface B2Config {
  endpoint: string;
  bucketName: string;
  keyId: string;
  appKey: string;
  bucketUrl?: string;
}

export const getB2Config = (configService: ConfigService): B2Config => ({
  endpoint: configService.get<string>('B2_ENDPOINT') ?? '',
  bucketName: configService.get<string>('B2_BUCKET_NAME') ?? '',
  keyId: configService.get<string>('B2_KEY_ID') ?? '',
  appKey: configService.get<string>('B2_APP_KEY') ?? '',
  bucketUrl: configService.get<string>('B2_BUCKET_URL'),
});
