import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/user.entity';

@Entity('transformation_history')
export class TransformationHistoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Index()
  @Column({ name: 'user_id' })
  userId!: string;

  @Index()
  @Column()
  type!: string;

  @Column()
  sourceFormat!: string;

  @Column()
  targetFormat!: string;

  @Index()
  @Column()
  status!: string;

  @Column({ type: 'int', nullable: true })
  fileSize!: number;

  @Column({ type: 'int', nullable: true })
  durationMs!: number;

  @Column({ nullable: true })
  errorCode!: string;

  @Column({ type: 'varchar', nullable: true })
  fileId!: string | null;

  @Index()
  @CreateDateColumn()
  createdAt!: Date;
}
