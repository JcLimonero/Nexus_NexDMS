import { Controller, Get, Module, Param, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { UserPayload } from '../auth/strategies/jwt.strategy';
import { ExportService } from './export.service';

@ApiTags('Exportación')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('export')
export class ExportController {
  constructor(private readonly exportar: ExportService) {}

  /** Qué listados se pueden exportar. */
  @Get()
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  listar() {
    return this.exportar.listar();
  }

  @Get(':dataset/excel')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  async excel(
    @CurrentUser() user: UserPayload,
    @Param('dataset') dataset: string,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.exportar.aExcel(
      dataset,
      user.tenantId,
    );
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(buffer.length),
    });
    res.end(buffer);
  }

  @Get(':dataset/pdf')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  async pdf(
    @CurrentUser() user: UserPayload,
    @Param('dataset') dataset: string,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.exportar.aPdf(
      dataset,
      user.tenantId,
    );
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(buffer.length),
    });
    res.end(buffer);
  }
}

@Module({
  controllers: [ExportController],
  providers: [ExportService],
  exports: [ExportService],
})
export class ExportModule {}
