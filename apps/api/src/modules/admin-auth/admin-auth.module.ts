import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminUser } from './entities/admin-user.entity';
import { AdminAuthController } from './admin-auth.controller';
import { AdminAuthService } from './admin-auth.service';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([AdminUser]), AuthModule],
  controllers: [AdminAuthController, AdminUsersController],
  providers: [AdminAuthService, AdminUsersService],
  exports: [AdminAuthService],
})
export class AdminAuthModule {}
