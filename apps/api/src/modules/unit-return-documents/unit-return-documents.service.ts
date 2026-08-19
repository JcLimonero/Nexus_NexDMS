import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UnitReturnDocument } from './entities/unit-return-document.entity';
import { UnitReturnDocumentStatusEnum } from './entities/unit-return-document.entity';
import { UnitReturn } from '../unit-returns/entities/unit-return.entity';
import { CatalogUnit } from '../catalog-units/entities/catalog-unit.entity';
import { User } from '../users/entities/user.entity';
import { StorageService } from '../../common/storage/storage.service';
import { BranchesService } from '../branches/branches.service';
import {
  REQUIRED_EXPEDIENTE_DOCUMENT_TYPES,
  UNIT_RETURN_DOCUMENT_TYPES,
} from './constants/document-types';
import { CatalogUnitStatusEnum } from '../catalog-units/entities/catalog-unit.entity';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

@Injectable()
export class UnitReturnDocumentsService {
  constructor(
    @InjectRepository(UnitReturnDocument)
    private readonly docRepo: Repository<UnitReturnDocument>,
    @InjectRepository(UnitReturn)
    private readonly returnRepo: Repository<UnitReturn>,
    @InjectRepository(CatalogUnit)
    private readonly catalogUnitRepo: Repository<CatalogUnit>,
    private readonly storageService: StorageService,
    private readonly branchesService: BranchesService,
  ) {}

  async findAllByUnitReturn(
    user: UserPayload,
    unitReturnId: string,
  ): Promise<UnitReturnDocument[]> {
    await this.assertUnitReturnExists(user, unitReturnId);
    return this.docRepo.find({
      where: { unitReturnId, tenantId: user.tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  async upload(
    user: UserPayload,
    unitReturnId: string,
    documentType: string,
    file: Express.Multer.File,
  ): Promise<UnitReturnDocument> {
    await this.assertUnitReturnExists(user, unitReturnId);
    if (
      !(UNIT_RETURN_DOCUMENT_TYPES as readonly string[]).includes(documentType)
    ) {
      throw new BadRequestException(
        `Tipo de documento inválido. Permitidos: ${UNIT_RETURN_DOCUMENT_TYPES.join(', ')}`,
      );
    }
    const buffer = (file as Express.Multer.File & { buffer?: Buffer }).buffer;
    if (!buffer) {
      throw new BadRequestException('No se pudo leer el archivo');
    }
    const key = `unit-returns/${unitReturnId}/documents/${Date.now()}-${file.originalname}`;
    await this.storageService.upload(buffer, key, file.mimetype);
    const doc = this.docRepo.create({
      tenantId: user.tenantId,
      unitReturnId,
      documentType,
      name: file.originalname,
      storageKey: key,
      mimeType: file.mimetype,
      sizeBytes: buffer.length,
    });
    return this.docRepo.save(doc);
  }

  async getDownloadUrl(
    user: UserPayload,
    unitReturnId: string,
    documentId: string,
  ): Promise<string> {
    const doc = await this.docRepo.findOne({
      where: {
        id: documentId,
        unitReturnId,
        tenantId: user.tenantId,
      },
    });
    if (!doc) {
      throw new NotFoundException(`Documento ${documentId} no encontrado`);
    }
    return this.storageService.getSignedUrl(doc.storageKey, 3600);
  }

  async delete(
    user: UserPayload,
    unitReturnId: string,
    documentId: string,
  ): Promise<void> {
    const doc = await this.docRepo.findOne({
      where: {
        id: documentId,
        unitReturnId,
        tenantId: user.tenantId,
      },
    });
    if (!doc) {
      throw new NotFoundException(`Documento ${documentId} no encontrado`);
    }
    await this.storageService.delete(doc.storageKey);
    await this.docRepo.remove(doc);
  }

  async approve(
    user: UserPayload,
    unitReturnId: string,
    documentId: string,
  ): Promise<UnitReturnDocument> {
    const doc = await this.docRepo.findOne({
      where: {
        id: documentId,
        unitReturnId,
        tenantId: user.tenantId,
      },
    });
    if (!doc) {
      throw new NotFoundException(`Documento ${documentId} no encontrado`);
    }
    if (doc.status !== UnitReturnDocumentStatusEnum.PENDING) {
      throw new BadRequestException(
        'Solo documentos pendientes pueden aprobarse',
      );
    }
    doc.status = UnitReturnDocumentStatusEnum.APPROVED;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    doc.validatedBy = { id: user.sub } as User;
    doc.validatedAt = new Date();
    doc.rejectionReason = null;
    const saved = await this.docRepo.save(doc);
    await this.tryCompleteExpediente(unitReturnId);
    return saved;
  }

  async reject(
    user: UserPayload,
    unitReturnId: string,
    documentId: string,
    rejectionReason: string,
  ): Promise<UnitReturnDocument> {
    const doc = await this.docRepo.findOne({
      where: {
        id: documentId,
        unitReturnId,
        tenantId: user.tenantId,
      },
    });
    if (!doc) {
      throw new NotFoundException(`Documento ${documentId} no encontrado`);
    }
    if (doc.status !== UnitReturnDocumentStatusEnum.PENDING) {
      throw new BadRequestException(
        'Solo documentos pendientes pueden rechazarse',
      );
    }
    doc.status = UnitReturnDocumentStatusEnum.REJECTED;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    doc.validatedBy = { id: user.sub } as User;
    doc.validatedAt = new Date();
    doc.rejectionReason = rejectionReason;
    return this.docRepo.save(doc);
  }

  private async tryCompleteExpediente(unitReturnId: string): Promise<void> {
    const unitReturn = await this.returnRepo.findOne({
      where: { id: unitReturnId },
      relations: ['catalogUnit'],
    });
    if (!unitReturn?.catalogUnit) return;
    const unit = unitReturn.catalogUnit;
    if (unit.status !== CatalogUnitStatusEnum.PENDING_EXPEDIENTE) return;

    const docs = await this.docRepo.find({
      where: {
        unitReturnId,
        status: UnitReturnDocumentStatusEnum.APPROVED,
      },
    });
    const approvedTypes = new Set(docs.map((d) => d.documentType));
    const allRequired = REQUIRED_EXPEDIENTE_DOCUMENT_TYPES.every((t) =>
      approvedTypes.has(t),
    );
    if (allRequired && unitReturn.clientId) {
      unit.status = CatalogUnitStatusEnum.AVAILABLE;
      await this.catalogUnitRepo.save(unit);
    }
  }

  private async assertUnitReturnExists(
    user: UserPayload,
    unitReturnId: string,
  ): Promise<void> {
    const unitReturn = await this.returnRepo.findOne({
      where: { id: unitReturnId, tenantId: user.tenantId },
    });
    if (!unitReturn) {
      throw new NotFoundException(`Recompra ${unitReturnId} no encontrada`);
    }
    const unit = await this.catalogUnitRepo.findOne({
      where: { id: unitReturn.catalogUnitId },
    });
    if (unit) {
      await this.branchesService.assertBranchInScope(user, unit.branchId);
    }
  }
}
