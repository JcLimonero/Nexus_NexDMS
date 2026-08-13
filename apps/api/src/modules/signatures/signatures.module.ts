import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentSignature } from './entities/document-signature.entity';
import { ServiceOrder } from '../service-orders/entities/service-order.entity';
import { Client } from '../clients/entities/client.entity';
import {
  PublicSignaturesController,
  SignaturesController,
} from './signatures.controller';
import { SignaturesService } from './signatures.service';

@Module({
  // StorageModule es @Global, no hace falta importarlo aquí.
  imports: [TypeOrmModule.forFeature([DocumentSignature, ServiceOrder, Client])],
  controllers: [SignaturesController, PublicSignaturesController],
  providers: [SignaturesService],
  exports: [SignaturesService],
})
export class SignaturesModule {}
