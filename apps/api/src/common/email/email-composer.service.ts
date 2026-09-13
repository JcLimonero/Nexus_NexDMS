import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Tenant } from '../../modules/tenants/entities/tenant.entity';
import { paletaPorId } from '../../modules/tenants/branding.paletas';
import { StorageService } from '../storage/storage.service';
import { wrapAdminEmail, wrapClientEmail } from './templates';

/** Máximo de una URL firmada de S3/B2 (SigV4): 7 días. */
const LOGO_TTL = 7 * 24 * 3600;

/**
 * Envuelve el contenido de un correo en la plantilla de marca correcta:
 * la del concesionario (con su logo y color) para correos a su gente/clientes,
 * o la de Nexus para avisos internos del SaaS.
 */
@Injectable()
export class EmailComposer {
  private readonly logger = new Logger(EmailComposer.name);

  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    private readonly storage: StorageService,
    private readonly config: ConfigService,
  ) {}

  /** Correo con la marca del concesionario (logo, color y nombre del tenant). */
  async brandedClient(
    tenantId: string,
    subject: string,
    bodyHtml: string,
    eyebrow?: string,
  ): Promise<string> {
    const t = await this.tenantRepo.findOne({ where: { id: tenantId } });
    const accent = paletaPorId(t?.palette ?? undefined)?.primary || '#2563eb';
    let logoUrl: string | null = null;
    if (t?.logoKey) {
      try {
        logoUrl = await this.storage.getSignedUrl(t.logoKey, LOGO_TTL);
      } catch (e) {
        this.logger.warn(`No se pudo firmar el logo del tenant ${tenantId}`, e as Error);
      }
    }
    return wrapClientEmail({
      brandName: t?.name || 'NexQSystem',
      accent,
      logoUrl,
      title: subject,
      content: bodyHtml,
      eyebrow,
    });
  }

  /** Correo con la marca de Nexus (avisos internos del SaaS). */
  brandedAdmin(subject: string, bodyHtml: string, eyebrow?: string): string {
    return wrapAdminEmail({
      title: subject,
      content: bodyHtml,
      eyebrow,
      logoUrl: this.config.get<string>(
        'NEXUS_LOGO_URL',
        'https://admin.nexusqsystem.com/nexus/logo.png',
      ),
    });
  }
}
