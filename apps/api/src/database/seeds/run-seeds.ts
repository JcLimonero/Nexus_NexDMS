import { config } from 'dotenv';
import { join } from 'path';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import {
  Tenant,
  TenantPlanEnum,
} from '../../modules/tenants/entities/tenant.entity';
import {
  LegalEntity,
  LegalEntityTypeEnum,
} from '../../modules/legal-entities/entities/legal-entity.entity';
import { UserBranch } from '../../modules/legal-entities/entities/user-branch.entity';
import { Branch } from '../../modules/branches/entities/branch.entity';
import { BranchConfig } from '../../modules/branches/entities/branch-config.entity';
import {
  User,
  RoleEnum,
  ScopeEnum,
} from '../../modules/users/entities/user.entity';
import { UserRole } from '../../modules/users/entities/user-role.entity';

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
    entities: [
      Tenant,
      LegalEntity,
      UserBranch,
      Branch,
      BranchConfig,
      User,
      UserRole,
    ],
    logging: process.env.NODE_ENV === 'development',
  });

  await ds.initialize();

  const tenantRepo = ds.getRepository(Tenant);
  const legalEntityRepo = ds.getRepository(LegalEntity);
  const userBranchRepo = ds.getRepository(UserBranch);
  const branchRepo = ds.getRepository(Branch);
  const configRepo = ds.getRepository(BranchConfig);
  const userRepo = ds.getRepository(User);
  const userRoleRepo = ds.getRepository(UserRole);

  let tenant = await tenantRepo.findOne({ where: { slug: 'demo' } });
  if (tenant) {
    console.log(
      'Tenant demo ya existe. Creando solo usuario de pruebas si no existe.',
    );
  } else {
    tenant = tenantRepo.create({
      name: 'Demo',
      slug: 'demo',
      plan: TenantPlanEnum.PRO,
      isActive: true,
    });
    tenant = await tenantRepo.save(tenant);

    const legalEntity = legalEntityRepo.create({
      tenantId: tenant.id,
      name: 'Demo',
      type: LegalEntityTypeEnum.BOTH,
      isActive: true,
    });
    const savedLegalEntity = await legalEntityRepo.save(legalEntity);

    const branch = branchRepo.create({
      tenantId: tenant.id,
      legalEntityId: savedLegalEntity.id,
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
      firstName: 'Admin',
      lastName: 'Demo',
      email: 'admin@demo.local',
      passwordHash,
      scope: ScopeEnum.GLOBAL,
      isActive: true,
    });
    const savedAdmin = await userRepo.save(admin);

    await userRoleRepo.save(
      userRoleRepo.create({
        userId: savedAdmin.id,
        role: RoleEnum.ADMIN,
      }),
    );

    await userBranchRepo.save(
      userBranchRepo.create({
        userId: savedAdmin.id,
        branchId: savedBranch.id,
        isDefault: true,
      }),
    );

    console.log('Seeds completados:');
    console.log('  - Tenant: demo');
    console.log('  - Legal Entity: Demo');
    console.log('  - Branch: Sucursal Central');
    console.log('  - Usuario: admin@demo.local / ' + DEMO_PASSWORD);
  }

  // Usuario de pruebas con máximo acceso (SUPERADMIN)
  const NEXUS_EMAIL = 'admin@nexusqtech.com';
  const NEXUS_PASSWORD = '00@Limonero';
  const existingNexus = await userRepo.findOne({
    where: { email: NEXUS_EMAIL, tenantId: tenant.id },
  });
  if (!existingNexus && tenant) {
    const nexusBranch = await branchRepo.findOne({
      where: { tenantId: tenant.id },
    });
    if (nexusBranch) {
      const nexusPasswordHash = await bcrypt.hash(
        NEXUS_PASSWORD,
        BCRYPT_ROUNDS,
      );
      const nexusUser = userRepo.create({
        tenantId: tenant.id,
        firstName: 'Admin',
        lastName: 'NexusQTech',
        email: NEXUS_EMAIL,
        passwordHash: nexusPasswordHash,
        scope: ScopeEnum.GLOBAL,
        isActive: true,
      });
      const savedNexus = await userRepo.save(nexusUser);
      await userRoleRepo.save(
        userRoleRepo.create({
          userId: savedNexus.id,
          role: RoleEnum.SUPERADMIN,
        }),
      );
      await userBranchRepo.save(
        userBranchRepo.create({
          userId: savedNexus.id,
          branchId: nexusBranch.id,
          isDefault: true,
        }),
      );
      console.log(
        '  - Usuario pruebas: ' +
          NEXUS_EMAIL +
          ' / ' +
          NEXUS_PASSWORD +
          ' (SUPERADMIN)',
      );
    }
  }

  await ds.destroy();
}

runSeeds().catch((e) => {
  console.error('Error en seeds:', e);
  process.exit(1);
});
