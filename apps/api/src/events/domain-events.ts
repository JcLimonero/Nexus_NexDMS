export class VentaConfirmadaEvent {
  constructor(
    public readonly saleId: string,
    public readonly branchId: string,
    public readonly tenantId: string,
    public readonly total: number,
    public readonly client: { email?: string; phone?: string },
  ) {}
}

export class CfdiGeneradoEvent {
  constructor(
    public readonly cfdiLogId: string,
    public readonly branchId: string,
    public readonly tenantId: string,
    public readonly total: number,
    public readonly client: { email?: string; phone?: string },
    public readonly xmlKey: string,
    public readonly pdfKey: string,
  ) {}
}

export class OsEstatusChangedEvent {
  constructor(
    public readonly serviceOrderId: string,
    public readonly branchId: string,
    public readonly tenantId: string,
    public readonly previousStatus: string,
    public readonly newStatus: string,
    public readonly client?: { email?: string; phone?: string },
  ) {}
}

export class CitaAgendadaEvent {
  constructor(
    public readonly appointmentId: string,
    public readonly branchId: string,
    public readonly tenantId: string,
    public readonly scheduledAt: Date,
    public readonly client: { email?: string; phone?: string; name?: string },
  ) {}
}

export class CitaRecordatorioEvent {
  constructor(
    public readonly appointmentId: string,
    public readonly branchId: string,
    public readonly tenantId: string,
    public readonly scheduledAt: Date,
    public readonly client: { email?: string; phone?: string; name?: string },
  ) {}
}

export class StockMinimoEvent {
  constructor(
    public readonly branchId: string,
    public readonly tenantId: string,
    public readonly parts: Array<{
      partId: string;
      name: string;
      stockActual: number;
      stockMinimo: number;
    }>,
  ) {}
}

export class PagoCreditoVencidoEvent {
  constructor(
    public readonly clientId: string,
    public readonly branchId: string,
    public readonly tenantId: string,
    public readonly client: { email?: string; phone?: string; name?: string },
    public readonly installments: Array<{
      installmentId: string;
      amount: number;
      dueDate: Date;
    }>,
  ) {}
}

export class CotizacionEnviadaEvent {
  constructor(
    public readonly quotationId: string,
    public readonly branchId: string,
    public readonly tenantId: string,
    public readonly client: { email?: string; phone?: string },
  ) {}
}

export class MantenimientoSinRefaccionesEvent {
  constructor(
    public readonly appointmentId: string,
    public readonly branchId: string,
    public readonly tenantId: string,
    public readonly serviceTypeName: string,
    public readonly scheduledAt: Date,
    public readonly missingParts: Array<{
      partId: string;
      partName: string;
      required: number;
      available: number;
    }>,
  ) {}
}

export class ServicioHallazgoCotizacionEvent {
  constructor(
    public readonly serviceOrderId: string,
    public readonly findingId: string,
    public readonly branchId: string,
    public readonly tenantId: string,
    public readonly description: string,
    public readonly mediaKey: string,
    public readonly mediaType: 'PHOTO' | 'VIDEO',
    public readonly client: { email?: string; phone?: string },
  ) {}
}

export class ServicioProximoVencimientoEvent {
  constructor(
    public readonly vehicleId: string,
    public readonly clientId: string,
    public readonly branchId: string,
    public readonly tenantId: string,
    public readonly serviceTypeName: string,
    public readonly nextDueDate: Date | null,
    public readonly nextDueKm: number | null,
    public readonly client: { email?: string; phone?: string; name?: string },
    public readonly vehicle: {
      make: string;
      model: string;
      year: number;
      plate?: string;
    },
  ) {}
}
