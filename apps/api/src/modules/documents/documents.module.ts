import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientDocument } from './entities/client-document.entity';
import { Client } from '../clients/entities/client.entity';
import { DocumentsController } from './documents.controller';
import { DocumentsPendingController } from './documents-pending.controller';
import { DocumentsService } from './documents.service';
import { StorageModule } from '../../common/storage/storage.module';

@Module({
  imports: [TypeOrmModule.forFeature([ClientDocument, Client]), StorageModule],
  controllers: [DocumentsController, DocumentsPendingController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
