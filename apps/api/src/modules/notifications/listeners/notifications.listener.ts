import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  CitaAgendadaEvent,
  CitaRecordatorioEvent,
  CfdiGeneradoEvent,
  OsEstatusChangedEvent,
  StockMinimoEvent,
  PagoCreditoVencidoEvent,
  VentaConfirmadaEvent,
  CotizacionEnviadaEvent,
} from '../../../events/domain-events';
import { NotificationChannelEnum } from '../entities/notification-log.entity';

@Injectable()
export class NotificationsListener {
  constructor(
    @InjectQueue('notifications')
    private readonly notificationsQueue: Queue,
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
