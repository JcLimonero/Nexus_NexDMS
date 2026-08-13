import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Asegura el valor `RECEPTIONIST` en el enum de roles.
 *
 * La migración anterior quedó marcada como ejecutada en las bases donde ya se
 * había corrido, así que añadir el valor allí requiere una migración nueva:
 * TypeORM no vuelve a ejecutar una que ya aplicó. Sin esto, esas bases se
 * quedarían sin el rol mientras el código ya lo exige.
 *
 * Solo añade el valor. Postgres no deja usar un valor de enum recién agregado
 * en la misma transacción, así que reasignar usuarios tendría que ir en una
 * migración posterior; hoy no hace falta porque el nombre anterior no llegó a
 * asignarse fuera de desarrollo.
 */
export class RolRecepcionAlias1787400000000 implements MigrationInterface {
  name = 'RolRecepcionAlias1787400000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(
      `ALTER TYPE "users_role_enum" ADD VALUE IF NOT EXISTS 'RECEPTIONIST'`,
    );
  }

  public async down(): Promise<void> {
    // Aditiva: Postgres no permite retirar un valor de un enum sin recrear el
    // tipo y reescribir las columnas que lo usan, y un valor sin asignar no
    // hace daño.
  }
}
