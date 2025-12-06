import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity()
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  originalFilename: string;

  @Column()
  mimeType: string;

  @Column()
  s3Key: string;

  @Column({ type: 'text', nullable: true })
  extractedText: string;

  @Column({ type: 'text', nullable: true })
  summary: string;

  @Column({ nullable: true })
  documentType: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @CreateDateColumn()
  createdAt: Date;
}
