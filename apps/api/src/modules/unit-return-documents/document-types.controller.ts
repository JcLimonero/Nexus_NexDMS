import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  UNIT_RETURN_DOCUMENT_TYPES,
  UNIT_RETURN_DOCUMENT_TYPE_LABELS,
} from './constants/document-types';

export interface DocumentTypeDto {
  code: string;
  label: string;
}

@ApiTags('Document Types')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('document-types/unit-return')
export class DocumentTypesController {
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
  getUnitReturnDocumentTypes(): DocumentTypeDto[] {
    return UNIT_RETURN_DOCUMENT_TYPES.map((code) => ({
      code,
      label: UNIT_RETURN_DOCUMENT_TYPE_LABELS[code],
    }));
  }
}
