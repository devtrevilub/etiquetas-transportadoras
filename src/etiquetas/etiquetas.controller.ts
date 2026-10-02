import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBasicAuth, ApiBearerAuth, ApiHeader, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { BasicAuthGuard } from '../common/guards/basic-auth.guard';
import { BearerAuthGuard } from '../common/guards/bearer-auth.guard';
import { IdempotencyInterceptor } from '../common/interceptors/idempotency.interceptor';
import { ConfirmacaoLoteDto, ConfirmacaoUnitariaDto } from './dto/confirmacao-response.dto';
import { EtiquetaDto } from './dto/etiqueta.dto';
import { LoteEtiquetasDto } from './dto/lote-etiquetas.dto';
import { EtiquetasQueryService } from './etiquetas-query.service';
import { EtiquetasService } from './etiquetas.service';

@ApiTags('etiquetas')
@Controller('v1/etiquetas')
export class EtiquetasController {
  constructor(
    private readonly etiquetasService: EtiquetasService,
    private readonly etiquetasQueryService: EtiquetasQueryService,
  ) {}

  /**
   * Consulta usada pelas transportadoras (autenticadas via login/senha
   * próprios, um por transportadora). Retorna TODAS as ordens de carga da
   * transportadora autenticada (pode ter mais de uma no mesmo dia), cada
   * uma já separada em pedidos (idRev) e notas fiscais (etqVol).
   *
   * Não recebe ordemCarga por parâmetro — o filtro é 100% pela FROTA da
   * credencial autenticada (ver EtiquetasQueryService).
   *
   * Este é o fluxo PRINCIPAL da API hoje.
   */
  @Get('carregamento')
  @UseGuards(BasicAuthGuard)
  @ApiBasicAuth()
  @ApiOkResponse({
    description:
      'Lista de ordens de carga da transportadora autenticada (com cnpj), cada uma agrupada por "chaveNfe" (numnota, serieNota, totalEtiquetas) e, dentro dela, um array único "etiquetas" misturando itens (idRev) e etiquetas de volume (etqVol), com sequência contínua entre os dois.',
  })
  async buscarCarregamentos(@Req() req: Request) {
    const { frota } = (req as any).transportadora;
    return this.etiquetasQueryService.buscarPorTransportadora(frota);
  }

  /**
   * Envio de etiqueta ao Sistema de Destino (autenticado via Bearer token
   * do Sistema de Origem — Sankhya / processo de disparo).
   *
   * ⚠️ Não é o fluxo ativo no momento (as transportadoras consultam via GET
   * acima) — mantido pronto para quando o envio for necessário.
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  @UseGuards(BearerAuthGuard)
  @UseInterceptors(IdempotencyInterceptor)
  @ApiBearerAuth()
  @ApiHeader({ name: 'Idempotency-Key', required: true, description: 'Chave única por tentativa de envio.' })
  @ApiOkResponse({ type: ConfirmacaoUnitariaDto, description: 'Etiqueta recebida e confirmada pelo Sistema de Destino.' })
  async enviarUnitario(@Body() dto: EtiquetaDto, @Req() req: Request) {
    return this.etiquetasService.enviarUnitario(dto, (req as any).correlationId);
  }

  /**
   * Envio em lote ao Sistema de Destino. Ver observação em enviarUnitario().
   */
  @Post('lote')
  @HttpCode(HttpStatus.OK)
  @UseGuards(BearerAuthGuard)
  @UseInterceptors(IdempotencyInterceptor)
  @ApiBearerAuth()
  @ApiHeader({ name: 'Idempotency-Key', required: true, description: 'Chave única por tentativa de envio.' })
  @ApiOkResponse({ type: ConfirmacaoLoteDto, description: 'Lote recebido e confirmado pelo Sistema de Destino.' })
  async enviarLote(@Body() dto: LoteEtiquetasDto, @Req() req: Request) {
    return this.etiquetasService.enviarLote(dto, (req as any).correlationId);
  }
}
