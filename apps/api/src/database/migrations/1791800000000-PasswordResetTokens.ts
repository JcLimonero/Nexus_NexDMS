import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tokens de recuperación de contraseña (para usuarios de tenant y de admin).
 * Se guarda solo el hash del token, con vencimiento y uso único.
 */
export class PasswordResetTokens1791800000000 implements MigrationInterface {
  name = 'PasswordResetTokens1791800000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_type" varchar(10) NOT NULL,
        "user_id" uuid NOT NULL,
        "token_hash" varchar(64) NOT NULL,
        "expires_at" TIMESTAMP NOT NULL,
        "used_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_password_reset_tokens" PRIMARY KEY ("id")
      )`);
    await q.query(
      `CREATE INDEX IF NOT EXISTS "IDX_password_reset_token_hash" ON "password_reset_tokens" ("token_hash")`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS "password_reset_tokens"`);
  }
}
