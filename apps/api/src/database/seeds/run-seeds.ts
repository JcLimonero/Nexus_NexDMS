import { config } from 'dotenv';
import { join } from 'path';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import {
  Tenant,
  TenantPlanEnum,
} from '../../modules/tenants/entities/tenant.entity';
import {
  Brand,
  BrandTypeEnum,
} from '../../modules/brands/entities/brand.entity';
import { Branch } from '../../modules/branches/entities/branch.entity';
import { BranchConfig } from '../../modules/branches/entities/branch-config.entity';
import {
  User,
  RoleEnum,
  ScopeEnum,
} from '../../modules/users/entities/user.entity';

const envPath = join(__dirname, '..', '..', '..', '.env');
config({ path: envPath });

const BCRYPT_ROUNDS = 12;
const DEMO_PASSWORD = 'demo123';

async function runSeeds() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(`DATABASE_URL no definida. Ruta .env buscada: ${envPath}`);
  }

  const ds = new DataSource({
    type: 'postgres',
    url: databaseUrl,
    synchronize: false,
    entities: [Tenant, Brand, Branch, BranchConfig, User],
    logging: process.env.NODE_ENV === 'development',
  });

  await ds.initialize();

  const tenantRepo = ds.getRepository(Tenant);
  const brandRepo = ds.getRepository(Brand);
  const branchRepo = ds.getRepository(Branch);
  const configRepo = ds.getRepository(BranchConfig);
  const userRepo = ds.getRepository(User);

  let tenant = await tenantRepo.findOne({ where: { slug: 'demo' } });
  if (tenant) {
    console.log('Tenant demo ya existe. Saltando seeds.');
    await ds.destroy();
    return;
  }

  tenant = tenantRepo.create({
    name: 'Demo',
    slug: 'demo',
    plan: TenantPlanEnum.PRO,
    isActive: true,
  });
  tenant = await tenantRepo.save(tenant);

  const brand = brandRepo.create({
    tenantId: tenant.id,
    name: 'Demo',
    type: BrandTypeEnum.BOTH,
    isActive: true,
  });
  const savedBrand = await brandRepo.save(brand);

  const branch = branchRepo.create({
    tenantId: tenant.id,
    brandId: savedBrand.id,
    name: 'Sucursal Central',
    slug: 'central',
    rfc: 'DEM123456ABC',
    legalName: 'Demo Sucursal Central S.A. de C.V.',
    taxRegime: '601',
    taxPostalCode: '01000',
    address: 'Av. Demo 123, Col. Centro',
    city: 'Ciudad de México',
    state: 'CDMX',
    counterPhone: '+525512345678',
    email: 'contacto@demo.local',
    schedule: {},
    timezone: 'America/Mexico_City',
    taxRate: 0.16,
    maxDiscountPct: 10,
    quotationValidityDays: 15,
    isPrimary: true,
    isActive: true,
  });
  const savedBranch = await branchRepo.save(branch);

  await configRepo.save(configRepo.create({ branchId: savedBranch.id }));

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_ROUNDS);
  const admin = userRepo.create({
    tenantId: tenant.id,
    branchId: savedBranch.id,
    brandId: savedBrand.id,
    firstName: 'Admin',
    lastName: 'Demo',
    email: 'admin@demo.local',
    passwordHash,
    role: RoleEnum.ADMIN,
    scope: ScopeEnum.GLOBAL,
    isActive: true,
  });
  await userRepo.save(admin);

  console.log('Seeds completados:');
  console.log('  - Tenant: demo');
  console.log('  - Brand: Demo');
  console.log('  - Branch: Sucursal Central');
  console.log('  - Usuario: admin@demo.local / ' + DEMO_PASSWORD);

  await ds.destroy();
}

runSeeds().catch((e) => {
  console.error('Error en seeds:', e);
  process.exit(1);
});
