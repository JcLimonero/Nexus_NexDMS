import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import {
  CitaAgendadaEvent,
  CitaRecordatorioEvent,
  CfdiGeneradoEvent,
  OsEntregadaEvent,
  OsEstatusChangedEvent,
  StockMinimoEvent,
  PagoCreditoVencidoEvent,
  VentaConfirmadaEvent,
  CotizacionEnviadaEvent,
  MantenimientoSinRefaccionesEvent,
  ServicioProximoVencimientoEvent,
  ServicioHallazgoCotizacionEvent,
} from '../../../events/domain-events';
import { NotificationChannelEnum } from '../entities/notification-log.entity';
import { UsersService } from '../../users/users.service';
import { RoleEnum } from '../../users/entities/user.entity';
import { StorageService } from '../../../common/storage/storage.service';
import { ServiceOrderFinding } from '../../service-orders/entities/service-order-finding.entity';

@Injectable()
export class NotificationsListener {
  constructor(
    @InjectQueue('notifications')
    private readonly notificationsQueue: Queue,
    private readonly usersService: UsersService,
    private readonly storageService: StorageService,
    @InjectRepository(ServiceOrderFinding)
    private readonly findingRepo: Repository<ServiceOrderFinding>,
  ) {}

  @OnEvent('cita.agendada')
  async onCitaAgendada(event: CitaAgendadaEvent): Promise<void> {
    if (event.client?.phone) {
      await this.notificationsQueue.add('send', {
        channel: NotificationChannelEnum.WHATSAPP,
        templateKey: 'cita_confirmada',
        referenceType: 'Appointment',
        referenceId: event.appointmentId,
        recipient: event.client.phone,
        tenantId: event.tenantId,
        branchId: event.branchId,
        templateParams: { name: event.client.name ?? 'Cliente' },
      });
    }
  }

  @OnEvent('cita.recordatorio')
  async onCitaRecordatorio(event: CitaRecordatorioEvent): Promise<void> {
    const channels: Array<{
      channel: NotificationChannelEnum;
      recipient: string;
    }> = [];
    if (event.client?.phone) {
      channels.push({
        channel: NotificationChannelEnum.WHATSAPP,
        recipient: event.client.phone,
      });
    }
    if (event.client?.email) {
      channels.push({
        channel: NotificationChannelEnum.EMAIL,
        recipient: event.client.email,
      });
    }
    for (const ch of channels) {
      await this.notificationsQueue.add('send', {
        channel: ch.channel,
        templateKey: 'cita_recordatorio',
        referenceType: 'Appointment',
        referenceId: event.appointmentId,
        recipient: ch.recipient,
        tenantId: event.tenantId,
        branchId: event.branchId,
        templateParams: { name: event.client?.name ?? 'Cliente' },
      });
    }
  }

  @OnEvent('cfdi.generado')
  async onCfdiGenerado(event: CfdiGeneradoEvent): Promise<void> {
    if (event.client?.email) {
      await this.notificationsQueue.add('send', {
        channel: NotificationChannelEnum.EMAIL,
        templateKey: 'factura_generada',
        referenceType: 'CfdiLog',
        referenceId: event.cfdiLogId,
        recipient: event.client.email,
        tenantId: event.tenantId,
        branchId: event.branchId,
        subject: 'Factura generada',
        html: `<p>Su factura ha sido generada. Total: $${event.total}</p>`,
      });
    }
  }

  @OnEvent('os.entregada')
  async onOsEntregada(event: OsEntregadaEvent): Promise<void> {
    if (!event.client?.phone) return;
    const base = process.env.APP_PUBLIC_URL ?? 'http://localhost:4200';
    await this.notificationsQueue.add('send', {
      channel: NotificationChannelEnum.WHATSAPP,
      templateKey: 'encuesta_servicio',
      referenceType: 'ServiceOrder',
      referenceId: event.serviceOrderId,
      recipient: event.client.phone,
      tenantId: event.tenantId,
      branchId: event.branchId,
      templateParams: {
        folio: event.folio,
        surveyUrl: `${base}/s/${event.surveyToken}`,
        trackingUrl: `${base}/t/${event.trackingToken}`,
      },
    });
  }

