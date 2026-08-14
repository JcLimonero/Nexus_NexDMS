import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  Appointment,
  AppointmentStatusEnum,
} from '../../appointments/entities/appointment.entity';
import { Branch } from '../../branches/entities/branch.entity';
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
 *
 * Cuánto se espera lo decide cada sucursal: un taller de ciudad con tráfico
 * da más margen que uno de carretera. Con `0` la regla queda apagada ahí.
 */
@Injectable()
export class AppointmentNoShowJob {
  private readonly logger = new Logger(AppointmentNoShowJob.name);

  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Cron('*/5 * * * *', { timeZone: 'America/Mexico_City' })
  async handleCron(): Promise<void> {
    const sucursales = await this.branchRepo.find({
      select: ['id', 'noShowToleranceMin'],
    });
    const tolerancia = new Map(
      sucursales.map((b) => [b.id, b.noShowToleranceMin ?? 30]),
    );
    // Las que la tienen apagada no entran siquiera a la consulta.
    const activas = sucursales.filter((b) => (b.noShowToleranceMin ?? 30) > 0);
    if (!activas.length) return;

    // Se pide una sola vez con el margen más corto y luego se filtra por el
    // de cada sucursal: una consulta por sucursal serían tantas como
    // talleres tenga el grupo, cada cinco minutos.
    const margenMinimo = Math.min(
      ...activas.map((b) => b.noShowToleranceMin ?? 30),
    );
    const candidatas = await this.appointmentRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.client', 'client')
      .where('a.branch_id IN (:...sucursales)', {
        sucursales: activas.map((b) => b.id),
      })
      .andWhere('a.scheduled_at < :limite', {
        limite: new Date(Date.now() - margenMinimo * 60_000),
      })
      // Solo las que seguían esperándose. Una cita cancelada o completada no
      // se toca, y la que ya se marcó no se vuelve a marcar —eso dispararía
      // el aviso cada cinco minutos.
      .andWhere('a.status IN (:...esperando)', {
        esperando: [
          AppointmentStatusEnum.SCHEDULED,
          AppointmentStatusEnum.CONFIRMED,
        ],
      })
      // Si ya se abrió la orden de servicio, la unidad está en el taller: da
      // igual que el estado de la cita se haya quedado en "agendada". Sin
      // esto, a la media hora de su hora se marcaba como no presentada una
      // unidad que estaba en la rampa, desaparecía de la agenda de recepción
      // y salía el aviso de perseguir a un cliente que ya está en el mostrador.
      .andWhere(
        'NOT EXISTS (SELECT 1 FROM service_orders so WHERE so.appointment_id = a.id)',
      )
      .getMany();

    const ahora = Date.now();
    const vencidas = candidatas.filter((c) => {
      const margen = tolerancia.get(c.branchId) ?? 30;
      return ahora - c.scheduledAt.getTime() >= margen * 60_000;
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

    this.logger.log(`${vencidas.length} cita(s) dadas por no presentadas`);
  }
}
