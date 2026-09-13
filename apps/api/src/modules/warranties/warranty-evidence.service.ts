import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Warranty, WarrantyStatusEnum } from './entities/warranty.entity';
import {
  WarrantyEvidence,
  WarrantyEvidenceKindEnum,
} from './entities/warranty-evidence.entity';
import { StorageService } from '../../common/storage/storage.service';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

/** Tope por archivo: fotos y videos cortos. */
const MAX_BYTES = 100 * 1024 * 1024;

export interface EvidenciaVista {
  id: string;
  kind: WarrantyEvidenceKindEnum;
  contentType: string | null;
  fileName: string | null;
  sizeBytes: number | null;
  caption: string | null;
  createdAt: Date;
  url: string | null;
}

/**
 * Evidencia (fotos/videos) de las reclamaciones de garantía.
 *
 * Se sube al levantar la garantía y mientras está en trámite (OPEN/IN_PROGRESS),
 * para que quien autoriza, rechaza o resuelve pueda verla. Una vez cerrada la
 * garantía queda de solo lectura.
 */
@Injectable()
export class WarrantyEvidenceService {
  constructor(
    @InjectRepository(Warranty)
    private readonly warrantyRepo: Repository<Warranty>,
    @InjectRepository(WarrantyEvidence)
    private readonly evidenceRepo: Repository<WarrantyEvidence>,
    private readonly storage: StorageService,
  ) {}

  private async garantia(user: UserPayload, warrantyId: string): Promise<Warranty> {
    const w = await this.warrantyRepo.findOne({
      where: { id: warrantyId, tenantId: user.tenantId },
    });
    if (!w) throw new NotFoundException('Garantía no encontrada');
    return w;
  }

  /** Solo se puede subir/quitar evidencia mientras la garantía sigue en trámite. */
  private assertEnTramite(w: Warranty): void {
    if (
      w.status !== WarrantyStatusEnum.OPEN &&
      w.status !== WarrantyStatusEnum.IN_PROGRESS
    ) {
      throw new BadRequestException(
        'La garantía ya fue cerrada; no se puede modificar la evidencia.',
      );
    }
  }

  private liga(e: WarrantyEvidence): Promise<string | null> {
    return this.storage.getSignedUrl(e.storageKey).catch(() => null);
  }

  private async aVista(e: WarrantyEvidence): Promise<EvidenciaVista> {
    return {
      id: e.id,
      kind: e.kind,
      contentType: e.contentType,
      fileName: e.fileName,
      sizeBytes: e.sizeBytes,
      caption: e.caption,
      createdAt: e.createdAt,
      url: await this.liga(e),
    };
  }

  async listar(user: UserPayload, warrantyId: string): Promise<EvidenciaVista[]> {
    await this.garantia(user, warrantyId);
    const rows = await this.evidenceRepo.find({
      where: { warrantyId, tenantId: user.tenantId },
      order: { createdAt: 'ASC' },
    });
    return Promise.all(rows.map((r) => this.aVista(r)));
  }

  async subir(
    user: UserPayload,
    warrantyId: string,
    file: { buffer: Buffer; mimetype: string; originalname?: string } | undefined,
    caption?: string | null,
  ): Promise<EvidenciaVista> {
    const w = await this.garantia(user, warrantyId);
    this.assertEnTramite(w);
    if (!file?.buffer?.length) {
      throw new BadRequestException('No llegó ningún archivo.');
    }
    const mime = file.mimetype || '';
    const esFoto = mime.startsWith('image/');
    const esVideo = mime.startsWith('video/');
    if (!esFoto && !esVideo) {
      throw new BadRequestException('Solo se permiten imágenes o videos.');
    }
    if (file.buffer.length > MAX_BYTES) {
      throw new BadRequestException('El archivo supera el tamaño permitido (100 MB).');
    }

    const key = `warranties/${warrantyId}/${Date.now()}`;
    await this.storage.upload(file.buffer, key, mime);
    const row = await this.evidenceRepo.save(
      this.evidenceRepo.create({
        tenantId: user.tenantId,
        warrantyId,
        kind: esFoto
          ? WarrantyEvidenceKindEnum.PHOTO
          : WarrantyEvidenceKindEnum.VIDEO,
        storageKey: key,
        contentType: mime,
        fileName: file.originalname ?? null,
        sizeBytes: file.buffer.length,
        caption: caption?.trim() || null,
        uploadedById: user.sub ?? null,
      }),
    );
    return this.aVista(row);
  }

  async eliminar(user: UserPayload, evidenceId: string): Promise<{ ok: true }> {
    const row = await this.evidenceRepo.findOne({
      where: { id: evidenceId, tenantId: user.tenantId },
    });
    if (!row) throw new NotFoundException('Evidencia no encontrada');
    const w = await this.garantia(user, row.warrantyId);
    this.assertEnTramite(w);
    await this.storage.delete(row.storageKey).catch(() => undefined);
    await this.evidenceRepo.delete({ id: row.id });
    return { ok: true };
  }
}
