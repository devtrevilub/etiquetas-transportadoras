import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { EtiquetaDto } from './etiqueta.dto';

export class LoteEtiquetasDto {
  @ApiProperty({ type: [EtiquetaDto], minItems: 1, maxItems: 500 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => EtiquetaDto)
  etiquetas: EtiquetaDto[];
}
