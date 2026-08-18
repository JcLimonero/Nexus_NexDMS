import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Not, Repository } from 'typeorm';
import {
  PhaseStatusEnum,
  ServiceKitPhase,
  ServiceOrderPhase,
} from './entities/service-phase.entities';
import {
  ServiceOrder,
  ServiceOrderStatusEnum,
} from '../service-orders/entities/service-order.entity';
import { ServiceKit } from '../service-kits/entities/service-kit.entity';
import { User } from '../users/entities/user.entity';
import { UserAvailabilityService } from '../user-availability/user-availability.service';

/** Cómo va una unidad respecto a lo que se estimó. */
export type Semaforo = 'en-tiempo' | 'por-vencer' | 'excedido' | 'sin-empezar';

export interface UnidadEnTablero {
  ordenId: string;
  folio: string;
  cliente: string;
  vehiculo: string;
  placa: string | null;
  estado: ServiceOrderStatusEnum;
  faseActual: string | null;
  faseSecuencia: number | null;
  fasesTotales: number;
  fasesTerminadas: number;
  responsable: string | null;
  /** Minutos que lleva la fase en curso; null si ninguna ha empezado. */
  minutosEnFase: number | null;
  estimadoFase: number | null;
  minutosTotales: number;
  estimadoTotal: number;
  semaforo: Semaforo;
  /** Cuánto se pasó del estimado, en minutos. 0 si va en tiempo. */
  retraso: number;
  /** Cuándo se recibió la unidad; base de la "vista por días". */
  recibidaEn: string;
  /** Fecha promesa de entrega, si se pactó. */
  promisedAt: string | null;
}

@Injectable()
export class ServicePhasesService {
  constructor(
    @InjectRepository(ServiceKitPhase)
    private readonly kitPhaseRepo: Repository<ServiceKitPhase>,
    @InjectRepository(ServiceOrderPhase)
    private readonly phaseRepo: Repository<ServiceOrderPhase>,
    @InjectRepository(ServiceOrder)
    private readonly orderRepo: Repository<ServiceOrder>,
    @InjectRepository(ServiceKit)
    private readonly kitRepo: Repository<ServiceKit>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly availability: UserAvailabilityService,
  ) {}

  // ─── Plantilla: fases del paquete ───────────────────────────

  fasesDelPaquete(kitId: string): Promise<ServiceKitPhase[]> {
    return this.kitPhaseRepo.find({
      where: { kitId },
      order: { sequence: 'ASC' },
    });
  }

  /**
   * Reemplaza las fases del paquete.
   *
   * Se guarda la lista entera y no fase por fase: la pantalla edita la
   * secuencia completa, y reordenar sería una sucesión de altas y bajas que
   * deja el orden roto si una falla a medias.
   */
  async guardarFasesDelPaquete(
    kitId: string,
    fases: {
      name: string;
      description?: string;
      estimatedMin: number;
      role?: string;
    }[],
  ): Promise<ServiceKitPhase[]> {
    const kit = await this.kitRepo.findOne({ where: { id: kitId } });
    if (!kit) throw new NotFoundException('Paquete no encontrado');
    for (const f of fases) {
      if (!f.name?.trim()) {
        throw new BadRequestException('Toda fase necesita nombre');
      }
      if (!f.estimatedMin || f.estimatedMin < 1) {
        throw new BadRequestException(
          `La fase "${f.name}" necesita un tiempo estimado`,
        );
      }
    }
    await this.kitPhaseRepo.delete({ kitId });
    if (!fases.length) return [];
    return this.kitPhaseRepo.save(
      fases.map((f, i) =>
        this.kitPhaseRepo.create({
          kitId,
          sequence: i + 1,
          name: f.name.trim(),
          description: f.description ?? null,
          estimatedMin: f.estimatedMin,
          role: f.role ?? null,
        }),
      ),
    );
  }

  // ─── Fases de una orden ─────────────────────────────────────

  fasesDeLaOrden(serviceOrderId: string): Promise<ServiceOrderPhase[]> {
    return this.phaseRepo.find({
      where: { serviceOrderId },
      order: { sequence: 'ASC' },
      relations: ['assignedUser'],
    });
  }

