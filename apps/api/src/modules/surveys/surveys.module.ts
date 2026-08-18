import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SurveyConfig } from './entities/survey-config.entity';
import { SurveysController } from './surveys.controller';
import { SurveysService } from './surveys.service';

@Module({
  imports: [TypeOrmModule.forFeature([SurveyConfig])],
  controllers: [SurveysController],
  providers: [SurveysService],
  exports: [TypeOrmModule, SurveysService],
})
export class SurveysModule {}
