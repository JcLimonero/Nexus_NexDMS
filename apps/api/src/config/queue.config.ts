import { ConfigService } from '@nestjs/config';

export const getQueueConnection = (configService: ConfigService) => {
  const redisUrl = configService.get<string>('REDIS_URL');
  if (!redisUrl) {
    return {
      host: 'localhost',
      port: 6379,
    };
  }
  try {
    const url = new URL(redisUrl);
    return {
      host: url.hostname,
      port: parseInt(url.port || '6379', 10),
      password: url.password || undefined,
      username: url.username || undefined,
    };
  } catch {
    return {
      host: 'localhost',
      port: 6379,
    };
  }
};
