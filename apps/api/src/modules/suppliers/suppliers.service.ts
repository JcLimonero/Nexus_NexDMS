import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Supplier } from './entities/supplier.entity';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { FilterSuppliersDto } from './dto/filter-suppliers.dto';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import { In } from 'typeorm';
import { PurchaseOrder } from '../purchase-orders/entities/purchase-order.entity';
import { PurchaseOrderStatusEnum } from '../purchase-orders/entities/purchase-order.entity';

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier)
    private readonly supplierRepo: Repository<Supplier>,
    @InjectRepository(PurchaseOrder)
    private readonly purchaseOrderRepo: Repository<PurchaseOrder>,
  ) {}

  async findAll(
    user: UserPayload,
    filters: FilterSuppliersDto,
  ): Promise<{
    data: Supplier[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    const qb = this.supplierRepo
      .createQueryBuilder('s')
      .where('s.tenant_id = :tenantId', { tenantId: user.tenantId })
      .andWhere('s.deleted_at IS NULL');

    if (filters.search?.trim()) {
      const term = `%${filters.search.trim()}%`;
      qb.andWhere(
        '(s.name ILIKE :term OR s.contact_name ILIKE :term OR s.rfc ILIKE :term)',
        { term },
      );
    }
    if (filters.isActive !== undefined) {
      qb.andWhere('s.is_active = :isActive', { isActive: filters.isActive });
    }

    const [data, total] = await qb
      .orderBy('s.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(user: UserPayload, id: string): Promise<Supplier> {
    const supplier = await this.supplierRepo.findOne({
      where: { id, tenantId: user.tenantId },
    });
    if (!supplier) {
      throw new NotFoundException(`Proveedor ${id} no encontrado`);
    }
    return supplier;
  }

  async create(user: UserPayload, dto: CreateSupplierDto): Promise<Supplier> {
    const supplier = this.supplierRepo.create({
      ...dto,
      tenantId: user.tenantId,
      creditDays: dto.creditDays ?? 0,
      isActive: dto.isActive ?? true,
    });
    return this.supplierRepo.save(supplier);
  }

  async update(
    user: UserPayload,
    id: string,
    dto: UpdateSupplierDto,
  ): Promise<Supplier> {
    const supplier = await this.findOne(user, id);
    Object.assign(supplier, dto);
    return this.supplierRepo.save(supplier);
  }

  async softDelete(user: UserPayload, id: string): Promise<void> {
    await this.findOne(user, id);

    const activeStatuses = [
      PurchaseOrderStatusEnum.DRAFT,
      PurchaseOrderStatusEnum.SENT,
      PurchaseOrderStatusEnum.PARTIAL,
    ];
    const activeCount = await this.purchaseOrderRepo.count({
      where: {
        supplierId: id,
        tenantId: user.tenantId,
        status: In(activeStatuses),
      },
    });

    if (activeCount > 0) {
      throw new BadRequestException(
        `No se puede eliminar el proveedor: tiene ${activeCount} orden(es) de compra activa(s)`,
      );
    }

    await this.supplierRepo.softDelete(id);
  }
}
