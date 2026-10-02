import { Module } from '@nestjs/common';
import { DestinoModule } from '../destino/destino.module';
import { EtiquetasController } from './etiquetas.controller';
import { EtiquetasQueryService } from './etiquetas-query.service';
import { EtiquetasService } from './etiquetas.service';

@Module({
  imports: [DestinoModule],
  controllers: [EtiquetasController],
  providers: [EtiquetasService, EtiquetasQueryService],
})
export class EtiquetasModule {}
