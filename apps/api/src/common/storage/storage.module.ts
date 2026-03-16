import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorageService } from './storage.service';
import { StorageController } from './storage.controller';
import { ServiceOrder } from '../../modules/service-orders/entities/service-order.entity';

@Global()
@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([ServiceOrder])],
  controllers: [StorageController],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
