import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceOrder } from '../service-orders/entities/service-order.entity';
import { ServiceOrderStatusEnum } from '../service-orders/entities/service-order.entity';
import { ServiceType } from '../service-types/entities/service-type.entity';
import { CustomerVehicle } from '../customer-vehicles/entities/customer-vehicle.entity';
import { Client } from '../clients/entities/client.entity';
import { DateTime } from 'luxon';

export interface VehicleDueForService {
  vehicleId: string;
  clientId: string;
  branchId: string;
  tenantId: string;
  serviceTypeId: string;
  serviceTypeName: string;
  nextDueDate: Date | null;
  nextDueKm: number | null;
  lastServiceDate: Date | null;
  lastServiceKm: number | null;
  client: { email?: string; phone?: string; name?: string };
  vehicle: { make: string; model: string; year: number; plate?: string };
}

@Injectable()
export class ServicePlanningService {
  constructor(
    @InjectRepository(ServiceOrder)
    private readonly soRepo: Repository<ServiceOrder>,
    @InjectRepository(ServiceType)
    private readonly serviceTypeRepo: Repository<ServiceType>,
    @InjectRepository(CustomerVehicle)
    private readonly vehicleRepo: Repository<CustomerVehicle>,
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
  ) {}

  async getVehiclesDueForService(
    branchId: string,
    serviceTypeId?: string,
    daysAhead: number = 14,
    kmAhead: number = 500,
  ): Promise<VehicleDueForService[]> {
    const daysAheadVal = daysAhead ?? 14;
    const kmAheadVal = kmAhead ?? 500;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + daysAheadVal);

    const qb = this.soRepo
      .createQueryBuilder('so')
      .innerJoinAndSelect('so.vehicle', 'v')
      .innerJoinAndSelect('so.owner', 'owner')
      .innerJoinAndSelect('so.serviceTypeRelation', 'st')
      .where('so.branch_id = :branchId', { branchId })
      .andWhere('so.status = :status', {
        status: ServiceOrderStatusEnum.DELIVERED,
      })
      .andWhere('so.service_type_id IS NOT NULL')
      .orderBy('so.delivered_at', 'DESC');

    if (serviceTypeId) {
      qb.andWhere('so.service_type_id = :serviceTypeId', { serviceTypeId });
    }

    const orders = await qb.getMany();

    const byVehicleAndType = new Map<
      string,
      { so: ServiceOrder; st: ServiceType }
    >();
    for (const so of orders) {
      const key = `${so.vehicleId}:${so.serviceTypeId}`;
      if (!byVehicleAndType.has(key)) {
        byVehicleAndType.set(key, {
          so,
          st: so.serviceTypeRelation!,
        });
      }
    }

    const result: VehicleDueForService[] = [];

    for (const [, { so, st }] of byVehicleAndType) {
      if (!st.recurrenceKmInterval && !st.recurrenceMonthsInterval) continue;

      const lastDate = so.deliveredAt ? new Date(so.deliveredAt) : null;
      const lastKm = so.kmOut ?? so.kmIn;

      let nextDueDate: Date | null = null;
      let nextDueKm: number | null = null;

      if (st.recurrenceMonthsInterval && lastDate) {
        nextDueDate = DateTime.fromJSDate(lastDate)
          .plus({ months: st.recurrenceMonthsInterval })
          .toJSDate();
      }
      if (st.recurrenceKmInterval) {
        nextDueKm = lastKm + st.recurrenceKmInterval;
      }

      const vehicle = await this.vehicleRepo.findOne({
        where: { id: so.vehicleId },
      });
      if (!vehicle) continue;

      const isDueByDate = nextDueDate && nextDueDate <= cutoffDate;
      const isDueByKm =
        nextDueKm != null && vehicle.mileage + kmAheadVal >= nextDueKm;

      if (!isDueByDate && !isDueByKm) continue;

      const client = await this.clientRepo.findOne({
        where: { id: so.ownerId },
      });

      result.push({
        vehicleId: so.vehicleId,
        clientId: so.ownerId,
        branchId: so.branchId,
        tenantId: so.tenantId,
        serviceTypeId: st.id,
        serviceTypeName: st.name,
        nextDueDate,
        nextDueKm,
        lastServiceDate: lastDate,
        lastServiceKm: lastKm,
        client: {
          email: client?.email ?? undefined,
          phone: client?.phone ?? undefined,
          name:
            (client?.isCompany
              ? client?.companyName
              : `${client?.firstName ?? ''} ${client?.lastName ?? ''}`.trim()) ??
            undefined,
        },
        vehicle: {
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year,
          plate: vehicle.plate ?? undefined,
        },
      });
    }

    return result;
  }
}
