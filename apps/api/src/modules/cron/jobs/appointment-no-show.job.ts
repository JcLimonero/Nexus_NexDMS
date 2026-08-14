import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThan, Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  Appointment,
  AppointmentStatusEnum,
} from '../../appointments/entities/appointment.entity';
import { CitaNoSePresentoEvent } from '../../../events/domain-events';

/**
 * Da por no presentada la cita a la que nadie llegó.
 *
 * Sin esto la agenda se llena de citas eternamente "esperadas": el monitor
 * las cuenta como pendientes toda la tarde, el reparto sigue creyendo que
 * ese asesor está ocupado, y nadie llama al cliente porque nadie tiene la
 * lista de quién faltó.
 *
 * Se corre cada cinco minutos y no una vez al día porque el seguimiento
 * sirve mientras el hueco todavía se puede reutilizar; mañana ya no.
 */
@Injectable()
export class AppointmentNoShowJob {
  private readonly logger = new Logger(AppointmentNoShowJob.name);

  /**
   * Cuánto se espera antes de darla por perdida. Media hora es lo que
   * tarda un cliente en avisar de que va en camino; menos convertiría el
   * tráfico en un no-show.
   */
  private static readonly TOLERANCIA_MIN = 30;

  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Cron('*/5 * * * *', { timeZone: 'America/Mexico_City' })
  async handleCron(): Promise<void> {
    const limite = new Date(
      Date.now() - AppointmentNoShowJob.TOLERANCIA_MIN * 60_000,
    );

    const vencidas = await this.appointmentRepo.find({
      where: {
        scheduledAt: LessThan(limite),
        // Solo las que seguían esperándose. Una cita ya recibida, cancelada
        // o completada no se toca, y la que ya se marcó no se vuelve a
        // marcar —eso dispararía el aviso cada cinco minutos.
        status: In([
          AppointmentStatusEnum.SCHEDULED,
          AppointmentStatusEnum.CONFIRMED,
        ]),
      },
      relations: ['client'],
    });
    if (!vencidas.length) return;

    for (const cita of vencidas) {
      await this.appointmentRepo.update(cita.id, {
        status: AppointmentStatusEnum.NO_SHOW,
      });
      this.eventEmitter.emit(
        'cita.no_se_presento',
        new CitaNoSePresentoEvent(
          cita.id,
          cita.branchId,
          cita.tenantId,
          cita.scheduledAt,
          cita.serviceType,
          cita.advisorId ?? null,
          {
            email: cita.client?.email ?? undefined,
            phone: cita.clientPhone ?? cita.client?.phone,
            name: cita.clientName,
          },
        ),
      );
    }

    this.logger.log(
      `${vencidas.length} cita(s) sin presentarse tras ${AppointmentNoShowJob.TOLERANCIA_MIN} min`,
    );
  }
}
