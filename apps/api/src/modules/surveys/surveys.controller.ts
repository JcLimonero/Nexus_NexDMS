import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SurveysService } from './surveys.service';
import {
  SurveyAreaEnum,
  SurveyQuestion,
} from './entities/survey-config.entity';
import type { UserPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Surveys')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('survey-configs')
export class SurveysController {
  constructor(private readonly service: SurveysService) {}

  @Get(':area')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  getConfig(
    @CurrentUser() user: UserPayload,
    @Param('area') area: SurveyAreaEnum,
  ) {
    return this.service.getConfig(user.tenantId, area);
  }

  @Put(':area')
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  setConfig(
    @CurrentUser() user: UserPayload,
    @Param('area') area: SurveyAreaEnum,
    @Body()
    dto: {
      intro?: string | null;
      thanks?: string | null;
      questions?: SurveyQuestion[];
      isActive?: boolean;
    },
  ) {
    return this.service.setConfig(user, area, dto);
  }
}
