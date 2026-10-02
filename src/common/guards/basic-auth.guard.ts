import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { CredencialTransportadora } from '../../config/configuration';

/**
 * Autentica as transportadoras via HTTP Basic Auth (`Authorization: Basic
 * base64(login:senha)`), cada uma com suas próprias credenciais.
 *
 * ⚠️ Basic Auth só é seguro em produção se a API estiver atrás de HTTPS —
 * o login/senha vai em base64 (não criptografado), não em texto plano, mas
 * base64 é trivialmente reversível.
 *
 * TODO produção: mover credenciais para o banco com senha com hash (bcrypt).
 */
@Injectable()
export class BasicAuthGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const header = req.headers['authorization'] || '';
    const [scheme, encoded] = header.split(' ');

    if (scheme !== 'Basic' || !encoded) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Credenciais inválidas ou ausentes.',
      });
    }

    let login = '';
    let senha = '';
    try {
      const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
      const separadorIndex = decoded.indexOf(':');
      login = decoded.slice(0, separadorIndex);
      senha = decoded.slice(separadorIndex + 1);
    } catch {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Credenciais inválidas ou ausentes.',
      });
    }

    const transportadoras =
      this.configService.get<CredencialTransportadora[]>('auth.transportadoras') || [];
    const encontrada = transportadoras.find((t) => t.login === login && t.senha === senha);

    if (!encontrada) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Credenciais inválidas ou ausentes.',
      });
    }

    (req as any).transportadora = {
      login: encontrada.login,
      nome: encontrada.nome,
      frota: encontrada.frota,
    };
    return true;
  }
}
