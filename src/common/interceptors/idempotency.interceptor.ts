import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

interface CachedResponse {
  status: number;
  body: any;
  expiresAt: number;
}

/**
 * Controle de idempotência baseado no header `Idempotency-Key`.
 *
 * Evita que reenvios (retry do chamador, timeout duplicado etc.) processem a
 * mesma etiqueta/lote duas vezes no Sistema de Destino.
 *
 * ATENÇÃO: implementação em memória — válida apenas para uma única instância
 * e se perde em restart. Antes de produção, trocar por Redis (SETNX + TTL) ou
 * tabela de banco com constraint UNIQUE em (idempotency_key).
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private static readonly seenKeys = new Map<string, CachedResponse>();
  private static readonly TTL_MS = 24 * 60 * 60 * 1000; // 24h

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const key = req.headers['idempotency-key'] as string | undefined;

    if (!key) {
      throw new BadRequestException({
        code: 'MISSING_IDEMPOTENCY_KEY',
        message: 'Header Idempotency-Key é obrigatório.',
      });
    }

    this.cleanupExpired();

    const existing = IdempotencyInterceptor.seenKeys.get(key);
    if (existing) {
      res.status(existing.status);
      return of(existing.body);
    }

    return next.handle().pipe(
      tap((body) => {
        IdempotencyInterceptor.seenKeys.set(key, {
          status: res.statusCode || 200,
          body,
          expiresAt: Date.now() + IdempotencyInterceptor.TTL_MS,
        });
      }),
    );
  }

  private cleanupExpired() {
    const now = Date.now();
    for (const [k, v] of IdempotencyInterceptor.seenKeys.entries()) {
      if (v.expiresAt < now) IdempotencyInterceptor.seenKeys.delete(k);
    }
  }
}
