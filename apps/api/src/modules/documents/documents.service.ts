import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ClientDocument,
  ClientDocumentStatusEnum,
} from './entities/client-document.entity';
import { Client } from '../clients/entities/client.entity';
import { User } from '../users/entities/user.entity';
import { StorageService } from '../../common/storage/storage.service';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(ClientDocument)
    private readonly docRepo: Repository<ClientDocument>,
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
    private readonly storageService: StorageService,
  ) {}

  async findPending(
    user: UserPayload,
    clientId?: string,
  ): Promise<ClientDocument[]> {
    const where: {
      tenantId: string;
      status: ClientDocumentStatusEnum;
      clientId?: string;
    } = {
      tenantId: user.tenantId,
      status: ClientDocumentStatusEnum.PENDING,
    };
    if (clientId) {
      await this.assertClientExists(user, clientId);
      where.clientId = clientId;
    }
    return this.docRepo.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async findAllByClient(
    user: UserPayload,
    clientId: string,
  ): Promise<ClientDocument[]> {
    await this.assertClientExists(user, clientId);
    return this.docRepo.find({
      where: { clientId, tenantId: user.tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  async upload(
    user: UserPayload,
    clientId: string,
    documentType: string,
    file: Express.Multer.File,
  ): Promise<ClientDocument> {
    await this.assertClientExists(user, clientId);
    const buffer = (file as Express.Multer.File & { buffer?: Buffer }).buffer;
    if (!buffer) {
      throw new BadRequestException('No se pudo leer el archivo');
    }
    const key = `clients/${clientId}/documents/${Date.now()}-${file.originalname}`;
    await this.storageService.upload(buffer, key, file.mimetype);
    const doc = this.docRepo.create({
      tenantId: user.tenantId,
      clientId,
      documentType,
      name: file.originalname,
      storageKey: key,
      mimeType: file.mimetype,
      sizeBytes: buffer.length,
    });
    return this.docRepo.save(doc);
  }

  async approve(
    user: UserPayload,
    clientId: string,
    documentId: string,
  ): Promise<ClientDocument> {
    const doc = await this.docRepo.findOne({
      where: {
        id: documentId,
        clientId,
        tenantId: user.tenantId,
      },
    });
    if (!doc) {
      throw new NotFoundException(`Documento ${documentId} no encontrado`);
    }
    if (doc.status !== ClientDocumentStatusEnum.PENDING) {
      throw new BadRequestException(
        'Solo documentos pendientes pueden aprobarse',
      );
    }
    doc.status = ClientDocumentStatusEnum.APPROVED;
    doc.validatedBy = { id: user.sub } as User;
    doc.validatedAt = new Date();
    doc.rejectionReason = null;
    return this.docRepo.save(doc);
  }

  async reject(
    user: UserPayload,
    clientId: string,
    documentId: string,
    rejectionReason: string,
  ): Promise<ClientDocument> {
    const doc = await this.docRepo.findOne({
      where: {
        id: documentId,
        clientId,
        tenantId: user.tenantId,
      },
    });
    if (!doc) {
      throw new NotFoundException(`Documento ${documentId} no encontrado`);
    }
    if (doc.status !== ClientDocumentStatusEnum.PENDING) {
      throw new BadRequestException(
        'Solo documentos pendientes pueden rechazarse',
      );
    }
    doc.status = ClientDocumentStatusEnum.REJECTED;
    doc.validatedBy = { id: user.sub } as User;
    doc.validatedAt = new Date();
    doc.rejectionReason = rejectionReason;
    return this.docRepo.save(doc);
  }

  async getDownloadUrl(
    user: UserPayload,
    clientId: string,
    documentId: string,
  ): Promise<string> {
    const doc = await this.docRepo.findOne({
      where: {
        id: documentId,
        clientId,
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
    clientId: string,
    documentId: string,
  ): Promise<void> {
    const doc = await this.docRepo.findOne({
      where: {
        id: documentId,
        clientId,
        tenantId: user.tenantId,
      },
    });
    if (!doc) {
      throw new NotFoundException(`Documento ${documentId} no encontrado`);
    }
    await this.storageService.delete(doc.storageKey);
    await this.docRepo.remove(doc);
  }

  private async assertClientExists(
    user: UserPayload,
    clientId: string,
  ): Promise<void> {
    const client = await this.clientRepo.findOne({
      where: { id: clientId, tenantId: user.tenantId },
    });
    if (!client) {
      throw new NotFoundException(`Cliente ${clientId} no encontrado`);
    }
  }
}
