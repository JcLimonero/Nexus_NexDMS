import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserRole } from './entities/user-role.entity';
import { UserBranch } from '../legal-entities/entities/user-branch.entity';
import { Branch } from '../branches/entities/branch.entity';
import { LegalEntity } from '../legal-entities/entities/legal-entity.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { EmailModule } from '../../common/email/email.module';
import { PasswordResetModule } from '../password-reset/password-reset.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserRole,
      UserBranch,
      Branch,
      LegalEntity,
      Tenant,
    ]),
    EmailModule,
    PasswordResetModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
