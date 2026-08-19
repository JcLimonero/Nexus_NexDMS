import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ParseUUIDPipe } from '@nestjs/common/pipes';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { FilterClientsDto } from './dto/filter-clients.dto';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

// #region agent log
let _dbgReqCount = 0;
const _dbgLog = (msg: string, data: Record<string, unknown>) => {
  fetch('http://127.0.0.1:7581/ingest/bcde24cd-a710-4919-a588-2e9c9447588e', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': 'b8cd5e',
    },
    body: JSON.stringify({
      sessionId: 'b8cd5e',
      location: 'clients.controller.ts',
      message: msg,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
};
// #endregion

@ApiTags('Clients')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  async findAll(
    @CurrentUser() user: UserPayload,
    @Query() filters: FilterClientsDto,
  ) {
    // #region agent log
    const reqSeq = ++_dbgReqCount;
    _dbgLog('clients findAll request arrived', {
      reqSeq,
      page: filters.page,
      limit: filters.limit,
    });
    // #endregion
    try {
      const result = await this.clientsService.findAll(user, filters);
      // #region agent log
      _dbgLog('clients findAll completed', {
        reqSeq,
        total: result.meta.total,
      });
      // #endregion
      return result;
    } catch (err) {
      // #region agent log
      _dbgLog('clients findAll error', { reqSeq, error: String(err) });
      // #endregion
      throw err;
    }
  }

  @Get('search')
  search(
    @CurrentUser() user: UserPayload,
    @Query('q') q: string,
    @Query('limit') limit?: string,
  ) {
    return this.clientsService.search(
      user,
      q ?? '',
      limit ? parseInt(limit, 10) : 8,
    );
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const client = await this.clientsService.findOne(user, id);
    const [contacts, vehicles, dataQuality] = await Promise.all([
      this.clientsService.getContactsForClient(user, id),
      this.clientsService.getVehiclesForClient(user, id),
      this.clientsService.getDataQualityScore(user, client),
    ]);
    return {
      ...client,
      contacts,
      vehicles,
      dataQuality,
    };
  }

  @Post()
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'WAREHOUSE', 'CASHIER', 'SELLER')
  create(@CurrentUser() user: UserPayload, @Body() dto: CreateClientDto) {
    return this.clientsService.create(user, dto);
  }

  @Patch(':id')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'WAREHOUSE', 'CASHIER', 'SELLER')
  update(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClientDto,
  ) {
    return this.clientsService.update(user, id, dto);
  }

  @Delete(':id')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'WAREHOUSE', 'CASHIER', 'SELLER')
  async remove(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.clientsService.remove(user, id);
    return { deleted: true };
  }
}
