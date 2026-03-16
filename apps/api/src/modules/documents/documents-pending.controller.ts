import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ParseUUIDPipe } from '@nestjs/common/pipes';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { DocumentsService } from './documents.service';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

@Controller('documents')
@ApiTags('Documents')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
export class DocumentsPendingController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get('pending')
  @Roles(
    'SUPERADMIN',
    'ADMIN',
    'MANAGER',
    'DOCUMENT_VALIDATOR',
    'AML_OFFICER',
    'AUDITOR',
  )
  @ApiQuery({
    name: 'clientId',
    required: false,
    description: 'UUID del cliente para filtrar documentos pendientes',
  })
  findPending(
    @CurrentUser() user: UserPayload,
    @Query('clientId', new ParseUUIDPipe({ optional: true })) clientId?: string,
  ) {
    return this.documentsService.findPending(user, clientId || undefined);
  }
}
