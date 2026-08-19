import { Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { RoleMapController } from './role-map.controller';
import { RoleMapService } from './role-map.service';

@Module({
  imports: [DiscoveryModule],
  controllers: [RoleMapController],
  providers: [RoleMapService],
  exports: [RoleMapService],
})
export class RoleMapModule {}
