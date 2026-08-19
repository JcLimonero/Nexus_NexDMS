import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Marca del cliente: su logotipo y su paleta.
 *
 * Va en el tenant y no en la sucursal porque es la marca del grupo: el mismo
 * logotipo y los mismos colores tienen que salir en el DMS, en el portal del
 * mostrador, en los monitores del taller y en lo que se imprime. La sucursal
 * ya tiene su propio `logo_key`, que sirve para otra cosa —el membrete de una
 * plaza concreta— y se deja como está.
 *
 * `palette` guarda el identificador de una paleta del catálogo, no los colores
 * sueltos: así, cuando se corrija un tono por contraste insuficiente, la
 * corrección alcanza a todos los clientes que la eligieron en vez de quedarse
 * congelada en cada registro.
 */
export class BrandingPorCliente1788300000000 implements MigrationInterface {
  name = 'BrandingPorCliente1788300000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      ALTER TABLE "tenants"
        ADD "logo_key" varchar(500)`);
    await q.query(`
      ALTER TABLE "tenants"
        ADD "palette" varchar(40) NOT NULL DEFAULT 'nexus'`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "tenants" DROP COLUMN "palette"`);
    await q.query(`ALTER TABLE "tenants" DROP COLUMN "logo_key"`);
  }
}
