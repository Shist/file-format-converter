import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('otps')
export class OtpEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column()
  email!: string;

  @Column()
  codeHash!: string;

  @Column({ type: 'timestamp' })
  expiresAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;
}
