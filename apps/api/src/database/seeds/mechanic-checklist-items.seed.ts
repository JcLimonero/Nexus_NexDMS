import { config } from 'dotenv';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { MechanicChecklistItem } from '../../modules/mechanic-checklist/entities/mechanic-checklist-item.entity';
import { Tenant } from '../../modules/tenants/entities/tenant.entity';

const envPath = join(__dirname, '..', '..', '..', '.env');
config({ path: envPath });

const ITEMS = [
  {
    code: 'TIRES',
    name: 'Desgaste de llantas',
    description: 'Profundidad del dibujo, estado general',
    isRequired: true,
    sortOrder: 1,
  },
  {
    code: 'BRAKES',
    name: 'Balatas (frenos)',
    description: 'Estado de pastillas/discos',
    isRequired: true,
    sortOrder: 2,
  },
  {
    code: 'SHOCKS',
    name: 'Amortiguadores',
    description: 'Fugas, rebote, estabilidad',
    isRequired: true,
    sortOrder: 3,
  },
  {
    code: 'WIPERS',
    name: 'Limpiaparabrisas',
    description: 'Estado de plumillas',
    isRequired: true,
    sortOrder: 4,
  },
  {
    code: 'BRAKE_FLUID',
    name: 'Líquido de frenos',
    description: 'Nivel y estado',
    isRequired: true,
    sortOrder: 5,
  },
  {
    code: 'COOLANT',
    name: 'Refrigerante',
    description: 'Nivel y estado',
    isRequired: true,
    sortOrder: 6,
  },
  {
    code: 'LIGHTS',
    name: 'Luces',
    description: 'Frontales, traseras, direccionales, stop',
    isRequired: true,
    sortOrder: 7,
  },
  {
    code: 'BATTERY',
    name: 'Batería',
    description: 'Voltaje/estado si se mide',
    isRequired: true,
    sortOrder: 8,
  },
  {
    code: 'TIMING_BELT',
    name: 'Correa de distribución',
    description: 'Estado, kilometraje desde último cambio',
    isRequired: false,
    sortOrder: 9,
  },
  {
    code: 'AIR_FILTER',
    name: 'Filtro de aire',
    description: 'Estado',
    isRequired: false,
    sortOrder: 10,
  },
  {
    code: 'SUSPENSION',
    name: 'Suspensión (rotulas, terminales)',
    description: 'Juego, desgaste',
    isRequired: false,
    sortOrder: 11,
  },
  {
    code: 'EXHAUST',
    name: 'Escape',
    description: 'Fugas, soportes',
    isRequired: false,
    sortOrder: 12,
  },
  {
    code: 'OIL_LEVEL',
    name: 'Nivel de aceite',
    description: 'Verificación',
    isRequired: false,
    sortOrder: 13,
  },
];

async function runMechanicChecklistSeed() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(`DATABASE_URL no definida. Ruta .env buscada: ${envPath}`);
  }

  const ds = new DataSource({
    type: 'postgres',
    url: databaseUrl,
    synchronize: false,
    entities: [Tenant, MechanicChecklistItem],
    logging: process.env.NODE_ENV === 'development',
  });

  await ds.initialize();

  const tenantRepo = ds.getRepository(Tenant);
  const itemRepo = ds.getRepository(MechanicChecklistItem);

  const tenants = await tenantRepo.find();
  for (const tenant of tenants) {
    for (const item of ITEMS) {
      const existing = await itemRepo.findOne({
        where: { tenantId: tenant.id, code: item.code },
      });
      if (!existing) {
        const entity = itemRepo.create({
          tenantId: tenant.id,
          ...item,
        });
        await itemRepo.save(entity);
        console.log(`  - Creado ítem ${item.code} para tenant ${tenant.slug}`);
      }
    }
  }

  console.log('Seed mechanic_checklist_items completado.');
  await ds.destroy();
}

runMechanicChecklistSeed().catch((e) => {
  console.error('Error en seed mechanic-checklist-items:', e);
  process.exit(1);
});
