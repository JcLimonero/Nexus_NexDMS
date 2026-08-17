import { Module } from '@nestjs/common';
import { ImportsController } from './imports.controller';
import { ImportsService } from './imports.service';

/**
 * Importación de catálogos por Excel: descargar una plantilla, llenarla y
 * cargarla. Trabaja sobre el DataSource (no repos concretos) para que agregar
 * un catálogo sea solo una definición más en `import-defs`.
 */
@Module({
  controllers: [ImportsController],
  providers: [ImportsService],
})
export class ImportsModule {}
