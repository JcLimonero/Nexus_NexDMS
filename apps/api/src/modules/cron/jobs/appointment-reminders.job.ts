import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Appointment } from '../../appointments/entities/appointment.entity';
import { AppointmentStatusEnum } from '../../appointments/entities/appointment.entity';
import { CitaRecordatorioEvent } from '../../../events/domain-events';
import { DateTime } from 'luxon';

@Injectable()
export class AppointmentRemindersJob {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Cron('0 8 * * *', { timeZone: 'America/Mexico_City' })
  async handleCron(): Promise<void> {
    const tz = 'America/Mexico_City';
    const tomorrow = DateTime.now().setZone(tz).plus({ days: 1 });
    const start = tomorrow.startOf('day').toJSDate();
    const end = tomorrow.endOf('day').toJSDate();

    const appointments = await this.appointmentRepo.find({
      where: {
        scheduledAt: Between(start, end),
        status: AppointmentStatusEnum.SCHEDULED,
        reminderSent: false,
      },
      relations: ['branch', 'client'],
    });

    for (const apt of appointments) {
      this.eventEmitter.emit(
        'cita.recordatorio',
        new CitaRecordatorioEvent(
          apt.id,
          apt.branchId,
          apt.tenantId,
          apt.scheduledAt,
          {
            email: apt.client?.email ?? undefined,
            phone: apt.clientPhone ?? apt.client?.phone,
            name: apt.clientName,
          },
        ),
      );
      await this.appointmentRepo.update(apt.id, { reminderSent: true });
    }
  }
}
