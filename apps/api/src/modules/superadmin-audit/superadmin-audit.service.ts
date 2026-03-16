import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SuperadminAuditLog } from './entities/superadmin-audit-log.entity';

export interface SuperadminAuditLogDto {
  ejecutivoEmail: string;
  accion: string;
  tenantId?: string | null;
  branchId?: string | null;
  detalle?: object | null;
  ip?: string | null;
}

@Injectable()
export class SuperadminAuditService {
  constructor(
    @InjectRepository(SuperadminAuditLog)
    private readonly repo: Repository<SuperadminAuditLog>,
  ) {}

  async log(dto: SuperadminAuditLogDto): Promise<SuperadminAuditLog> {
    const entry = this.repo.create({
      ejecutivoEmail: dto.ejecutivoEmail,
      accion: dto.accion,
      tenantId: dto.tenantId ?? null,
      branchId: dto.branchId ?? null,
      detalle: dto.detalle ?? null,
      ip: dto.ip ?? null,
    });
    return this.repo.save(entry);
  }
}
