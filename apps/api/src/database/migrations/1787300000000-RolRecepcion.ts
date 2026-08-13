import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Rol de recepción de unidades.
 *
 * Quien recibe unidades no necesita —ni debe— ver ventas, compras o finanzas:
 * su jornada es recibir, documentar con fotos y entregar la unidad al taller.
 * Con un rol propio el portal de recepción se le abre solo al entrar.
 *
 * Solo se añade el valor al enum; no se usa en esta misma transacción porque
 * Postgres no permite emplear un valor recién agregado hasta que confirma.
 */
export class RolRecepcion1787300000000 implements MigrationInterface {
  name = 'RolRecepcion1787300000000';

  /**
   * Fuera de transacción: `ALTER TYPE ... ADD VALUE` no surte efecto dentro
   * de la que abre TypeORM —la migración se registra pero el valor no queda—,
   * y el fallo es silencioso.
   */
  transaction = false;

  public async up(q: QueryRunner): Promise<void> {
    await q.query(
      `ALTER TYPE "users_role_enum" ADD VALUE IF NOT EXISTS 'RECEPTIONIST'`,
    );
  }

  public async down(): Promise<void> {
    // Postgres no permite quitar un valor de un enum sin recrear el tipo y
    // reescribir las columnas que lo usan. Como el rol es aditivo y no rompe
    // nada al quedarse, se deja: revertirlo costaría más de lo que resuelve.
  }
}
