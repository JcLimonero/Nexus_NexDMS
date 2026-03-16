# NexDMS — Coding Standards

## Entidad TypeORM estándar

```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
         UpdateDateColumn, DeleteDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';

export enum EstatusOS {
  RECIBIDO = 'RECIBIDO',
  DIAGNOSTICO = 'DIAGNOSTICO',
  EN_PROCESO = 'EN_PROCESO',
  EN_ESPERA_PARTES = 'EN_ESPERA_PARTES',
  LISTO = 'LISTO',
  ENTREGADO = 'ENTREGADO',
  CANCELADO = 'CANCELADO',
}

@Entity('ordenes_servicio')
@Index(['tenantId', 'sucursalId'])
@Index(['tenantId', 'folio'])
export class OrdenServicio {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'sucursal_id' })
  sucursalId: string;

  @Column({ name: 'titular_id' })
  titularId: string;

  @Column({ name: 'vehiculo_id' })
  vehiculoId: string;

  @Column({ name: 'mecanico_id', nullable: true })
  mecanicoId: string | null;

  @Column({ name: 'contacto_recepcion_id', nullable: true })
  contactoRecepcionId: string | null;

  @Column({ name: 'nombre_recepcion', nullable: true })
  nombreRecepcion: string | null;

  @Column({ name: 'telefono_recepcion', nullable: true })
  telefonoRecepcion: string | null;

  @Column()
  folio: string;

  @Column({ type: 'enum', enum: EstatusOS, default: EstatusOS.RECIBIDO })
  estatus: EstatusOS;

  @Column({ name: 'falla_reportada', type: 'text' })
  fallaReportada: string;

  @Column({ type: 'text', nullable: true })
  diagnostico: string | null;

  @Column({ name: 'trabajo_realizado', type: 'text', nullable: true })
  trabajoRealizado: string | null;

  @Column({ name: 'km_entrada' })
  kmEntrada: number;

  @Column({ name: 'km_salida', nullable: true })
  kmSalida: number | null;

  @Column({ name: 'costo_mano_obra', type: 'decimal', precision: 12, scale: 2, default: 0 })
  costoManoObra: number;

  @Column({ name: 'costo_partes', type: 'decimal', precision: 12, scale: 2, default: 0 })
  costoPartes: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  descuento: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total: number;

  @Column({ name: 'fecha_entrada' })
  fechaEntrada: Date;

  @Column({ name: 'fecha_promesa', nullable: true })
  fechaPromesa: Date | null;

  @Column({ name: 'fecha_listo', nullable: true })
  fechaListo: Date | null;

  @Column({ name: 'fecha_entrega', nullable: true })
  fechaEntrega: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}
```

## UserPayload (extraído del JWT)

```typescript
export interface UserPayload {
  sub: string;          // userId
  tenantId: string;
  sucursalId: string;
  marcaId: string | null;
  rol: RolEnum;
  scope: 'SUCURSAL' | 'MARCA' | 'GLOBAL';
  iat: number;
  exp: number;
}
```

## Servicio con scope y transacción

```typescript
@Injectable()
export class TallerService {
  private readonly logger = new Logger(TallerService.name);

  constructor(
    @InjectRepository(OrdenServicio)
    private readonly osRepo: Repository<OrdenServicio>,
    private readonly eventEmitter: EventEmitter2,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(user: UserPayload, filters: FilterOsDto): Promise<PaginatedResponse<OrdenServicio>> {
    const { page = 1, limit = 20 } = filters;
    const qb = this.osRepo.createQueryBuilder('os')
      .where('os.tenant_id = :tenantId', { tenantId: user.tenantId })
      .andWhere('os.deleted_at IS NULL');

    // Aplicar scope
    switch (user.scope) {
      case 'SUCURSAL':
        qb.andWhere('os.sucursal_id = :sid', { sid: user.sucursalId }); break;
      case 'MARCA':
        qb.innerJoin('sucursales', 's', 's.id = os.sucursal_id')
          .andWhere('s.marca_id = :mid', { mid: user.marcaId }); break;
      // GLOBAL: sin filtro adicional
    }

    // Si es mecánico, solo sus OS
    if (user.rol === 'MECANICO') {
      qb.andWhere('os.mecanico_id = :uid', { uid: user.sub });
    }

    const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async create(user: UserPayload, dto: CreateOrdenServicioDto): Promise<OrdenServicio> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const folio = await this.generarFolio(user.tenantId, queryRunner);
      const os = queryRunner.manager.create(OrdenServicio, {
        ...dto,
        tenantId: user.tenantId,
        folio,
        fechaEntrada: new Date(),
      });
      const saved = await queryRunner.manager.save(os);
      await queryRunner.commitTransaction();
      this.eventEmitter.emit('os.creada', new OsCreadaEvent(saved));
      return saved;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error creando OS: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findOneOrFail(id: string, tenantId: string): Promise<OrdenServicio> {
    const os = await this.osRepo.findOne({ where: { id, tenantId } });
    if (!os) throw new NotFoundException(`Orden de servicio ${id} no encontrada`);
    return os;
  }

  private async generarFolio(tenantId: string, qr: QueryRunner): Promise<string> {
    const year = new Date().getFullYear();
    const { count } = await qr.manager
      .createQueryBuilder(OrdenServicio, 'os')
      .select('COUNT(*)', 'count')
      .where('os.tenant_id = :tenantId', { tenantId })
      .andWhere('EXTRACT(YEAR FROM os.created_at) = :year', { year })
      .getRawOne();
    const seq = String(Number(count) + 1).padStart(4, '0');
    return `OS-${year}-${seq}`;
  }
}
```