  /**
   * Copia al pie de la letra las fases del paquete a la orden.
   *
   * Se niega si la orden ya tiene fases: volver a aplicar borraría el avance
   * de un trabajo en curso, y eso no se deshace.
   */
  async aplicarPaquete(
    serviceOrderId: string,
    kitId: string,
  ): Promise<ServiceOrderPhase[]> {
    const orden = await this.orderRepo.findOne({
      where: { id: serviceOrderId },
    });
    if (!orden) throw new NotFoundException('Orden no encontrada');

    const yaTiene = await this.phaseRepo.count({ where: { serviceOrderId } });
    if (yaTiene) {
      throw new BadRequestException(
        'La orden ya tiene fases. Bórralas antes de aplicar otro paquete.',
      );
    }

    const plantilla = await this.fasesDelPaquete(kitId);
    if (!plantilla.length) {
      throw new BadRequestException('Ese paquete no tiene fases definidas');
    }

    return this.phaseRepo.save(
      plantilla.map((f) =>
        this.phaseRepo.create({
          serviceOrderId,
          kitPhaseId: f.id,
          sequence: f.sequence,
          name: f.name,
          estimatedMin: f.estimatedMin,
          role: f.role,
          status: PhaseStatusEnum.PENDIENTE,
        }),
      ),
    );
  }

  /**
   * Mueve una fase de estado y marca las horas.
   *
   * Las horas las pone el sistema y no quien pulsa: el tablero mide contra
   * ellas, y dejarlas a captura manual convertiría el semáforo en una
   * opinión.
   */
  async cambiarEstado(
    id: string,
    status: PhaseStatusEnum,
    assignedUserId?: string | null,
  ): Promise<ServiceOrderPhase> {
    const fase = await this.phaseRepo.findOne({ where: { id } });
    if (!fase) throw new NotFoundException('Fase no encontrada');

    if (status === PhaseStatusEnum.EN_CURSO && !fase.startedAt) {
      fase.startedAt = new Date();
    }
    if (status === PhaseStatusEnum.TERMINADA) {
      // Terminar sin haber empezado pasa cuando alguien la despacha de una
      // vez; se le da entrada y salida a la vez para no dejarla sin duración.
      fase.startedAt ??= new Date();
      fase.finishedAt = new Date();
    }
    if (status === PhaseStatusEnum.PENDIENTE) {
      fase.startedAt = null;
      fase.finishedAt = null;
    }
    fase.status = status;
    if (assignedUserId !== undefined) fase.assignedUserId = assignedUserId;
    return this.phaseRepo.save(fase);
  }

  async asignar(id: string, userId: string | null): Promise<ServiceOrderPhase> {
    const fase = await this.phaseRepo.findOne({ where: { id } });
    if (!fase) throw new NotFoundException('Fase no encontrada');
    fase.assignedUserId = userId;
    return this.phaseRepo.save(fase);
  }

  // ─── Tablero ────────────────────────────────────────────────

  private minutos(desde: Date | null, hasta: Date | null): number {
    if (!desde) return 0;
    return Math.round(((hasta ?? new Date()).getTime() - desde.getTime()) / 60000);
  }

  /**
   * El semáforo del taller.
   *
   * Se avisa antes de excederse, no solo después: a partir del 85% del
   * estimado la fase se marca por vencer, que es cuando todavía se puede
   * hacer algo. Al pasarse, rojo.
   */
  private semaforo(transcurrido: number, estimado: number): Semaforo {
    if (!estimado) return 'en-tiempo';
    const proporcion = transcurrido / estimado;
    if (proporcion > 1) return 'excedido';
    if (proporcion >= 0.85) return 'por-vencer';
    return 'en-tiempo';
  }

