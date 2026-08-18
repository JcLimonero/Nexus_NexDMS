import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { PublicPortalService } from './public-portal.service';
import { AnswerSurveyDto } from './dto/answer-survey.dto';
import { ReceptionService } from '../service-orders/reception.service';
import { QuotationLineStatusEnum } from '../quotations/entities/quotation-item.entity';

/**
 * Endpoints públicos (sin auth) accesibles por token:
 * tracking de orden de servicio y encuesta de satisfacción.
 */
@ApiTags('Public Portal')
@Controller('public')
export class PublicPortalController {
  constructor(
    private readonly publicPortalService: PublicPortalService,
    private readonly receptionService: ReceptionService,
  ) {}

  @Get('tracking/:token')
  @Throttle({ short: { limit: 20, ttl: 60000 } })
  getTracking(@Param('token', ParseUUIDPipe) token: string) {
    return this.publicPortalService.getTracking(token);
  }

  /**
   * Cómo llegó su unidad: fotos de recepción y daños marcados.
   *
   * Es la misma evidencia que ve el taller, y es del cliente. Se entrega solo
   * la de ESTA orden —nunca el historial de la unidad, que puede ser de un
   * dueño anterior— y por el token, que es lo único que él tiene.
   *
   * Las ligas de las fotos caducan en una hora, así que reenviar la dirección
   * de una imagen a un tercero no le sirve de mucho pasado ese rato.
   */
  @Get('tracking/:token/evidencia')
  @Throttle({ short: { limit: 20, ttl: 60000 } })
  getEvidencia(@Param('token', ParseUUIDPipe) token: string) {
    return this.receptionService.evidenciaPublica(token);
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

  /** Cotización de recepción que el cliente debe autorizar. */
  @Get('quotations/:token')
  @Throttle({ short: { limit: 20, ttl: 60000 } })
  getQuotation(@Param('token', ParseUUIDPipe) token: string) {
    return this.receptionService.cotizacionPublica(token);
  }

  @Post('quotations/:token')
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  answerQuotation(
    @Param('token', ParseUUIDPipe) token: string,
    @Body() dto: { acepta: boolean; nota?: string },
  ) {
    return this.receptionService.responderCotizacion(token, dto);
  }

  /** Autorización parcial: el cliente decide cada línea y firma. */
  @Post('quotations/:token/lineas')
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  answerQuotationLines(
    @Param('token', ParseUUIDPipe) token: string,
    @Body()
    dto: {
      lineas: {
        itemId: string;
        decision: QuotationLineStatusEnum;
        nota?: string;
      }[];
      firma?: string;
    },
  ) {
    return this.receptionService.responderCotizacionPorLinea(token, dto);
  }
}
