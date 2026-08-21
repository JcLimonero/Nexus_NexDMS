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
import { PALETAS, paletaPorId } from '../tenants/branding.paletas';
import { StorageService } from '../../common/storage/storage.service';
import { ConfigService } from '@nestjs/config';
import {
  BillingBlockState,
  BillingStatusService,
} from './billing-status.service';
import { ConektaService, CheckoutSalida } from './conekta.service';

export interface ResumenCobroCliente {
  tenantId: string;
  ultimoPago: { period: string; status: string; vencido: boolean } | null;
  proximoCobro: string | null;
}

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
    private readonly storage: StorageService,
    private readonly config: ConfigService,
    private readonly billing: BillingStatusService,
    private readonly conekta: ConektaService,
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
   * Valida que sean módulos reales del catálogo. Un plan a la medida puede
   * incluir cualquier módulo, sin importar el nivel técnico de origen.
   */
  private modulosDelNivel(
    modulos: string[] | null | undefined,
    _tier: TenantPlanEnum,
  ): string[] | null {
    if (!modulos) return null;
    const validos = new Set<string>(MODULE_REGISTRY.map((m) => m.key));
    return modulos.filter((k) => validos.has(k));
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
  /**
   * Marca del cliente: su paleta y su logotipo.
   *
   * Se devuelve la paleta resuelta y no solo su identificador, para que quien
   * pinte —el DMS, el portal del mostrador, un PDF— no tenga que conocer el
   * catálogo ni quedarse sin colores si el identificador guardado ya no existe.
   */
  async branding(tenantId: string) {
    const t = await this.tenant(tenantId);
    return {
      paletaId: t.palette,
      paleta: paletaPorId(t.palette),
      logoKey: t.logoKey,
      logoUrl: t.logoKey ? await this.ligaDeLogo(t.logoKey) : null,
      iconKey: t.iconKey,
      iconUrl: t.iconKey ? await this.ligaDeLogo(t.iconKey) : null,
    };
  }

  /** Liga temporal del logotipo; el bucket es privado. */
  private async ligaDeLogo(key: string): Promise<string | null> {
    try {
      return await this.storage.getSignedUrl(key, 24 * 3600);
    } catch {
      // Sin almacenamiento la aplicación sigue viva y sin logotipo, que es
      // preferible a una pantalla que no carga por una imagen.
      return null;
    }
  }

  async guardarBranding(
    tenantId: string,
    dto: {
      paletaId?: string;
      logoKey?: string | null;
      iconKey?: string | null;
    },
  ) {
    const t = await this.tenant(tenantId);
    if (dto.paletaId !== undefined) {
      // Se valida contra el catálogo: un identificador inventado dejaría al
      // cliente con la paleta por omisión sin que nadie entienda por qué.
      if (!PALETAS.some((p) => p.id === dto.paletaId)) {
        throw new BadRequestException(`La paleta "${dto.paletaId}" no existe`);
      }
      t.palette = dto.paletaId;
    }
    if (dto.logoKey !== undefined) t.logoKey = dto.logoKey;
    if (dto.iconKey !== undefined) t.iconKey = dto.iconKey;
    await this.tenantRepo.save(t);
    return this.branding(tenantId);
  }

  /** Sube el logotipo (horizontal) del cliente y lo deja asignado. */
  async subirLogo(tenantId: string, file: Express.Multer.File) {
    const key = await this.subirImagenBranding(tenantId, file, 'logo');
    return this.guardarBranding(tenantId, { logoKey: key });
  }

  /** Sube el isotipo (cuadrado) del cliente y lo deja asignado. */
  async subirIcono(tenantId: string, file: Express.Multer.File) {
    const key = await this.subirImagenBranding(tenantId, file, 'icon');
    return this.guardarBranding(tenantId, { iconKey: key });
  }

  private async subirImagenBranding(
    tenantId: string,
    file: Express.Multer.File,
    tipo: 'logo' | 'icon',
  ): Promise<string> {
    if (!file) throw new BadRequestException('Archivo requerido');
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('El archivo debe ser una imagen');
    }
    return this.storage.upload(
      file.buffer,
      `branding/${tenantId}/${tipo}-${Date.now()}`,
      file.mimetype,
    );
  }

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

    // Bases de cada portal (config por despliegue); la liga de cada cliente
    // cuelga de su slug: `<base>/<slug>`.
    const bases = {
      dms: this.config.get<string>('WEB_APP_URL', 'http://app.localhost'),
      recepcion: this.config.get<string>(
        'RECEPCION_APP_URL',
        'http://recepcion.localhost',
      ),
      tecnico: this.config.get<string>('PWA_APP_URL', 'http://pwa.localhost'),
    };
    const liga = (base: string) => (t.slug ? `${base}/${t.slug}` : base);
    return {
      tenant: t,
      cobro,
      // Liga de acceso del cliente por portal.
      accessUrl: liga(bases.dms),
      accessUrls: {
        dms: liga(bases.dms),
        recepcion: liga(bases.recepcion),
        tecnico: liga(bases.tecnico),
      },
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
      // Identidad del cliente: antes se editaba en un diálogo aparte; ahora
      // vive en la misma ficha, así que la ficha también la guarda.
      name: dto.name?.trim() || t.name,
      slug: dto.slug?.trim() || t.slug,
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
    const guardado = await this.pagoRepo.save(pago);
    // El estado de bloqueo se cachea unos segundos; un cobro que cambia debe
    // reflejarse ya (p. ej. reactivar a quien acaba de pagar).
    this.billing.invalidar(tenantId);
    return guardado;
  }

  async eliminarPago(id: string): Promise<void> {
    const pago = await this.pagoRepo.findOne({ where: { id } });
    await this.pagoRepo.delete(id);
    if (pago) this.billing.invalidar(pago.tenantId);
  }

  // ─── Cobro en línea (Conekta) ───────────────────────────────

  /**
   * Arranca el pago en línea del adeudo del cliente: crea la orden en la
   * pasarela y devuelve a dónde mandarlo. Cobra exactamente lo vencido; si no
   * hay nada vencido, no hay pago que iniciar.
   */
  async iniciarCheckout(tenantId: string): Promise<CheckoutSalida> {
    const t = await this.tenant(tenantId);
    const estado = await this.billing.estado(tenantId);
    if (estado.adeudo <= 0 || estado.periodosVencidos.length === 0) {
      throw new BadRequestException('No tienes adeudos vencidos por pagar.');
    }
    const base = this.config.get<string>('WEB_APP_URL', 'http://app.localhost');
    const liga = t.slug ? `${base}/${t.slug}/pago` : `${base}/pago`;
    return this.conekta.crearCheckout({
      tenantId,
      monto: estado.adeudo,
      periodos: estado.periodosVencidos,
      cliente: {
        nombre: t.name,
        email: t.billingEmail || t.contactEmail || '',
        telefono: t.contactPhone || undefined,
      },
      successUrl: `${liga}?pago=ok`,
      failureUrl: `${liga}?pago=error`,
    });
  }

  /**
   * Confirma un pago desde el webhook de Conekta. No se cree al webhook: se
   * vuelve a consultar la orden a la pasarela y solo si responde "pagada" se
   * dan por saldados los periodos que cubría.
   */
  async confirmarPagoConekta(orderId: string): Promise<void> {
    const r = await this.conekta.confirmarOrden(orderId);
    if (!r.pagada || !r.tenantId) return;
    for (const period of r.periodos) {
      const pago = await this.pagoRepo.findOne({
        where: { tenantId: r.tenantId, period },
      });
      if (!pago) continue;
      pago.status = SaasPaymentStatusEnum.PAGADO;
      pago.paidAt = new Date();
      pago.method = 'conekta';
      pago.reference = r.referencia;
      await this.pagoRepo.save(pago);
    }
    this.billing.invalidar(r.tenantId);
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
    // Aviso a Nexus: qué clientes están en solo-lectura o ya bloqueados por
    // el reloj del impago, para actuar antes de que reclamen. El estado lo
    // deriva el mismo motor que aplica el bloqueo, así el panel no miente.
    const conAdeudo = [...new Set(vencidos.map((p) => p.tenantId))];
    const morosos = (
      await Promise.all(
        conAdeudo.map(async (id) => {
          const t = tenants.find((x) => x.id === id);
          const e = await this.billing.estado(id);
          return {
            tenantId: id,
            nombre: t?.name ?? '',
            slug: t?.slug ?? '',
            estado: e.estado,
            diasMora: e.diasMora,
            diasParaBloqueo: e.diasParaBloqueo,
            adeudo: e.adeudo,
            suspendidoManual: t ? !t.isActive : false,
          };
        }),
      )
    ).sort((a, b) => b.diasMora - a.diasMora);

    return {
      clientes: tenants.length,
      activos: activos.length,
      suspendidos: tenants.length - activos.length,
      ingresoMensual: recurrente,
      adeudoTotal: vencidos.reduce((a, p) => a + p.amount, 0),
      clientesConAdeudo: conAdeudo.length,
      enSoloLectura: morosos.filter(
        (m) => m.estado === BillingBlockState.SOLO_LECTURA,
      ).length,
      bloqueadosPorPago: morosos.filter(
        (m) => m.estado === BillingBlockState.BLOQUEADO,
      ).length,
      morosos,
    };
  }

  /**
   * Resumen de cobro por cliente para la lista: cómo va su último pago y
   * cuándo le toca el siguiente. El "próximo" es la fecha límite del pendiente
   * más cercano; si no hay pendientes, el siguiente día de cobro según su
   * `billingDay`.
   */
  async resumenCobros(): Promise<ResumenCobroCliente[]> {
    const tenants = await this.tenantRepo.find();
    const salida: ResumenCobroCliente[] = [];
    for (const t of tenants) {
      const pagos = await this.pagoRepo.find({
        where: { tenantId: t.id },
        order: { period: 'DESC' },
      });
      const ultimo = pagos[0] ?? null;
      const pendientes = pagos
        .filter(
          (p) =>
            p.status === SaasPaymentStatusEnum.PENDIENTE ||
            p.status === SaasPaymentStatusEnum.VENCIDO,
        )
        .filter((p) => !!p.dueDate)
        .sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1));
      const proximoCobro =
        pendientes[0]?.dueDate ??
        (t.billingDay ? this.proximoDiaCobro(t.billingDay) : null);
      salida.push({
        tenantId: t.id,
        ultimoPago: ultimo
          ? {
              period: ultimo.period,
              status: ultimo.status,
              vencido: this.vencido(ultimo),
            }
          : null,
        proximoCobro,
      });
    }
    return salida;
  }

  /** Siguiente fecha con día de mes = `dia`, hoy o en el futuro (AAAA-MM-DD). */
  private proximoDiaCobro(dia: number): string {
    const hoy = new Date();
    let y = hoy.getFullYear();
    let m = hoy.getMonth();
    if (hoy.getDate() > dia) {
      m++;
      if (m > 11) {
        m = 0;
        y++;
      }
    }
    // Un mes corto (feb) recorta el día al último disponible.
    const finDeMes = new Date(y, m + 1, 0).getDate();
    const d = Math.min(dia, finDeMes);
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
}
