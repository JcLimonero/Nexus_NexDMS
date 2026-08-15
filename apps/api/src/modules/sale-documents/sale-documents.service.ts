import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import { StorageService } from '../../common/storage/storage.service';
import {
  SaleDocument,
  SaleDocumentRule,
  SaleDocumentScopeEnum,
  SaleDocumentStatusEnum,
  SaleDocumentType,
} from './entities/sale-document.entities';
import { UnitSale } from '../unit-sales/entities/unit-sale.entity';
import { Client } from '../clients/entities/client.entity';
import { ClientDocument } from '../documents/entities/client-document.entity';
import { CatalogUnit } from '../catalog-units/entities/catalog-unit.entity';

/** Un requisito ya resuelto: qué se pide y con qué está (o no) cumplido. */
export interface RequisitoResuelto {
  documentTypeId: string;
  key: string;
  name: string;
  scope: SaleDocumentScopeEnum;
  hasExpiration: boolean;
  required: boolean;
  /** Documento que lo cumple, si hay uno. */
  cumplido: {
    id: string;
    origen: 'CLIENTE' | 'VENTA';
    status: string;
    /** Vencido: el tipo caduca y la fecha ya pasó. */
    vencido: boolean;
    expirationDate: string | null;
    createdAt: Date;
  } | null;
}

@Injectable()
export class SaleDocumentsService {
  constructor(
    @InjectRepository(SaleDocumentType)
    private readonly typeRepo: Repository<SaleDocumentType>,
    @InjectRepository(SaleDocumentRule)
    private readonly ruleRepo: Repository<SaleDocumentRule>,
    @InjectRepository(SaleDocument)
    private readonly docRepo: Repository<SaleDocument>,
    @InjectRepository(UnitSale)
    private readonly saleRepo: Repository<UnitSale>,
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
    @InjectRepository(ClientDocument)
    private readonly clientDocRepo: Repository<ClientDocument>,
    @InjectRepository(CatalogUnit)
    private readonly catalogRepo: Repository<CatalogUnit>,
    private readonly storage: StorageService,
  ) {}

  // ─── Catálogo de tipos ───────────────────────────

  tipos(tenantId: string) {
    return this.typeRepo.find({
      where: { tenantId },
      order: { sortOrder: 'ASC' },
    });
  }

  async guardarTipo(tenantId: string, dto: Partial<SaleDocumentType>) {
    if (dto.id) {
      const t = await this.typeRepo.findOne({ where: { id: dto.id, tenantId } });
      if (!t) throw new NotFoundException('Tipo de documento no encontrado');
      Object.assign(t, dto, { id: t.id, tenantId });
      return this.typeRepo.save(t);
    }
    if (!dto.key || !dto.name) {
      throw new BadRequestException('Clave y nombre son requeridos');
    }
    return this.typeRepo.save(
      this.typeRepo.create({ ...dto, id: undefined, tenantId }),
    );
  }

  async eliminarTipo(tenantId: string, id: string) {
    const t = await this.typeRepo.findOne({ where: { id, tenantId } });
    if (!t) throw new NotFoundException('Tipo de documento no encontrado');
    // Si ya se subió un documento de este tipo a alguna venta, no se borra: se
    // desactiva, para no dejar archivos colgando de un tipo inexistente.
    const usados = await this.docRepo.count({ where: { documentTypeId: id } });
    if (usados > 0) {
      t.isActive = false;
      await this.typeRepo.save(t);
      return { ok: true, desactivado: true };
    }
    await this.typeRepo.remove(t); // las reglas caen por la FK en cascada
    return { ok: true, desactivado: false };
  }

  // ─── Matriz de reglas ────────────────────────────

  reglas(tenantId: string) {
    return this.ruleRepo.find({
      where: { tenantId },
      relations: ['documentType'],
    });
  }

  async guardarRegla(tenantId: string, dto: Partial<SaleDocumentRule>) {
    if (!dto.documentTypeId) {
      throw new BadRequestException('Falta el tipo de documento');
    }
    const tipo = await this.typeRepo.findOne({
      where: { id: dto.documentTypeId, tenantId },
    });
    if (!tipo) throw new BadRequestException('El tipo de documento no existe');

    if (dto.id) {
      const r = await this.ruleRepo.findOne({ where: { id: dto.id, tenantId } });
      if (!r) throw new NotFoundException('Regla no encontrada');
      Object.assign(r, dto, { id: r.id, tenantId });
      return this.ruleRepo.save(r);
    }
    return this.ruleRepo.save(
      this.ruleRepo.create({
        ...dto,
        id: undefined,
        tenantId,
        // Los ejes vacíos se normalizan a null = "cualquiera".
        clientType: dto.clientType || null,
        financingType: dto.financingType || null,
        vehicleType: dto.vehicleType || null,
      }),
    );
  }

