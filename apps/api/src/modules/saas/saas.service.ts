import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant, TenantPlanEnum } from '../tenants/entities/tenant.entity';
import {
  MODULE_REGISTRY,
  modulesForPlan,
  resolveModules,
} from '../modules/module-registry';
import {
  SaasModulePrice,
  SaasPayment,
  SaasPaymentStatusEnum,
  SaasPlan,
} from './entities/saas.entities';

/** Lo que un cliente paga al mes, desglosado. */
export interface Cobro {
  plan: { key: string; name: string; precio: number };
  extras: { key: string; name: string; precio: number }[];
  total: number;
  moneda: string;
}

@Injectable()
export class SaasService {
  constructor(
    @InjectRepository(SaasPlan)
    private readonly planRepo: Repository<SaasPlan>,
    @InjectRepository(SaasModulePrice)
    private readonly precioRepo: Repository<SaasModulePrice>,
    @InjectRepository(SaasPayment)
    private readonly pagoRepo: Repository<SaasPayment>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
  ) {}

  // ─── Planes ─────────────────────────────────────────────────

  planes(): Promise<SaasPlan[]> {
    return this.planRepo.find({ order: { sortOrder: 'ASC' } });
  }

  /**
   * Da de alta un paquete comercial.
   *
   * Un plan nuevo no inventa un nivel: elige uno de los tres que existen y
   * recorta dentro de él. Lo contrario obligaría a tocar el enum, el guard y
   * las reglas de licencia cada vez que comercial quiere probar una oferta.
   */
  async crearPlan(dto: Partial<SaasPlan>): Promise<SaasPlan> {
    const key = (dto.key ?? '').trim().toUpperCase();
    if (!/^[A-Z0-9_]{3,20}$/.test(key)) {
      throw new BadRequestException(
        'La clave va en mayúsculas, sin espacios, de 3 a 20 caracteres',
      );
    }
    if (await this.planRepo.findOne({ where: { key } })) {
      throw new BadRequestException(`Ya existe un plan con la clave ${key}`);
    }
    const tier = this.nivelValido(dto.tier);
    const plan = this.planRepo.create({
      key,
      tier,
      name: dto.name?.trim() || key,
      description: dto.description ?? null,
      monthlyPrice: dto.monthlyPrice ?? 0,
      currency: dto.currency ?? 'MXN',
      isActive: dto.isActive ?? true,
      sortOrder: dto.sortOrder ?? 99,
      includedModules: this.modulosDelNivel(dto.includedModules, tier),
      isSystem: false,
    });
    return this.planRepo.save(plan);
  }

  async guardarPlan(id: string, dto: Partial<SaasPlan>): Promise<SaasPlan> {
    const plan = await this.planRepo.findOne({ where: { id } });
    if (!plan) throw new NotFoundException('Plan no encontrado');

    // De los de sistema solo se retoca la presentación y el precio: su clave
    // es el enum del tenant y su nivel es el que ese enum ya significa.
    if (!plan.isSystem) {
      if (dto.tier) plan.tier = this.nivelValido(dto.tier);
      if (dto.includedModules !== undefined) {
        plan.includedModules = this.modulosDelNivel(
          dto.includedModules,
          plan.tier,
        );
      }
    }
    Object.assign(plan, {
      name: dto.name ?? plan.name,
      description: dto.description ?? plan.description,
      monthlyPrice: dto.monthlyPrice ?? plan.monthlyPrice,
      currency: dto.currency ?? plan.currency,
      isActive: dto.isActive ?? plan.isActive,
      sortOrder: dto.sortOrder ?? plan.sortOrder,
    });
    return this.planRepo.save(plan);
  }

  async eliminarPlan(id: string): Promise<void> {
    const plan = await this.planRepo.findOne({ where: { id } });
    if (!plan) throw new NotFoundException('Plan no encontrado');
    if (plan.isSystem) {
      throw new BadRequestException(
        'Los planes base no se borran: son los tres niveles del sistema. ' +
          'Retíralo de la venta si ya no lo ofreces.',
      );
    }
    // Un plan con clientes no se borra: se dejarían sin tarifa y el ingreso
    // mensual pasaría a contarlos en cero sin que nadie lo pidiera.
    const enUso = await this.tenantRepo.count({ where: { saasPlanId: id } });
    if (enUso) {
      throw new BadRequestException(
        `Hay ${enUso} cliente(s) con este plan. Cámbialos de plan antes de borrarlo.`,
      );
    }
    await this.planRepo.delete(id);
  }