## Controller con decorators

```typescript
@ApiTags('Taller')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('taller/ordenes')
export class TallerController {
  constructor(private readonly tallerService: TallerService) {}

  @Get()
  @Roles('ADMIN', 'GERENTE_GLOBAL', 'GERENTE_MARCA', 'GERENTE_SUCURSAL', 'MOSTRADOR', 'MECANICO')
  findAll(@CurrentUser() user: UserPayload, @Query() filters: FilterOsDto) {
    return this.tallerService.findAll(user, filters);
  }

  @Post()
  @Roles('ADMIN', 'MOSTRADOR')
  @HttpCode(201)
  create(@CurrentUser() user: UserPayload, @Body() dto: CreateOrdenServicioDto) {
    return this.tallerService.create(user, dto);
  }

  @Post(':id/cambiar-estatus')
  @Roles('ADMIN', 'MOSTRADOR', 'MECANICO', 'GERENTE_SUCURSAL')
  cambiarEstatus(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserPayload,
    @Body() dto: CambiarEstatusDto,
  ) {
    return this.tallerService.cambiarEstatus(id, user, dto);
  }
}
```

## Decoradores custom

```typescript
// current-user.decorator.ts
export const CurrentUser = createParamDecorator(
  (_, ctx: ExecutionContext): UserPayload => ctx.switchToHttp().getRequest().user
);

// roles.decorator.ts
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
```

## DTO con validación

```typescript
export class CreateOrdenServicioDto {
  @IsUUID() titularId: string;
  @IsUUID() vehiculoId: string;
  @IsUUID() sucursalId: string;
  @IsOptional() @IsUUID() mecanicoId?: string;
  @IsOptional() @IsUUID() contactoRecepcionId?: string;
  @IsOptional() @IsString() @Transform(({ value }) => value?.trim()) nombreRecepcion?: string;
  @IsOptional() @IsString() telefonoRecepcion?: string;
  @IsString() @Transform(({ value }) => value?.trim()) fallaReportada: string;
  @IsInt() @Min(0) kmEntrada: number;
  @IsOptional() @IsDateString() fechaPromesa?: string;
  @IsOptional() @IsString() notas?: string;
}

export class UpdateOrdenServicioDto extends PartialType(CreateOrdenServicioDto) {}

export class CambiarEstatusDto {
  @IsEnum(EstatusOS) estatus: EstatusOS;
  @IsOptional() @IsString() notas?: string;
}
```

## Angular — Componente con Signals

```typescript
@Component({
  selector: 'app-ordenes-lista',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatTableModule, MatPaginatorModule, AsyncPipe],
  template: `
    <mat-table [dataSource]="ordenes()">
      <ng-container matColumnDef="folio">
        <mat-header-cell *matHeaderCellDef>Folio</mat-header-cell>
        <mat-cell *matCellDef="let row">{{ row.folio }}</mat-cell>
      </ng-container>
    </mat-table>
    @if (loading()) { <mat-progress-bar mode="indeterminate"/> }
    @if (error()) { <app-error-message [message]="error()!"/> }
  `,
})
export class OrdenesListaComponent implements OnInit {
  private tallerService = inject(TallerService);
  private destroyRef = inject(DestroyRef);

  ordenes = signal<OrdenServicio[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  total = signal(0);
  page = signal(1);
  limit = signal(20);

  ngOnInit() { this.cargar(); }

  cargar() {
    this.loading.set(true);
    this.tallerService.findAll({ page: this.page(), limit: this.limit() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => { this.ordenes.set(res.data); this.total.set(res.meta.total); this.loading.set(false); },
        error: err => { this.error.set(err.message); this.loading.set(false); },
      });
  }
}
```

## Angular — Service HTTP

