import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsPositive, IsString } from 'class-validator';

/**
 * Representa uma etiqueta de volume pronta para expedição.
 *
 * Mapeamento para as colunas do arquivo de origem (Sankhya):
 *   ordemCarga -> ORDEMCARGA   numPedido -> NUMPEDIDO   idRev -> IDREV
 *   nunota     -> NUNOTA       etqVol    -> ETQVOL
 *
 * Decisão de design: os dados de origem têm duas fases (ver README) —
 * pré-fatura (NUMPEDIDO+IDREV) e pós-fatura (NUNOTA+ETQVOL). Como esta API
 * envia a ETIQUETA FÍSICA DE VOLUME, tratamos NUNOTA+ETQVOL como obrigatórios
 * (é o que de fato existe para imprimir/rastrear) e NUMPEDIDO+IDREV como
 * metadado opcional de rastreabilidade até o(s) pedido(s) de origem.
 * ⚠️ Confirmar com o time de negócio se essa é a interpretação correta.
 */
export class EtiquetaDto {
  @ApiProperty({
    example: 164214,
    description: 'ORDEMCARGA — identificador da ordem de carga/carregamento.',
  })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  ordemCarga: number;

  @ApiProperty({
    example: 18631990,
    description: 'NUNOTA — número da nota fiscal, gerado após o faturamento do pedido.',
  })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  nunota: number;

  @ApiProperty({
    example: 'VOL10823069',
    description: 'ETQVOL — código da etiqueta de volume (uma NUNOTA pode ter várias).',
  })
  @IsString()
  @IsNotEmpty()
  etqVol: string;

  @ApiPropertyOptional({
    example: 1279913,
    description: 'NUMPEDIDO — pedido de origem (opcional; existe apenas na fase pré-fatura).',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  numPedido?: number;

  @ApiPropertyOptional({
    example: 5146564,
    description: 'IDREV — identificador de item/revisão do pedido de origem (opcional).',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  idRev?: number;
}
