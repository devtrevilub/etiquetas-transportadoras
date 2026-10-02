import 'reflect-metadata';
import { setDefaultResultOrder } from 'node:dns';

// Corrige um bug comum em Windows onde o DNS resolve o host do Oracle para
// um endereço IPv6 link-local (fe80::...) inválido, em vez do IP real do
// servidor. Forçamos o Node a preferir IPv4 na resolução de hostnames.
setDefaultResultOrder('ipv4first');

import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { randomUUID } from 'crypto';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Correlation id por requisição, para rastreabilidade ponta a ponta.
  // Registrado como middleware Express puro para rodar antes de guards/interceptors.
  app.use((req: any, res: any, next: any) => {
    req.correlationId = req.headers['x-correlation-id'] || randomUUID();
    res.setHeader('X-Correlation-Id', req.correlationId);
    next();
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      errorHttpStatusCode: 422,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('API de Integração — Envio de Etiquetas de Produtos')
    .setDescription(
      'Autentica, valida, transforma e entrega etiquetas de volume (Sankhya) ao Sistema de Destino. Suporta envio unitário e em lote.',
    )
    .setVersion('0.4.0')
    .addBearerAuth()
    .addBasicAuth({
      type: 'http',
      scheme: 'basic',
      description: 'Login/senha da transportadora (usado no endpoint de consulta GET).',
    })
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(`API de Integração de Etiquetas rodando na porta ${port} — docs em /docs`, 'Bootstrap');
}

bootstrap();