  private nivelValido(tier?: TenantPlanEnum): TenantPlanEnum {
    const niveles = Object.values(TenantPlanEnum);
    if (tier && niveles.includes(tier)) return tier;
    if (tier) throw new BadRequestException(`Nivel desconocido: ${tier}`);
    return TenantPlanEnum.BASIC;
  }

  /**
   * Recorta la lista a lo que el nivel permite. Vender un módulo que el nivel
   * no alcanza daría un plan que promete algo que el guard no deja abrir.
   */
  private modulosDelNivel(
    modulos: string[] | null | undefined,
    tier: TenantPlanEnum,
  ): string[] | null {
    if (!modulos) return null;
    const permitidos = new Set<string>(modulesForPlan(tier));
    return modulos.filter((k) => permitidos.has(k));
  }

  // ─── Precio por módulo ──────────────────────────────────────

  /** Catálogo de módulos con su precio de add-on, con o sin precio puesto. */
  async preciosDeModulos() {
    const precios = await this.precioRepo.find();
    const porClave = new Map(precios.map((p) => [p.moduleKey, p]));
    return MODULE_REGISTRY.map((m) => ({
      key: m.key,
      name: m.name,
      minPlan: m.minPlan,
      core: !!m.core,
      monthlyPrice: porClave.get(m.key)?.monthlyPrice ?? 0,
      currency: porClave.get(m.key)?.currency ?? 'MXN',
    }));
  }

  async guardarPrecioModulo(
    moduleKey: string,
    monthlyPrice: number,
  ): Promise<SaasModulePrice> {
    if (!MODULE_REGISTRY.some((m) => m.key === moduleKey)) {
      throw new BadRequestException(`Módulo desconocido: ${moduleKey}`);
    }
    // Un importe ausente o basura se rechaza en vez de guardarse: dejarlo pasar
    // lo convertía en cero y el módulo se regalaba sin que nadie lo notara.
    const precio = Number(monthlyPrice);
    if (!Number.isFinite(precio) || precio < 0) {
      throw new BadRequestException('El precio mensual debe ser un número ≥ 0');
    }
    monthlyPrice = precio;
    const existente = await this.precioRepo.findOne({ where: { moduleKey } });
    if (existente) {
      existente.monthlyPrice = monthlyPrice;
      return this.precioRepo.save(existente);
    }
    return this.precioRepo.save(
      this.precioRepo.create({ moduleKey, monthlyPrice }),
    );
  }

  // ─── Ficha del cliente ──────────────────────────────────────

  private async tenant(id: string): Promise<Tenant> {
    const t = await this.tenantRepo.findOne({ where: { id } });
    if (!t) throw new NotFoundException('Cliente no encontrado');
    return t;
  }

  /**
   * Qué paga este cliente al mes: el plan más los módulos que contrató por
   * encima de él. Se calcula al vuelo y no se guarda, para que un cambio de
   * tarifa se refleje sin tener que reescribir a los clientes.
   */
  async cobroMensual(tenantId: string): Promise<Cobro> {
    const t = await this.tenant(tenantId);
    const [planes, precios] = await Promise.all([
      this.planes(),
      this.precioRepo.find(),
    ]);
    // El paquete contratado manda sobre el nivel: dos clientes en el mismo
    // nivel pueden pagar distinto porque compraron paquetes distintos. El
    // nivel solo decide la tarifa de quien todavía no tiene paquete asignado.
    const plan =
      planes.find((p) => p.id === t.saasPlanId) ??
      planes.find((p) => p.key === t.plan);
    const incluidos = new Set(modulesForPlan(t.plan));
    const porClave = new Map(precios.map((p) => [p.moduleKey, p.monthlyPrice]));

    const extras = (t.extraModules ?? [])
      // Un módulo que el plan ya incluye no se cobra dos veces, aunque
      // alguien lo haya marcado como extra por error.
      .filter((k) => !incluidos.has(k as never))
      .map((k) => ({
        key: k,
        name: MODULE_REGISTRY.find((m) => m.key === k)?.name ?? k,
        precio: porClave.get(k) ?? 0,
      }));

    const precioPlan = plan?.monthlyPrice ?? 0;
    return {
      plan: {
        key: plan?.key ?? t.plan,
        name: plan?.name ?? t.plan,
        precio: precioPlan,
      },
      extras,
      total: precioPlan + extras.reduce((a, e) => a + e.precio, 0),
      moneda: plan?.currency ?? 'MXN',
    };
  }

