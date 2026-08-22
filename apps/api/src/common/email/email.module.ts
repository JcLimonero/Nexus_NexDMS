import { Module } from '@nestjs/common';
import { EmailjsService } from './emailjs.service';

/** Envío de correo por EmailJS, reutilizable por cualquier módulo. */
@Module({
  providers: [EmailjsService],
  exports: [EmailjsService],
})
export class EmailModule {}
