import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Isotipo cuadrado del cliente, aparte del logotipo horizontal. Se usa donde
 * el logo apaisado no cabe: favicon, monitores del taller, ícono del PWA.
 */
export class IconoPorTenant1790700000000 implements MigrationInterface {
  name = 'IconoPorTenant1790700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "icon_key" character varying(500)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tenants" DROP COLUMN IF EXISTS "icon_key"`,
    );
  }
}
