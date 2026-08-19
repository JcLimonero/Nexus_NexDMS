import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, Repository } from 'typeorm';
import {
  OwnershipSourceEnum,
  VehicleOwnership,
} from './entities/vehicle-ownership.entity';
import { CustomerVehicle } from '../customer-vehicles/entities/customer-vehicle.entity';
import { Client } from '../clients/entities/client.entity';
import { ServiceOrder } from '../service-orders/entities/service-order.entity';

@Injectable()
export class VehicleHistoryService {
  constructor(
    @InjectRepository(VehicleOwnership)
    private readonly ownershipRepo: Repository<VehicleOwnership>,
    @InjectRepository(CustomerVehicle)
    private readonly vehicleRepo: Repository<CustomerVehicle>,
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
    @InjectRepository(ServiceOrder)
    private readonly orderRepo: Repository<ServiceOrder>,
    private readonly dataSource: DataSource,
  ) {}

  private nombre(c: Client | undefined | null): string {
    if (!c) return '—';
    return c.isCompany
      ? (c.companyName ?? '')
      : `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim();
  }

  /** Los dueños que ha tenido el vehículo, del más reciente al primero. */
  async duenos(tenantId: string, vehicleId: string) {
    const filas = await this.ownershipRepo.find({
      where: { tenantId, vehicleId },
      order: { fromDate: 'DESC' },
      relations: ['client'],
    });
    return filas.map((f) => ({
      id: f.id,
      clientId: f.clientId,
      cliente: this.nombre(f.client),
      desde: f.fromDate,
      hasta: f.toDate,
      actual: f.toDate === null,
      origen: f.source,
      notas: f.notes,
    }));
  }

  /**
   * Pasa el vehículo a otro cliente.
   *
   * Cierra el tramo del dueño anterior y abre el del nuevo en la misma
   * transacción: si una de las dos fallara, el vehículo quedaría con dos
   * dueños vigentes o con ninguno. También mueve `owner_id`, que es lo que
   * consulta el resto del sistema.
   *
   * Las órdenes de servicio anteriores **no** se tocan: son del dueño que las
   * pagó. Eso es justamente lo que se estaba perdiendo antes.
   */
  async traspasar(
    tenantId: string,
    vehicleId: string,
    dto: { clientId: string; fecha?: string; notas?: string },
  ) {
    const vehiculo = await this.vehicleRepo.findOne({
      where: { id: vehicleId, tenantId },
    });
    if (!vehiculo) throw new NotFoundException('Vehículo no encontrado');

    const nuevo = await this.clientRepo.findOne({
      where: { id: dto.clientId, tenantId },
    });
    if (!nuevo) throw new NotFoundException('Cliente no encontrado');
    if (vehiculo.ownerId === dto.clientId) {
      throw new BadRequestException('El vehículo ya es de ese cliente');
    }

    const fecha = dto.fecha ?? new Date().toISOString().slice(0, 10);

    await this.dataSource.transaction(async (m) => {
      const vigente = await m.findOne(VehicleOwnership, {
        where: { vehicleId, toDate: IsNull() },
      });
      if (vigente) {
        if (vigente.fromDate > fecha) {
          throw new BadRequestException(
            'La fecha del traspaso es anterior a cuando lo recibió el dueño actual',
          );
        }
        vigente.toDate = fecha;
        await m.save(vigente);
      }
      await m.save(
        m.create(VehicleOwnership, {
          tenantId,
          vehicleId,
          clientId: dto.clientId,
          fromDate: fecha,
          source: OwnershipSourceEnum.MANUAL,
          notes: dto.notas ?? null,
        }),
      );
      await m.update(CustomerVehicle, vehicleId, { ownerId: dto.clientId });
    });

    return this.duenos(tenantId, vehicleId);
  }

  /**
   * La ficha completa del vehículo: quién lo ha tenido y qué se le ha hecho.
   *
   * Los servicios se marcan con el dueño que lo era ese día, no con el actual:
   * es la pregunta que se hace al recibir una unidad de segunda mano.
   */
  async fichaDelVehiculo(tenantId: string, vehicleId: string) {
    const vehiculo = await this.vehicleRepo.findOne({
      where: { id: vehicleId, tenantId },
    });
    if (!vehiculo) throw new NotFoundException('Vehículo no encontrado');

    const [duenos, ordenes] = await Promise.all([
      this.duenos(tenantId, vehicleId),
      this.orderRepo.find({
        where: { tenantId, vehicleId },
        order: { createdAt: 'DESC' },
        relations: ['owner'],
      }),
    ]);

    const servicios = ordenes.map((o) => {
      const fecha = o.createdAt.toISOString().slice(0, 10);
      const dueno = duenos.find(
        (d) => d.desde <= fecha && (!d.hasta || d.hasta >= fecha),
      );
      return {
        id: o.id,
        folio: o.folio,
        fecha,
        estado: o.status,
        kmEntrada: o.kmIn ?? null,
        total: Number(o.total ?? 0),
        // Quién era el dueño ese día; si no cuadra con ningún tramo se cae
        // al cliente que quedó en la orden, que es el dato original.
        cliente: dueno?.cliente ?? this.nombre(o.owner),
        deDuenoAnterior: !!dueno && !dueno.actual,
      };
    });

    return {
      vehiculo: {
        id: vehiculo.id,
        descripcion: `${vehiculo.make} ${vehiculo.model} ${vehiculo.year}`,
        placa: vehiculo.plate,
        vin: vehiculo.vin,
        color: vehiculo.color,
        km: vehiculo.mileage,
        ownerId: vehiculo.ownerId,
      },
      duenos,
      servicios,
      resumen: {
        servicios: servicios.length,
        duenos: duenos.length,
        gastoTotal: servicios.reduce((a, s) => a + s.total, 0),
        ultimoServicio: servicios[0]?.fecha ?? null,
      },
    };
  }

  /**
   * Los vehículos de un cliente: los que tiene y los que tuvo.
   *
   * Los que ya no son suyos se listan aparte porque su historial sigue
   * siendo parte de la relación con él, aunque la unidad ya no le pertenezca.
   */
  async vehiculosDelCliente(tenantId: string, clientId: string) {
    const tramos = await this.ownershipRepo.find({
      where: { tenantId, clientId },
      order: { fromDate: 'DESC' },
      relations: ['vehicle'],
    });

    const ids = tramos.map((t) => t.vehicleId);
    const conteo = ids.length
      ? await this.orderRepo
          .createQueryBuilder('o')
          .select('o.vehicle_id', 'vehicleId')
          .addSelect('COUNT(*)', 'total')
          .where('o.vehicle_id IN (:...ids)', { ids })
          .andWhere('o.owner_id = :clientId', { clientId })
          .groupBy('o.vehicle_id')
          .getRawMany<{ vehicleId: string; total: string }>()
      : [];
    const porVehiculo = new Map(conteo.map((c) => [c.vehicleId, Number(c.total)]));

    return tramos
      .filter((t) => t.vehicle)
      .map((t) => ({
        vehicleId: t.vehicleId,
        descripcion: `${t.vehicle!.make} ${t.vehicle!.model} ${t.vehicle!.year}`,
        placa: t.vehicle!.plate,
        vin: t.vehicle!.vin,
        desde: t.fromDate,
        hasta: t.toDate,
        actual: t.toDate === null,
        servicios: porVehiculo.get(t.vehicleId) ?? 0,
      }));
  }
}
