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
import { UnitReturnDocumentsService } from './unit-return-documents.service';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Unit Return Documents')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('unit-returns/:unitReturnId/documents')
export class UnitReturnDocumentsController {
  constructor(
    private readonly unitReturnDocumentsService: UnitReturnDocumentsService,
  ) {}

  @Get()
  @Roles(
    'SUPERADMIN',
    'ADMIN',
    'MANAGER',
    'WAREHOUSE',
    'CASHIER',
    'SELLER',
    'EXECUTIVE',
  )
  findAll(
    @CurrentUser() user: UserPayload,
    @Param('unitReturnId', ParseUUIDPipe) unitReturnId: string,
  ) {
    return this.unitReturnDocumentsService.findAllByUnitReturn(
      user,
      unitReturnId,
    );
  }

  @Post('upload')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'WAREHOUSE', 'SELLER')
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
    @Param('unitReturnId', ParseUUIDPipe) unitReturnId: string,
    @Body('documentType') documentType: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!documentType || !file) {
      throw new BadRequestException('documentType y file son requeridos');
    }
    return this.unitReturnDocumentsService.upload(
      user,
      unitReturnId,
      documentType,
      file,
    );
  }

  @Get(':documentId/download-url')
  @Roles(
    'SUPERADMIN',
    'ADMIN',
    'MANAGER',
    'WAREHOUSE',
    'CASHIER',
    'SELLER',
    'EXECUTIVE',
  )
  getDownloadUrl(
    @CurrentUser() user: UserPayload,
    @Param('unitReturnId', ParseUUIDPipe) unitReturnId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
  ) {
    return this.unitReturnDocumentsService.getDownloadUrl(
      user,
      unitReturnId,
      documentId,
    );
  }

  @Delete(':documentId')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'WAREHOUSE', 'SELLER')
  delete(
    @CurrentUser() user: UserPayload,
    @Param('unitReturnId', ParseUUIDPipe) unitReturnId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
  ) {
    return this.unitReturnDocumentsService.delete(
      user,
      unitReturnId,
      documentId,
    );
  }

  @Post(':documentId/approve')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'WAREHOUSE', 'SELLER')
  approve(
    @CurrentUser() user: UserPayload,
    @Param('unitReturnId', ParseUUIDPipe) unitReturnId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
  ) {
    return this.unitReturnDocumentsService.approve(
      user,
      unitReturnId,
      documentId,
    );
  }

  @Post(':documentId/reject')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'WAREHOUSE', 'SELLER')
  reject(
    @CurrentUser() user: UserPayload,
    @Param('unitReturnId', ParseUUIDPipe) unitReturnId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Body('rejectionReason') rejectionReason: string,
  ) {
    if (!rejectionReason?.trim()) {
      throw new BadRequestException('rejectionReason es requerido');
    }
    return this.unitReturnDocumentsService.reject(
      user,
      unitReturnId,
      documentId,
      rejectionReason,
    );
  }
}
