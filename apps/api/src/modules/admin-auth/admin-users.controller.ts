import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

import { AdminUsersService } from './admin-users.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

class CreateAdminUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MaxLength(100)
  firstName: string;

  @IsString()
  @MaxLength(100)
  lastName: string;

  @IsString()
  @MinLength(8)
  password: string;
}

class UpdateAdminUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

class PasswordDto {
  @IsString()
  @MinLength(8)
  password: string;
}

/** Gestión de los usuarios del portal admin. Solo administradores del SaaS. */
@UseGuards(AuthGuard, RolesGuard)
@Roles('SUPERADMIN')
@Controller('admin-users')
export class AdminUsersController {
  constructor(private readonly service: AdminUsersService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Post()
  create(@Body() dto: CreateAdminUserDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAdminUserDto,
  ) {
    return this.service.update(id, dto);
  }

  @Patch(':id/password')
  password(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PasswordDto,
  ) {
    return this.service.cambiarPassword(id, dto.password);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
