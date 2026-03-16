import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from './entities/client.entity';
import { Contact } from '../contacts/entities/contact.entity';
import { CustomerVehicle } from '../customer-vehicles/entities/customer-vehicle.entity';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';

@Module({
  imports: [TypeOrmModule.forFeature([Client, Contact, CustomerVehicle])],
  controllers: [ClientsController],
  providers: [ClientsService],
  exports: [TypeOrmModule, ClientsService],
})
export class ClientsModule {}
