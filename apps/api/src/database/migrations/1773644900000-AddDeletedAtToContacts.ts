import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeletedAtToContacts1773644900000 implements MigrationInterface {
  name = 'AddDeletedAtToContacts1773644900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "contacts" ADD "deleted_at" TIMESTAMP`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "contacts" DROP COLUMN "deleted_at"`);
  }
}
