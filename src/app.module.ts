import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentsModule } from './documents/documents.module';
import { Document } from './documents/document.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), // Loads .env
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'postgres', // Matches .env
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USER || 'user',
      password: process.env.DB_PASS || 'password',
      database: process.env.DB_NAME || 'documind',
      entities: [Document],
      synchronize: true, // Only for dev/hackathon
    }),
    DocumentsModule,
  ],
})
export class AppModule {}
