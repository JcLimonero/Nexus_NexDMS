import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WarrantiesController } from './warranties.controller';
import { WarrantiesService } from './warranties.service';
import { Warranty } from './entities/warranty.entity';
import { Branch } from '../branches/entities/branch.entity';
import { Client } from '../clients/entities/client.entity';
import { BranchesModule } from '../branches/branches.module';
import { EmailModule } from '../../common/email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Warranty, Branch, Client]),
    BranchesModule,
    EmailModule,
  ],
  controllers: [WarrantiesController],
  providers: [WarrantiesService],
  exports: [WarrantiesService],
})
export class WarrantiesModule {}
