import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { UserSchedule } from './entities/user-schedule.entity';
import {
  UserAbsence,
  UserAbsenceTypeEnum,
} from './entities/user-absence.entity';
import { UserBranch } from '../legal-entities/entities/user-branch.entity';
import { UserRole } from '../users/entities/user-role.entity';
import { User } from '../users/entities/user.entity';
import { RoleEnum } from '../users/entities/user.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { AppointmentStatusEnum } from '../appointments/entities/appointment.entity';
import { ServiceType } from '../service-types/entities/service-type.entity';
import { BranchRamp } from '../branch-ramps/entities/branch-ramp.entity';

export interface MechanicInfo {
  id: string;
  firstName: string;
  lastName: string;
}

export interface AvailableSlot {
  start: string;
  end: string;
  mechanicId?: string;
}

/**
 * Turno que se asume para quien no tiene horario propio.
 *
 * Estaba escrito a mano dentro del cálculo de slots. Ahora que la
 * disponibilidad decide también a quién se le asignan citas, el valor tiene
 * que ser uno solo y estar a la vista: si cada sitio inventa el suyo, un
 * usuario aparece disponible para el planificador y ocupado para el reparto.
 */
export const TURNO_POR_OMISION = { inicio: '09:00', fin: '18:00' };

/** Por qué alguien no puede tomar trabajo en un momento dado. */
export type MotivoNoDisponible = 'ausente' | 'fuera-de-horario';

export interface Disponibilidad {
  disponible: boolean;
  motivo?: MotivoNoDisponible;
  /** Ventanas de trabajo de ese día, para poder decir hasta qué hora está. */
  ventanas: { inicio: string; fin: string }[];
  /** Si el horario sale del turno por omisión y no de uno configurado. */
  porOmision: boolean;
}

@Injectable()
export class UserAvailabilityService {
  constructor(
    @InjectRepository(UserSchedule)
    private readonly scheduleRepo: Repository<UserSchedule>,
    @InjectRepository(UserAbsence)
    private readonly absenceRepo: Repository<UserAbsence>,
    @InjectRepository(UserBranch)
    private readonly userBranchRepo: Repository<UserBranch>,
    @InjectRepository(UserRole)
    private readonly userRoleRepo: Repository<UserRole>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,
    @InjectRepository(ServiceType)
    private readonly serviceTypeRepo: Repository<ServiceType>,
    @InjectRepository(BranchRamp)
    private readonly branchRampRepo: Repository<BranchRamp>,
  ) {}

  // ─── Disponibilidad: quién puede tomar trabajo y cuándo ──────

  /**
   * Si estas personas pueden tomar trabajo en esa sucursal ese día.
   *
   * Se resuelve para varias a la vez porque quien reparte carga siempre
   * pregunta por el equipo entero: hacerlo de una en una son tantas consultas
   * como asesores tenga la sucursal.
   *
   * Reglas, en orden: una ausencia que cubre el día lo deja fuera aunque tenga
   * horario; un horario configurado manda, y los días que no aparecen en él
   * son días que no trabaja; sin horario configurado se asume el turno por
   * omisión, que es como se ha venido comportando el planificador.
   */
  async disponibilidadDelDia(
    userIds: string[],
    branchId: string,
    fecha: Date,
    /** Si se indica, además comprueba que esa hora caiga dentro del turno. */
    hora?: Date,
  ): Promise<Map<string, Disponibilidad>> {
    const resultado = new Map<string, Disponibilidad>();
    if (!userIds.length) return resultado;

    const dia = fecha.getDay();
    const [horarios, ausencias] = await Promise.all([
      this.scheduleRepo.find({
        where: { branchId, userId: In(userIds) },
      }),
      this.absenceRepo.find({ where: { branchId, userId: In(userIds) } }),
    ]);

    // La fecha se compara a mediodía: las ausencias se guardan como fecha sin
    // hora y comparar contra medianoche deja fuera el primer día por el huso.
    const referencia = new Date(fecha);
    referencia.setHours(12, 0, 0, 0);
    const minutosDeLaHora = hora
      ? hora.getHours() * 60 + hora.getMinutes()
      : null;

    for (const id of userIds) {
      const ausente = ausencias.some(
        (a) =>
          a.userId === id &&
          referencia >= new Date(`${this.soloFecha(a.startDate)}T00:00:00`) &&
          referencia <= new Date(`${this.soloFecha(a.endDate)}T23:59:59`),
      );
      if (ausente) {
        resultado.set(id, {
          disponible: false,
          motivo: 'ausente',
          ventanas: [],
          porOmision: false,
        });
        continue;
      }

      const suyos = horarios.filter((h) => h.userId === id);
      const porOmision = suyos.length === 0;
      const delDia = suyos.filter((h) => h.dayOfWeek === dia);

      const ventanas = porOmision
        ? [{ inicio: TURNO_POR_OMISION.inicio, fin: TURNO_POR_OMISION.fin }]
        : delDia.map((h) => ({
            inicio: this.hhmm(h.startTime),
            fin: this.hhmm(h.endTime),
          }));

      if (!ventanas.length) {
        resultado.set(id, {
          disponible: false,
          motivo: 'fuera-de-horario',
          ventanas: [],
          porOmision,
        });
        continue;
      }

      const dentro =
        minutosDeLaHora === null ||
        ventanas.some(
          (v) =>
            minutosDeLaHora >= this.aMinutos(v.inicio) &&
            minutosDeLaHora < this.aMinutos(v.fin),
        );

      resultado.set(id, {
        disponible: dentro,
        motivo: dentro ? undefined : 'fuera-de-horario',
        ventanas,
        porOmision,
      });
    }

    return resultado;
  }

