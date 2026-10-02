import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { writeFileSync } from 'fs';
import { AppModule } from '../src/app.module';

async function run() {
  const app = await NestFactory.create(AppModule, { logger: false });

  const config = new DocumentBuilder()
    .setTitle('API de Integração — Envio de Etiquetas de Produtos')
    .setDescription(
      'Autentica, valida, transforma e entrega etiquetas de volume (Sankhya) ao Sistema de Destino.',
    )
    .setVersion('0.2.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  writeFileSync('openapi.json', JSON.stringify(document, null, 2));
  // eslint-disable-next-line no-console
  console.log('openapi.json gerado com sucesso.');

  await app.close();
  process.exit(0);
}

run();
