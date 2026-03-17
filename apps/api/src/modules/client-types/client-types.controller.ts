import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../../common/guards/auth.guard';
import { ClientTypesService } from './client-types.service';

@ApiTags('Client Types')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('client-types')
export class ClientTypesController {
  constructor(private readonly clientTypesService: ClientTypesService) {}

  @Get()
  findAll() {
    return this.clientTypesService.findAll();
  }
}
