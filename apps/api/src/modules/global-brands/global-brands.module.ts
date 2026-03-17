import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GlobalBrand } from './entities/global-brand.entity';
import { GlobalBrandsController } from './global-brands.controller';
import { GlobalBrandsService } from './global-brands.service';

@Module({
  imports: [TypeOrmModule.forFeature([GlobalBrand])],
  controllers: [GlobalBrandsController],
  providers: [GlobalBrandsService],
  exports: [GlobalBrandsService],
})
export class GlobalBrandsModule {}
