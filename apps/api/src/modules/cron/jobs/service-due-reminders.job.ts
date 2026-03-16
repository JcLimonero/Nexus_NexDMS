import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DateTime } from 'luxon';
import { ServicePlanningService } from '../../service-planning/service-planning.service';
import { ServiceDueNotification } from '../../service-planning/entities/service-due-notification.entity';
import { ServicioProximoVencimientoEvent } from '../../../events/domain-events';
import { Branch } from '../../branches/entities/branch.entity';

@Injectable()
export class ServiceDueRemindersJob {
  constructor(
    private readonly servicePlanningService: ServicePlanningService,
    @InjectRepository(ServiceDueNotification)
    private readonly notificationRepo: Repository<ServiceDueNotification>,
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Cron('0 8 * * *', { timeZone: 'America/Mexico_City' })
  async handleCron(): Promise<void> {
    const daysAhead = 14;
    const kmAhead = 500;

    const branches = await this.branchRepo.find({
      select: ['id'],
    });
    const branchIds = branches.map((b) => b.id);

    for (const branchId of branchIds) {
      try {
        const vehiclesDue =
          await this.servicePlanningService.getVehiclesDueForService(
            branchId,
            undefined,
            daysAhead,
            kmAhead,
          );

        const cutoffDate = DateTime.now().minus({ days: 14 }).toJSDate();

        for (const v of vehiclesDue) {
          const lastNotified = await this.notificationRepo
            .createQueryBuilder('n')
            .where('n.vehicle_id = :vehicleId', { vehicleId: v.vehicleId })
            .andWhere('n.service_type_id = :serviceTypeId', {
              serviceTypeId: v.serviceTypeId,
            })
            .orderBy('n.notified_at', 'DESC')
            .getOne();

          if (lastNotified && new Date(lastNotified.notifiedAt) >= cutoffDate) {
            continue;
          }

          this.eventEmitter.emit(
            'servicio.proximo_vencimiento',
            new ServicioProximoVencimientoEvent(
              v.vehicleId,
              v.clientId,
              v.branchId,
              v.tenantId,
              v.serviceTypeName,
              v.nextDueDate,
              v.nextDueKm,
              v.client,
              v.vehicle,
            ),
          );

          await this.notificationRepo.save({
            vehicleId: v.vehicleId,
            serviceTypeId: v.serviceTypeId,
            notifiedAt: new Date(),
          });
        }
      } catch (err) {
        console.error(
          `ServiceDueRemindersJob error for branch ${branchId}:`,
          err,
        );
      }
    }
  }
}
