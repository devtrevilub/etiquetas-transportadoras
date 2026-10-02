import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const correlationId = (request as any).correlationId;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'Erro interno ao processar a requisição.';
    let details: string[] | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();

      if (typeof body === 'string') {
        message = body;
        code = this.defaultCodeForStatus(status);
      } else if (typeof body === 'object' && body !== null) {
        const b = body as Record<string, any>;
        if (Array.isArray(b.message)) {
          // Erros de validação do class-validator (ValidationPipe)
          message = 'Falha de validação dos dados da etiqueta.';
          details = b.message;
        } else {
          message = b.message || message;
        }
        code = b.code || this.defaultCodeForStatus(status);
      }
    } else {
      this.logger.error('Erro não tratado', (exception as Error)?.stack);
    }

    response.status(status).json({
      error: {
        code,
        message,
        ...(details ? { details } : {}),
        correlationId,
        timestamp: new Date().toISOString(),
      },
    });
  }

  private defaultCodeForStatus(status: number): string {
    switch (status) {
      case 400:
        return 'BAD_REQUEST';
      case 401:
        return 'UNAUTHORIZED';
      case 404:
        return 'NOT_FOUND';
      case 409:
        return 'CONFLICT';
      case 422:
        return 'VALIDATION_ERROR';
      case 429:
        return 'RATE_LIMIT_EXCEEDED';
      case 502:
        return 'DESTINO_UNAVAILABLE';
      default:
        return 'INTERNAL_ERROR';
    }
  }
}
