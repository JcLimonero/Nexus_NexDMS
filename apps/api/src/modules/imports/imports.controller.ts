import {
  Controller,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ImportsService } from './imports.service';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Imports')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('imports')
export class ImportsController {
  constructor(private readonly imports: ImportsService) {}

  /** Catálogos importables y sus columnas. */
  @Get()
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'WAREHOUSE', 'CASHIER', 'SELLER')
  listar() {
    return this.imports.listar();
  }

  /** Descarga la plantilla .xlsx de un catálogo. */
  @Get(':key/template')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'WAREHOUSE', 'CASHIER', 'SELLER')
  async plantilla(@Param('key') key: string, @Res() res: Response) {
    const { buffer, filename } = await this.imports.plantilla(key);
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.send(buffer);
  }

  /** Carga el .xlsx lleno y crea los registros. */
  @Post(':key')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'WAREHOUSE')
  @UseInterceptors(FileInterceptor('file'))
  importar(
    @Param('key') key: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: UserPayload,
  ) {
    return this.imports.importar(key, file, user);
  }
}
