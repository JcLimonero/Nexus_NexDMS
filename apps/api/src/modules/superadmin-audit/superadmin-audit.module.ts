import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SuperadminAuditLog } from './entities/superadmin-audit-log.entity';
import { SuperadminAuditService } from './superadmin-audit.service';

@Module({
  imports: [TypeOrmModule.forFeature([SuperadminAuditLog])],
  providers: [SuperadminAuditService],
  exports: [SuperadminAuditService],
})
export class SuperadminAuditModule {}