  @OnEvent('os.estatus_changed')
  async onOsEstatusChanged(event: OsEstatusChangedEvent): Promise<void> {
    if (event.newStatus === 'READY' && event.client?.phone) {
      await this.notificationsQueue.add('send', {
        channel: NotificationChannelEnum.WHATSAPP,
        templateKey: 'os_lista_entrega',
        referenceType: 'ServiceOrder',
        referenceId: event.serviceOrderId,
        recipient: event.client.phone,
        tenantId: event.tenantId,
        branchId: event.branchId,
      });
    }
  }

  @OnEvent('venta.confirmada')
  async onVentaConfirmada(event: VentaConfirmadaEvent): Promise<void> {
    if (event.client?.phone) {
      await this.notificationsQueue.add('send', {
        channel: NotificationChannelEnum.WHATSAPP,
        templateKey: 'ticket_cobro',
        referenceType: 'Sale',
        referenceId: event.saleId,
        recipient: event.client.phone,
        tenantId: event.tenantId,
        branchId: event.branchId,
        templateParams: { total: String(event.total) },
      });
    }
  }

  @OnEvent('cotizacion.enviada')
  async onCotizacionEnviada(event: CotizacionEnviadaEvent): Promise<void> {
    if (event.client?.email) {
      await this.notificationsQueue.add('send', {
        channel: NotificationChannelEnum.EMAIL,
        templateKey: 'cotizacion_enviada',
        referenceType: 'Quotation',
        referenceId: event.quotationId,
        recipient: event.client.email,
        tenantId: event.tenantId,
        branchId: event.branchId,
        subject: 'Cotización enviada',
      });
    }
  }

  @OnEvent('stock.minimo')
  async onStockMinimo(event: StockMinimoEvent): Promise<void> {
    const opsEmail = process.env.OPS_EMAIL ?? 'almacen@nexdms.com';
    const partsList = event.parts
      .map((p) => `${p.name}: ${p.stockActual}/${p.stockMinimo}`)
      .join(', ');
    await this.notificationsQueue.add('send', {
      channel: NotificationChannelEnum.EMAIL,
      templateKey: 'stock_minimo',
      referenceType: 'Branch',
      referenceId: event.branchId,
      recipient: opsEmail,
      tenantId: event.tenantId,
      branchId: event.branchId,
      subject: 'Alerta de stock mínimo',
      html: `<p>Partes con stock bajo: ${partsList}</p>`,
    });
  }

  @OnEvent('mantenimiento.sin_refacciones')
  async onMantenimientoSinRefacciones(
    event: MantenimientoSinRefaccionesEvent,
  ): Promise<void> {
    const users = await this.usersService.getUsersByRoleInBranch(
      event.branchId,
      [RoleEnum.PARTS_MANAGER, RoleEnum.MANAGER, RoleEnum.AFTERSALES_MANAGER],
    );
    const emails = [...new Set(users.map((u) => u.email).filter(Boolean))];
    const partsList = event.missingParts
      .map(
        (p) =>
          `${p.partName}: requerido ${p.required}, disponible ${p.available}`,
      )
      .join('; ');
    for (const email of emails) {
      if (email) {
        await this.notificationsQueue.add('send', {
          channel: NotificationChannelEnum.EMAIL,
          templateKey: 'mantenimiento_sin_refacciones',
          referenceType: 'Appointment',
          referenceId: event.appointmentId,
          recipient: email,
          tenantId: event.tenantId,
          branchId: event.branchId,
          subject: `Cita de mantenimiento sin refacciones: ${event.serviceTypeName}`,
          html: `<p>Cita programada para ${event.scheduledAt.toISOString()}. Partes faltantes: ${partsList}</p>`,
        });
      }
    }
  }

