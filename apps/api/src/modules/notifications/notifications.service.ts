import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { NotificationLog } from './entities/notification-log.entity';
import {
  NotificationChannelEnum,
  NotificationStatusEnum,
} from './entities/notification-log.entity';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import { ScopeEnum } from '../users/entities/user.entity';

export interface FilterNotificationLogsDto {
  branchId?: string;
  channel?: NotificationChannelEnum;
  status?: NotificationStatusEnum;
  referenceType?: string;
  referenceId?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(NotificationLog)
    private readonly logRepo: Repository<NotificationLog>,
    @InjectQueue('notifications')
    private readonly queue: Queue,
  ) {}

  private applyScope(
    qb: ReturnType<Repository<NotificationLog>['createQueryBuilder']>,
    user: UserPayload,
  ) {
    switch (user.scope) {
      case ScopeEnum.SUCURSAL:
        qb.andWhere('n.branch_id = :branchId', { branchId: user.branchId });
        break;
      case ScopeEnum.LEGAL_ENTITY:
        if (!user.legalEntityId) return;
        qb.innerJoin('branches', 'b', 'b.id = n.branch_id').andWhere(
          'b.legal_entity_id = :legalEntityId',
          { legalEntityId: user.legalEntityId },
        );
        break;
      case ScopeEnum.GLOBAL:
        break;
    }
  }

  async getLog(
    user: UserPayload,
    filters: FilterNotificationLogsDto,
  ): Promise<{
    data: NotificationLog[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    const qb = this.logRepo
      .createQueryBuilder('n')
      .where('n.tenant_id = :tenantId', { tenantId: user.tenantId });

    this.applyScope(qb, user);

    if (filters.branchId) {
      qb.andWhere('n.branch_id = :branchId', { branchId: filters.branchId });
    }
    if (filters.channel) {
      qb.andWhere('n.channel = :channel', { channel: filters.channel });
    }
    if (filters.status) {
      qb.andWhere('n.status = :status', { status: filters.status });
    }
    if (filters.referenceType) {
      qb.andWhere('n.reference_type = :referenceType', {
        referenceType: filters.referenceType,
      });
    }
    if (filters.referenceId) {
      qb.andWhere('n.reference_id = :referenceId', {
        referenceId: filters.referenceId,
      });
    }

    const [data, total] = await qb
      .orderBy('n.created_at', 'DESC')
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

  async resend(user: UserPayload, id: string): Promise<NotificationLog> {
    const log = await this.logRepo.findOne({
      where: { id, tenantId: user.tenantId },
    });
    if (!log) {
      throw new NotFoundException('Registro de notificación no encontrado');
    }

    await this.queue.add(
      'send',
      {
        channel: log.channel,
        templateKey: log.templateKey,
        referenceType: log.referenceType,
        referenceId: log.referenceId,
        recipient: log.recipient,
        tenantId: log.tenantId,
        branchId: log.branchId,
      },
      { attempts: 3, backoff: { type: 'exponential', delay: 1000 } },
    );

    return log;
  }
}
