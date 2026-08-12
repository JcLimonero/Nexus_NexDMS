import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { PublicPortalService } from './public-portal.service';
import { AnswerSurveyDto } from './dto/answer-survey.dto';

/**
 * Endpoints públicos (sin auth) accesibles por token:
 * tracking de orden de servicio y encuesta de satisfacción.
 */
@ApiTags('Public Portal')
@Controller('public')
export class PublicPortalController {
  constructor(private readonly publicPortalService: PublicPortalService) {}

  @Get('tracking/:token')
  @Throttle({ short: { limit: 20, ttl: 60000 } })
  getTracking(@Param('token', ParseUUIDPipe) token: string) {
    return this.publicPortalService.getTracking(token);
  }

  @Get('surveys/:token')
  @Throttle({ short: { limit: 20, ttl: 60000 } })
  getSurvey(@Param('token', ParseUUIDPipe) token: string) {
    return this.publicPortalService.getSurvey(token);
  }

  @Post('surveys/:token')
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  answerSurvey(
    @Param('token', ParseUUIDPipe) token: string,
    @Body() dto: AnswerSurveyDto,
  ) {
    return this.publicPortalService.answerSurvey(token, dto);
  }
}
