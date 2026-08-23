import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from '../../modules/tenants/entities/tenant.entity';
import { StorageModule } from '../storage/storage.module';
import { EmailjsService } from './emailjs.service';
import { EmailComposer } from './email-composer.service';

/** Envío de correo por EmailJS + composición con la marca, reutilizable. */
@Module({
  imports: [TypeOrmModule.forFeature([Tenant]), StorageModule],
  providers: [EmailjsService, EmailComposer],
  exports: [EmailjsService, EmailComposer],
})
export class EmailModule {}
