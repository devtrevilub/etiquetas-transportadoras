import { Injectable, Logger } from '@nestjs/common';
import { DestinoService } from '../destino/destino.service';
import { EtiquetaDto } from './dto/etiqueta.dto';
import { LoteEtiquetasDto } from './dto/lote-etiquetas.dto';

@Injectable()
export class EtiquetasService {
  private readonly logger = new Logger(EtiquetasService.name);

  constructor(private readonly destinoService: DestinoService) {}

  async enviarUnitario(dto: EtiquetaDto, correlationId: string) {
    const payload = this.transformarParaDestino(dto);
    const confirmacaoDestino = await this.destinoService.enviar('/etiquetas', payload, correlationId);

    this.logger.log(
      `Etiqueta enviada com sucesso [correlationId=${correlationId}] [nunota=${dto.nunota}] [etqVol=${dto.etqVol}]`,
    );

    return {
      status: 'RECEBIDO',
      ordemCarga: dto.ordemCarga,
      nunota: dto.nunota,
      etqVol: dto.etqVol,
      confirmacaoDestino,
      correlationId,
    };
  }

  async enviarLote(dto: LoteEtiquetasDto, correlationId: string) {
    const payload = { etiquetas: dto.etiquetas.map((e) => this.transformarParaDestino(e)) };
    const confirmacaoDestino = await this.destinoService.enviar('/etiquetas/lote', payload, correlationId);

    this.logger.log(
      `Lote de etiquetas enviado com sucesso [correlationId=${correlationId}] [total=${dto.etiquetas.length}]`,
    );

    return {
      status: 'RECEBIDO',
      totalEtiquetas: dto.etiquetas.length,
      confirmacaoDestino,
      correlationId,
    };
  }

  /**
   * Transforma o payload validado (formato interno) para o formato esperado
   * pelo Sistema de Destino.
   *
   * TODO: ajustar mapeamento assim que o contrato do Destino for confirmado.
   */
  private transformarParaDestino(etiqueta: EtiquetaDto) {
    return {
      ordem_carga: etiqueta.ordemCarga,
      numero_nota: etiqueta.nunota,
      etiqueta_volume: etiqueta.etqVol,
      pedido_origem: etiqueta.numPedido ?? null,
      id_rev: etiqueta.idRev ?? null,
    };
  }
}