  /** Todo lo que el portal muestra de un cliente en una sola llamada. */
  async ficha(tenantId: string) {
    const t = await this.tenant(tenantId);
    const [cobro, pagos] = await Promise.all([
      this.cobroMensual(tenantId),
      this.pagos(tenantId),
    ]);
    const activos = resolveModules(t.plan, t.enabledModules);

    const pagados = pagos.filter(
      (p) => p.status === SaasPaymentStatusEnum.PAGADO,
    );
    const vencidos = pagos.filter((p) => this.vencido(p));

    return {
      tenant: t,
      cobro,
      modulos: {
        activos: activos.length,
        incluidosEnPlan: modulesForPlan(t.plan).length,
        extras: t.extraModules ?? [],
      },
      // Se marca cuál está vencido en vez de reescribir su estado: el dato
      // guardado sigue siendo lo que alguien capturó, y la lista no contradice
      // al adeudo de arriba.
      pagos: pagos.map((p) => ({ ...p, vencido: this.vencido(p) })),
      resumen: {
        // Lo que de verdad se ha cobrado, no lo facturado.
        totalPagado: pagados.reduce((a, p) => a + p.amount, 0),
        mesesPagados: pagados.length,
        vencidos: vencidos.length,
        adeudo: vencidos.reduce((a, p) => a + p.amount, 0),
        ultimoPago: pagados.length ? pagados[0].paidAt : null,
        antiguedadMeses: this.antiguedad(t.subscriptionStart),
      },
    };
  }

  /**
   * Un cobro está vencido si se marcó así, o si sigue pendiente y ya pasó su
   * fecha límite. Se calcula al leer en vez de dejarlo a un proceso nocturno:
   * un adeudo que solo aparece si alguien recuerda marcarlo no sirve de nada.
   */
  private vencido(p: SaasPayment): boolean {
    if (p.status === SaasPaymentStatusEnum.VENCIDO) return true;
    if (p.status !== SaasPaymentStatusEnum.PENDIENTE || !p.dueDate) return false;
    return new Date(`${p.dueDate}T23:59:59`) < new Date();
  }

  private antiguedad(desde: string | null): number | null {
    if (!desde) return null;
    const inicio = new Date(`${desde}T12:00:00`);
    const hoy = new Date();
    return Math.max(
      0,
      (hoy.getFullYear() - inicio.getFullYear()) * 12 +
        (hoy.getMonth() - inicio.getMonth()),
    );
  }

  async guardarFicha(tenantId: string, dto: Partial<Tenant>): Promise<Tenant> {
    const t = await this.tenant(tenantId);
    if (dto.saasPlanId !== undefined) await this.asignarPlan(t, dto.saasPlanId);
    Object.assign(t, {
      contactName: dto.contactName ?? t.contactName,
      contactEmail: dto.contactEmail ?? t.contactEmail,
      contactPhone: dto.contactPhone ?? t.contactPhone,
      rfc: dto.rfc ?? t.rfc,
      billingEmail: dto.billingEmail ?? t.billingEmail,
      address: dto.address ?? t.address,
      notes: dto.notes ?? t.notes,
      subscriptionStart: dto.subscriptionStart ?? t.subscriptionStart,
      billingDay: dto.billingDay ?? t.billingDay,
    });
    // Los extras se reaplican aunque no vengan en la petición: cambiar de plan
    // reescribe la lista de módulos, y sin esto el cliente perdería lo que
    // contrató aparte —y se le seguiría cobrando.
    const extras = dto.extraModules ?? t.extraModules;
    if (extras) this.contratarExtras(t, extras);
    return this.tenantRepo.save(t);
  }

  /**
   * Pone al cliente en un paquete comercial.
   *
   * Cambiar de plan no es solo cambiar de precio: mueve el nivel técnico y,
   * si el paquete trae su propia lista, los módulos con los que opera. Se hace
   * aquí y no en un `Object.assign` porque son tres campos que deben moverse
   * juntos o el cliente acaba pagando un plan y usando otro.
   */
  private async asignarPlan(t: Tenant, planId: string | null): Promise<void> {
    if (!planId) {
      t.saasPlanId = null;
      return;
    }
    const plan = await this.planRepo.findOne({ where: { id: planId } });
    if (!plan) throw new NotFoundException('Plan no encontrado');

    t.saasPlanId = plan.id;
    t.plan = plan.tier;
    if (plan.includedModules) {
      t.enabledModules = plan.includedModules;
    } else if (t.enabledModules) {
      // Sin lista propia el paquete da todo su nivel; lo que el cliente tenía
      // apagado se respeta, salvo lo que el nivel nuevo ya no alcanza.
      const permitidos = new Set<string>(modulesForPlan(plan.tier));
      t.enabledModules = t.enabledModules.filter((k) => permitidos.has(k));
    }
  }

