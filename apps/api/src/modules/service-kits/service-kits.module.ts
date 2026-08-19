import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceKit, ServiceKitItem } from './entities/service-kit.entity';
import { Part } from '../parts/entities/part.entity';
import { ServiceKitsController } from './service-kits.controller';
import { ServiceKitsService } from './service-kits.service';
import { ModulesModule } from '../modules/modules.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ServiceKit, ServiceKitItem, Part]),
    ModulesModule,
  ],
  controllers: [ServiceKitsController],
  providers: [ServiceKitsService],
  exports: [ServiceKitsService],
})
export class ServiceKitsModule {}