  async eliminarRegla(tenantId: string, id: string) {
    const r = await this.ruleRepo.findOne({ where: { id, tenantId } });
    if (!r) throw new NotFoundException('Regla no encontrada');
    await this.ruleRepo.remove(r);
    return { ok: true };
  }

  // ─── Expediente de una venta ─────────────────────

  /**
   * Los tres ejes de una venta: a quién, cómo y qué.
   *
   * Se leen de la venta y de sus relaciones, no se piden al cliente: quien
   * consulta el expediente no debería poder decir "trátalo como contado" para
   * saltarse el comprobante de ingresos.
   */
  private async ejesDeLaVenta(venta: UnitSale) {
    const cliente = await this.clientRepo.findOne({
      where: { id: venta.clientId },
    });
    const unidad = await this.catalogRepo.findOne({
      where: { id: venta.catalogUnitId },
    });
    return {
      clientType: cliente?.clientType ?? null,
      financingType: venta.financingType ?? null,
      vehicleType: unidad?.vehicleType ?? null,
    };
  }

  /** Reglas que aplican a esos ejes (una regla con eje null aplica a todos). */
  private aplican(
    reglas: SaleDocumentRule[],
    ejes: { clientType: unknown; financingType: unknown; vehicleType: unknown },
  ): SaleDocumentRule[] {
    return reglas.filter(
      (r) =>
        (!r.clientType || r.clientType === ejes.clientType) &&
        (!r.financingType || r.financingType === ejes.financingType) &&
        (!r.vehicleType || r.vehicleType === ejes.vehicleType),
    );
  }

  private estaVencido(hasExpiration: boolean, fecha: string | null): boolean {
    if (!hasExpiration || !fecha) return false;
    // Se compara por fecha local del taller, no por instante: un documento
    // vence al terminar su día, no a medianoche UTC.
    return new Date(`${fecha}T23:59:59`) < new Date();
  }

  /**
   * El expediente resuelto de una venta.
   *
   * Une la matriz que aplica a sus ejes con lo que ya se subió, y marca cada
   * requisito como cumplido o no. Un requisito de ámbito cliente se cumple con
   * un documento del expediente del cliente; uno de venta, con uno de la venta.
   */
  async expediente(user: UserPayload, unitSaleId: string) {
    const venta = await this.saleRepo.findOne({
      where: { id: unitSaleId, tenantId: user.tenantId },
    });
    if (!venta) throw new NotFoundException('Venta no encontrada');

    const ejes = await this.ejesDeLaVenta(venta);
    const reglas = this.aplican(
      await this.ruleRepo.find({
        where: { tenantId: user.tenantId },
        relations: ['documentType'],
      }),
      ejes,
    );

    // Solo tipos activos: una regla puede referir un tipo que luego se apagó.
    const porTipo = new Map<string, SaleDocumentRule>();
    for (const r of reglas) {
      if (!r.documentType?.isActive) continue;
      // Si un tipo cae en dos reglas, basta que una lo exija.
      const previa = porTipo.get(r.documentTypeId);
      if (!previa || (r.isRequired && !previa.isRequired)) {
        porTipo.set(r.documentTypeId, r);
      }
    }

    const tipos = [...porTipo.values()].map((r) => r.documentType!);
    const deVenta = await this.docRepo.find({ where: { unitSaleId } });
    // Documentos del cliente, para cumplir los de ámbito cliente. Se cruzan por
    // la clave del tipo, que es la que guarda `client_documents.document_type`.
    const clienteDocs = await this.clientDocRepo.find({
      where: { clientId: venta.clientId, tenantId: user.tenantId },
    });

    const requisitos: RequisitoResuelto[] = [...porTipo.values()]
      .map((regla) => {
        const t = regla.documentType!;
        let cumplido: RequisitoResuelto['cumplido'] = null;

        if (t.scope === SaleDocumentScopeEnum.SALE) {
          // El más reciente de la venta para ese tipo.
          const d = deVenta
            .filter((x) => x.documentTypeId === t.id)
            .sort((a, b) => +b.createdAt - +a.createdAt)[0];
          if (d) {
            cumplido = {
              id: d.id,
              origen: 'VENTA',
              status: d.status,
              vencido: this.estaVencido(t.hasExpiration, d.expirationDate),
              expirationDate: d.expirationDate,
              createdAt: d.createdAt,
            };
          }
        } else {
          const d = clienteDocs
            .filter((x) => x.documentType === t.key)
            .sort((a, b) => +b.createdAt - +a.createdAt)[0];
          if (d) {
            cumplido = {
              id: d.id,
              origen: 'CLIENTE',
              status: d.status,
              // `client_documents` no guarda vencimiento; se toma como vigente.
              vencido: false,
              expirationDate: null,
              createdAt: d.createdAt,
            };
          }
        }

        return {
          documentTypeId: t.id,
          key: t.key,
          name: t.name,
          scope: t.scope,
          hasExpiration: t.hasExpiration,
          required: regla.isRequired,
          cumplido,
        };
      })
      .sort(
        (a, b) =>
          (this.ordenDe(tipos, a.documentTypeId) ?? 0) -
          (this.ordenDe(tipos, b.documentTypeId) ?? 0),
      );

    // Falta un obligatorio si no hay documento, o el que hay está rechazado o
    // vencido. Aprobado o pendiente cuenta como presente: la revisión es otro
    // paso, no impide juntar el expediente.
    const faltantes = requisitos.filter(
      (r) =>
        r.required &&
        (!r.cumplido ||
          r.cumplido.status === 'REJECTED' ||
          r.cumplido.vencido),
    );

    return {
      venta: { id: venta.id, folio: venta.folio, status: venta.status },
      ejes,
      requisitos,
      completo: faltantes.length === 0,
      faltan: faltantes.map((r) => r.name),
    };
  }

