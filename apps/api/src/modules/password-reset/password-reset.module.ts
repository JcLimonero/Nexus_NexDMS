import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PasswordResetToken } from './password-reset-token.entity';
import { PasswordResetService } from './password-reset.service';

/** Tokens de recuperación de contraseña, compartido por auth y admin-auth. */
@Module({
  imports: [TypeOrmModule.forFeature([PasswordResetToken])],
  providers: [PasswordResetService],
  exports: [PasswordResetService],
})
export class PasswordResetModule {}
