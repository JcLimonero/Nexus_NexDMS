import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ParseUUIDPipe } from '@nestjs/common/pipes';
import { UnitSalesService } from './unit-sales.service';
import { UnitSalePaymentsService } from './unit-sale-payments.service';
import type { RegistrarPagoDto } from './unit-sale-payments.service';
import { CreateUnitSaleDto } from './dto/create-unit-sale.dto';
import { CreatePaymentPlanDto } from './dto/create-payment-plan.dto';
import { FilterUnitSalesDto } from './dto/filter-unit-sales.dto';
import { CancelUnitSaleDto } from './dto/cancel-unit-sale.dto';
import { RegisterInstallmentPaymentDto } from './dto/register-installment-payment.dto';
import { AddAccessoryToSaleDto } from '../unit-accessories/dto/add-accessory-to-sale.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { IdempotencyGuard } from '../../common/guards/idempotency.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { IdempotencyInterceptor } from '../../common/interceptors/idempotency.interceptor';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Unit Sales')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('unit-sales')
export class UnitSalesController {
  constructor(
    private readonly unitSalesService: UnitSalesService,
    private readonly pagos: UnitSalePaymentsService,
  ) {}

  @Get()
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'WAREHOUSE', 'SELLER', 'EXECUTIVE')
  findAll(
    @CurrentUser() user: UserPayload,
    @Query() filters: FilterUnitSalesDto,
  ) {
    return this.unitSalesService.findAll(user, filters);
  }

  @Post()
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'SELLER')
  @UseGuards(IdempotencyGuard)
  @UseInterceptors(IdempotencyInterceptor)
  create(@CurrentUser() user: UserPayload, @Body() dto: CreateUnitSaleDto) {
    return this.unitSalesService.create(user, dto);
  }

  @Post(':id/complete')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'SELLER')
  complete(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.unitSalesService.complete(user, id);
  }

  @Post(':id/cancel')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  cancel(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelUnitSaleDto,
  ) {
    return this.unitSalesService.cancel(user, id, dto.reason);
  }

  @Post(':id/payment-plan')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'SELLER')
  createPaymentPlan(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreatePaymentPlanDto,
  ) {
    return this.unitSalesService.createPaymentPlan(user, id, dto);
  }

  @Get(':id/payment-plan')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'WAREHOUSE', 'SELLER', 'EXECUTIVE')
  getPaymentPlan(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.unitSalesService.getPaymentPlan(user, id);
  }

  @Get(':id/accessories')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'WAREHOUSE', 'SELLER', 'EXECUTIVE')
  getAccessories(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.unitSalesService.getAccessories(user, id);
  }

  @Post(':id/accessories')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'SELLER')
  addAccessory(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddAccessoryToSaleDto,
  ) {
    return this.unitSalesService.addAccessory(
      user,
      id,
      dto.accessoryId,
      dto.quantity,
    );
  }

  @Delete(':id/accessories/:accessoryLineId')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'SELLER')
  removeAccessory(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('accessoryLineId', ParseUUIDPipe) accessoryLineId: string,
  ) {
    return this.unitSalesService.removeAccessory(user, id, accessoryLineId);
  }

  @Get(':id')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'WAREHOUSE', 'SELLER', 'EXECUTIVE')
  findOne(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.unitSalesService.findOne(user, id);
  }

  @Post(':id/payment-plan/installments/:installmentId/register')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'SELLER')
  registerInstallmentPayment(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('installmentId', ParseUUIDPipe) installmentId: string,
    @Body() dto: RegisterInstallmentPaymentDto,
  ) {
    return this.unitSalesService.registerInstallmentPayment(
      user,
      id,
      installmentId,
      {
        paymentDate: dto.paymentDate,
        paymentMethod: dto.paymentMethod,
        paymentReference: dto.paymentReference,
      },
    );
  }
  /** Programa la fecha de entrega, que al crear la venta no se conoce. */
  @Post(':id/delivery-date')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'SELLER')
  scheduleDelivery(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { deliveryDate: string | null },
  ) {
    return this.unitSalesService.scheduleDelivery(user, id, dto.deliveryDate);
  }

  // ─── Pagos de la venta ───────────────────────────

  @Get(':id/payments')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'SELLER', 'CASHIER')
  listPayments(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.pagos.listar(user, id);
  }

  @Post(':id/payments')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'SELLER', 'CASHIER')
  registerPayment(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RegistrarPagoDto,
  ) {
    return this.pagos.registrar(user, id, dto);
  }

  @Post('payments/:paymentId/receipt')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'SELLER', 'CASHIER')
  @UseInterceptors(FileInterceptor('file'))
  uploadReceipt(
    @CurrentUser() user: UserPayload,
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.pagos.subirComprobante(user, paymentId, file);
  }

  @Get('payments/:paymentId/receipt-url')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'SELLER', 'CASHIER')
  receiptUrl(
    @CurrentUser() user: UserPayload,
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
  ) {
    return this.pagos.ligaComprobante(user, paymentId);
  }

  @Delete('payments/:paymentId')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'SELLER', 'CASHIER')
  deletePayment(
    @CurrentUser() user: UserPayload,
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
  ) {
    return this.pagos.eliminar(user, paymentId);
  }
}