  private ordenDe(tipos: SaleDocumentType[], id: string): number | undefined {
    return tipos.find((t) => t.id === id)?.sortOrder;
  }

  // ─── Subir / revisar documentos de la venta ──────

  async subir(
    user: UserPayload,
    unitSaleId: string,
    documentTypeId: string,
    file: Express.Multer.File,
    expirationDate?: string,
  ) {
    if (!file) throw new BadRequestException('Archivo requerido');
    const venta = await this.saleRepo.findOne({
      where: { id: unitSaleId, tenantId: user.tenantId },
    });
    if (!venta) throw new NotFoundException('Venta no encontrada');

    const tipo = await this.typeRepo.findOne({
      where: { id: documentTypeId, tenantId: user.tenantId },
    });
    if (!tipo) throw new BadRequestException('Tipo de documento no válido');
    // Un tipo de ámbito cliente se sube a su expediente, no a la venta: aquí
    // se rechaza para no partir en dos el mismo documento.
    if (tipo.scope === SaleDocumentScopeEnum.CLIENT) {
      throw new BadRequestException(
        'Este documento es del expediente del cliente; súbelo desde su ficha',
      );
    }

    const key = await this.storage.upload(
      file.buffer,
      `ventas/${unitSaleId}/${tipo.key}-${Date.now()}`,
      file.mimetype,
    );

    // Volver a subir reemplaza el anterior de ese tipo: el expediente muestra
    // el vigente, no una pila de intentos.
    const previos = await this.docRepo.find({
      where: { unitSaleId, documentTypeId },
    });
    for (const p of previos) {
      await this.storage.delete(p.storageKey).catch(() => undefined);
      await this.docRepo.remove(p);
    }

    return this.docRepo.save(
      this.docRepo.create({
        tenantId: user.tenantId,
        unitSaleId,
        documentTypeId,
        name: file.originalname || tipo.name,
        storageKey: key,
        mimeType: file.mimetype,
        sizeBytes: file.size ?? file.buffer.length,
        status: SaleDocumentStatusEnum.PENDING,
        expirationDate: tipo.hasExpiration ? (expirationDate ?? null) : null,
      }),
    );
  }

  async ligaDescarga(user: UserPayload, id: string) {
    const d = await this.docRepo.findOne({
      where: { id, tenantId: user.tenantId },
    });
    if (!d) throw new NotFoundException('Documento no encontrado');
    return { url: await this.storage.getSignedUrl(d.storageKey) };
  }

  async revisar(
    user: UserPayload,
    id: string,
    dto: { status: SaleDocumentStatusEnum; rejectionReason?: string },
  ) {
    const d = await this.docRepo.findOne({
      where: { id, tenantId: user.tenantId },
    });
    if (!d) throw new NotFoundException('Documento no encontrado');
    if (
      dto.status === SaleDocumentStatusEnum.REJECTED &&
      !dto.rejectionReason?.trim()
    ) {
      throw new BadRequestException('El rechazo necesita un motivo');
    }
    d.status = dto.status;
    d.rejectionReason =
      dto.status === SaleDocumentStatusEnum.REJECTED
        ? (dto.rejectionReason ?? null)
        : null;
    d.validatedAt = new Date();
    return this.docRepo.save(d);
  }

  async eliminarDocumento(user: UserPayload, id: string) {
    const d = await this.docRepo.findOne({
      where: { id, tenantId: user.tenantId },
    });
    if (!d) throw new NotFoundException('Documento no encontrado');
    await this.storage.delete(d.storageKey).catch(() => undefined);
    await this.docRepo.remove(d);
    return { ok: true };
  }
}
