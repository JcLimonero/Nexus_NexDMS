import { MigrationInterface, QueryRunner } from 'typeorm';

export class ClientDocumentValidation1773645600000 implements MigrationInterface {
  name = 'ClientDocumentValidation1773645600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."client_documents_status_enum" AS ENUM('PENDING', 'APPROVED', 'REJECTED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "client_documents" ADD "status" "public"."client_documents_status_enum" NOT NULL DEFAULT 'PENDING'`,
    );
    await queryRunner.query(
      `ALTER TABLE "client_documents" ADD "validated_by" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "client_documents" ADD "validated_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "client_documents" ADD "rejection_reason" character varying(500)`,
    );
    await queryRunner.query(
      `ALTER TABLE "client_documents" ADD CONSTRAINT "FK_client_documents_validated_by" FOREIGN KEY ("validated_by") REFERENCES "users"("id") ON DELETE SET NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_client_documents_status" ON "client_documents" ("status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_client_documents_status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "client_documents" DROP CONSTRAINT "FK_client_documents_validated_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "client_documents" DROP COLUMN "rejection_reason"`,
    );
    await queryRunner.query(
      `ALTER TABLE "client_documents" DROP COLUMN "validated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "client_documents" DROP COLUMN "validated_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "client_documents" DROP COLUMN "status"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."client_documents_status_enum"`,
    );
  }
}
