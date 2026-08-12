import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PublicPortalController } from './public-portal.controller';
import { PublicPortalService } from './public-portal.service';
import { ServiceOrder } from '../service-orders/entities/service-order.entity';
import { ServiceOrderUpdate } from '../service-orders/entities/service-order-update.entity';
import { ServiceSurvey } from '../service-orders/entities/service-survey.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ServiceOrder, ServiceOrderUpdate, ServiceSurvey]),
  ],
  controllers: [PublicPortalController],
  providers: [PublicPortalService],
})
export class PublicPortalModule {}
