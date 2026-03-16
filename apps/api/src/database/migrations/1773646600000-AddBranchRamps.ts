import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBranchRamps1773646600000 implements MigrationInterface {
  name = 'AddBranchRamps1773646600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "branch_ramps" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "branch_id" uuid NOT NULL,
        "name" varchar(100) NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_branch_ramps" PRIMARY KEY ("id"),
        CONSTRAINT "FK_branch_ramps_branch" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_branch_ramps_branch_id" ON "branch_ramps" ("branch_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_branch_ramps_branch_id"`);
    await queryRunner.query(`DROP TABLE "branch_ramps"`);
  }
}
