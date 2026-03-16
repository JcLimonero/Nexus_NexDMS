import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MechanicChecklistItem } from './entities/mechanic-checklist-item.entity';
import { MechanicSafetyChecklist } from './entities/mechanic-safety-checklist.entity';
import { CreateChecklistItemDto } from './dto/create-checklist-item.dto';
import { SaveSafetyChecklistDto } from './dto/save-safety-checklist.dto';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import { ServiceOrder } from '../service-orders/entities/service-order.entity';
import { BranchesService } from '../branches/branches.service';

@Injectable()
export class MechanicChecklistService {
  constructor(
    @InjectRepository(MechanicChecklistItem)
    private readonly itemRepo: Repository<MechanicChecklistItem>,
    @InjectRepository(MechanicSafetyChecklist)
    private readonly safetyRepo: Repository<MechanicSafetyChecklist>,
    @InjectRepository(ServiceOrder)
    private readonly soRepo: Repository<ServiceOrder>,
    private readonly branchesService: BranchesService,
  ) {}

  async findItems(user: UserPayload): Promise<MechanicChecklistItem[]> {
    return this.itemRepo.find({
      where: { tenantId: user.tenantId },
      order: { sortOrder: 'ASC', code: 'ASC' },
    });
  }

  async createItem(
    user: UserPayload,
    dto: CreateChecklistItemDto,
  ): Promise<MechanicChecklistItem> {
    const allowed = ['SUPERADMIN', 'ADMIN', 'MANAGER'];
    if (!allowed.some((r) => user.roles?.includes(r))) {
      throw new ForbiddenException(
        'Solo ADMIN, MANAGER pueden crear ítems del checklist',
      );
    }
    const existing = await this.itemRepo.findOne({
      where: { tenantId: user.tenantId, code: dto.code },
    });
    if (existing) {
      throw new BadRequestException(`Ya existe un ítem con código ${dto.code}`);
    }
    const item = this.itemRepo.create({
      tenantId: user.tenantId,
      code: dto.code,
      name: dto.name,
      description: dto.description ?? null,
      isRequired: dto.isRequired ?? true,
      sortOrder: dto.sortOrder ?? 0,
    });
    return this.itemRepo.save(item);
  }

  async saveSafetyChecklist(
    user: UserPayload,
    serviceOrderId: string,
    dto: SaveSafetyChecklistDto,
  ): Promise<MechanicSafetyChecklist[]> {
    const so = await this.soRepo.findOne({
      where: { id: serviceOrderId, tenantId: user.tenantId },
    });
    if (!so) {
      throw new NotFoundException('Orden de servicio no encontrada');
    }
    await this.branchesService.assertBranchInScope(user, so.branchId);
    const allowed = ['SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'MECHANIC'];
    if (!allowed.some((r) => user.roles?.includes(r))) {
      throw new ForbiddenException('Sin permisos para guardar checklist');
    }
    const results: MechanicSafetyChecklist[] = [];
    for (const item of dto.items) {
      const itemEntity = await this.itemRepo.findOne({
        where: { id: item.itemId, tenantId: user.tenantId },
      });
      if (!itemEntity) {
        throw new NotFoundException(`Ítem ${item.itemId} no encontrado`);
      }
      let safety = await this.safetyRepo.findOne({
        where: { serviceOrderId, itemId: item.itemId },
      });
      if (safety) {
        safety.status = item.status;
        safety.notes = item.notes ?? null;
        safety = await this.safetyRepo.save(safety);
      } else {
        safety = this.safetyRepo.create({
          serviceOrderId,
          itemId: item.itemId,
          userId: user.sub,
          status: item.status,
          notes: item.notes ?? null,
        });
        safety = await this.safetyRepo.save(safety);
      }
      results.push(safety);
    }
    return results;
  }

  async getSafetyChecklist(
    user: UserPayload,
    serviceOrderId: string,
  ): Promise<MechanicSafetyChecklist[]> {
    const so = await this.soRepo.findOne({
      where: { id: serviceOrderId, tenantId: user.tenantId },
    });
    if (!so) {
      throw new NotFoundException('Orden de servicio no encontrada');
    }
    await this.branchesService.assertBranchInScope(user, so.branchId);
    return this.safetyRepo.find({
      where: { serviceOrderId },
      relations: ['item', 'user'],
      order: { createdAt: 'DESC' },
    });
  }
}
