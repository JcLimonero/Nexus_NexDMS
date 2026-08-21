import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Branch } from '../branches/entities/branch.entity';
import { BranchConfig } from '../branches/entities/branch-config.entity';
import { SharedModule } from '../../shared/shared.module';
import { WhatsAppProvider } from '../notifications/providers/whatsapp.provider';
import { WhatsappRoutingService } from './whatsapp-routing.service';

/**
 * La plomería común del canal de WhatsApp: de qué sucursal es un número y con
 * qué credenciales se le contesta.
 *
 * Vive aparte porque la necesitan los dos lados y en direcciones opuestas: el
 * webhook del bot para saber de quién es lo que entra, y la bandeja del taller
 * para mandar la respuesta del asesor. Con esto en cualquiera de los dos, el
 * otro tendría que importarlo y quedaría un ciclo entre módulos.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Branch, BranchConfig]), SharedModule],
  providers: [WhatsappRoutingService, WhatsAppProvider],
  exports: [WhatsappRoutingService, WhatsAppProvider],
})
export class WhatsappCoreModule {}
