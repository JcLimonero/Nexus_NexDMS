import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contact } from './entities/contact.entity';
import { Client } from '../clients/entities/client.entity';
import { ContactsController } from './contacts.controller';
import { ContactsService } from './contacts.service';

@Module({
  imports: [TypeOrmModule.forFeature([Contact, Client])],
  controllers: [ContactsController],
  providers: [ContactsService],
  exports: [TypeOrmModule, ContactsService],
})
export class ContactsModule {}
