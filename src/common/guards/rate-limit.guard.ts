import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

/**
 * Rate limiting simples por token (janela fixa de 1 minuto), aplicado
 * globalmente (todas as rotas, incluindo /health).
 *
 * ATENÇÃO: implementação em memória — válida apenas para uma única instância.
 * Antes de produção com múltiplas instâncias, trocar por solução distribuída
 * (ex.: Redis + @nestjs/throttler com storage customizado).
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly requestCounts = new Map<string, { count: number; windowStart: number }>();
  private readonly windowMs = 60_000;

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const token = (req.headers['authorization'] || '').toString().replace('Bearer ', '') || 'anonimo';
    const limit = this.configService.get<number>('rateLimit.perMinute') || 120;
    const now = Date.now();

    const entry = this.requestCounts.get(token) || { count: 0, windowStart: now };
    if (now - entry.windowStart > this.windowMs) {
      entry.count = 0;
      entry.windowStart = now;
    }
    entry.count += 1;
    this.requestCounts.set(token, entry);

    if (entry.count > limit) {
      throw new HttpException(
        {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Limite de requisições excedido. Tente novamente em instantes.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
