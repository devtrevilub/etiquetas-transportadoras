import { join } from 'path';
import { config as loadEnv } from 'dotenv';

// Carregado explicitamente ANTES do @Module(), com um caminho ABSOLUTO
// (calculado a partir de onde este arquivo compilado está, não do diretório
// de onde o comando `node`/`npm` foi executado). Isso evita um problema
// clássico: dotenv, por padrão, procura o `.env` relativo ao "current
// working directory" do terminal — se você roda `npm start` de um lugar
// diferente da raiz do projeto (comum no Windows, dependendo de como o
// comando é disparado), o `.env` não é encontrado e todas as variáveis
// ficam vazias, mesmo que o arquivo exista.
//
// dist/main.js -> __dirname é "<projeto>/dist" -> ".." é a raiz do projeto.
const envPath = join(__dirname, '..', '.env');
loadEnv({ path: envPath });

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import configuration from './config/configuration';
import { RateLimitGuard } from './common/guards/rate-limit.guard';
import { DatabaseModule } from './database/database.module';
import { EtiquetasModule } from './etiquetas/etiquetas.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: envPath,
      load: [configuration],
    }),
    DatabaseModule.forRoot(),
    EtiquetasModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
  ],
})
export class AppModule {}
