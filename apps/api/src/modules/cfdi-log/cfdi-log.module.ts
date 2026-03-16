import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CfdiLog } from './entities/cfdi-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CfdiLog])],
  exports: [TypeOrmModule],
})
export class CfdiLogModule {}
