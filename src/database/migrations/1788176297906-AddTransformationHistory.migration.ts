import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTransformationHistory1788176297906 implements MigrationInterface {
  name = 'AddTransformationHistory1788176297906';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "transformation_history" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "type" character varying NOT NULL, "sourceFormat" character varying NOT NULL, "targetFormat" character varying NOT NULL, "status" character varying NOT NULL, "fileSize" integer, "durationMs" integer, "errorCode" character varying, "fileId" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_d3099ba2127cba21a5d120236f3" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "transformation_history" ADD CONSTRAINT "FK_a5c4f42ca71d69c1e1f1b6cdbcd" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "transformation_history" DROP CONSTRAINT "FK_a5c4f42ca71d69c1e1f1b6cdbcd"`,
    );
    await queryRunner.query(`DROP TABLE "transformation_history"`);
  }
}
