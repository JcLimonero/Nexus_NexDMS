import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ParseUUIDPipe } from '@nestjs/common/pipes';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { IdempotencyGuard } from '../../common/guards/idempotency.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { IdempotencyInterceptor } from '../../common/interceptors/idempotency.interceptor';
import { PurchaseOrdersService } from './purchase-orders.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { ReceivePurchaseOrderDto } from './dto/receive-purchase-order.dto';
import { CancelPurchaseOrderDto } from './dto/cancel-purchase-order.dto';
import { FilterPurchaseOrdersDto } from './dto/filter-purchase-orders.dto';
import { ImportCfdiDto } from './dto/import-cfdi.dto';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Purchase Orders')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  @Get()
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'WAREHOUSE', 'CASHIER', 'SELLER')
  findAll(
    @CurrentUser() user: UserPayload,
    @Query() filters: FilterPurchaseOrdersDto,
  ) {
    return this.purchaseOrdersService.findAll(user, filters);
  }

  /** Top 3 de proveedores de una refacción (para comparar al comprar). */
  @Get('parts/:partId/suppliers')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'WAREHOUSE', 'CASHIER', 'SELLER')
  topProveedores(
    @CurrentUser() user: UserPayload,
    @Param('partId', ParseUUIDPipe) partId: string,
  ) {
    return this.purchaseOrdersService.topProveedores(user, partId);
  }

  /** Registra la garantía que un proveedor da sobre una refacción. */
  @Post('parts/:partId/supplier-warranty')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'WAREHOUSE')
  setSupplierWarranty(
    @CurrentUser() user: UserPayload,
    @Param('partId', ParseUUIDPipe) partId: string,
    @Body()
    dto: {
      supplierId: string;
      warrantyMonths?: number | null;
      warrantyNote?: string | null;
    },
  ) {
    return this.purchaseOrdersService.setSupplierWarranty(user, partId, dto);
  }

  @Get(':id')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'WAREHOUSE', 'CASHIER', 'SELLER')
  findOne(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.purchaseOrdersService.findOne(user, id);
  }

  @Post()
  @Roles('SUPERADMIN', 'ADMIN', 'WAREHOUSE')
  @UseGuards(IdempotencyGuard)
  @UseInterceptors(IdempotencyInterceptor)
  create(
    @CurrentUser() user: UserPayload,
    @Body() dto: CreatePurchaseOrderDto,
  ) {
    return this.purchaseOrdersService.create(user, dto);
  }

  /** Importa una orden de compra en borrador desde el XML del CFDI. */
  @Post('import-xml')
  @Roles('SUPERADMIN', 'ADMIN', 'WAREHOUSE')
  importXml(@CurrentUser() user: UserPayload, @Body() dto: ImportCfdiDto) {
    return this.purchaseOrdersService.importarCfdiXml(
      user,
      dto.branchId,
      dto.xml,
    );
  }

  @Patch(':id')
  @Roles('SUPERADMIN', 'ADMIN', 'WAREHOUSE')
  update(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePurchaseOrderDto,
  ) {
    return this.purchaseOrdersService.update(user, id, dto);
  }

  @Post(':id/send')
  @Roles('SUPERADMIN', 'ADMIN', 'WAREHOUSE')
  send(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.purchaseOrdersService.send(user, id);
  }

  @Post(':id/receive')
  @Roles('SUPERADMIN', 'ADMIN', 'WAREHOUSE')
  receive(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReceivePurchaseOrderDto,
  ) {
    return this.purchaseOrdersService.receive(user, id, dto);
  }

  @Post(':id/cancel')
  @Roles('SUPERADMIN', 'ADMIN', 'WAREHOUSE')
  cancel(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelPurchaseOrderDto,
  ) {
    return this.purchaseOrdersService.cancel(user, id, dto);
  }
}
