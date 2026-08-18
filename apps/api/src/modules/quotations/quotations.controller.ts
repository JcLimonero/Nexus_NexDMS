import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ParseUUIDPipe } from '@nestjs/common/pipes';
import { QuotationsService } from './quotations.service';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { FilterQuotationsDto } from './dto/filter-quotations.dto';
import { UpdateQuotationDto } from './dto/update-quotation.dto';
import { RejectQuotationDto } from './dto/reject-quotation.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { IdempotencyGuard } from '../../common/guards/idempotency.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { IdempotencyInterceptor } from '../../common/interceptors/idempotency.interceptor';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Quotations')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('quotations')
export class QuotationsController {
  constructor(private readonly quotationsService: QuotationsService) {}

  @Get()
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'SELLER')
  findAll(
    @CurrentUser() user: UserPayload,
    @Query() filters: FilterQuotationsDto,
  ) {
    return this.quotationsService.findAll(user, filters);
  }

  @Get(':id')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'SELLER')
  findOne(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.quotationsService.findOne(user, id);
  }

  @Post()
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'SELLER')
  @UseGuards(IdempotencyGuard)
  @UseInterceptors(IdempotencyInterceptor)
  create(@CurrentUser() user: UserPayload, @Body() dto: CreateQuotationDto) {
    return this.quotationsService.create(user, dto);
  }

  @Patch(':id')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'SELLER')
  update(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateQuotationDto,
  ) {
    return this.quotationsService.update(user, id, dto);
  }

  @Post(':id/approve')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  approve(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.quotationsService.approve(user, id);
  }

  @Post(':id/reject')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  reject(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectQuotationDto,
  ) {
    return this.quotationsService.reject(user, id, dto.reason);
  }

  @Post(':id/send')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'SELLER')
  send(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.quotationsService.send(user, id);
  }

  @Post(':id/convert')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'SELLER')
  convert(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { vehicleId?: string },
  ) {
    return this.quotationsService.convert(user, id, dto ?? {});
  }

  /** Sube una foto de lo que se recomienda cambiar a una línea del presupuesto. */
  @Post(':id/items/:itemId/photos')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'SELLER')
  @UseInterceptors(FileInterceptor('file'))
  uploadItemPhoto(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.quotationsService.subirFotoLinea(user, id, itemId, file);
  }
}
