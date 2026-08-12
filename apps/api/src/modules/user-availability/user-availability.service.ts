import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { UserSchedule } from './entities/user-schedule.entity';
import { UserAbsence } from './entities/user-absence.entity';
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
        workWindows.push({
          start: new Date(dayStart.getTime()),
          end: new Date(dayEnd.getTime()),
        });
        workWindows[0].start.setHours(9, 0, 0, 0);
        workWindows[0].end.setHours(18, 0, 0, 0);
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
}