  /**
   * Contrata módulos fuera del plan y los deja funcionando.
   *
   * `extra_modules` por sí solo sería un dato que no cambia nada: quien decide
   * si una pantalla abre es `enabledModules`, que ya admite excepciones por
   * encima del plan. Así que al cobrarlos se encienden, y al quitarlos se
   * apagan —de lo contrario el cliente seguiría usando lo que dejó de pagar.
   *
   * Si el tenant no tenía lista explícita (que significa "todo lo del plan"),
   * aquí se materializa: es el precio de poder añadir algo que el plan no trae.
   */
  private contratarExtras(t: Tenant, extras: string[]): void {
    const desconocido = extras.find(
      (k) => !MODULE_REGISTRY.some((m) => m.key === k),
    );
    if (desconocido) {
      throw new BadRequestException(`Módulo desconocido: ${desconocido}`);
    }

    const antes = new Set(t.extraModules ?? []);
    const ahora = new Set(extras);
    const base = new Set<string>(
      t.enabledModules ?? modulesForPlan(t.plan),
    );

    for (const k of ahora) base.add(k);
    // Los que se dieron de baja solo se apagan si el plan no los incluía ya.
    const delPlan = new Set<string>(modulesForPlan(t.plan));
    for (const k of antes) {
      if (!ahora.has(k) && !delPlan.has(k)) base.delete(k);
    }

    t.extraModules = extras;
    t.enabledModules = MODULE_REGISTRY.filter((m) => base.has(m.key)).map(
      (m) => m.key,
    );
  }

  // ─── Cobros ─────────────────────────────────────────────────

  pagos(tenantId: string): Promise<SaasPayment[]> {
    return this.pagoRepo.find({
      where: { tenantId },
      order: { period: 'DESC' },
    });
  }

  async registrarPago(
    tenantId: string,
    dto: Partial<SaasPayment>,
  ): Promise<SaasPayment> {
    await this.tenant(tenantId);
    if (!dto.period || !/^\d{4}-\d{2}$/.test(dto.period)) {
      throw new BadRequestException('El periodo va como AAAA-MM');
    }
    const existente = await this.pagoRepo.findOne({
      where: { tenantId, period: dto.period },
    });
    // El periodo es único por cliente: si ya existe se actualiza en vez de
    // fallar, que es lo que se espera al corregir un cobro.
    const pago = existente ?? this.pagoRepo.create({ tenantId });
    Object.assign(pago, {
      period: dto.period,
      amount: dto.amount ?? pago.amount ?? 0,
      currency: dto.currency ?? pago.currency ?? 'MXN',
      status: dto.status ?? pago.status ?? SaasPaymentStatusEnum.PENDIENTE,
      dueDate: dto.dueDate ?? pago.dueDate ?? null,
      method: dto.method ?? pago.method ?? null,
      reference: dto.reference ?? pago.reference ?? null,
      concept: dto.concept ?? pago.concept ?? null,
      notes: dto.notes ?? pago.notes ?? null,
      // La fecha de pago la pone el sistema al marcarlo pagado, para que no
      // dependa de que quien registra se acuerde de capturarla.
      paidAt:
        dto.status === SaasPaymentStatusEnum.PAGADO
          ? (dto.paidAt ?? pago.paidAt ?? new Date())
          : null,
    });
    return this.pagoRepo.save(pago);
  }

  async eliminarPago(id: string): Promise<void> {
    await this.pagoRepo.delete(id);
  }

  /**
   * Panorama del negocio: cuánto se factura al mes y quién debe.
   * Es lo primero que quiere ver quien administra el SaaS.
   */
  async panorama() {
    const tenants = await this.tenantRepo.find();
    const activos = tenants.filter((t) => t.isActive);
    let recurrente = 0;
    for (const t of activos) {
      recurrente += (await this.cobroMensual(t.id)).total;
    }
    const vencidos = (
      await this.pagoRepo.find({
        where: [
          { status: SaasPaymentStatusEnum.VENCIDO },
          { status: SaasPaymentStatusEnum.PENDIENTE },
        ],
      })
    ).filter((p) => this.vencido(p));
    return {
      clientes: tenants.length,
      activos: activos.length,
      suspendidos: tenants.length - activos.length,
      ingresoMensual: recurrente,
      adeudoTotal: vencidos.reduce((a, p) => a + p.amount, 0),
      clientesConAdeudo: new Set(vencidos.map((p) => p.tenantId)).size,
    };
  }
}
