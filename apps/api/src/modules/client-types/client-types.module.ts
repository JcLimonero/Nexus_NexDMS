import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientType } from './entities/client-type.entity';
import { ClientTypesController } from './client-types.controller';
import { ClientTypesService } from './client-types.service';

@Module({
  imports: [TypeOrmModule.forFeature([ClientType])],
  controllers: [ClientTypesController],
  providers: [ClientTypesService],
  exports: [ClientTypesService],
})
export class ClientTypesModule {}