```typescript
@Injectable({ providedIn: 'root' })
export class TallerService {
  private http = inject(HttpClient);
  private BASE = '/api/v1/taller/ordenes';

  findAll(params: FilterOsParams) {
    return this.http.get<PaginatedResponse<OrdenServicio>>(this.BASE, { params: params as any });
  }
  findOne(id: string) {
    return this.http.get<{ data: OrdenServicio }>(`${this.BASE}/${id}`);
  }
  create(dto: CreateOrdenServicioDto) {
    return this.http.post<{ data: OrdenServicio }>(this.BASE, dto);
  }
  update(id: string, dto: Partial<CreateOrdenServicioDto>) {
    return this.http.patch<{ data: OrdenServicio }>(`${this.BASE}/${id}`, dto);
  }
  cambiarEstatus(id: string, estatus: string, notas?: string) {
    return this.http.post(`${this.BASE}/${id}/cambiar-estatus`, { estatus, notas });
  }
}
```

## Respuesta paginada

```typescript
export interface PaginatedResponse<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number; };
}
```

## Test mínimo por servicio

```typescript
describe('TallerService', () => {
  let service: TallerService;
  let osRepo: jest.Mocked<Repository<OrdenServicio>>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TallerService,
        { provide: getRepositoryToken(OrdenServicio), useValue: { findOne: jest.fn(), createQueryBuilder: jest.fn() } },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
        { provide: DataSource, useValue: { createQueryRunner: jest.fn(() => ({
          connect: jest.fn(), startTransaction: jest.fn(), commitTransaction: jest.fn(),
          rollbackTransaction: jest.fn(), release: jest.fn(),
          manager: { create: jest.fn(), save: jest.fn(), createQueryBuilder: jest.fn() }
        })) } },
      ],
    }).compile();
    service = module.get(TallerService);
    osRepo = module.get(getRepositoryToken(OrdenServicio));
  });

  it('findOneOrFail lanza NotFoundException si no existe', async () => {
    osRepo.findOne.mockResolvedValue(null);
    await expect(service.findOneOrFail('uuid', 'tenant')).rejects.toThrow(NotFoundException);
  });
});
```

## Manejo de errores HTTP

```typescript
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const status = exception.getStatus();
    const res = exception.getResponse() as any;
    ctx.getResponse().status(status).json({
      statusCode: status,
      error: typeof res === 'string' ? res : res.error,
      message: typeof res === 'string' ? res : res.message,
    });
  }
}
```

## Cifrado de credenciales (sucursal_config)

```typescript
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly key: Buffer;
  constructor(private config: ConfigService) {
    this.key = Buffer.from(config.get('ENCRYPTION_KEY'), 'hex');
  }
  encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.key, iv);
    return iv.toString('hex') + ':' + Buffer.concat([cipher.update(text), cipher.final()]).toString('hex');
  }
  decrypt(encrypted: string): string {
    const [ivHex, dataHex] = encrypted.split(':');
    const decipher = crypto.createDecipheriv('aes-256-cbc', this.key, Buffer.from(ivHex, 'hex'));
    return Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]).toString();
  }
}
```

**Campos que DEBEN cifrarse con EncryptionService antes de persistir:**
- `sucursal_config.whatsapp_phone_id`
- `sucursal_config.whatsapp_token`
- `sucursal_config.facturaapi_api_key`
- `users.totp_secret` ← crítico, mismo patrón que sucursal_config

**Patrón para totp_secret:**
```typescript
// Al activar 2FA — cifrar antes de guardar
const secret = authenticator.generateSecret();
user.totp_secret = this.encryptionService.encrypt(secret);
user.totp_enabled = false; // se activa después de verificar primer código

// Al verificar código TOTP
const secret = this.encryptionService.decrypt(user.totp_secret);
const isValid = authenticator.verify({ token: code, secret });
```

## Patrón venta_pagos

Al crear una venta, siempre persistir el desglose de pagos en `venta_pagos`:

```typescript
// En VentasService.create() — dentro de la transacción
const venta = await qr.manager.save(Venta, { ...ventaData });

// Crear detalle de pagos
for (const pago of dto.pagos) {
  await qr.manager.save(VentaPago, {
    ventaId: venta.id,
    metodo: pago.metodo,
    monto: pago.monto,
    referencia: pago.referencia ?? null,
  });
}

// Derivar metodo_pago en la venta
venta.metodoPago = dto.pagos.length === 1 ? dto.pagos[0].metodo : MetodoPago.MIXTO;
await qr.manager.save(Venta, venta);

// Actualizar caja por método — NO usar el campo ENUM, usar venta_pagos
for (const pago of dto.pagos) {
  const field = {
    EFECTIVO: 'total_efectivo',
    TARJETA: 'total_tarjeta',
    TRANSFERENCIA: 'total_transferencia',
  }[pago.metodo];

  await qr.manager
    .createQueryBuilder()
    .update(CajaSesion)
    .set({ [field]: () => `${field} + ${pago.monto}` })
    .where('id = :id', { id: cajaSesionId })
    .execute();
}
```
