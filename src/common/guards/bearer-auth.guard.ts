import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

/**
 * Autentica o Sistema de Origem (Sankhya / processo de disparo) via
 * `Authorization: Bearer <token>`.
 *
 * TODO produção: trocar validação estática por OAuth2 (client_credentials)
 * ou JWT assinado com expiração + rotação de chave.
 */
@Injectable()
export class BearerAuthGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const header = req.headers['authorization'] || '';
    const [scheme, token] = header.split(' ');

    const validTokens = this.configService.get<string[]>('auth.validTokens') || [];

    if (scheme !== 'Bearer' || !token || !validTokens.includes(token)) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Credenciais inválidas ou ausentes.',
      });
    }

    (req as any).authToken = token;
    return true;
  }
}
