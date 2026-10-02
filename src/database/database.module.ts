import { existsSync } from 'fs';
import { join } from 'path';
import { DynamicModule, Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

const logger = new Logger('DatabaseModule');

/**
 * Módulo de conexão com o Oracle via TypeORM.
 *
 * DB_MODE=oracle (padrão) -> conecta de verdade, usando @nestjs/typeorm.
 * DB_MODE=mock            -> NÃO importa o TypeOrmModule (evita tentar
 *                             conectar em algo que não existe); os serviços
 *                             que dependem de DataSource devem injetá-la
 *                             como opcional (@Optional() @InjectDataSource())
 *                             e cair para os dados de mock-data.json.
 *
 * oracledb roda em "thin mode" por padrão (driver 100% JS, sem precisar do
 * Oracle Instant Client instalado) — não é necessário chamar
 * oracledb.initOracleClient() a menos que alguma feature específica do modo
 * "thick" seja exigida pelo DBA.
 *
 * Duas formas de configurar a conexão (ver .env.example):
 *  1. ORACLE_CONNECT_STRING — uma única connect string "Easy Connect"
 *     (ex.: "10.140.1.131:1521/snkdbprd"). Recomendado — mais simples e
 *     evita ambiguidade entre SID e SERVICE_NAME.
 *  2. Campos separados (ORACLE_HOST, ORACLE_PORT, ORACLE_SID ou
 *     ORACLE_SERVICE_NAME) — usados só se a opção 1 estiver vazia.
 */
@Module({})
export class DatabaseModule {
  static forRoot(): DynamicModule {
    if (process.env.DB_MODE === 'mock') {
      logger.warn(
        'DB_MODE=mock — a API vai responder com dados de exemplo (src/etiquetas/mock-data.json), sem conectar no Oracle. Ajuste DB_MODE=oracle (ou remova a variável) para usar o banco real.',
      );
      return { module: DatabaseModule, imports: [] };
    }

    return {
      module: DatabaseModule,
      imports: [
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          useFactory: (configService: ConfigService) => {
            const connectString = configService.get<string>('database.connectString');

            const enderecoConexao = connectString
              ? { connectString }
              : {
                  host: configService.get<string>('database.host'),
                  port: configService.get<number>('database.port'),
                  sid: configService.get<string>('database.sid'),
                  serviceName: configService.get<string>('database.serviceName'),
                };

            const semNenhumaConfiguracao = !connectString && !enderecoConexao['host'];
            if (semNenhumaConfiguracao) {
              const envPath = join(__dirname, '..', '..', '.env');
              const envExiste = existsSync(envPath);
              logger.error(
                'ORACLE_CONNECT_STRING e ORACLE_HOST estão AMBOS vazios — o .env provavelmente ' +
                  `não foi carregado. Arquivo esperado em: ${envPath} (existe: ${envExiste ? 'sim' : 'NÃO'}). ` +
                  (envExiste
                    ? 'O arquivo existe, mas as variáveis ORACLE_* dentro dele podem estar vazias — confira o conteúdo.'
                    : 'Crie esse arquivo (copie de .env.example) na raiz do projeto, ao lado do package.json.') +
                  ' Para rodar sem Oracle por enquanto, use DB_MODE=mock.',
              );
            }

            logger.log(
              connectString
                ? `Conectando ao Oracle via ORACLE_CONNECT_STRING="${connectString}"`
                : `Conectando ao Oracle via host="${enderecoConexao['host']}" port=${enderecoConexao['port']} sid="${enderecoConexao['sid'] || ''}" serviceName="${enderecoConexao['serviceName'] || ''}"`,
            );

            return {
              type: 'oracle',
              ...enderecoConexao,
              username: configService.get<string>('database.username'),
              password: configService.get<string>('database.password'),
              entities: [],
              synchronize: false, // NUNCA true contra o banco do Sankhya
              logging: configService.get<boolean>('database.logging'),
            };
          },
          inject: [ConfigService],
        }),
      ],
    };
  }
}
