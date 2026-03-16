import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { ParseUUIDPipe } from '@nestjs/common/pipes';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { DocumentsService } from './documents.service';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Documents')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('clients/:clientId/documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  @Roles(
    'SUPERADMIN',
    'ADMIN',
    'MANAGER',
    'WAREHOUSE',
    'CASHIER',
    'SELLER',
    'AML_OFFICER',
    'AUDITOR',
  )
  findAll(
    @CurrentUser() user: UserPayload,
    @Param('clientId', ParseUUIDPipe) clientId: string,
  ) {
    return this.documentsService.findAllByClient(user, clientId);
  }

  @Post('upload')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'WAREHOUSE', 'CASHIER', 'SELLER')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        documentType: { type: 'string', example: 'INE' },
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  upload(
    @CurrentUser() user: UserPayload,
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Body('documentType') documentType: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!documentType || !file) {
      throw new BadRequestException('documentType y file son requeridos');
    }
    return this.documentsService.upload(user, clientId, documentType, file);
  }

  @Get(':documentId/download-url')
  @Roles(
    'SUPERADMIN',
    'ADMIN',
    'MANAGER',
    'WAREHOUSE',
    'CASHIER',
    'SELLER',
    'AML_OFFICER',
    'AUDITOR',
  )
  getDownloadUrl(
    @CurrentUser() user: UserPayload,
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
  ) {
    return this.documentsService.getDownloadUrl(user, clientId, documentId);
  }

  @Delete(':documentId')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  delete(
    @CurrentUser() user: UserPayload,
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
  ) {
    return this.documentsService.delete(user, clientId, documentId);
  }

  @Post(':documentId/approve')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'DOCUMENT_VALIDATOR', 'AML_OFFICER')
  approve(
    @CurrentUser() user: UserPayload,
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
  ) {
    return this.documentsService.approve(user, clientId, documentId);
  }

  @Post(':documentId/reject')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'DOCUMENT_VALIDATOR', 'AML_OFFICER')
  reject(
    @CurrentUser() user: UserPayload,
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Body('rejectionReason') rejectionReason: string,
  ) {
    if (!rejectionReason?.trim()) {
      throw new BadRequestException('rejectionReason es requerido');
    }
    return this.documentsService.reject(
      user,
      clientId,
      documentId,
      rejectionReason,
    );
  }
}
