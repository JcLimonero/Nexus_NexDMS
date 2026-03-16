import {
  Controller,
  Get,
  Query,
  UseGuards,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Repository } from 'typeorm';
import { StorageService } from './storage.service';
import { ServiceOrder } from '../../modules/service-orders/entities/service-order.entity';
import { CurrentUser } from '../decorators/current-user.decorator';
import { AuthGuard } from '../guards/auth.guard';
import type { UserPayload } from '../../modules/auth/strategies/jwt.strategy';

@ApiTags('Storage')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('storage')
export class StorageController {
  constructor(
    private readonly storageService: StorageService,
    @InjectRepository(ServiceOrder)
    private readonly soRepo: Repository<ServiceOrder>,
  ) {}

  @Get('signed-url')
  async getSignedUrl(
    @CurrentUser() user: UserPayload,
    @Query('key') key: string,
    @Query('expires') expires?: string,
  ): Promise<{ url: string }> {
    if (!key) {
      throw new BadRequestException('Parámetro key es requerido');
    }
    const expiresIn = expires ? parseInt(expires, 10) : 3600;
    if (isNaN(expiresIn) || expiresIn < 60 || expiresIn > 86400 * 7) {
      throw new BadRequestException(
        'expires debe ser un número entre 60 y 604800 (7 días)',
      );
    }
    if (!key.startsWith('service-orders/')) {
      throw new ForbiddenException('Key no válida para este recurso');
    }
    const parts = key.split('/');
    if (parts.length < 2) {
      throw new ForbiddenException('Key inválida');
    }
    const serviceOrderId = parts[1];
    if (!serviceOrderId) {
      throw new ForbiddenException('Key inválida');
    }
    const so = await this.soRepo.findOne({
      where: { id: serviceOrderId, tenantId: user.tenantId },
    });
    if (!so) {
      throw new ForbiddenException('No tiene acceso a este recurso');
    }
    const url = await this.storageService.getSignedUrl(key, expiresIn);
    return { url };
  }
}
