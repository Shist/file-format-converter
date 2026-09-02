import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIndexes1788318729303 implements MigrationInterface {
  name = 'AddIndexes1788318729303';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "IDX_204e9b624861ff4a5b26819210" ON "users" ("createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a5c4f42ca71d69c1e1f1b6cdbc" ON "transformation_history" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b4f128f8a700c7e686e9fa0acc" ON "transformation_history" ("type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a487dc34fbf6d5e68f26641ceb" ON "transformation_history" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6c9329c5945ed3955223e1baec" ON "transformation_history" ("createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9bd09e59708ea02bb49081961c" ON "otps" ("email") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9bd09e59708ea02bb49081961c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6c9329c5945ed3955223e1baec"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a487dc34fbf6d5e68f26641ceb"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b4f128f8a700c7e686e9fa0acc"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a5c4f42ca71d69c1e1f1b6cdbc"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_204e9b624861ff4a5b26819210"`,
    );
  }
}
