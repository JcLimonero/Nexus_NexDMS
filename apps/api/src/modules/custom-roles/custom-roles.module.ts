import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomRole } from './entities/custom-role.entity';
import { CustomRolesController } from './custom-roles.controller';
import { CustomRolesService } from './custom-roles.service';
import { RoleMapModule } from '../role-map/role-map.module';

@Module({
  imports: [TypeOrmModule.forFeature([CustomRole]), RoleMapModule],
  controllers: [CustomRolesController],
  providers: [CustomRolesService],
  exports: [CustomRolesService],
})
export class CustomRolesModule {}
