import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type Redis from 'ioredis';
import { Branch } from '../branches/entities/branch.entity';
import { BranchConfig } from '../branches/entities/branch-config.entity';
import { EncryptionService } from '../../shared/encryption/encryption.service';
import { whatsappRouteCacheKey } from './whatsapp-route-cache';

/** A qué sucursal pertenece el número por el que entró un mensaje. */
export interface WhatsappRoute {
  tenantId: string;
  branchId: string;
  branchSlug: string;
  branchName: string;
  phoneNumberId: string;
}

/** Credenciales listas para llamar a la API de Meta. */
export interface WhatsappCredentials {
  phoneNumberId: string;
  token: string;
}

const ROUTE_CACHE_TTL_SEC = 5 * 60;

/**
 * Resuelve de qué sucursal es un mensaje entrante de WhatsApp.
 *
 * Antes no se resolvía: el bot tomaba `WHATSAPP_BOT_BRANCH_SLUG` o, si no
 * estaba, la primera sucursal activa de toda la base. En un SaaS multi-tenant
 * eso significa que los mensajes de un cliente caían en la sucursal de otro.
 *
 * La llave es el `phone_number_id` que Meta manda en `value.metadata`: cada
 * sucursal tiene el suyo en `branch_config`, con índice único.
 */
@Injectable()
export class WhatsappRoutingService {
  private readonly logger = new Logger(WhatsappRoutingService.name);

  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
    @InjectRepository(BranchConfig)
    private readonly configRepo: Repository<BranchConfig>,
    private readonly encryption: EncryptionService,
  ) {}

  /**
   * `null` cuando el número no está dado de alta en ninguna sucursal. El
   * webhook contesta 200 de todos modos —si no, Meta reintenta en ciclo— pero
   * no procesa nada.
   */
  async resolve(phoneNumberId: string): Promise<WhatsappRoute | null> {
    const cached = await this.readCache(phoneNumberId);
    if (cached) return cached;

    const config = await this.configRepo.findOne({
      where: { whatsappPhoneNumberId: phoneNumberId },
    });
    if (!config) {
      this.logger.warn(
        `Mensaje de WhatsApp para un número no configurado (${phoneNumberId})`,
      );
      return null;
    }

    const branch = await this.branchRepo.findOne({
      where: { id: config.branchId },
    });
    if (!branch) {
      this.logger.error(
        `branch_config ${config.id} apunta a una sucursal inexistente`,
      );
      return null;
    }

    const route: WhatsappRoute = {
      tenantId: branch.tenantId,
      branchId: branch.id,
      branchSlug: branch.slug,
      branchName: branch.name,
      phoneNumberId,
    };
    await this.writeCache(phoneNumberId, route);
    return route;
  }

  /**
   * Credenciales de salida de una sucursal.
   *
   * A propósito no se cachean: el token va cifrado en la base y no tiene por
   * qué existir descifrado en un segundo almacén. Es una lectura por mensaje
   * enviado, que al lado de la llamada a Meta no se nota.
   */
  async credentialsFor(branchId: string): Promise<WhatsappCredentials | null> {
    const config = await this.configRepo.findOne({ where: { branchId } });
    if (!config?.whatsappPhoneNumberId || !config.whatsappToken) return null;

    try {
      return {
        phoneNumberId: config.whatsappPhoneNumberId,
        token: this.encryption.decrypt(config.whatsappToken),
      };
    } catch {
      // Cambió ENCRYPTION_KEY, o el valor se guardó sin cifrar. No se registra
      // el contenido, sólo de qué sucursal es.
      this.logger.error(
        `No se pudo descifrar el token de WhatsApp de la sucursal ${branchId}`,
      );
      return null;
    }
  }

  /** Se llama al cambiar la configuración para no servir la ruta vieja. */
  async invalidate(phoneNumberId: string): Promise<void> {
    await this.redis.del(whatsappRouteCacheKey(phoneNumberId));
  }

  private cacheKey(phoneNumberId: string): string {
    return whatsappRouteCacheKey(phoneNumberId);
  }

  private async readCache(
    phoneNumberId: string,
  ): Promise<WhatsappRoute | null> {
    try {
      const raw = await this.redis.get(this.cacheKey(phoneNumberId));
      return raw ? (JSON.parse(raw) as WhatsappRoute) : null;
    } catch {
      return null;
    }
  }

  private async writeCache(
    phoneNumberId: string,
    route: WhatsappRoute,
  ): Promise<void> {
    try {
      await this.redis.set(
        this.cacheKey(phoneNumberId),
        JSON.stringify(route),
        'EX',
        ROUTE_CACHE_TTL_SEC,
      );
    } catch {
      // Redis caído no debe tumbar el webhook: sin caché se resuelve por BD.
    }
  }
}