  /**
   * Qué hay en el taller ahora mismo.
   *
   * Sirve tanto a la pantalla del monitor como al tablero de quien lo
   * gestiona: es el mismo dato y separarlo garantizaría que uno de los dos
   * acabara mostrando algo distinto.
   */
  async tablero(
    tenantId: string,
    branchId: string,
  ): Promise<UnidadEnTablero[]> {
    const ordenes = await this.orderRepo.find({
      where: {
        tenantId,
        branchId,
        // Entregada o cancelada ya no está en el taller: dejarlas llenaría la
        // pantalla de unidades que no están.
        status: Not(
          In([
            ServiceOrderStatusEnum.DELIVERED,
            ServiceOrderStatusEnum.CANCELLED,
          ]),
        ),
      },
      relations: ['owner', 'vehicle'],
      order: { createdAt: 'ASC' },
    });
    if (!ordenes.length) return [];

    const fases = await this.phaseRepo.find({
      where: { serviceOrderId: In(ordenes.map((o) => o.id)) },
      order: { sequence: 'ASC' },
      relations: ['assignedUser'],
    });

    return ordenes.map((o) => {
      const suyas = fases.filter((f) => f.serviceOrderId === o.id);
      const enCurso = suyas.find((f) => f.status === PhaseStatusEnum.EN_CURSO);
      const terminadas = suyas.filter(
        (f) => f.status === PhaseStatusEnum.TERMINADA,
      );

      const minutosEnFase = enCurso
        ? this.minutos(enCurso.startedAt, null)
        : null;
      // El total se mide desde que empezó la primera fase, no desde que se
      // recibió: una unidad puede esperar autorización del cliente durante
      // horas y eso no es tiempo de taller.
      const primera = suyas.find((f) => f.startedAt);
      const minutosTotales = this.minutos(primera?.startedAt ?? null, null);
      const estimadoTotal = suyas.reduce((a, f) => a + f.estimatedMin, 0);

      // El semáforo mira la fase en curso; sin ninguna abierta, el acumulado.
      const semaforo: Semaforo = enCurso
        ? this.semaforo(minutosEnFase ?? 0, enCurso.estimatedMin)
        : primera
          ? this.semaforo(minutosTotales, estimadoTotal)
          : 'sin-empezar';

      const referencia = enCurso
        ? { transcurrido: minutosEnFase ?? 0, estimado: enCurso.estimatedMin }
        : { transcurrido: minutosTotales, estimado: estimadoTotal };

      const cliente = o.owner
        ? o.owner.isCompany
          ? (o.owner.companyName ?? '')
          : `${o.owner.firstName ?? ''} ${o.owner.lastName ?? ''}`.trim()
        : '';

      return {
        ordenId: o.id,
        folio: o.folio,
        cliente,
        vehiculo: o.vehicle
          ? `${o.vehicle.make} ${o.vehicle.model} ${o.vehicle.year}`
          : '',
        placa: o.vehicle?.plate ?? null,
        estado: o.status,
        faseActual: enCurso?.name ?? null,
        faseSecuencia: enCurso?.sequence ?? null,
        fasesTotales: suyas.length,
        fasesTerminadas: terminadas.length,
        responsable: enCurso?.assignedUser
          ? `${enCurso.assignedUser.firstName} ${enCurso.assignedUser.lastName}`.trim()
          : null,
        minutosEnFase,
        estimadoFase: enCurso?.estimatedMin ?? null,
        minutosTotales,
        estimadoTotal,
        semaforo,
        retraso: Math.max(0, referencia.transcurrido - referencia.estimado),
        recibidaEn: o.createdAt.toISOString(),
        promisedAt: o.promisedAt ? o.promisedAt.toISOString() : null,
      };
    });
  }
  // ─── Magneto plano ──────────────────────────────────────────

