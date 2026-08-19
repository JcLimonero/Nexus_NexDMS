import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Garantía que el proveedor otorga sobre una refacción comprada. Vive en la
 * relación parte↔proveedor (part_suppliers): meses de cobertura y nota. Sirve
 * para saber, cuando un cliente reclama, si la pieza aún tiene garantía del
 * proveedor y se le puede reclamar a él.
 */
export class GarantiaProveedorRefaccion1789900000000
  implements MigrationInterface
{
  name = 'GarantiaProveedorRefaccion1789900000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(
      `ALTER TABLE "part_suppliers" ADD COLUMN "warranty_months" int`,
    );
    await q.query(
      `ALTER TABLE "part_suppliers" ADD COLUMN "warranty_note" varchar(300)`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "part_suppliers" DROP COLUMN "warranty_note"`);
    await q.query(`ALTER TABLE "part_suppliers" DROP COLUMN "warranty_months"`);
  }
}
