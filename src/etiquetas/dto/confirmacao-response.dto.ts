import { ApiProperty } from '@nestjs/swagger';

export class ConfirmacaoUnitariaDto {
  @ApiProperty({ example: 'RECEBIDO' })
  status: string;

  @ApiProperty({ example: 164214 })
  ordemCarga: number;

  @ApiProperty({ example: 18631990 })
  nunota: number;

  @ApiProperty({ example: 'VOL10823069' })
  etqVol: string;

  @ApiProperty()
  confirmacaoDestino: Record<string, any>;

  @ApiProperty()
  correlationId: string;
}

export class ConfirmacaoLoteDto {
  @ApiProperty({ example: 'RECEBIDO' })
  status: string;

  @ApiProperty({ example: 10 })
  totalEtiquetas: number;

  @ApiProperty()
  confirmacaoDestino: Record<string, any>;

  @ApiProperty()
  correlationId: string;
}