  /** De una lista, quiénes pueden tomar trabajo en ese momento. */
  async quienesPueden(
    userIds: string[],
    branchId: string,
    momento: Date,
  ): Promise<string[]> {
    const mapa = await this.disponibilidadDelDia(
      userIds,
      branchId,
      momento,
      momento,
    );
    return userIds.filter((id) => mapa.get(id)?.disponible);
  }

  private soloFecha(v: Date | string): string {
    return typeof v === 'string' ? v.slice(0, 10) : v.toISOString().slice(0, 10);
  }

  /** `09:00:00` → `09:00`; en la pantalla los segundos solo estorban. */
  private hhmm(t: string): string {
    return t.slice(0, 5);
  }

  private aMinutos(hhmm: string): number {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  }

  /**
   * Get mechanics with MECHANIC role assigned to the branch via user_branches
   */
  async getMechanicsForBranch(branchId: string): Promise<string[]> {
    const mechanics = await this.userRoleRepo
      .createQueryBuilder('ur')
      .innerJoin('user_branches', 'ub', 'ub.user_id = ur.user_id')
      .where('ur.role = :role', { role: RoleEnum.MECHANIC })
      .andWhere('ub.branch_id = :branchId', { branchId })
      .select('ur.user_id')
      .distinct(true)
      .getRawMany<{ user_id: string }>();
    return mechanics.map((m) => m.user_id);
  }

