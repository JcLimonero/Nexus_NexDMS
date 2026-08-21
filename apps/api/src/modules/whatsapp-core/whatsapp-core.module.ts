import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Branch } from '../branches/entities/branch.entity';
import { BranchConfig } from '../branches/entities/branch-config.entity';
import { SharedModule } from '../../shared/shared.module';
import { StorageModule } from '../../common/storage/storage.module';
import { WhatsAppProvider } from '../notifications/providers/whatsapp.provider';
import { WhatsappRoutingService } from './whatsapp-routing.service';
import { WhatsappMediaService } from './whatsapp-media.service';

/**
 * La plomería común del canal de WhatsApp: de qué sucursal es un número, con
 * qué credenciales se le contesta, y cómo se baja un adjunto que mandó el
 * cliente.
 *
 * Vive aparte porque la necesitan los dos lados y en direcciones opuestas: el
 * webhook del bot para saber de quién es lo que entra, y la bandeja del taller
 * para mandar la respuesta del asesor. Con esto en cualquiera de los dos, el
 * otro tendría que importarlo y quedaría un ciclo entre módulos.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Branch, BranchConfig]),
    SharedModule,
    StorageModule,
  ],
  providers: [WhatsappRoutingService, WhatsAppProvider, WhatsappMediaService],
  exports: [WhatsappRoutingService, WhatsAppProvider, WhatsappMediaService],
})
export class WhatsappCoreModule {}
