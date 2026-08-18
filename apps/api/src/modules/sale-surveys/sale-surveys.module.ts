import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SaleSurvey } from './entities/sale-survey.entity';
import {
  PublicSaleSurveysController,
  SaleSurveysController,
} from './sale-surveys.controller';
import { SaleSurveysService } from './sale-surveys.service';
import { SurveysModule } from '../surveys/surveys.module';

@Module({
  imports: [TypeOrmModule.forFeature([SaleSurvey]), SurveysModule],
  controllers: [SaleSurveysController, PublicSaleSurveysController],
  providers: [SaleSurveysService],
  exports: [TypeOrmModule, SaleSurveysService],
})
export class SaleSurveysModule {}
