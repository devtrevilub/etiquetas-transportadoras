import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DestinoService } from './destino.service';

@Module({
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        baseURL: configService.get<string>('destino.baseUrl'),
        timeout: configService.get<number>('destino.timeoutMs'),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${configService.get<string>('destino.apiKey')}`,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [DestinoService],
  exports: [DestinoService],
})
export class DestinoModule {}
