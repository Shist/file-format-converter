import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/user.entity';

@Entity('transformation_history')
export class TransformationHistoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'user_id' })
  userId!: string;

  @Column()
  type!: string;

  @Column()
  sourceFormat!: string;

  @Column()
  targetFormat!: string;

  @Column()
  status!: string;

  @Column({ type: 'int', nullable: true })
  fileSize!: number;

  @Column({ type: 'int', nullable: true })
  durationMs!: number;

  @Column({ nullable: true })
  errorCode!: string;

  @Column({ nullable: true })
  fileId!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