  /**
   * El tablero de recursos del taller: técnico por hora.
   *
   * Es el "magneto plano" de toda la vida —una fila por técnico y los
   * trabajos colocados sobre la hora en que ocurren—, con dos cosas que un
   * tablero de imanes no puede tener: la franja de su horario, para que se
   * vea de un vistazo quién no está, y el avance real de cada trabajo contra
   * lo estimado.
   *
   * Lo que todavía no ha empezado no se coloca en ninguna hora, porque no la
   * tiene: va a una bandeja aparte, igual que los imanes que esperan al
   * margen del tablero.
   */
  async magneto(tenantId: string, branchId: string, fecha: string) {
    const dia = new Date(`${fecha}T12:00:00`);
    const inicioDia = new Date(`${fecha}T00:00:00`);
    const finDia = new Date(`${fecha}T23:59:59.999`);

    const tecnicos = await this.availability.getMechanicsWithDetailsForBranch(
      branchId,
    );
    const ids = tecnicos.map((t) => t.id);
    const turnos = await this.availability.disponibilidadDelDia(
      ids,
      branchId,
      dia,
    );

    // Órdenes vivas de la sucursal con sus fases; el tablero es de lo que
    // está en el taller, no de lo que ya salió.
    const ordenes = await this.orderRepo.find({
      where: {
        tenantId,
        branchId,
        status: Not(
          In([
            ServiceOrderStatusEnum.DELIVERED,
            ServiceOrderStatusEnum.CANCELLED,
          ]),
        ),
      },
      relations: ['vehicle', 'owner'],
      order: { createdAt: 'ASC' },
    });
    const fases = ordenes.length
      ? await this.phaseRepo.find({
          where: { serviceOrderId: In(ordenes.map((o) => o.id)) },
          order: { sequence: 'ASC' },
        })
      : [];

    const porOrden = new Map(ordenes.map((o) => [o.id, o]));
    const etiqueta = (o: (typeof ordenes)[number]) => ({
      folio: o.folio,
      vehiculo: o.vehicle
        ? `${o.vehicle.make} ${o.vehicle.model}`.trim()
        : 'Sin unidad',
      placa: o.vehicle?.plate ?? null,
    });

    // Un bloque por fase que haya corrido hoy: ahí es donde estuvo la unidad.
    const bloques = fases
      .filter(
        (f) =>
          f.startedAt && f.startedAt >= inicioDia && f.startedAt <= finDia,
      )
      .map((f) => {
        const o = porOrden.get(f.serviceOrderId)!;
        const transcurrido = this.minutos(f.startedAt, f.finishedAt);
        return {
          faseId: f.id,
          ordenId: f.serviceOrderId,
          ...etiqueta(o),
          fase: f.name,
          secuencia: f.sequence,
          estado: f.status,
          tecnicoId: f.assignedUserId,
          inicio: f.startedAt!.toISOString(),
          fin: f.finishedAt?.toISOString() ?? null,
          estimadoMin: f.estimatedMin,
          transcurridoMin: transcurrido,
          semaforo: this.semaforo(transcurrido, f.estimatedMin),
        };
      });

    // Lo que espera turno: sin ninguna fase empezada todavía.
    const enEspera = ordenes
      .filter(
        (o) => !fases.some((f) => f.serviceOrderId === o.id && f.startedAt),
      )
      .map((o) => {
        const suyas = fases.filter((f) => f.serviceOrderId === o.id);
        return {
          ordenId: o.id,
          ...etiqueta(o),
          estado: o.status,
          fases: suyas.length,
          estimadoMin: suyas.reduce((a, f) => a + f.estimatedMin, 0),
          desde: o.createdAt.toISOString(),
        };
      });

    return {
      fecha,
      // La hora del servidor, para que la línea de "ahora" no dependa del
      // reloj del equipo donde esté colgada la pantalla.
      ahora: new Date().toISOString(),
      tecnicos: tecnicos.map((t) => {
        const d = turnos.get(t.id);
        return {
          id: t.id,
          nombre: `${t.firstName} ${t.lastName}`.trim(),
          iniciales: `${t.firstName?.[0] ?? ''}${t.lastName?.[0] ?? ''}`.toUpperCase(),
          especialidad: t.specialty ?? null,
          disponible: d?.disponible ?? false,
          motivo: d?.motivo ?? null,
          ventanas: d?.ventanas ?? [],
          bloques: bloques.filter((b) => b.tecnicoId === t.id),
        };
      }),
      // Trabajo en curso sin técnico asignado: si no se muestra, desaparece
      // del tablero justo cuando hay que asignarlo.
      sinAsignar: bloques.filter((b) => !b.tecnicoId),
      enEspera,
    };
  }

}
