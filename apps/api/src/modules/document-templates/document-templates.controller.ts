import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import { DocumentTemplatesService } from './document-templates.service';

@ApiTags('Document Templates')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('document-templates')
export class DocumentTemplatesController {
  constructor(private readonly service: DocumentTemplatesService) {}

  @Get(':key')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'SELLER', 'EXECUTIVE')
  obtener(@CurrentUser() user: UserPayload, @Param('key') key: string) {
    this.validar(key);
    return this.service.obtener(user.tenantId, key);
  }

  @Put(':key')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  guardar(
    @CurrentUser() user: UserPayload,
    @Param('key') key: string,
    @Body() body: { html?: string },
  ) {
    this.validar(key);
    return this.service.guardar(user.tenantId, key, body?.html ?? '');
  }

  private validar(key: string) {
    if (!this.service.esClaveValida(key)) {
      throw new BadRequestException(`Plantilla "${key}" no permitida`);
    }
  }
}
