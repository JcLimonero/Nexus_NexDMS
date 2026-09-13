import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentTemplate } from './entities/document-template.entity';
import { DocumentTemplatesService } from './document-templates.service';
import { DocumentTemplatesController } from './document-templates.controller';

/**
 * Plantillas de documentos por cliente. @Global: el servicio se inyecta donde se
 * generan los PDF (contrato, etc.) sin recablear módulos.
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([DocumentTemplate])],
  controllers: [DocumentTemplatesController],
  providers: [DocumentTemplatesService],
  exports: [DocumentTemplatesService],
})
export class DocumentTemplatesModule {}