  /**
   * Get mechanics with MECHANIC role assigned to the branch, including name
   */
  async getMechanicsWithDetailsForBranch(
    branchId: string,
  ): Promise<MechanicInfo[]> {
    const ids = await this.getMechanicsForBranch(branchId);
    if (ids.length === 0) return [];
    const users = await this.userRepo.find({
      where: { id: In(ids) },
      select: ['id', 'firstName', 'lastName'],
    });
    return users.map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
    }));
  }

  /**
   * Get available time slots for a branch on a given date.
   * Considers: mechanics with MECHANIC role in user_branches, UserSchedule, UserAbsence, existing appointments.
   * If serviceTypeId is provided: validates schedulable_days, uses duration from ServiceType, considers ramp occupancy.
   */
  async getAvailableSlots(
    branchId: string,
    date: string,
    mechanicId?: string,
    durationMin?: number,
    serviceTypeId?: string,
  ): Promise<AvailableSlot[]> {
    // "YYYY-MM-DD" a secas se parsea como medianoche UTC (día anterior en
    // horario local); con hora explícita se interpreta en el TZ del proceso.
    const targetDate = new Date(`${date}T00:00:00`);
    if (isNaN(targetDate.getTime())) {
      return [];
    }
    const dayOfWeek = targetDate.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat

    let duration = durationMin ?? 60;
    let requiresRamp = false;
    let rampDurationMin = 0;

    if (serviceTypeId) {
      const serviceType = await this.serviceTypeRepo.findOne({
        where: { id: serviceTypeId },
      });
      if (!serviceType) {
        return [];
      }
      if (
        serviceType.schedulableDays &&
        serviceType.schedulableDays.length > 0 &&
        !serviceType.schedulableDays.includes(dayOfWeek)
      ) {
        return [];
      }
      duration = serviceType.durationMin;
      requiresRamp = serviceType.requiresRamp;
      rampDurationMin = serviceType.rampDurationMin ?? 0;
    }

    let mechanicIds: string[];
    if (mechanicId) {
      const allMechanics = await this.getMechanicsForBranch(branchId);
      if (!allMechanics.includes(mechanicId)) {
        return [];
      }
      mechanicIds = [mechanicId];
    } else {
      mechanicIds = await this.getMechanicsForBranch(branchId);
    }

    if (mechanicIds.length === 0) {
      return [];
    }

    const dayStart = new Date(`${date}T00:00:00`);
    const dayEnd = new Date(`${date}T23:59:59.999`);

    const [schedules, absences, appointments] = await Promise.all([
      this.scheduleRepo.find({
        where: {
          branchId,
          dayOfWeek,
          userId: In(mechanicIds),
        },
      }),
      this.absenceRepo.find({
        where: {
          branchId,
          userId: In(mechanicIds),
        },
      }),
      this.appointmentRepo
        .createQueryBuilder('a')
        .where('a.branch_id = :branchId', { branchId })
        .andWhere('a.scheduled_at >= :dayStart', { dayStart })
        .andWhere('a.scheduled_at <= :dayEnd', { dayEnd })
        .andWhere('a.status NOT IN (:...statuses)', {
          statuses: [
            AppointmentStatusEnum.CANCELLED,
            AppointmentStatusEnum.NO_SHOW,
          ],
        })
        .leftJoinAndSelect('a.serviceTypeRelation', 'st')
        .getMany(),
    ]);

    const totalRamps = requiresRamp
      ? await this.branchRampRepo.count({
          where: { branchId, isActive: true },
        })
      : 0;

    const slots: AvailableSlot[] = [];

    for (const mid of mechanicIds) {
      const mechanicAbsent = absences.some(
        (a) =>
          a.userId === mid &&
          targetDate >= new Date(a.startDate) &&
          targetDate <= new Date(a.endDate),
      );
      if (mechanicAbsent) continue;

      const mechanicSchedules = schedules.filter((s) => s.userId === mid);
      const workWindows: { start: Date; end: Date }[] = [];

      if (mechanicSchedules.length > 0) {
        for (const s of mechanicSchedules) {
          const [sh, sm] = s.startTime.split(':').map(Number);
          const [eh, em] = s.endTime.split(':').map(Number);
          const winStart = new Date(dayStart);
          winStart.setHours(sh, sm, 0, 0);
          const winEnd = new Date(dayStart);
          winEnd.setHours(eh, em, 0, 0);
          workWindows.push({ start: winStart, end: winEnd });
        }
      } else {
        // Sin horario propio se asume el turno por omisión, el mismo que usa
        // el reparto de citas.
        const [oi, omi] = TURNO_POR_OMISION.inicio.split(':').map(Number);
        const [of, omf] = TURNO_POR_OMISION.fin.split(':').map(Number);
        const inicio = new Date(dayStart.getTime());
        const fin = new Date(dayStart.getTime());
        inicio.setHours(oi, omi, 0, 0);
        fin.setHours(of, omf, 0, 0);
        workWindows.push({ start: inicio, end: fin });
      }

      const mechanicAppointments = appointments.filter(
        (a) => a.mechanicId === mid || a.mechanicId === null,
      );

      for (const win of workWindows) {
        // Avanza 30 min en cada iteración (con `continue` incluido) para no
        // quedar en loop infinito cuando un slot traslapa una cita existente.
        for (
          let slotStart = new Date(win.start);
          slotStart < win.end;
          slotStart = new Date(slotStart.getTime() + 30 * 60 * 1000)
        ) {
          const slotEnd = new Date(slotStart);
          slotEnd.setMinutes(slotEnd.getMinutes() + duration);
          if (slotEnd > win.end) break;

          const overlaps = mechanicAppointments.some((apt) => {
            const aptStart = new Date(apt.scheduledAt);
            const aptDuration =
              apt.serviceTypeRelation?.durationMin ?? apt.durationMin ?? 60;
            const aptEnd = new Date(aptStart);
            aptEnd.setMinutes(aptEnd.getMinutes() + aptDuration);
            return slotStart < aptEnd && slotEnd > aptStart;
          });
          if (overlaps) continue;

          if (requiresRamp && totalRamps > 0) {
            const rampSlotEnd = new Date(slotStart);
            rampSlotEnd.setMinutes(rampSlotEnd.getMinutes() + rampDurationMin);
            const rampsOccupied = appointments.filter((apt) => {
              const aptRequiresRamp =
                apt.serviceTypeRelation?.requiresRamp ?? false;
              if (!aptRequiresRamp) return false;
              const aptRampEnd = new Date(apt.scheduledAt);
              aptRampEnd.setMinutes(
                aptRampEnd.getMinutes() +
                  (apt.serviceTypeRelation?.rampDurationMin ?? 0),
              );
              return slotStart < aptRampEnd && rampSlotEnd > apt.scheduledAt;
            }).length;
            if (rampsOccupied >= totalRamps) continue;
          }

          slots.push({
            start: slotStart.toISOString(),
            end: slotEnd.toISOString(),
            mechanicId: mid,
          });
        }
      }
    }

    return slots.sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
    );
  }
  // ─── Administración del horario ─────────────────────────────

  /** Horario semanal y ausencias de una persona, para la pantalla. */
  async agendaDe(userId: string, branchId?: string) {
    const donde = branchId ? { userId, branchId } : { userId };
    const [horarios, ausencias] = await Promise.all([
      this.scheduleRepo.find({
        where: donde,
        order: { dayOfWeek: 'ASC', startTime: 'ASC' },
      }),
      this.absenceRepo.find({ where: donde, order: { startDate: 'DESC' } }),
    ]);
    return {
      horarios,
      ausencias,
      // Si no tiene ninguno, lo que rige es el turno por omisión: se dice
      // aquí para que la pantalla no muestre un vacío que parece "no trabaja".
      porOmision: horarios.length === 0,
      turnoPorOmision: TURNO_POR_OMISION,
    };
  }

  /**
   * Reemplaza el horario de una persona en una sucursal.
   *
   * Se guarda completo en vez de por filas sueltas: la pantalla edita la
   * semana entera, y borrar el martes sería una petición distinta que es fácil
   * olvidar de mandar. Así lo que se ve es lo que queda.
   */
  async guardarHorario(
    userId: string,
    branchId: string,
    dias: { dayOfWeek: number; startTime: string; endTime: string }[],
  ): Promise<UserSchedule[]> {
    for (const d of dias) {
      if (d.dayOfWeek < 0 || d.dayOfWeek > 6) {
        throw new BadRequestException(`Día fuera de rango: ${d.dayOfWeek}`);
      }
      if (this.aMinutos(d.startTime) >= this.aMinutos(d.endTime)) {
        throw new BadRequestException(
          'La hora de salida tiene que ser posterior a la de entrada',
        );
      }
    }
    await this.scheduleRepo.delete({ userId, branchId });
    if (!dias.length) return [];
    return this.scheduleRepo.save(
      dias.map((d) =>
        this.scheduleRepo.create({
          userId,
          branchId,
          dayOfWeek: d.dayOfWeek,
          startTime: d.startTime,
          endTime: d.endTime,
        }),
      ),
    );
  }

  async registrarAusencia(
    userId: string,
    branchId: string,
    dto: {
      startDate: string;
      endDate: string;
      type: UserAbsenceTypeEnum;
      notes?: string;
    },
  ): Promise<UserAbsence> {
    if (dto.endDate < dto.startDate) {
      throw new BadRequestException('La ausencia termina antes de empezar');
    }
    return this.absenceRepo.save(
      this.absenceRepo.create({
        userId,
        branchId,
        startDate: new Date(`${dto.startDate}T12:00:00`),
        endDate: new Date(`${dto.endDate}T12:00:00`),
        type: dto.type,
        notes: dto.notes ?? null,
      }),
    );
  }

  async eliminarAusencia(id: string): Promise<void> {
    await this.absenceRepo.delete(id);
  }

  /**
   * Quién está y quién no en una sucursal un día dado.
   *
   * Es la vista que necesita quien reparte trabajo por la mañana: antes había
   * que abrir el perfil de cada persona para saberlo.
   */
  async panelDelDia(branchId: string, fecha: string) {
    const ids = (
      await this.userBranchRepo.find({ where: { branchId } })
    ).map((ub) => ub.userId);
    if (!ids.length) return [];

    const [usuarios, disponibilidad] = await Promise.all([
      this.userRepo.find({
        where: { id: In(ids), isActive: true },
        select: ['id', 'firstName', 'lastName'],
      }),
      this.disponibilidadDelDia(ids, branchId, new Date(`${fecha}T12:00:00`)),
    ]);

    return usuarios.map((u) => ({
      id: u.id,
      nombre: `${u.firstName} ${u.lastName}`.trim(),
      ...(disponibilidad.get(u.id) ?? {
        disponible: false,
        ventanas: [],
        porOmision: false,
      }),
    }));
  }

}