  @OnEvent('servicio.proximo_vencimiento')
  async onServicioProximoVencimiento(
    event: ServicioProximoVencimientoEvent,
  ): Promise<void> {
    const channels: Array<{
      channel: NotificationChannelEnum;
      recipient: string;
    }> = [];
    if (event.client?.phone) {
      channels.push({
        channel: NotificationChannelEnum.WHATSAPP,
        recipient: event.client.phone,
      });
    }
    if (event.client?.email) {
      channels.push({
        channel: NotificationChannelEnum.EMAIL,
        recipient: event.client.email,
      });
    }
    for (const ch of channels) {
      await this.notificationsQueue.add('send', {
        channel: ch.channel,
        templateKey: 'servicio_proximo_vencimiento',
        referenceType: 'CustomerVehicle',
        referenceId: event.vehicleId,
        recipient: ch.recipient,
        tenantId: event.tenantId,
        branchId: event.branchId,
        templateParams: {
          name: event.client?.name ?? 'Cliente',
          vehicleMake: event.vehicle.make,
          vehicleModel: event.vehicle.model,
          serviceTypeName: event.serviceTypeName,
        },
      });
    }
  }

  @OnEvent('servicio.hallazgo_cotizacion')
  async onServicioHallazgoCotizacion(
    event: ServicioHallazgoCotizacionEvent,
  ): Promise<void> {
    const expiresIn = 48 * 60 * 60; // 48 horas
    const signedUrl = await this.storageService.getSignedUrl(
      event.mediaKey,
      expiresIn,
    );
    const message = `Hay un hallazgo en su unidad que requiere cotización: ${event.description}. Ver evidencia: ${signedUrl}`;
    let sent = false;
    if (event.client?.phone) {
      await this.notificationsQueue.add('send', {
        channel: NotificationChannelEnum.WHATSAPP,
        templateKey: 'hallazgo_cotizacion',
        referenceType: 'ServiceOrderFinding',
        referenceId: event.findingId,
        recipient: event.client.phone,
        tenantId: event.tenantId,
        branchId: event.branchId,
        text: message,
      });
      sent = true;
    }
    if (event.client?.email) {
      await this.notificationsQueue.add('send', {
        channel: NotificationChannelEnum.EMAIL,
        templateKey: 'hallazgo_cotizacion',
        referenceType: 'ServiceOrderFinding',
        referenceId: event.findingId,
        recipient: event.client.email,
        tenantId: event.tenantId,
        branchId: event.branchId,
        subject: 'Hallazgo que requiere cotización',
        html: `<p>${message}</p>`,
      });
      sent = true;
    }
    if (sent) {
      await this.findingRepo.update(event.findingId, {
        clientNotifiedAt: new Date(),
      });
    }
  }

  @OnEvent('pago.credito_vencido')
  async onPagoCreditoVencido(event: PagoCreditoVencidoEvent): Promise<void> {
    const channels: Array<{
      channel: NotificationChannelEnum;
      recipient: string;
    }> = [];
    if (event.client?.phone) {
      channels.push({
        channel: NotificationChannelEnum.WHATSAPP,
        recipient: event.client.phone,
      });
    }
    if (event.client?.phone) {
      channels.push({
        channel: NotificationChannelEnum.SMS,
        recipient: event.client.phone,
      });
    }
    if (event.client?.email && channels.length === 0) {
      channels.push({
        channel: NotificationChannelEnum.EMAIL,
        recipient: event.client.email,
      });
    }
    for (const ch of channels) {
      await this.notificationsQueue.add('send', {
        channel: ch.channel,
        templateKey: 'pago_vencido',
        referenceType: 'PaymentPlanInstallment',
        referenceId: event.installments[0]?.installmentId ?? event.clientId,
        recipient: ch.recipient,
        tenantId: event.tenantId,
        branchId: event.branchId,
        text: `Tiene pagos vencidos. Por favor regularice su situación.`,
      });
    }
  }
}
