import { Global, Module } from '@nestjs/common';
import { DocumentoCorreoService } from './documento-correo.service';
import { EmailProvider } from '../../modules/notifications/providers/email.provider';
import { EmailModule } from '../email/email.module';

/**
 * Envío de documentos por correo, disponible en todo el sistema (@Global) para
 * que cualquier módulo con impresiones pueda mandarlas al cliente sin cablear
 * dependencias. Provee su propia instancia de EmailProvider (sin estado).
 */
@Global()
@Module({
  imports: [EmailModule],
  providers: [EmailProvider, DocumentoCorreoService],
  exports: [DocumentoCorreoService],
})
export class DocumentMailModule {}
