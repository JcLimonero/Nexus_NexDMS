import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UnitAccessory } from './entities/unit-accessory.entity';
import { UnitAccessoryCompatibility } from './entities/unit-accessory-compatibility.entity';
import { UnitSaleAccessory } from './entities/unit-sale-accessory.entity';
import { CatalogUnit } from '../catalog-units/entities/catalog-unit.entity';
import { CreateUnitAccessoryDto } from './dto/create-unit-accessory.dto';
import { UpdateUnitAccessoryDto } from './dto/update-unit-accessory.dto';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

@Injectable()
export class UnitAccessoriesService {
  constructor(
    @InjectRepository(UnitAccessory)
    private readonly accessoryRepo: Repository<UnitAccessory>,
    @InjectRepository(UnitAccessoryCompatibility)
    private readonly compatibilityRepo: Repository<UnitAccessoryCompatibility>,
    @InjectRepository(UnitSaleAccessory)
    private readonly saleAccessoryRepo: Repository<UnitSaleAccessory>,
    @InjectRepository(CatalogUnit)
    private readonly catalogUnitRepo: Repository<CatalogUnit>,
  ) {}

  private assertCanWrite(user: UserPayload) {
    const allowed = ['SUPERADMIN', 'ADMIN', 'MANAGER', 'SELLER'];
    if (!allowed.some((r) => user.roles?.includes(r))) {
      throw new ForbiddenException(
        'Solo SELLER, MANAGER y ADMIN pueden gestionar accesorios',
      );
    }
  }

  async findAll(user: UserPayload): Promise<UnitAccessory[]> {
    const qb = this.accessoryRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.compatibilities', 'c')
      .leftJoinAndSelect('c.globalModel', 'gm')
      .where('a.tenant_id = :tenantId', { tenantId: user.tenantId })
      .andWhere('a.is_active = true');
    return qb.orderBy('a.name', 'ASC').getMany();
  }

  async findOne(user: UserPayload, id: string): Promise<UnitAccessory> {
    const accessory = await this.accessoryRepo.findOne({
      where: { id, tenantId: user.tenantId },
      relations: ['compatibilities', 'compatibilities.globalModel'],
    });
    if (!accessory) {
      throw new NotFoundException(`Accesorio ${id} no encontrado`);
    }
    return accessory;
  }

  async create(
    user: UserPayload,
    dto: CreateUnitAccessoryDto,
  ): Promise<UnitAccessory> {
    this.assertCanWrite(user);

    const accessory = this.accessoryRepo.create({
      tenantId: user.tenantId,
      name: dto.name,
      sku: dto.sku ?? null,
      price: dto.price,
      satProductKey: dto.satProductKey ?? null,
      description: dto.description ?? null,
      isActive: dto.isActive ?? true,
    });
    const saved = await this.accessoryRepo.save(accessory);

    if (dto.globalModelIds?.length) {
      const compatibilities = dto.globalModelIds.map((gid) =>
        this.compatibilityRepo.create({
          accessoryId: saved.id,
          globalModelId: gid,
        }),
      );
      await this.compatibilityRepo.save(compatibilities);
    }

    return this.findOne(user, saved.id);
  }

  async update(
    user: UserPayload,
    id: string,
    dto: UpdateUnitAccessoryDto,
  ): Promise<UnitAccessory> {
    this.assertCanWrite(user);
    await this.findOne(user, id);

    await this.accessoryRepo.update(id, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.sku !== undefined && { sku: dto.sku }),
      ...(dto.price !== undefined && { price: dto.price }),
      ...(dto.satProductKey !== undefined && {
        satProductKey: dto.satProductKey,
      }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
    });

    if (dto.globalModelIds !== undefined) {
      await this.compatibilityRepo.delete({ accessoryId: id });
      if (dto.globalModelIds.length > 0) {
        const compatibilities = dto.globalModelIds.map((gid) =>
          this.compatibilityRepo.create({
            accessoryId: id,
            globalModelId: gid,
          }),
        );
        await this.compatibilityRepo.save(compatibilities);
      }
    }

    return this.findOne(user, id);
  }

  async delete(user: UserPayload, id: string): Promise<void> {
    this.assertCanWrite(user);
    await this.findOne(user, id);
    await this.accessoryRepo.delete(id);
  }

  /**
   * Get accessories compatible with a catalog unit (via its global_model_id)
   */
  async getCompatibleAccessories(
    user: UserPayload,
    catalogUnitId: string,
  ): Promise<UnitAccessory[]> {
    const catalogUnit = await this.catalogUnitRepo.findOne({
      where: { id: catalogUnitId, tenantId: user.tenantId },
    });
    if (!catalogUnit) {
      throw new NotFoundException('Unidad de catálogo no encontrada');
    }
    if (!catalogUnit.globalModelId) {
      return [];
    }

    const accessories = await this.accessoryRepo
      .createQueryBuilder('a')
      .innerJoin(
        'unit_accessory_compatibilities',
        'c',
        'c.accessory_id = a.id AND c.global_model_id = :globalModelId',
        { globalModelId: catalogUnit.globalModelId },
      )
      .where('a.tenant_id = :tenantId', { tenantId: user.tenantId })
      .andWhere('a.is_active = true')
      .orderBy('a.name', 'ASC')
      .getMany();

    return accessories;
  }

  async addAccessoryToSale(
    user: UserPayload,
    unitSaleId: string,
    accessoryId: string,
    quantity: number,
  ): Promise<UnitSaleAccessory> {
    this.assertCanWrite(user);
    // Unit sale validation is done by UnitSalesService - we'll be called from there
    const accessory = await this.findOne(user, accessoryId);
    return this.saleAccessoryRepo.save({
      unitSaleId,
      accessoryId,
      quantity,
      unitPrice: Number(accessory.price),
    });
  }

  async removeAccessoryFromSale(
    user: UserPayload,
    unitSaleId: string,
    unitSaleAccessoryId: string,
  ): Promise<void> {
    this.assertCanWrite(user);
    const row = await this.saleAccessoryRepo.findOne({
      where: { id: unitSaleAccessoryId, unitSaleId },
    });
    if (!row) {
      throw new NotFoundException('Accesorio de venta no encontrado');
    }
    await this.saleAccessoryRepo.delete(row.id);
  }

  async getSaleAccessories(unitSaleId: string): Promise<UnitSaleAccessory[]> {
    return this.saleAccessoryRepo.find({
      where: { unitSaleId },
      relations: ['accessory'],
    });
  }
}
