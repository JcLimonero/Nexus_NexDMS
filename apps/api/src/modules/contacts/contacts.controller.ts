import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ParseUUIDPipe } from '@nestjs/common/pipes';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Contacts')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('clients/:clientId/contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get()
  findAll(
    @CurrentUser() user: UserPayload,
    @Param('clientId', ParseUUIDPipe) clientId: string,
  ) {
    return this.contactsService.findAllByClient(user, clientId);
  }

  @Get(':contactId')
  async findOne(
    @CurrentUser() user: UserPayload,
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Param('contactId', ParseUUIDPipe) contactId: string,
  ) {
    const contact = await this.contactsService.findOne(
      user,
      clientId,
      contactId,
    );
    const dataQuality = await this.contactsService.getDataQualityScore(
      user,
      contact,
    );
    return {
      ...contact,
      dataQuality,
    };
  }

  @Post()
  create(
    @CurrentUser() user: UserPayload,
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Body() dto: CreateContactDto,
  ) {
    return this.contactsService.create(user, clientId, dto);
  }

  @Patch(':contactId')
  update(
    @CurrentUser() user: UserPayload,
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Param('contactId', ParseUUIDPipe) contactId: string,
    @Body() dto: UpdateContactDto,
  ) {
    return this.contactsService.update(user, clientId, contactId, dto);
  }

  @Delete(':contactId')
  async remove(
    @CurrentUser() user: UserPayload,
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Param('contactId', ParseUUIDPipe) contactId: string,
  ) {
    await this.contactsService.remove(user, clientId, contactId);
    return { deleted: true };
  }
}
