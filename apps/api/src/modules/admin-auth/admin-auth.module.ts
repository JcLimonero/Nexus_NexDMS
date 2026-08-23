import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminUser } from './entities/admin-user.entity';
import { AdminAuthController } from './admin-auth.controller';
import { AdminAuthService } from './admin-auth.service';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';
import { AuthModule } from '../auth/auth.module';
import { EmailModule } from '../../common/email/email.module';
import { PasswordResetModule } from '../password-reset/password-reset.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AdminUser]),
    AuthModule,
    EmailModule,
    PasswordResetModule,
  ],
  controllers: [AdminAuthController, AdminUsersController],
  providers: [AdminAuthService, AdminUsersService],
  exports: [AdminAuthService],
})
export class AdminAuthModule {}
